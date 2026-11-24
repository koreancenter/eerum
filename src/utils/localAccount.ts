import type { StoredCard } from '../types/card';
import {
  ACCOUNT_CHANGED_EVENT,
  LEGACY_MIGRATED_FLAG_KEY,
  type StoredAccountRecord,
  readStoredAccountsList,
  writeStoredAccountsList,
  getActiveAccountId,
  setActiveAccountSessionId,
  resolveAccountId,
  sanitizeAccountId,
  getAccountCategoriesKey,
  getAccountCardThemeMapKey,
  getAccountLastCardThemeKey,
  clearAllAccountScopedStorage,
} from './accountStorage';
import {
  LEGACY_CARDS_STORAGE_KEYS,
  clearMemoryDecryptedCards,
  decryptStoredCards,
  loadUserCards,
  normalizeStoredCards,
  saveUserCards,
} from './initialCards';
import { isEncryptedEnvelope, decryptCardsVault, verifyPinWithToken } from './cryptoVault';
import { hashPin, isPinSet, setAppPin, verifyPin, setSessionLocked } from './pinLock';
import { isBiometricRegistered, registerBiometric, verifyBiometric } from './biometrics';
import { removeDirectoryHandleForAccount } from './localFolderBackup';
import { resolveCardsWithStoredThemes, syncCardThemeMapFromCards } from './cardThemeStorage';

export { ACCOUNT_CHANGED_EVENT, getActiveAccountId };
export type LocalAccountMeta = StoredAccountRecord;

export interface CreateLocalAccountParams {
  displayName: string;
  pin?: string;
  enableBiometrics?: boolean;
  importLegacyData?: boolean;
  legacyPin?: string;
}

export interface LocalAccountActionResult {
  ok: boolean;
  account?: LocalAccountMeta;
  cards?: StoredCard[];
  error?: string;
  biometricError?: string;
  requiresPinRevalidation?: boolean;
}

function generateAccountId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `acct_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  return `acct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function findLegacyCardsRaw(): string | null {
  if (typeof window === 'undefined') return null;
  for (const key of LEGACY_CARDS_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw && raw.trim()) return raw;
    } catch {
      // Ignore malformed storage
    }
  }
  return null;
}

export function isLegacyVaultPinProtected(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem('app_pin_vault_token') || localStorage.getItem('app_pin_hash')) {
    return true;
  }
  const raw = findLegacyCardsRaw();
  if (!raw) return false;
  try {
    return isEncryptedEnvelope(JSON.parse(raw));
  } catch {
    return false;
  }
}

export function hasLegacySingleVaultData(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(LEGACY_MIGRATED_FLAG_KEY) === 'true') {
      return false;
    }
    if (localStorage.getItem('app_pin_vault_token') || localStorage.getItem('app_pin_hash')) {
      return true;
    }
    const raw = findLegacyCardsRaw();
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (isEncryptedEnvelope(parsed)) return true;
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

