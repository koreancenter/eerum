import { setActiveSessionKey, clearActiveSessionKey } from './vaultSession';
import {
  resolveAccountId,
  getAccountPinHashKey,
  getAccountPinTokenKey,
  getAccountPinLastVerifiedKey,
  getAccountSessionLockKey,
  getAccountLazyPinDismissedKey,
  getAccountBioCredKey,
  getAccountBioVaultKey,
  readStoredAccountsList,
  writeStoredAccountsList,
} from './accountStorage';

// SHA-256 legacy hash helper using browser Web Crypto API
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`goguma_card_pin_${pin}_salt`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function updateStoredAccountPinFlag(accountId: string | null, hasPin: boolean): void {
  if (!accountId || typeof window === 'undefined') return;
  const accounts = readStoredAccountsList();
  let changed = false;
  const updated = accounts.map((acct) => {
    if (acct.id !== accountId) return acct;
    if (acct.hasPin !== hasPin || (!hasPin && acct.biometricsEnabled)) {
      changed = true;
      return {
        ...acct,
        hasPin,
        ...(hasPin ? {} : { biometricsEnabled: false }),
      };
    }
    return acct;
  });
  if (changed) {
    writeStoredAccountsList(updated);
  }
}

/**
 * Records current timestamp as the last PIN verification time
 */
export function recordPinVerified(accountId?: string | null): void {
  if (typeof window === 'undefined') return;
  const key = getAccountPinLastVerifiedKey(accountId);
  if (!key) return;
  localStorage.setItem(key, Date.now().toString());
}

/**
 * Gets timestamp when the PIN was last verified/unlocked
 */
