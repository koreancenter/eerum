import type { StoredCard } from '../types/card';

export type VaultViewScope = 'all' | 'recent';

export type VaultSortOption =
  | 'smart'
  | 'frequency'
  | 'newest'
  | 'oldest'
  | 'name'
  | 'company';

export interface VaultSortOptionMeta {
  id: VaultSortOption;
  label: string;
  description?: string;
}

export const SORT_OPTIONS: VaultSortOptionMeta[] = [
  { id: 'smart', label: '자동 추천순', description: '연락 빈도 · 등록일 반영' },
  { id: 'frequency', label: '자주 찾는순', description: '열람 · 연락 횟수순' },
  { id: 'newest', label: '최신 등록순', description: '최근 생성 · 등록일순' },
  { id: 'oldest', label: '오래된순', description: '이전 생성 · 등록일순' },
  { id: 'name', label: '이름순' },
  { id: 'company', label: '회사명순' },
];

export const RECENT_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const parseTimestampMs = (val?: string): number => {
  if (!val) return 0;
  const ms = new Date(val).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

export const getCardCreationTimestamp = (card: StoredCard): number => {
  const createdMs = Math.max(
    parseTimestampMs(card.created_at),
    parseTimestampMs(card.createdAt)
  );
  if (createdMs > 0) return createdMs;
  return Math.max(parseTimestampMs(card.updated_at), parseTimestampMs(card.updatedAt));
};

export const getCardRecentActivityTimestamp = (card: StoredCard): number => {
  return Math.max(
    parseTimestampMs(card.lastInteractedAt),
    parseTimestampMs(card.created_at),
    parseTimestampMs(card.createdAt),
    parseTimestampMs(card.updated_at),
    parseTimestampMs(card.updatedAt)
  );
};

export const getCardInteractionCount = (card: StoredCard): number => {
  if (typeof card.interactionCount !== 'number' || !Number.isFinite(card.interactionCount)) {
    return 0;
  }
  return Math.max(0, Math.floor(card.interactionCount));
};

export const isRecentVaultCard = (
  card: StoredCard,
  nowMs: number = Date.now(),
  windowDays: number = RECENT_WINDOW_DAYS
): boolean => {
  const cutoffMs = nowMs - windowDays * DAY_MS;
  return getCardRecentActivityTimestamp(card) >= cutoffMs;
};

export const filterCardsByScope = (
  cards: StoredCard[],
  scope: VaultViewScope,
  nowMs: number = Date.now()
): StoredCard[] => {
  if (scope === 'all') return cards;
  return cards.filter((card) => isRecentVaultCard(card, nowMs));
};

/**
 * Automated ranking score combining interaction frequency and recency/creation date:
 * - Frequently interacted cards receive logarithmic freshness weight (~5 days for 1st tap, ~12 days for 5 taps)
 *   so consistently contacted relationships float up without permanently burying newly created cards.
 * - Cards with zero interactions preserve pure creation/activity recency order.
 */
export const getSmartSortScore = (card: StoredCard): number => {
  const activityMs = Math.max(
    parseTimestampMs(card.lastInteractedAt),
    getCardCreationTimestamp(card)
  );
  const interactions = getCardInteractionCount(card);
  const frequencyBoostMs = interactions > 0 ? Math.log1p(interactions) * 7 * DAY_MS : 0;
  return activityMs + frequencyBoostMs;
};

const compareByKoreanName = (a: StoredCard, b: StoredCard): number => {
  const nameA = (a.data.name || a.data.nameKr || '').trim();
  const nameB = (b.data.name || b.data.nameKr || '').trim();
  const cmp = nameA.localeCompare(nameB, 'ko', { numeric: true, sensitivity: 'base' });
  if (cmp !== 0) return cmp;
  const orgA = (a.data.organizationKr || a.data.organization || '').trim();
  const orgB = (b.data.organizationKr || b.data.organization || '').trim();
  return orgA.localeCompare(orgB, 'ko', { numeric: true, sensitivity: 'base' });
};

export const sortVaultCards = (
  cards: StoredCard[],
  sortBy: VaultSortOption
): StoredCard[] => {
  const list = [...cards];

  if (sortBy === 'name') {
    return list.sort(compareByKoreanName);
  }

  if (sortBy === 'company') {
    return list.sort((a, b) => {
      const orgA = (
        a.data.organizationKr ||
        a.data.organization ||
        a.data.subOrg ||
        a.data.details?.sub_org ||
        ''
      ).trim();
      const orgB = (
        b.data.organizationKr ||
        b.data.organization ||
        b.data.subOrg ||
        b.data.details?.sub_org ||
        ''
      ).trim();
      if (!orgA && orgB) return 1;
      if (orgA && !orgB) return -1;
      const cmp = orgA.localeCompare(orgB, 'ko', { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      return compareByKoreanName(a, b);
    });
  }

  if (sortBy === 'frequency') {
    return list.sort((a, b) => {
      const countDiff = getCardInteractionCount(b) - getCardInteractionCount(a);
      if (countDiff !== 0) return countDiff;
      const interactedDiff =
        parseTimestampMs(b.lastInteractedAt) - parseTimestampMs(a.lastInteractedAt);
      if (interactedDiff !== 0) return interactedDiff;
      const createdDiff = getCardCreationTimestamp(b) - getCardCreationTimestamp(a);
      if (createdDiff !== 0) return createdDiff;
      return compareByKoreanName(a, b);
    });
  }

  if (sortBy === 'oldest') {
    return list.sort((a, b) => {
      const createdDiff = getCardCreationTimestamp(a) - getCardCreationTimestamp(b);
      if (createdDiff !== 0) return createdDiff;
      return compareByKoreanName(a, b);
    });
  }

  if (sortBy === 'newest') {
    return list.sort((a, b) => {
      const createdDiff = getCardCreationTimestamp(b) - getCardCreationTimestamp(a);
      if (createdDiff !== 0) return createdDiff;
      const updatedDiff =
        Math.max(parseTimestampMs(b.updated_at), parseTimestampMs(b.updatedAt)) -
        Math.max(parseTimestampMs(a.updated_at), parseTimestampMs(a.updatedAt));
      if (updatedDiff !== 0) return updatedDiff;
      return compareByKoreanName(a, b);
    });
  }

  // Default 'smart': Automated ranking by interaction frequency + creation/activity date
  return list.sort((a, b) => {
    const scoreDiff = getSmartSortScore(b) - getSmartSortScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    const countDiff = getCardInteractionCount(b) - getCardInteractionCount(a);
    if (countDiff !== 0) return countDiff;
    return getCardCreationTimestamp(b) - getCardCreationTimestamp(a);
  });
};