function cleanupLegacySingleVaultStorage(): void {
  if (typeof window === 'undefined') return;
  const legacyKeys = [
    ...LEGACY_CARDS_STORAGE_KEYS,
    'vault_categories_v1',
    'eerum_card_theme_map_v1',
    'eerum_last_used_card_theme_v1',
    'app_pin_hash',
    'app_pin_vault_token',
    'app_pin_last_verified_at',
    'app_biometric_credential_id',
    'app_biometric_vault_token',
    'biometric_credential_id',
    'wallet_sync_id',
    'card_sync_id',
    'lazy_pin_dismissed',
    'eerum_last_backup_at',
    'eerum_last_folder_backup_at',
    'eerum_backup_nudge_dismissed_at',
    'eerum_local_snapshots_v1',
    'eerum_vault_sort_by',
  ];
  for (const key of legacyKeys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
  try {
    localStorage.setItem(LEGACY_MIGRATED_FLAG_KEY, 'true');
  } catch {
    // Ignore
  }
}

async function extractLegacyVaultData(legacyPin?: string): Promise<{
  ok: boolean;
  cards: StoredCard[];
  categories: string[] | null;
  themeMapRaw: string | null;
  lastThemeRaw: string | null;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { ok: false, cards: [], categories: null, themeMapRaw: null, lastThemeRaw: null };
  }

  const rawCards = findLegacyCardsRaw();
  const legacyToken = localStorage.getItem('app_pin_vault_token');
  const legacyHash = localStorage.getItem('app_pin_hash');
  const hasLegacyPin = Boolean(legacyToken || legacyHash);

  let parsedCardsPayload: unknown = null;
  if (rawCards) {
    try {
      parsedCardsPayload = JSON.parse(rawCards);
    } catch {
      parsedCardsPayload = null;
    }
  }

  const cardsEncrypted = Boolean(parsedCardsPayload && isEncryptedEnvelope(parsedCardsPayload));

  if (hasLegacyPin || cardsEncrypted) {
    const cleanPin = (legacyPin || '').trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      return {
        ok: false,
        cards: [],
        categories: null,
        themeMapRaw: null,
        lastThemeRaw: null,
        error: '기존 보관함을 가져오려면 기존 4자리 PIN을 입력해 주세요.',
      };
    }

    if (legacyToken) {
      const verified = await verifyPinWithToken(cleanPin, legacyToken, { activateSession: false });
      if (!verified.valid) {
        return {
          ok: false,
          cards: [],
          categories: null,
          themeMapRaw: null,
          lastThemeRaw: null,
          error: '기존 4자리 PIN이 일치하지 않습니다.',
        };
      }
    } else if (legacyHash) {
      const hashed = await hashPin(cleanPin);
      if (hashed !== legacyHash) {
        return {
          ok: false,
          cards: [],
          categories: null,
          themeMapRaw: null,
          lastThemeRaw: null,
          error: '기존 4자리 PIN이 일치하지 않습니다.',
        };
      }
    }
  }

  let extractedCards: StoredCard[] = [];
  if (cardsEncrypted && parsedCardsPayload && isEncryptedEnvelope(parsedCardsPayload)) {
    try {
      extractedCards = await decryptCardsVault(parsedCardsPayload, (legacyPin || '').trim());
    } catch {
      return {
        ok: false,
        cards: [],
        categories: null,
        themeMapRaw: null,
        lastThemeRaw: null,
        error: '기존 암호화 보관함을 복호화하지 못했습니다. PIN을 다시 확인해 주세요.',
      };
    }
  } else if (Array.isArray(parsedCardsPayload)) {
    extractedCards = parsedCardsPayload as StoredCard[];
  }

  let categories: string[] | null = null;
  try {
    const rawCats = localStorage.getItem('vault_categories_v1');
    if (rawCats) {
      const parsedCats = JSON.parse(rawCats);
      if (Array.isArray(parsedCats)) {
        categories = parsedCats.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
      }
    }
  } catch {
    categories = null;
  }

  return {
    ok: true,
    cards: normalizeStoredCards(extractedCards),
    categories,
    themeMapRaw: localStorage.getItem('eerum_card_theme_map_v1'),
    lastThemeRaw: localStorage.getItem('eerum_last_used_card_theme_v1'),
  };
}

export function listLocalAccounts(): LocalAccountMeta[] {
  const accounts = readStoredAccountsList();
  return [...accounts].sort(
    (a, b) => Date.parse(b.lastLoginAt || b.createdAt) - Date.parse(a.lastLoginAt || a.createdAt)
  );
}

export function getActiveAccount(): LocalAccountMeta | null {
  const activeId = getActiveAccountId();
  if (!activeId) return null;
  return readStoredAccountsList().find((acct) => acct.id === activeId) || null;
}

export function syncLocalAccountSecurity(accountId?: string | null): void {
  const resolvedId = resolveAccountId(accountId);
  if (!resolvedId) return;

  const hasPin = isPinSet(resolvedId);
  const biometricsEnabled = hasPin && isBiometricRegistered(resolvedId);
  const accounts = readStoredAccountsList();
  let changed = false;

  const next = accounts.map((acct) => {
    if (acct.id !== resolvedId) return acct;
    if (acct.hasPin !== hasPin || acct.biometricsEnabled !== biometricsEnabled) {
      changed = true;
      return { ...acct, hasPin, biometricsEnabled };
    }
    return acct;
  });

  if (changed) {
    writeStoredAccountsList(next);
  }
}