export function getLastPinVerifiedAt(accountId?: string | null): number | null {
  if (typeof window === 'undefined') return null;
  const key = getAccountPinLastVerifiedKey(accountId);
  if (!key) return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Returns stored PIN verification token or legacy SHA-256 hash
 */
export function getStoredPinToken(accountId?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  const key = getAccountPinTokenKey(accountId);
  if (!key) return null;
  return localStorage.getItem(key);
}

export function getStoredPinHash(accountId?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  const key = getAccountPinHashKey(accountId);
  if (!key) return null;
  return localStorage.getItem(key);
}

/**
 * Returns whether a 4-digit PIN lock has been set for the target/active local account
 */
export function isPinSet(accountId?: string | null): boolean {
  const resolvedId = resolveAccountId(accountId);
  if (!resolvedId) return false;
  return Boolean(getStoredPinToken(resolvedId) || getStoredPinHash(resolvedId));
}

/**
 * Saves a new 4-digit PIN using PBKDF2 + AES-GCM-256 Web Crypto layer,
 * immediately securing stored cards in localStorage for the active/target account.
 */
export async function setAppPin(pin: string, accountId?: string | null): Promise<void> {
  if (typeof window === 'undefined') return;
  const resolvedId = resolveAccountId(accountId);
  if (!resolvedId) return;

  const tokenKey = getAccountPinTokenKey(resolvedId);
  const hashKey = getAccountPinHashKey(resolvedId);
  const bioCredKey = getAccountBioCredKey(resolvedId);
  if (!tokenKey || !hashKey) return;

  const { createPinVerificationToken, linkBiometricsToVault } = await import('./cryptoVault');

  // 1. Create PBKDF2-SHA256 authenticated AES-GCM verification envelope
  const vaultToken = await createPinVerificationToken(pin);
  localStorage.setItem(tokenKey, vaultToken);

  // 2. Also keep salted SHA-256 fallback hash
  const legacyHash = await hashPin(pin);
  localStorage.setItem(hashKey, legacyHash);

  // 3. Mark session unlocked, cache active session PIN for encryption, and record verification timestamp
  setActiveSessionKey(null, pin);
  recordPinVerified(resolvedId);
  setSessionLocked(false, resolvedId);
  updateStoredAccountPinFlag(resolvedId, true);

  // 4. Link biometrics if already registered on this account
  const bioCredId = bioCredKey ? localStorage.getItem(bioCredKey) : null;
  if (bioCredId) {
    await linkBiometricsToVault(pin, bioCredId, resolvedId);
  }

  // 5. Upgrade stored cards in localStorage to AES-GCM encrypted format
  try {
    const { reEncryptCardsOnPinChange } = await import('./initialCards');
    await reEncryptCardsOnPinChange(pin, resolvedId);
  } catch (err) {
    console.warn('Notice encrypting stored cards on PIN set:', err);
  }
}

/**
 * Verifies entered PIN against PBKDF2 authenticated AES-GCM token or legacy hash.
 * Unlocks the cryptographic session key upon success.
 */
export async function verifyPin(
  pin: string,
  accountId?: string | null,
  options?: { activateSession?: boolean; decryptCards?: boolean }
): Promise<boolean> {
  const resolvedId = resolveAccountId(accountId);
  if (!resolvedId) return false;

  const token = getStoredPinToken(resolvedId);
  const legacyHash = getStoredPinHash(resolvedId);

  if (!token && !legacyHash) return true; // No PIN configured for this account

  let matched = false;

  const { verifyPinWithToken, createPinVerificationToken, linkBiometricsToVault } =
    await import('./cryptoVault');

  const activateSession = options?.activateSession !== false;

  // 1. Primary: Verify with PBKDF2 + AES-GCM token
  if (token) {
    const verification = await verifyPinWithToken(pin, token, { activateSession });
    matched = verification.valid;
  }
  // 2. Fallback: Verify SHA-256 hash and transparently upgrade
  else if (legacyHash) {
    const enteredHash = await hashPin(pin);
    matched = legacyHash === enteredHash;
    if (matched) {
      const tokenKey = getAccountPinTokenKey(resolvedId);
      if (tokenKey) {
        const newToken = await createPinVerificationToken(pin);
        localStorage.setItem(tokenKey, newToken);
      }
      if (activateSession) {
        setActiveSessionKey(null, pin);
      }
    }
  }

  if (matched) {
    recordPinVerified(resolvedId);
    if (activateSession) {
      setSessionLocked(false, resolvedId);

      // If biometrics is registered but not linked, link it now
      const bioCredKey = getAccountBioCredKey(resolvedId);
      const bioVaultKey = getAccountBioVaultKey(resolvedId);
      const bioCredId = bioCredKey ? localStorage.getItem(bioCredKey) : null;
      if (bioCredId && bioVaultKey && !localStorage.getItem(bioVaultKey)) {
        void linkBiometricsToVault(pin, bioCredId, resolvedId);
      }

      if (options?.decryptCards !== false) {
        try {
          const { decryptStoredCards } = await import('./initialCards');
          await decryptStoredCards(pin, resolvedId);
        } catch (err) {
          console.warn('Notice decrypting cards upon PIN verify:', err);
        }
      }
    }
  }

  return matched;
}

/**
 * Disables PIN lock and safely decrypts stored cards in localStorage
 */
export async function clearAppPin(accountId?: string | null): Promise<void> {
  if (typeof window === 'undefined') return;
  const resolvedId = resolveAccountId(accountId);
  if (!resolvedId) return;

  // 1. Re-save cards in plain JSON before clearing keys
  try {
    const { reSaveUnencryptedCards } = await import('./initialCards');
    reSaveUnencryptedCards(resolvedId);
  } catch (err) {
    console.warn('Notice decrypting cards on PIN clear:', err);
  }

  const { clearBiometricVault } = await import('./cryptoVault');

  const hashKey = getAccountPinHashKey(resolvedId);
  const tokenKey = getAccountPinTokenKey(resolvedId);
  const lastVerifiedKey = getAccountPinLastVerifiedKey(resolvedId);

  if (hashKey) localStorage.removeItem(hashKey);
  if (tokenKey) localStorage.removeItem(tokenKey);
  if (lastVerifiedKey) localStorage.removeItem(lastVerifiedKey);

  clearActiveSessionKey();
  clearBiometricVault(resolvedId);
  setSessionLocked(false, resolvedId);
  updateStoredAccountPinFlag(resolvedId, false);
}

/**
 * Checks if the current session is locked for the active/target account.
 */
export function getSessionLocked(accountId?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  const resolvedId = resolveAccountId(accountId);
  if (!resolvedId) return false;
  if (!isPinSet(resolvedId)) return false;
  const sessionLockKey = getAccountSessionLockKey(resolvedId);
  if (!sessionLockKey) return false;
  const sessionVal = sessionStorage.getItem(sessionLockKey);
  return sessionVal !== 'unlocked';
}

export const getSessionLockState = getSessionLocked;

/**
 * Sets current runtime unlock status in sessionStorage
 */
export function setSessionLocked(locked: boolean, accountId?: string | null): void {
  if (typeof window === 'undefined') return;
  const resolvedId = resolveAccountId(accountId);
  if (!resolvedId) return;
  const sessionLockKey = getAccountSessionLockKey(resolvedId);
  if (!sessionLockKey) return;

  if (locked) {
    sessionStorage.setItem(sessionLockKey, 'locked');
    clearActiveSessionKey();
  } else {
    sessionStorage.setItem(sessionLockKey, 'unlocked');
  }
}

export const setSessionLockState = setSessionLocked;

/**
 * Persists dismissal of the lazy first-card PIN setup prompt for the active account.
 */
export function markLazyPinDismissed(accountId?: string | null): void {
  if (typeof window === 'undefined') return;
  const key = getAccountLazyPinDismissedKey(accountId);
  if (!key) return;
  try {
    localStorage.setItem(key, 'true');
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Checks whether the lazy PIN setup prompt should trigger after saving a user's first card.
 */
export function isLazyPinPromptEligible(
  isFirstEverCard: boolean,
  isPinConfigured: boolean,
  accountId?: string | null
): boolean {
  const resolvedId = resolveAccountId(accountId);
  if (!resolvedId || !isFirstEverCard || isPinConfigured || typeof window === 'undefined') {
    return false;
  }
  const key = getAccountLazyPinDismissedKey(resolvedId);
  if (!key) return false;
  try {
    return localStorage.getItem(key) !== 'true';
  } catch {
    return false;
  }
}
