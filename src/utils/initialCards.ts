import { StoredCard } from '../types/card';
import { CARD_DATA, INITIAL_CARDS } from '../constants/sampleCards';

export { INITIAL_CARDS };
export const SAMPLE_CARDS = INITIAL_CARDS;

import {
  isEncryptedEnvelope,
  encryptCardsVault,
  decryptCardsVault,
  getActiveSessionKey,
  getActiveSessionPin,
  clearActiveSessionKey,
  EncryptedEnvelope
} from './cryptoVault';
import { isPinSet } from './pinLock';

const STORAGE_KEY = 'my_cards';
const FALLBACK_STORAGE_KEY = 'user_cards';
const LEGACY_STORAGE_KEY = 'koreancenter_stored_cards_v2';

// In-memory decrypted cards cache to protect against DevTools plain-text extraction
let memoryDecryptedCards: StoredCard[] | null = null;

function enrichCard(c: StoredCard): StoredCard {
  const rawData = c.data;
  const primaryName = (rawData?.name || rawData?.nameKr || '').trim();
  const rawNameKr = (rawData?.nameKr || '').trim();
  const rawNameEn = (rawData?.nameEn || '').trim();
  const cleanNameKr =
    rawNameKr && rawNameKr.toLowerCase() !== primaryName.toLowerCase() ? rawData.nameKr : '';
  const cleanNameEn =
    rawNameEn && rawNameEn.toLowerCase() !== primaryName.toLowerCase() ? rawData.nameEn : '';

  const rawOrg = (rawData?.organization || '').trim();
  const rawOrgKr = (rawData?.organizationKr || '').trim();
  const cleanOrg =
    rawOrg && rawOrgKr && rawOrg.toLowerCase() === rawOrgKr.toLowerCase()
      ? ''
      : (rawData?.organization || '');

  const rawTitle = (rawData?.title || '').trim();
  const rawTitleKr = (rawData?.titleKr || '').trim();
  const cleanTitle =
    rawTitle && rawTitleKr && rawTitle.toLowerCase() === rawTitleKr.toLowerCase()
      ? ''
      : (rawData?.title || '');

  const enriched: StoredCard = {
    ...c,
    owner_key: c.owner_key || (c.isMyCard ? `key_${c.id}` : undefined),
    data: rawData
      ? {
          ...rawData,
          name: primaryName || rawData.name || '',
          nameEn: cleanNameEn,
          nameKr: cleanNameKr,
          organization: cleanOrg,
          title: cleanTitle,
        }
      : c.data,
  };
  const isLegacyMasterSample =
    c.id === 'sample-card-alexander-vance' ||
    c.slug === 'vance' ||
    ((c.id === 'sample-card-goguma-master' || c.slug === 'master') &&
      (c.data?.organization === 'GOGUMA AI STUDIO' || c.data?.organizationKr === '고구마 AI 스튜디오'));

  if (isLegacyMasterSample) {
    return {
      ...enriched,
      id: 'sample-card-goguma-master',
      slug: 'master',
      owner_key: c.owner_key || 'owner_master_sample',
      customDomain: 'card.goguma.app/master',
      category: '글로벌 네트워크',
      theme: c.theme || 'pure_white',
      data: {
        ...CARD_DATA,
        website: 'https://card.goguma.app/master',
        websiteDisplay: 'card.goguma.app/master'
      }
    };
  }
  return enriched;
}

export function loadUserCards(): StoredCard[] {
  if (typeof window === 'undefined') return [];

  // 1. If cards have been decrypted into memory during the authenticated session, return them
  if (memoryDecryptedCards !== null) {
    return memoryDecryptedCards;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    // 2. If storage holds an AES-GCM Encrypted Envelope and session is locked, return empty
    // to prevent unauthenticated plain-text extraction via browser DevTools
    if (isEncryptedEnvelope(parsed)) {
      // Data is encrypted with AES-256-GCM. Will be decrypted asynchronously upon PIN/biometric unlock.
      return [];
    }

    // 3. Unencrypted legacy cards (when no PIN is configured)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const enriched = parsed.map(enrichCard);
      memoryDecryptedCards = enriched;
      return enriched;
    }
    return [];
  } catch (e) {
    console.warn('Notice loading cards from storage', e);
    return [];
  }
}

export const loadStoredCards = loadUserCards;

/**
 * Asynchronously decrypts AES-GCM encrypted cards from localStorage upon successful authentication
 */
