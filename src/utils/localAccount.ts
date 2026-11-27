import type { StoredCard } from '../types/card';
import {
  ACCOUNT_CHANGED_EVENT,
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
  clearMemoryDecryptedCards,
  decryptStoredCards,
  loadUserCards,
  normalizeStoredCards,
  saveUserCards,
} from './initialCards';
import { generateOwnerKey } from './ownerKey';
import { sanitizeCardForVault } from '@/utils/cardSerializer';
import { isPinSet, setAppPin, verifyPin, setSessionLocked } from './pinLock';
import { isBiometricRegistered, registerBiometric, verifyBiometric } from './biometrics';
import { removeDirectoryHandleForAccount } from './localFolderBackup';
import { resolveCardsWithStoredThemes, syncCardThemeMapFromCards } from './cardThemeStorage';
import {
  cleanupLegacySingleVaultStorage,
  extractLegacyVaultData,
  hasLegacySingleVaultData,
} from './legacyMigration';
import { getCurrentLocale } from '../hooks/useLocale';

export { ACCOUNT_CHANGED_EVENT, getActiveAccountId };
export type LocalAccountMeta = StoredAccountRecord;

export interface CreateLocalAccountParams {
  displayName: string;
  pin?: string;
  enableBiometrics?: boolean;
  importLegacyData?: boolean;
  legacyPin?: string;
  initialCards?: StoredCard[];
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
  initialCards,
}: CreateLocalAccountParams): Promise<LocalAccountActionResult> {
  const isEn = getCurrentLocale() === 'en';
  if (typeof window === 'undefined') {
    return {
      ok: false,
      error: isEn
        ? 'Local accounts can only be created in a browser environment.'
        : '브라우저 환경에서만 로컬 계정을 만들 수 있습니다.',
    };
  }

  const trimmedName = displayName.trim();
  if (!trimmedName) {
    return {
      ok: false,
      error: isEn ? 'Please enter an account name.' : '계정 이름(별칭)을 입력해 주세요.',
    };
  }
  if (trimmedName.length > 32) {
    return {
      ok: false,
      error: isEn
        ? 'Account name must be 32 characters or fewer.'
        : '계정 이름은 32자 이하로 입력해 주세요.',
    };
  }

  const cleanPin = (pin || '').trim();
  if (cleanPin && !/^\d{4}$/.test(cleanPin)) {
    return {
      ok: false,
      error: isEn ? 'PIN must be 4 digits.' : 'PIN 번호는 숫자 4자리로 입력해 주세요.',
    };
  }

  let legacyBundle: Awaited<ReturnType<typeof extractLegacyVaultData>> | null = null;
  if (importLegacyData && hasLegacySingleVaultData()) {
    legacyBundle = await extractLegacyVaultData(legacyPin);
    if (!legacyBundle.ok) {
      return {
        ok: false,
        error:
          legacyBundle.error ||
          (isEn ? 'Failed to import existing vault.' : '기존 보관함을 가져오지 못했습니다.'),
      };
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

  const hasMigratedMyCard = migratedCards.some((c) => c.isMyCard);
  const transferredCards: StoredCard[] = [];
  if (Array.isArray(initialCards) && initialCards.length > 0) {
    let assignedDefaultMyCard = hasMigratedMyCard;
    initialCards.forEach((rawCard, index) => {
      if (!rawCard || !rawCard.data) return;
      if (rawCard.isMyCard) {
        const shouldBeDefault =
          !hasMigratedMyCard && (Boolean(rawCard.isDefault) || !assignedDefaultMyCard);
        if (shouldBeDefault) assignedDefaultMyCard = true;
        const freshId = `my-card-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
        const freshOwnerKey = generateOwnerKey();
        transferredCards.push({
          ...rawCard,
          id: freshId,
          isMyCard: true,
          isDefault: shouldBeDefault,
          ownerKey: freshOwnerKey,
          owner_key: freshOwnerKey,
          data: { ...rawCard.data },
        });
      } else {
        const freshId = `vault-card-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
        transferredCards.push(
          sanitizeCardForVault(rawCard, {
            id: freshId,
            category: rawCard.category,
            notes: rawCard.notes,
            memo: rawCard.memo,
            metAt: rawCard.metAt,
            metLocation: rawCard.metLocation,
          })
        );
      }
    });
  }

  let finalCards = migratedCards;
  if (transferredCards.length > 0) {
    finalCards = normalizeStoredCards([...transferredCards, ...migratedCards]);
    syncCardThemeMapFromCards(finalCards, { overwriteExisting: false, accountId });
    saveUserCards(finalCards, accountId);
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
    cards: finalCards,
    biometricError,
  };
}

export async function loginLocalAccount(
  accountId: string,
  pin?: string
): Promise<LocalAccountActionResult> {
  const isEn = getCurrentLocale() === 'en';
  if (typeof window === 'undefined') {
    return {
      ok: false,
      error: isEn
        ? 'Sign-in is only supported in a browser environment.'
        : '브라우저 환경에서만 로그인할 수 있습니다.',
    };
  }

  const cleanId = sanitizeAccountId(accountId);
  if (!cleanId) {
    return {
      ok: false,
      error: isEn ? 'Invalid local account.' : '유효하지 않은 로컬 계정입니다.',
    };
  }

  const accounts = readStoredAccountsList();
  const target = accounts.find((acct) => acct.id === cleanId);
  if (!target) {
    return {
      ok: false,
      error: isEn ? 'Selected local account not found.' : '선택한 로컬 계정을 찾을 수 없습니다.',
    };
  }

  const accountHasPin = isPinSet(cleanId) || target.hasPin;
  if (accountHasPin) {
    const cleanPin = (pin || '').trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      return {
        ok: false,
        error: isEn ? 'Please enter your 4-digit PIN.' : '4자리 PIN 번호를 입력해 주세요.',
      };
    }

    const verified = await verifyPin(cleanPin, cleanId, {
      activateSession: true,
      decryptCards: false,
    });
    if (!verified) {
      return {
        ok: false,
        error: isEn
          ? 'Incorrect PIN. Please check and try again.'
          : 'PIN 번호가 일치하지 않습니다. 다시 확인해 주세요.',
      };
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
  const isEn = getCurrentLocale() === 'en';
  if (typeof window === 'undefined') {
    return {
      ok: false,
      error: isEn
        ? 'Sign-in is only supported in a browser environment.'
        : '브라우저 환경에서만 로그인할 수 있습니다.',
    };
  }

  const cleanId = sanitizeAccountId(accountId);
  if (!cleanId) {
    return {
      ok: false,
      error: isEn ? 'Invalid local account.' : '유효하지 않은 로컬 계정입니다.',
    };
  }

  const accounts = readStoredAccountsList();
  const target = accounts.find((acct) => acct.id === cleanId);
  if (!target) {
    return {
      ok: false,
      error: isEn ? 'Selected local account not found.' : '선택한 로컬 계정을 찾을 수 없습니다.',
    };
  }

  clearMemoryDecryptedCards();

  const bioResult = await verifyBiometric(cleanId, { activateSession: true });
  if (!bioResult.success) {
    return {
      ok: false,
      error: bioResult.error || (isEn ? 'Biometric verification failed.' : '생체 인증에 실패했습니다.'),
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
