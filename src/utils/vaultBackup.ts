import { StoredCard } from '../types/card';
import {
  type EncryptedEnvelope,
  isEncryptedEnvelope,
  encryptTextWithPin,
  decryptTextWithPin,
} from './cryptoVault';
import { normalizeStoredCards } from './initialCards';
import { loadVaultCategories, saveVaultCategories } from './categories';

export const LAST_BACKUP_AT_KEY = 'eerum_last_backup_at';
export const BACKUP_NUDGE_DISMISSED_AT_KEY = 'eerum_backup_nudge_dismissed_at';
export const BACKUP_UPDATED_EVENT = 'eerum-backup-updated';
export const BACKUP_REMINDER_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const BACKUP_NUDGE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days after manual dismiss

export interface VaultBackupPayloadV1 {
  version: 1;
  exportedAt: string;
  cards: StoredCard[];
  categories: string[];
  metadata?: {
    app: 'eerum_card_studio';
    myCardCount: number;
    vaultCardCount: number;
    totalCount: number;
    encryptedWithPin: boolean;
  };
}

export interface EncryptedVaultBackupFile extends EncryptedEnvelope {
  format: 'eerum_vault_backup_v1';
  exportedAt: string;
  cardCount?: number;
}

export type ParsedBackupFile =
  | {
      kind: 'encrypted';
      envelope: EncryptedEnvelope;
      exportedAt?: string;
      cardCount?: number;
    }
  | {
      kind: 'plain';
      payload: VaultBackupPayloadV1;
    };

export interface BackupRestorePreview {
  exportedAt: string;
  totalIncoming: number;
  incomingMyCards: number;
  incomingVaultCards: number;
  duplicateCount: number;
  newCardsCount: number;
  newMyCardsCount: number;
  newVaultCardsCount: number;
  newCategoriesCount: number;
}

export type BackupRestoreMode = 'merge' | 'replace';

