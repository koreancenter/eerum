import type { StoredCard } from '../types/card';
import { LEGACY_MIGRATED_FLAG_KEY } from './accountStorage';
import { LEGACY_CARDS_STORAGE_KEYS, normalizeStoredCards } from './initialCards';
import { isEncryptedEnvelope, decryptCardsVault, verifyPinWithToken } from './cryptoVault';
import { hashPin } from './pinLock';

export interface LegacyVaultExtractionResult {
  ok: boolean;
  cards: StoredCard[];
  categories: string[] | null;
  themeMapRaw: string | null;
  lastThemeRaw: string | null;
  error?: string;
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

export function cleanupLegacySingleVaultStorage(): void {
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

export async function extractLegacyVaultData(
  legacyPin?: string
): Promise<LegacyVaultExtractionResult> {
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