export async function createLocalAccount({
  displayName,
  pin,
  enableBiometrics,
  importLegacyData,
  legacyPin,
}: CreateLocalAccountParams): Promise<LocalAccountActionResult> {
  if (typeof window === 'undefined') {
    return { ok: false, error: '브라우저 환경에서만 로컬 계정을 만들 수 있습니다.' };
  }

  const trimmedName = displayName.trim();
  if (!trimmedName) {
    return { ok: false, error: '계정 이름(별칭)을 입력해 주세요.' };
  }
  if (trimmedName.length > 32) {
    return { ok: false, error: '계정 이름은 32자 이하로 입력해 주세요.' };
  }

  const cleanPin = (pin || '').trim();
  if (cleanPin && !/^\d{4}$/.test(cleanPin)) {
    return { ok: false, error: 'PIN 번호는 숫자 4자리로 입력해 주세요.' };
  }

  let legacyBundle: Awaited<ReturnType<typeof extractLegacyVaultData>> | null = null;
  if (importLegacyData && hasLegacySingleVaultData()) {
    legacyBundle = await extractLegacyVaultData(legacyPin);
    if (!legacyBundle.ok) {
      return { ok: false, error: legacyBundle.error || '기존 보관함을 가져오지 못했습니다.' };
    }
  }

  const nowIso = new Date().toISOString();
  const accountId = generateAccountId();
  const newRecord: LocalAccountMeta = {
    id: accountId,
    displayName: trimmedName,
    createdAt: nowIso,
    lastLoginAt: nowIso,
    hasPin: Boolean(cleanPin),
    biometricsEnabled: false,
  };

  // Clear previous decrypted memory cache before activating the new account
  clearMemoryDecryptedCards();

  const existingAccounts = readStoredAccountsList();
  writeStoredAccountsList([newRecord, ...existingAccounts]);
  setActiveAccountSessionId(accountId);

  if (cleanPin) {
    await setAppPin(cleanPin, accountId);
  }

  let migratedCards: StoredCard[] = [];
  if (legacyBundle && legacyBundle.ok) {
    if (legacyBundle.themeMapRaw) {
      const themeMapKey = getAccountCardThemeMapKey(accountId);
      if (themeMapKey) {
        try {
          localStorage.setItem(themeMapKey, legacyBundle.themeMapRaw);
        } catch {
          // Ignore quota error
        }
      }
    }
    if (legacyBundle.lastThemeRaw) {
      const lastThemeKey = getAccountLastCardThemeKey(accountId);
      if (lastThemeKey) {
        try {
          localStorage.setItem(lastThemeKey, legacyBundle.lastThemeRaw);
        } catch {
          // Ignore quota error
        }
      }
    }
    if (legacyBundle.categories && legacyBundle.categories.length > 0) {
      const catsKey = getAccountCategoriesKey(accountId);
      if (catsKey) {
        try {
          localStorage.setItem(catsKey, JSON.stringify(legacyBundle.categories));
        } catch {
          // Ignore quota error
        }
      }
    }

    migratedCards = resolveCardsWithStoredThemes(legacyBundle.cards, accountId);
    if (migratedCards.length > 0) {
      syncCardThemeMapFromCards(migratedCards, { overwriteExisting: false, accountId });
      saveUserCards(migratedCards, accountId);
    }

    cleanupLegacySingleVaultStorage();
  }

  let biometricError: string | undefined;
  if (cleanPin && enableBiometrics) {
    const bioRes = await registerBiometric(accountId);
    if (!bioRes.success) {
      biometricError = bioRes.error;
    }
  }

  syncLocalAccountSecurity(accountId);
  const finalAccount =
    readStoredAccountsList().find((acct) => acct.id === accountId) || newRecord;

  return {
    ok: true,
    account: finalAccount,
    cards: migratedCards,
    biometricError,
  };
}