export function getLastBackupAt(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_BACKUP_AT_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function recordBackupCompleted(timestampMs = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_BACKUP_AT_KEY, String(timestampMs));
    localStorage.removeItem(BACKUP_NUDGE_DISMISSED_AT_KEY);
    window.dispatchEvent(new CustomEvent(BACKUP_UPDATED_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function getBackupNudgeDismissedAt(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BACKUP_NUDGE_DISMISSED_AT_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function dismissBackupNudge(timestampMs = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BACKUP_NUDGE_DISMISSED_AT_KEY, String(timestampMs));
    window.dispatchEvent(new CustomEvent(BACKUP_UPDATED_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function shouldShowBackupNudge(totalCardsCount: number, nowMs = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  if (totalCardsCount < 3) return false;

  const dismissedAt = getBackupNudgeDismissedAt();
  if (dismissedAt && nowMs - dismissedAt < BACKUP_NUDGE_SNOOZE_MS) {
    return false;
  }

  const lastBackupAt = getLastBackupAt();
  if (!lastBackupAt) return true;
  return nowMs - lastBackupAt >= BACKUP_REMINDER_INTERVAL_MS;
}

export function buildVaultBackupPayload(
  cards: StoredCard[],
  categories: string[],
  encryptedWithPin: boolean
): VaultBackupPayloadV1 {
  const safeCards = Array.isArray(cards) ? cards : [];
  const resolvedCategories =
    Array.isArray(categories) && categories.length > 0
      ? categories
      : loadVaultCategories(safeCards);
  const myCardCount = safeCards.filter((c) => Boolean(c.isMyCard)).length;
  const vaultCardCount = safeCards.length - myCardCount;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: safeCards,
    categories: resolvedCategories,
    metadata: {
      app: 'eerum_card_studio',
      myCardCount,
      vaultCardCount,
      totalCount: safeCards.length,
      encryptedWithPin,
    },
  };
}

export async function createEncryptedBackupContent(
  cards: StoredCard[],
  categories: string[],
  secret: string,
  encryptedWithPin: boolean
): Promise<string> {
  if (!secret || secret.trim().length < 4) {
    throw new Error('백업 암호화는 최소 4자 이상의 PIN 또는 암호가 필요합니다.');
  }

  const payload = buildVaultBackupPayload(cards, categories, encryptedWithPin);
  const envelope = await encryptTextWithPin(JSON.stringify(payload), secret);

  const backupFile: EncryptedVaultBackupFile = {
    ...envelope,
    format: 'eerum_vault_backup_v1',
    exportedAt: payload.exportedAt,
    cardCount: payload.cards.length,
  };

  return JSON.stringify(backupFile, null, 2);
}

export function downloadVaultBackupFile(
  content: string,
  extension: 'eerum' | 'json' = 'eerum'
): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `eerum-vault-backup-${dateStr}.${extension}`;
  const mimeType = extension === 'json' ? 'application/json;charset=utf-8' : 'application/octet-stream';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);

  return filename;
}

function isValidStoredCardCandidate(raw: unknown): raw is StoredCard {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string' || !obj.id.trim()) return false;
  if (!obj.data || typeof obj.data !== 'object') return false;
  return true;
}

export function validateBackupPayload(raw: unknown): VaultBackupPayloadV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('올바른 백업 데이터 형식이 아닙니다.');
  }

  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error('지원하지 않는 백업 파일 버전입니다.');
  }

  if (!Array.isArray(obj.cards)) {
    throw new Error('백업 파일에 유효한 명함 목록(cards)이 포함되어 있지 않습니다.');
  }

  const validCards: StoredCard[] = [];
  for (const entry of obj.cards) {
    if (!isValidStoredCardCandidate(entry)) {
      throw new Error('백업 파일 내 명함 데이터 구조가 손상되었거나 올바르지 않습니다.');
    }
    validCards.push({
      ...entry,
      isMyCard: Boolean(entry.isMyCard),
      category: typeof entry.category === 'string' && entry.category.trim() ? entry.category.trim() : '기타',
      theme: typeof entry.theme === 'string' && entry.theme ? entry.theme : 'pure_white',
      createdAt:
        typeof entry.createdAt === 'string' && entry.createdAt
          ? entry.createdAt
          : new Date().toISOString().split('T')[0],
    });
  }

  const validCategories = Array.isArray(obj.categories)
    ? obj.categories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : [];

  const exportedAt =
    typeof obj.exportedAt === 'string' && obj.exportedAt
      ? obj.exportedAt
      : new Date().toISOString();

  return {
    version: 1,
    exportedAt,
    cards: validCards,
    categories: validCategories,
    metadata:
      obj.metadata && typeof obj.metadata === 'object'
        ? (obj.metadata as VaultBackupPayloadV1['metadata'])
        : undefined,
  };
}

export function parseBackupFileText(rawText: string): ParsedBackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('백업 파일을 읽을 수 없습니다. 올바른 .eerum 또는 .json 파일인지 확인해 주세요.');
  }

  if (isEncryptedEnvelope(parsed)) {
    const meta = parsed as unknown as Record<string, unknown>;
    return {
      kind: 'encrypted',
      envelope: parsed,
      exportedAt: typeof meta.exportedAt === 'string' ? meta.exportedAt : undefined,
      cardCount: typeof meta.cardCount === 'number' ? meta.cardCount : undefined,
    };
  }

  const payload = validateBackupPayload(parsed);
  return {
    kind: 'plain',
    payload,
  };
}