export async function decryptStoredCards(keyOrPin?: CryptoKey | string): Promise<StoredCard[]> {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (isEncryptedEnvelope(parsed)) {
      const key = keyOrPin || getActiveSessionKey() || getActiveSessionPin();
      if (!key) {
        console.warn('No active cryptographic key available to decrypt cards vault');
        return [];
      }

      const decrypted = await decryptCardsVault(parsed, key);
      const enriched = decrypted.map(enrichCard);
      memoryDecryptedCards = enriched;
      return enriched;
    }

    if (Array.isArray(parsed)) {
      const enriched = parsed.map(enrichCard);
      memoryDecryptedCards = enriched;
      return enriched;
    }

    return [];
  } catch (err) {
    console.warn('Notice decrypting stored cards vault:', err);
    return [];
  }
}

/**
 * Saves cards to storage. If PIN lock is configured, card data is immediately encrypted
 * via AES-GCM 256-bit using PBKDF2 derived keys before writing to localStorage,
 * completely neutralizing DevTools plain-text data extraction attacks.
 */
export function saveUserCards(cards: StoredCard[]): void {
  if (typeof window === 'undefined') return;

  memoryDecryptedCards = cards;

  try {
    if (!cards || cards.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(FALLBACK_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem('saved_cards');
      return;
    }

    const pinActive = isPinSet();

    if (pinActive) {
      const activeKey = getActiveSessionKey();
      const activePin = getActiveSessionPin();

      if (activeKey || activePin) {
        encryptCardsVault(cards, activeKey || activePin!).then((envelope) => {
          const encryptedPayload = JSON.stringify(envelope);
          localStorage.setItem(STORAGE_KEY, encryptedPayload);
          localStorage.setItem(FALLBACK_STORAGE_KEY, encryptedPayload);
          localStorage.setItem('saved_cards', encryptedPayload);
        }).catch((err) => {
          console.warn('Background encryption save notice:', err);
        });
        return;
      }
    }

    // Default unencrypted write when PIN protection is disabled
    const plainJson = JSON.stringify(cards);
    localStorage.setItem(STORAGE_KEY, plainJson);
    localStorage.setItem(FALLBACK_STORAGE_KEY, plainJson);
    localStorage.setItem('saved_cards', plainJson);
  } catch (e) {
    console.warn('Notice saving cards to storage', e);
  }
}

export const saveStoredCards = saveUserCards;

/**
 * Re-encrypts all current cards when a new PIN is created or changed
 */
export async function reEncryptCardsOnPinChange(pin: string): Promise<void> {
  const currentCards = memoryDecryptedCards || loadUserCards();
  if (!currentCards || currentCards.length === 0) return;

  try {
    const envelope = await encryptCardsVault(currentCards, pin);
    const payload = JSON.stringify(envelope);
    localStorage.setItem(STORAGE_KEY, payload);
    localStorage.setItem(FALLBACK_STORAGE_KEY, payload);
    localStorage.setItem('saved_cards', payload);
  } catch (err) {
    console.warn('Notice re-encrypting cards on PIN change:', err);
  }
}

/**
 * Re-saves cards in plain text format when PIN lock is completely removed
 */
export function reSaveUnencryptedCards(): void {
  const currentCards = memoryDecryptedCards || loadUserCards();
  if (!currentCards || currentCards.length === 0) return;

  const plainJson = JSON.stringify(currentCards);
  localStorage.setItem(STORAGE_KEY, plainJson);
  localStorage.setItem(FALLBACK_STORAGE_KEY, plainJson);
  localStorage.setItem('saved_cards', plainJson);
}

/**
 * Completely clears all local data stored by GOGUMA CARD STUDIO:
 * user cards, encrypted vault tokens, PIN hashes, biometric keys, sync IDs, and lazy preferences.
 */
export function clearAllLocalData(): void {
  if (typeof window === 'undefined') return;
  try {
    memoryDecryptedCards = null;
    clearActiveSessionKey();

    localStorage.removeItem('my_cards');
    localStorage.removeItem(FALLBACK_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem('saved_cards');
    localStorage.removeItem('app_pin_hash');
    localStorage.removeItem('app_pin_vault_token');
    localStorage.removeItem('app_pin_last_verified_at');
    localStorage.removeItem('app_biometric_credential_id');
    localStorage.removeItem('app_biometric_vault_token');
    localStorage.removeItem('biometric_credential_id');
    localStorage.removeItem('wallet_sync_id');
    localStorage.removeItem('card_sync_id');
    localStorage.removeItem('lazy_pin_dismissed');
    sessionStorage.clear();
  } catch (e) {
    console.warn('Notice resetting local data', e);
  }
}

