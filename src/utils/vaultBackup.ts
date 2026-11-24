import { StoredCard } from '../types/card';
import {
  type EncryptedEnvelope,
  isEncryptedEnvelope,
  encryptTextWithPin,
  encryptTextWithKey,
  decryptTextWithPin,
} from './cryptoVault';
import { normalizeStoredCards } from './initialCards';
import { loadVaultCategories, saveVaultCategories } from './categories';
import { type CardThemeMap, loadCardThemeMap } from './cardThemeStorage';
import {
  getAccountLastBackupKey,
  getAccountBackupNudgeDismissedKey,
  getAccountLocalSnapshotsKey,
  resolveAccountId,
} from './accountStorage';

export const BACKUP_UPDATED_EVENT = 'eerum-backup-updated';
export const BACKUP_REMINDER_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const BACKUP_NUDGE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days after manual dismiss
const MAX_LOCAL_SNAPSHOTS = 5;

export type BackupIntegrityStatus = 'verified' | 'mismatch' | 'legacy';

export interface VaultBackupPayloadV1 {
  version: 1;
  exportedAt: string;
  cards: StoredCard[];
  categories: string[];
  cardThemeMap?: CardThemeMap;
  appTheme?: 'light' | 'dark';
  integrityHash?: string;
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
  newerDuplicatesCount: number;
  newCardsCount: number;
  newMyCardsCount: number;
  newVaultCardsCount: number;
  newCategoriesCount: number;
  hasThemePreferences: boolean;
  integrityStatus: BackupIntegrityStatus;
}

export type BackupRestoreMode = 'merge' | 'replace';

export interface BackupMergeOptions {
  updateNewerDuplicates?: boolean;
}

export type LocalSnapshotReason = 'manual' | 'pre_restore';

export interface LocalRecoverySnapshot {
  id: string;
  createdAt: string;
  reason: LocalSnapshotReason;
  label: string;
  cardCount: number;
  myCardCount: number;
  vaultCardCount: number;
  encrypted: boolean;
  content: string;
}