export async function decryptBackupEnvelope(
  envelope: EncryptedEnvelope,
  secret: string
): Promise<VaultBackupPayloadV1> {
  if (!secret || !secret.trim()) {
    throw new Error('복호화할 PIN 또는 백업 암호를 입력해 주세요.');
  }

  let decryptedJson: string;
  try {
    decryptedJson = await decryptTextWithPin(envelope, secret);
  } catch {
    throw new Error('PIN 또는 백업 암호가 일치하지 않아 복호화할 수 없습니다.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decryptedJson);
  } catch {
    throw new Error('복호화된 백업 데이터가 손상되었습니다.');
  }

  return validateBackupPayload(parsed);
}

function getSlugKey(slug?: string): string | null {
  const trimmed = (slug || '').trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export function computeBackupRestorePreview(
  incoming: VaultBackupPayloadV1,
  existingCards: StoredCard[],
  existingCategories: string[]
): BackupRestorePreview {
  const existingIds = new Set(existingCards.map((c) => c.id));
  const existingSlugs = new Set(
    existingCards.map((c) => getSlugKey(c.slug)).filter((s): s is string => Boolean(s))
  );

  let duplicateCount = 0;
  let newMyCardsCount = 0;
  let newVaultCardsCount = 0;

  for (const card of incoming.cards) {
    const slugKey = getSlugKey(card.slug);
    const isDuplicate = existingIds.has(card.id) || (slugKey !== null && existingSlugs.has(slugKey));
    if (isDuplicate) {
      duplicateCount += 1;
    } else if (card.isMyCard) {
      newMyCardsCount += 1;
    } else {
      newVaultCardsCount += 1;
    }
  }

  const existingCategoryLower = new Set(existingCategories.map((c) => c.trim().toLowerCase()));
  const newCategoriesCount = incoming.categories.filter(
    (c) => c.trim() && c.trim() !== '전체' && !existingCategoryLower.has(c.trim().toLowerCase())
  ).length;

  const incomingMyCards = incoming.cards.filter((c) => Boolean(c.isMyCard)).length;
  const incomingVaultCards = incoming.cards.length - incomingMyCards;

  return {
    exportedAt: incoming.exportedAt,
    totalIncoming: incoming.cards.length,
    incomingMyCards,
    incomingVaultCards,
    duplicateCount,
    newCardsCount: newMyCardsCount + newVaultCardsCount,
    newMyCardsCount,
    newVaultCardsCount,
    newCategoriesCount,
  };
}

export function applyBackupRestore(
  incoming: VaultBackupPayloadV1,
  existingCards: StoredCard[],
  existingCategories: string[],
  mode: BackupRestoreMode
): {
  cards: StoredCard[];
  categories: string[];
  addedCount: number;
  skippedCount: number;
} {
  if (mode === 'replace') {
    const restoredCards = normalizeStoredCards(
      incoming.cards.map((c) => ({
        ...c,
        isMyCard: Boolean(c.isMyCard),
      }))
    );

    const categorySeed =
      incoming.categories.length > 0
        ? incoming.categories
        : restoredCards.map((c) => c.category).filter(Boolean);
    const restoredCategories = saveVaultCategories(categorySeed);

    return {
      cards: restoredCards,
      categories: restoredCategories,
      addedCount: restoredCards.length,
      skippedCount: 0,
    };
  }

  // Merge mode: skip duplicates by card ID or slug while strictly preserving isMyCard flags
  const existingIds = new Set(existingCards.map((c) => c.id));
  const existingSlugs = new Set(
    existingCards.map((c) => getSlugKey(c.slug)).filter((s): s is string => Boolean(s))
  );
  const alreadyHasDefaultMyCard = existingCards.some((c) => c.isMyCard && c.isDefault);

  const nonDuplicates: StoredCard[] = [];
  let skippedCount = 0;

  for (const card of incoming.cards) {
    const slugKey = getSlugKey(card.slug);
    const isDuplicate = existingIds.has(card.id) || (slugKey !== null && existingSlugs.has(slugKey));
    if (isDuplicate) {
      skippedCount += 1;
      continue;
    }

    existingIds.add(card.id);
    if (slugKey) {
      existingSlugs.add(slugKey);
    }

    nonDuplicates.push({
      ...card,
      isMyCard: Boolean(card.isMyCard),
      isDefault: card.isMyCard ? (alreadyHasDefaultMyCard ? false : Boolean(card.isDefault)) : false,
    });
  }

  const mergedCards = normalizeStoredCards([...existingCards, ...nonDuplicates]);
  const mergedCategories = saveVaultCategories([
    ...existingCategories,
    ...incoming.categories,
    ...nonDuplicates.map((c) => c.category).filter(Boolean),
  ]);

  return {
    cards: mergedCards,
    categories: mergedCategories,
    addedCount: nonDuplicates.length,
    skippedCount,
  };
}
