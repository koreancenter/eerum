import {
  createPinVerificationToken,
  verifyPinWithToken,
  setActiveSessionKey,
  clearActiveSessionKey,
  linkBiometricsToVault,
  clearBiometricVault,
  getActiveSessionPin,
} from './cryptoVault';

// SHA-256 legacy hash helper using browser Web Crypto API
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`goguma_card_pin_${pin}_salt`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const PIN_STORAGE_KEY = 'app_pin_hash';
export const PIN_VAULT_TOKEN_KEY = 'app_pin_vault_token';
export const SESSION_LOCK_KEY = 'app_session_locked';
export const PIN_LAST_VERIFIED_KEY = 'app_pin_last_verified_at';

/**
 * Records current timestamp as the last PIN verification time
 */
export function recordPinVerified(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PIN_LAST_VERIFIED_KEY, Date.now().toString());
}

/**
 * Gets timestamp when the PIN was last verified/unlocked
 */
export function getLastPinVerifiedAt(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(PIN_LAST_VERIFIED_KEY);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Returns stored PIN verification token or legacy SHA-256 hash
 */
export function getStoredPinToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PIN_VAULT_TOKEN_KEY);
}

export function getStoredPinHash(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PIN_STORAGE_KEY);
}

/**
 * Returns whether a 4-digit PIN lock has been set by the user
 */
export function isPinSet(): boolean {
  return Boolean(getStoredPinToken() || getStoredPinHash());
}

/**
 * Saves a new 4-digit PIN using PBKDF2 + AES-GCM-256 Web Crypto layer,
 * immediately securing stored cards in localStorage.
 */
export async function setAppPin(pin: string): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Create PBKDF2-SHA256 authenticated AES-GCM verification envelope
  const vaultToken = await createPinVerificationToken(pin);
  localStorage.setItem(PIN_VAULT_TOKEN_KEY, vaultToken);

  // 2. Also keep legacy hash for fail-safe fallback
  const legacyHash = await hashPin(pin);
  localStorage.setItem(PIN_STORAGE_KEY, legacyHash);

  // 3. Mark session unlocked and record verification timestamp
  recordPinVerified();
  setSessionLocked(false);

  // 4. Link biometrics if already registered
  const bioCredId = localStorage.getItem('app_biometric_credential_id');
  if (bioCredId) {
    await linkBiometricsToVault(pin, bioCredId);
  }

  // 5. Upgrade stored cards in localStorage to AES-GCM encrypted format
  try {
    const { reEncryptCardsOnPinChange } = await import('./initialCards');
    await reEncryptCardsOnPinChange(pin);
  } catch (err) {
    console.warn('Notice encrypting stored cards on PIN set:', err);
  }
}

/**
 * Verifies entered PIN against PBKDF2 authenticated AES-GCM token or legacy hash.
 * Unlocks the cryptographic session key upon success.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const token = getStoredPinToken();
  const legacyHash = getStoredPinHash();

  if (!token && !legacyHash) return true; // No PIN configured

  let matched = false;

  // 1. Primary: Verify with PBKDF2 + AES-GCM token
  if (token) {
    const verification = await verifyPinWithToken(pin, token);
    matched = verification.valid;
  } 
  // 2. Fallback: Verify legacy SHA-256 hash and transparently upgrade
  else if (legacyHash) {
    const enteredHash = await hashPin(pin);
    matched = legacyHash === enteredHash;
    if (matched) {
      // Transparently upgrade to AES-GCM token
      const newToken = await createPinVerificationToken(pin);
      localStorage.setItem(PIN_VAULT_TOKEN_KEY, newToken);
    }
  }

  if (matched) {
    recordPinVerified();
    setSessionLocked(false);

    // If biometrics is registered but not linked, link it now
    const bioCredId = localStorage.getItem('app_biometric_credential_id');
    if (bioCredId && !localStorage.getItem('app_biometric_vault_token')) {
      linkBiometricsToVault(pin, bioCredId);
    }

    // Decrypt and cache stored cards in memory
    try {
      const { decryptStoredCards } = await import('./initialCards');
      await decryptStoredCards(pin);
    } catch (err) {
      console.warn('Notice decrypting cards upon PIN verify:', err);
    }
  }

  return matched;
}

/**
 * Disables PIN lock and safely decrypts stored cards in localStorage
 */
export async function clearAppPin(): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Re-save cards in plain JSON before clearing keys
  try {
    const { reSaveUnencryptedCards } = await import('./initialCards');
    await reSaveUnencryptedCards();
  } catch (err) {
    console.warn('Notice decrypting cards on PIN clear:', err);
  }

  // 2. Remove all PIN and vault keys
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(PIN_VAULT_TOKEN_KEY);
  localStorage.removeItem(PIN_LAST_VERIFIED_KEY);
  clearActiveSessionKey();
  clearBiometricVault();
  setSessionLocked(false);
}

/**
 * Checks if the current session is locked.
 */
export function getSessionLocked(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isPinSet()) return false;
  const sessionVal = sessionStorage.getItem(SESSION_LOCK_KEY);
  return sessionVal !== 'unlocked';
}

export const getSessionLockState = getSessionLocked;

/**
 * Sets current runtime unlock status in sessionStorage
 */
export function setSessionLocked(locked: boolean): void {
  if (typeof window === 'undefined') return;
  if (locked) {
    sessionStorage.setItem(SESSION_LOCK_KEY, 'locked');
    clearActiveSessionKey();
  } else {
    sessionStorage.setItem(SESSION_LOCK_KEY, 'unlocked');
  }
}

export const setSessionLockState = setSessionLocked;