export async function loginLocalAccount(
  accountId: string,
  pin?: string
): Promise<LocalAccountActionResult> {
  if (typeof window === 'undefined') {
    return { ok: false, error: '브라우저 환경에서만 로그인할 수 있습니다.' };
  }

  const cleanId = sanitizeAccountId(accountId);
  if (!cleanId) {
    return { ok: false, error: '유효하지 않은 로컬 계정입니다.' };
  }

  const accounts = readStoredAccountsList();
  const target = accounts.find((acct) => acct.id === cleanId);
  if (!target) {
    return { ok: false, error: '선택한 로컬 계정을 찾을 수 없습니다.' };
  }

  const accountHasPin = isPinSet(cleanId) || target.hasPin;
  if (accountHasPin) {
    const cleanPin = (pin || '').trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      return { ok: false, error: '4자리 PIN 번호를 입력해 주세요.' };
    }

    const verified = await verifyPin(cleanPin, cleanId, {
      activateSession: true,
      decryptCards: false,
    });
    if (!verified) {
      return { ok: false, error: 'PIN 번호가 일치하지 않습니다. 다시 확인해 주세요.' };
    }
  } else {
    setSessionLocked(false, cleanId);
  }

  clearMemoryDecryptedCards();
  if (accountHasPin && pin) {
    // Re-run verifyPin token session activation after clearMemoryDecryptedCards cleared session key
    await verifyPin(pin.trim(), cleanId, {
      activateSession: true,
      decryptCards: true,
    });
  } else {
    await decryptStoredCards(undefined, cleanId);
  }

  const nowIso = new Date().toISOString();
  const updatedAccounts = accounts.map((acct) =>
    acct.id === cleanId
      ? {
          ...acct,
          lastLoginAt: nowIso,
          hasPin: isPinSet(cleanId),
          biometricsEnabled: isPinSet(cleanId) && isBiometricRegistered(cleanId),
        }
      : acct
  );
  writeStoredAccountsList(updatedAccounts);
  setActiveAccountSessionId(cleanId);

  const hydratedCards = loadUserCards(cleanId);
  const refreshedAccount =
    updatedAccounts.find((acct) => acct.id === cleanId) || target;

  return {
    ok: true,
    account: refreshedAccount,
    cards: hydratedCards,
  };
}

export async function loginLocalAccountWithBiometrics(
  accountId: string
): Promise<LocalAccountActionResult> {
  if (typeof window === 'undefined') {
    return { ok: false, error: '브라우저 환경에서만 로그인할 수 있습니다.' };
  }

  const cleanId = sanitizeAccountId(accountId);
  if (!cleanId) {
    return { ok: false, error: '유효하지 않은 로컬 계정입니다.' };
  }

  const accounts = readStoredAccountsList();
  const target = accounts.find((acct) => acct.id === cleanId);
  if (!target) {
    return { ok: false, error: '선택한 로컬 계정을 찾을 수 없습니다.' };
  }

  clearMemoryDecryptedCards();

  const bioResult = await verifyBiometric(cleanId, { activateSession: true });
  if (!bioResult.success) {
    return {
      ok: false,
      error: bioResult.error || '생체 인증에 실패했습니다.',
      requiresPinRevalidation: bioResult.requiresPinRevalidation,
    };
  }

  const nowIso = new Date().toISOString();
  const updatedAccounts = accounts.map((acct) =>
    acct.id === cleanId
      ? {
          ...acct,
          lastLoginAt: nowIso,
          hasPin: isPinSet(cleanId),
          biometricsEnabled: isBiometricRegistered(cleanId),
        }
      : acct
  );
  writeStoredAccountsList(updatedAccounts);
  setActiveAccountSessionId(cleanId);

  const decryptedCards = loadUserCards(cleanId);
  const refreshedAccount =
    updatedAccounts.find((acct) => acct.id === cleanId) || target;

  return {
    ok: true,
    account: refreshedAccount,
    cards: decryptedCards,
  };
}

export function logoutLocalAccount(): void {
  if (typeof window === 'undefined') return;
  const activeId = getActiveAccountId();
  if (activeId && isPinSet(activeId)) {
    setSessionLocked(true, activeId);
  }
  clearMemoryDecryptedCards();
  setActiveAccountSessionId(null);
}

export function deleteLocalAccount(accountId: string): void {
  if (typeof window === 'undefined') return;
  const cleanId = sanitizeAccountId(accountId);
  if (!cleanId) return;

  const activeId = getActiveAccountId();
  if (activeId === cleanId) {
    clearMemoryDecryptedCards();
    setActiveAccountSessionId(null);
  }

  clearAllAccountScopedStorage(cleanId);
  void removeDirectoryHandleForAccount(cleanId).catch(() => {});

  const remaining = readStoredAccountsList().filter((acct) => acct.id !== cleanId);
  writeStoredAccountsList(remaining);
}
