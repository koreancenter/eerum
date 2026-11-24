export const LOCAL_ACCOUNTS_KEY = 'eerum_local_accounts_v1';
export const ACTIVE_ACCOUNT_SESSION_KEY = 'eerum_active_account_session';
export const LEGACY_MIGRATED_FLAG_KEY = 'eerum_legacy_migrated_v1';
export const ACCOUNT_CHANGED_EVENT = 'eerum:local-account-changed';

export interface StoredAccountRecord {
  id: string;
  displayName: string;
  createdAt: string;
  lastLoginAt: string;
  hasPin: boolean;
  biometricsEnabled: boolean;
}

export function sanitizeAccountId(accountId?: string | null): string | null {
  if (typeof accountId !== 'string') return null;
  const trimmed = accountId.trim();
  if (!trimmed || !/^[a-zA-Z0-9_-]{3,64}$/.test(trimmed)) return null;
  return trimmed;
}

export function readStoredAccountsList(): StoredAccountRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is StoredAccountRecord => {
        if (!item || typeof item !== 'object') return false;
        const obj = item as Record<string, unknown>;
        return (
          typeof obj.id === 'string' &&
          sanitizeAccountId(obj.id) !== null &&
          typeof obj.displayName === 'string' &&
          obj.displayName.trim().length > 0
        );
      })
      .map((item) => ({
        id: item.id.trim(),
        displayName: item.displayName.trim(),
        createdAt: typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : new Date().toISOString(),
        lastLoginAt: typeof item.lastLoginAt === 'string' && item.lastLoginAt ? item.lastLoginAt : new Date().toISOString(),
        hasPin: Boolean(item.hasPin),
        biometricsEnabled: Boolean(item.biometricsEnabled),
      }));
  } catch {
    return [];
  }
}

export function writeStoredAccountsList(accounts: StoredAccountRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (accounts.length === 0) {
      localStorage.removeItem(LOCAL_ACCOUNTS_KEY);
    } else {
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
    }
  } catch (err) {
    console.warn('Notice persisting local accounts metadata:', err);
  }
}

export function getActiveAccountId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const sessionId = sanitizeAccountId(sessionStorage.getItem(ACTIVE_ACCOUNT_SESSION_KEY));
    if (!sessionId) return null;
    const accounts = readStoredAccountsList();
    if (!accounts.some((a) => a.id === sessionId)) {
      sessionStorage.removeItem(ACTIVE_ACCOUNT_SESSION_KEY);
      return null;
    }
    return sessionId;
  } catch {
    return null;
  }
}

export function setActiveAccountSessionId(accountId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanId = sanitizeAccountId(accountId);
    if (cleanId) {
      sessionStorage.setItem(ACTIVE_ACCOUNT_SESSION_KEY, cleanId);
    } else {
      sessionStorage.removeItem(ACTIVE_ACCOUNT_SESSION_KEY);
    }
    window.dispatchEvent(new CustomEvent(ACCOUNT_CHANGED_EVENT, { detail: { accountId: cleanId } }));
  } catch {
    // Ignore sessionStorage errors
  }
}

export function resolveAccountId(explicitAccountId?: string | null): string | null {
  if (explicitAccountId !== undefined) {
    return sanitizeAccountId(explicitAccountId);
  }
  return getActiveAccountId();
}

export function getAccountScopedKey(prefix: string, accountId?: string | null): string | null {
  const id = resolveAccountId(accountId);
  if (!id) return null;
  return `${prefix}_${id}`;
}

export function getAccountCardsKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_cards', accountId);
}

export function getAccountCategoriesKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_categories', accountId);
}

export function getAccountCardThemeMapKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_card_theme_map_v1', accountId);
}

export function getAccountLastCardThemeKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_last_used_card_theme_v1', accountId);
}

export function getAccountPinHashKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_pin_hash', accountId);
}

export function getAccountPinTokenKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_pin_vault_token', accountId);
}

export function getAccountPinLastVerifiedKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_pin_last_verified_at', accountId);
}

export function getAccountSessionLockKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_session_locked', accountId);
}

export function getAccountLazyPinDismissedKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_lazy_pin_dismissed', accountId);
}

export function getAccountBioCredKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_bio_credential_id', accountId);
}

export function getAccountBioModeKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_bio_mode', accountId);
}

export function getAccountBioVaultKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_bio_vault_token', accountId);
}

export function getAccountLastBackupKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_last_backup_at', accountId);
}

export function getAccountBackupNudgeDismissedKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_backup_nudge_dismissed_at', accountId);
}

export function getAccountLocalSnapshotsKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_local_snapshots_v1', accountId);
}

export function getAccountLastFolderBackupKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_last_folder_backup_at', accountId);
}

export function getAccountFolderHandleId(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_backup_dir_handle', accountId);
}

export function getAccountSyncIdKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_card_sync_id', accountId);
}

export function getAccountVaultSortKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_vault_sort_by', accountId);
}

export function getAccountOnboardingImportPromptDoneKey(accountId?: string | null): string | null {
  return getAccountScopedKey('eerum_onboarding_import_prompt_done', accountId);
}

export function clearAllAccountScopedStorage(accountId: string): void {
  if (typeof window === 'undefined') return;
  const cleanId = sanitizeAccountId(accountId);
  if (!cleanId) return;

  const localKeys = [
    getAccountCardsKey(cleanId),
    getAccountCategoriesKey(cleanId),
    getAccountCardThemeMapKey(cleanId),
    getAccountLastCardThemeKey(cleanId),
    getAccountPinHashKey(cleanId),
    getAccountPinTokenKey(cleanId),
    getAccountPinLastVerifiedKey(cleanId),
    getAccountLazyPinDismissedKey(cleanId),
    getAccountBioCredKey(cleanId),
    getAccountBioModeKey(cleanId),
    getAccountBioVaultKey(cleanId),
    getAccountLastBackupKey(cleanId),
    getAccountBackupNudgeDismissedKey(cleanId),
    getAccountLocalSnapshotsKey(cleanId),
    getAccountLastFolderBackupKey(cleanId),
    getAccountSyncIdKey(cleanId),
    getAccountVaultSortKey(cleanId),
    getAccountOnboardingImportPromptDoneKey(cleanId),
  ];

  for (const key of localKeys) {
    if (key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }
  }

  const sessionLockKey = getAccountSessionLockKey(cleanId);
  if (sessionLockKey) {
    try {
      sessionStorage.removeItem(sessionLockKey);
    } catch {
      // Ignore
    }
  }
}