export function getLastBackupAt(accountId?: string | null): number | null {
  if (typeof window === 'undefined') return null;
  const key = getAccountLastBackupKey(accountId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function recordBackupCompleted(timestampMs = Date.now(), accountId?: string | null): void {
  if (typeof window === 'undefined') return;
  const lastKey = getAccountLastBackupKey(accountId);
  const nudgeKey = getAccountBackupNudgeDismissedKey(accountId);
  if (!lastKey) return;
  try {
    localStorage.setItem(lastKey, String(timestampMs));
    if (nudgeKey) {
      localStorage.removeItem(nudgeKey);
    }
    window.dispatchEvent(new CustomEvent(BACKUP_UPDATED_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function getBackupNudgeDismissedAt(accountId?: string | null): number | null {
  if (typeof window === 'undefined') return null;
  const key = getAccountBackupNudgeDismissedKey(accountId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function dismissBackupNudge(timestampMs = Date.now(), accountId?: string | null): void {
  if (typeof window === 'undefined') return;
  const key = getAccountBackupNudgeDismissedKey(accountId);
  if (!key) return;
  try {
    localStorage.setItem(key, String(timestampMs));
    window.dispatchEvent(new CustomEvent(BACKUP_UPDATED_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function shouldShowBackupNudge(
  totalCardsCount: number,
  nowMs = Date.now(),
  accountId?: string | null
): boolean {
  if (typeof window === 'undefined') return false;
  if (!resolveAccountId(accountId)) return false;
  if (totalCardsCount < 3) return false;

  const dismissedAt = getBackupNudgeDismissedAt(accountId);
  if (dismissedAt && nowMs - dismissedAt < BACKUP_NUDGE_SNOOZE_MS) {
    return false;
  }

  const lastBackupAt = getLastBackupAt(accountId);
  if (!lastBackupAt) return true;
  return nowMs - lastBackupAt >= BACKUP_REMINDER_INTERVAL_MS;
}

function getCurrentAppThemePreference(): 'light' | 'dark' | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const saved = localStorage.getItem('eerum_app_theme');
    return saved === 'light' || saved === 'dark' ? saved : undefined;
  } catch {
    return undefined;
  }
}

function buildIntegrityCanonicalString(payload: VaultBackupPayloadV1): string {
  return JSON.stringify({
    version: payload.version,
    exportedAt: payload.exportedAt,
    cards: payload.cards,
    categories: payload.categories,
    cardThemeMap: payload.cardThemeMap ?? null,
    appTheme: payload.appTheme ?? null,
  });
}

export async function computePayloadIntegrityHash(
  payload: VaultBackupPayloadV1
): Promise<string | undefined> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return undefined;
  try {
    const canonical = buildIntegrityCanonicalString(payload);
    const bytes = new TextEncoder().encode(canonical);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return undefined;
  }
}

export async function verifyBackupPayloadIntegrity(
  payload: VaultBackupPayloadV1
): Promise<BackupIntegrityStatus> {
  if (!payload.integrityHash) return 'legacy';
  const expected = await computePayloadIntegrityHash(payload);
  if (!expected) return 'legacy';
  return expected === payload.integrityHash ? 'verified' : 'mismatch';
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
  const cardThemeMap = loadCardThemeMap();
  const appTheme = getCurrentAppThemePreference();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: safeCards,
    categories: resolvedCategories,
    ...(Object.keys(cardThemeMap).length > 0 ? { cardThemeMap } : {}),
    ...(appTheme ? { appTheme } : {}),
    metadata: {
      app: 'eerum_card_studio',
      myCardCount,
      vaultCardCount,
      totalCount: safeCards.length,
      encryptedWithPin,
    },
  };
}

export async function buildSignedVaultBackupPayload(
  cards: StoredCard[],
  categories: string[],
  encryptedWithPin: boolean
): Promise<VaultBackupPayloadV1> {
  const payload = buildVaultBackupPayload(cards, categories, encryptedWithPin);
  const integrityHash = await computePayloadIntegrityHash(payload);
  return integrityHash ? { ...payload, integrityHash } : payload;
}

export const createBackupPayload = buildSignedVaultBackupPayload;

export async function createEncryptedBackupContent(
  cards: StoredCard[],
  categories: string[],
  secret: string,
  encryptedWithPin: boolean
): Promise<string> {
  if (!secret || secret.trim().length < 4) {
    throw new Error('백업 암호화는 최소 4자 이상의 PIN 또는 암호가 필요합니다.');
  }

  const payload = await buildSignedVaultBackupPayload(cards, categories, encryptedWithPin);
  const envelope = await encryptTextWithPin(JSON.stringify(payload), secret);

  const backupFile: EncryptedVaultBackupFile = {
    ...envelope,
    format: 'eerum_vault_backup_v1',
    exportedAt: payload.exportedAt,
    cardCount: payload.cards.length,
  };

  return JSON.stringify(backupFile, null, 2);
}

export async function createEncryptedBackupContentWithKey(
  cards: StoredCard[],
  categories: string[],
  key: CryptoKey,
  salt: Uint8Array,
  encryptedWithPin = true
): Promise<string> {
  const payload = await buildSignedVaultBackupPayload(cards, categories, encryptedWithPin);
  const envelope = await encryptTextWithKey(JSON.stringify(payload), key, salt);

  const backupFile: EncryptedVaultBackupFile = {
    ...envelope,
    format: 'eerum_vault_backup_v1',
    exportedAt: payload.exportedAt,
    cardCount: payload.cards.length,
  };

  return JSON.stringify(backupFile, null, 2);
}

export async function createPlainBackupContent(
  cards: StoredCard[],
  categories: string[]
): Promise<string> {
  const payload = await buildSignedVaultBackupPayload(cards, categories, false);
  return JSON.stringify(payload, null, 2);
}

export function estimateBackupSizeBytes(cards: StoredCard[], categories: string[]): number {
  const payload = buildVaultBackupPayload(cards, categories, false);
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

export function formatBytesReadable(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function buildVaultBackupFilename(extension: 'eerum' | 'json' = 'eerum'): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `eerum-vault-backup-${dateStr}.${extension}`;
}

export function createVaultBackupFile(
  content: string,
  extension: 'eerum' | 'json' = 'eerum'
): File {
  const filename = buildVaultBackupFilename(extension);
  const mimeType = extension === 'json' ? 'application/json' : 'application/octet-stream';
  return new File([content], filename, { type: mimeType });
}

export function canShareVaultBackupFile(extension: 'eerum' | 'json' = 'eerum'): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    const probeFile = createVaultBackupFile('{}', extension);
    return navigator.canShare({ files: [probeFile] });
  } catch {
    return false;
  }
}

export async function shareVaultBackupFile(
  content: string,
  extension: 'eerum' | 'json' = 'eerum'
): Promise<{ outcome: 'shared' | 'aborted' | 'unsupported'; filename: string }> {
  const backupFile = createVaultBackupFile(content, extension);

  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return { outcome: 'unsupported', filename: backupFile.name };
  }

  let canShareFiles = false;
  try {
    canShareFiles = navigator.canShare({ files: [backupFile] });
  } catch {
    canShareFiles = false;
  }

  if (!canShareFiles) {
    return { outcome: 'unsupported', filename: backupFile.name };
  }

  try {
    await navigator.share({
      files: [backupFile],
      title: extension === 'eerum' ? 'eerum 암호화 백업' : 'eerum JSON 백업',
    });
    return { outcome: 'shared', filename: backupFile.name };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return { outcome: 'aborted', filename: backupFile.name };
    }
    throw err;
  }
}

export function downloadVaultBackupFile(
  content: string,
  extension: 'eerum' | 'json' = 'eerum'
): string {
  const filename = buildVaultBackupFilename(extension);
  const mimeType =
    extension === 'json' ? 'application/json;charset=utf-8' : 'application/octet-stream';
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
      category:
        typeof entry.category === 'string' && entry.category.trim() ? entry.category.trim() : '기타',
      theme: typeof entry.theme === 'string' && entry.theme ? entry.theme : 'pure_white',
      interactionCount:
        typeof entry.interactionCount === 'number' &&
        Number.isFinite(entry.interactionCount) &&
        entry.interactionCount > 0
          ? Math.floor(entry.interactionCount)
          : undefined,
      lastInteractedAt:
        typeof entry.lastInteractedAt === 'string' && entry.lastInteractedAt.trim()
          ? entry.lastInteractedAt.trim()
          : undefined,
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

  const validCardThemeMap =
    obj.cardThemeMap && typeof obj.cardThemeMap === 'object' && !Array.isArray(obj.cardThemeMap)
      ? (obj.cardThemeMap as CardThemeMap)
      : undefined;

  const validAppTheme =
    obj.appTheme === 'light' || obj.appTheme === 'dark' ? obj.appTheme : undefined;

  const validIntegrityHash =
    typeof obj.integrityHash === 'string' && /^[a-f0-9]{64}$/i.test(obj.integrityHash)
      ? obj.integrityHash.toLowerCase()
      : undefined;

  return {
    version: 1,
    exportedAt,
    cards: validCards,
    categories: validCategories,
    ...(validCardThemeMap ? { cardThemeMap: validCardThemeMap } : {}),
    ...(validAppTheme ? { appTheme: validAppTheme } : {}),
    ...(validIntegrityHash ? { integrityHash: validIntegrityHash } : {}),
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

function parseTimestampMs(iso?: string): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function getCardUpdatedTimestamp(card: StoredCard): number {
  return Math.max(
    parseTimestampMs(card.updatedAt),
    parseTimestampMs(card.lastInteractedAt),
    parseTimestampMs(card.createdAt)
  );
}

export function computeBackupRestorePreview(
  incoming: VaultBackupPayloadV1,
  existingCards: StoredCard[],
  existingCategories: string[],
  integrityStatus: BackupIntegrityStatus = 'legacy'
): BackupRestorePreview {
  const existingById = new Map(existingCards.map((c) => [c.id, c]));
  const existingBySlug = new Map<string, StoredCard>();
  for (const card of existingCards) {
    const slugKey = getSlugKey(card.slug);
    if (slugKey) {
      existingBySlug.set(slugKey, card);
    }
  }

  let duplicateCount = 0;
  let newerDuplicatesCount = 0;
  let newMyCardsCount = 0;
  let newVaultCardsCount = 0;

  for (const card of incoming.cards) {
    const slugKey = getSlugKey(card.slug);
    const matched =
      existingById.get(card.id) || (slugKey !== null ? existingBySlug.get(slugKey) : undefined);

    if (matched) {
      duplicateCount += 1;
      if (getCardUpdatedTimestamp(card) > getCardUpdatedTimestamp(matched)) {
        newerDuplicatesCount += 1;
      }
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
    newerDuplicatesCount,
    newCardsCount: newMyCardsCount + newVaultCardsCount,
    newMyCardsCount,
    newVaultCardsCount,
    newCategoriesCount,
    hasThemePreferences: Boolean(
      (incoming.cardThemeMap && Object.keys(incoming.cardThemeMap).length > 0) ||
        incoming.appTheme
    ),
    integrityStatus,
  };
}

export function applyBackupRestore(
  incoming: VaultBackupPayloadV1,
  existingCards: StoredCard[],
  existingCategories: string[],
  mode: BackupRestoreMode,
  mergeOptions?: BackupMergeOptions
): {
  cards: StoredCard[];
  categories: string[];
  addedCount: number;
  updatedCount: number;
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
      updatedCount: 0,
      skippedCount: 0,
    };
  }

  // Merge mode: add non-duplicates and optionally update existing cards when backup is newer
  const updateNewerDuplicates = Boolean(mergeOptions?.updateNewerDuplicates);
  const existingIds = new Set(existingCards.map((c) => c.id));
  const existingSlugs = new Set(
    existingCards.map((c) => getSlugKey(c.slug)).filter((s): s is string => Boolean(s))
  );
  const alreadyHasDefaultMyCard = existingCards.some((c) => c.isMyCard && c.isDefault);

  const nextExistingCards = [...existingCards];
  const nonDuplicates: StoredCard[] = [];
  let updatedCount = 0;
  let skippedCount = 0;

  for (const card of incoming.cards) {
    const slugKey = getSlugKey(card.slug);
    const matchedIndex = nextExistingCards.findIndex(
      (existing) =>
        existing.id === card.id || (slugKey !== null && getSlugKey(existing.slug) === slugKey)
    );

    if (matchedIndex !== -1) {
      const existing = nextExistingCards[matchedIndex];
      const shouldUpdate =
        updateNewerDuplicates &&
        Boolean(existing.isMyCard) === Boolean(card.isMyCard) &&
        getCardUpdatedTimestamp(card) > getCardUpdatedTimestamp(existing);

      if (shouldUpdate) {
        const mergedMemo = (card.memo ?? card.notes ?? existing.memo ?? existing.notes ?? '').trim();
        nextExistingCards[matchedIndex] = {
          ...card,
          id: existing.id,
          isMyCard: existing.isMyCard,
          isDefault: existing.isDefault,
          ownerKey: existing.ownerKey || existing.owner_key || card.ownerKey || card.owner_key,
          owner_key: existing.owner_key || existing.ownerKey || card.owner_key || card.ownerKey,
          memo: mergedMemo || undefined,
          notes: mergedMemo || undefined,
          metAt: card.metAt || existing.metAt,
          metLocation: card.metLocation || existing.metLocation,
          interactionCount: Math.max(
            existing.interactionCount ?? 0,
            card.interactionCount ?? 0
          ) || undefined,
          lastInteractedAt:
            parseTimestampMs(card.lastInteractedAt) >= parseTimestampMs(existing.lastInteractedAt)
              ? card.lastInteractedAt || existing.lastInteractedAt
              : existing.lastInteractedAt,
        };
        updatedCount += 1;
      } else {
        skippedCount += 1;
      }
      continue;
    }

    if (existingIds.has(card.id) || (slugKey !== null && existingSlugs.has(slugKey))) {
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

  const mergedCards = normalizeStoredCards([...nextExistingCards, ...nonDuplicates]);
  const mergedCategories = saveVaultCategories([
    ...existingCategories,
    ...incoming.categories,
    ...nonDuplicates.map((c) => c.category).filter(Boolean),
  ]);

  return {
    cards: mergedCards,
    categories: mergedCategories,
    addedCount: nonDuplicates.length,
    updatedCount,
    skippedCount,
  };
}

// =========================================================================
// Local Browser Recovery Snapshots (Zero-Server Safety Checkpoints)
// =========================================================================

function writeSnapshotsSafe(
  snapshots: LocalRecoverySnapshot[],
  accountId?: string | null
): boolean {
  if (typeof window === 'undefined') return false;
  const key = getAccountLocalSnapshotsKey(accountId);
  if (!key) return false;
  let candidate = snapshots.slice(0, MAX_LOCAL_SNAPSHOTS);
  while (candidate.length >= 0) {
    try {
      if (candidate.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(candidate));
      }
      return true;
    } catch {
      if (candidate.length <= 1) {
        return false;
      }
      candidate = candidate.slice(0, candidate.length - 1);
    }
  }
  return false;
}

export function listLocalRecoverySnapshots(accountId?: string | null): LocalRecoverySnapshot[] {
  if (typeof window === 'undefined') return [];
  const key = getAccountLocalSnapshotsKey(accountId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is LocalRecoverySnapshot =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.createdAt === 'string' &&
            typeof item.content === 'string'
        )
    );
  } catch {
    return [];
  }
}

export async function saveLocalRecoverySnapshot(
  cards: StoredCard[],
  categories: string[],
  options: {
    reason: LocalSnapshotReason;
    label?: string;
    secret?: string | null;
    encryptedWithPin?: boolean;
    accountId?: string | null;
  }
): Promise<LocalRecoverySnapshot | null> {
  if (typeof window === 'undefined' || !Array.isArray(cards) || cards.length === 0) {
    return null;
  }
  const resolvedId = resolveAccountId(options.accountId);
  if (!resolvedId) return null;

  const secret = (options.secret || '').trim();
  const shouldEncrypt = secret.length >= 4;
  const content = shouldEncrypt
    ? await createEncryptedBackupContent(
        cards,
        categories,
        secret,
        Boolean(options.encryptedWithPin)
      )
    : await createPlainBackupContent(cards, categories);

  const myCardCount = cards.filter((c) => Boolean(c.isMyCard)).length;
  const vaultCardCount = cards.length - myCardCount;
  const snapshot: LocalRecoverySnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    reason: options.reason,
    label:
      options.label ||
      (options.reason === 'pre_restore' ? '전체 교체 전 자동 스냅샷' : '수동 안전 스냅샷'),
    cardCount: cards.length,
    myCardCount,
    vaultCardCount,
    encrypted: shouldEncrypt,
    content,
  };

  const existing = listLocalRecoverySnapshots(resolvedId);
  const saved = writeSnapshotsSafe([snapshot, ...existing], resolvedId);
  if (!saved) return null;

  window.dispatchEvent(new CustomEvent(BACKUP_UPDATED_EVENT));
  return snapshot;
}

export function deleteLocalRecoverySnapshot(
  snapshotId: string,
  accountId?: string | null
): LocalRecoverySnapshot[] {
  const existing = listLocalRecoverySnapshots(accountId);
  const next = existing.filter((s) => s.id !== snapshotId);
  writeSnapshotsSafe(next, accountId);
  window.dispatchEvent(new CustomEvent(BACKUP_UPDATED_EVENT));
  return next;
}
