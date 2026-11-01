import { StoredCard } from '../types/card';

export const DEFAULT_VAULT_CATEGORIES = [
  'VIP 파트너',
  '글로벌 네트워크',
  '공공·기관',
  '투자·금융',
  'IT·기술',
] as const;

export const FALLBACK_CATEGORY = '기타';
const CATEGORIES_STORAGE_KEY = 'vault_categories_v1';
export const CATEGORIES_UPDATED_EVENT = 'vault-categories-updated';

function sanitizeCategoryList(rawList: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of rawList) {
    const trimmed = (item || '').trim();
    if (!trimmed || trimmed === '전체') continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(trimmed);
  }

  if (cleaned.length === 0) {
    cleaned.push(FALLBACK_CATEGORY);
  }

  return cleaned;
}

function notifyCategoriesUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CATEGORIES_UPDATED_EVENT));
  }
}

/**
 * Loads user-configured categories merged with defaults (if uninitialized) and any categories present on stored cards.
 */
export function loadVaultCategories(cards?: StoredCard[]): string[] {
  let baseList: string[] = [...DEFAULT_VAULT_CATEGORIES];

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseList = sanitizeCategoryList(parsed.filter((v): v is string => typeof v === 'string'));
        }
      }
    } catch {
      baseList = [...DEFAULT_VAULT_CATEGORIES];
    }
  }

  if (cards && cards.length > 0) {
    const existingLower = new Set(baseList.map((c) => c.toLowerCase()));
    const dynamicExtras: string[] = [];
    for (const card of cards) {
      const cat = (card.category || '').trim();
      if (cat && cat !== '전체' && !existingLower.has(cat.toLowerCase())) {
        existingLower.add(cat.toLowerCase());
        dynamicExtras.push(cat);
      }
    }
    if (dynamicExtras.length > 0) {
      const fallbackIdx = baseList.indexOf(FALLBACK_CATEGORY);
      if (fallbackIdx >= 0) {
        baseList = [
          ...baseList.slice(0, fallbackIdx),
          ...dynamicExtras,
          ...baseList.slice(fallbackIdx),
        ];
      } else {
        baseList = [...baseList, ...dynamicExtras];
      }
    }
  }

  return baseList;
}

export function saveVaultCategories(categories: string[]): string[] {
  const cleaned = sanitizeCategoryList(categories);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cleaned));
      notifyCategoriesUpdated();
    } catch (e) {
      console.warn('Notice saving vault categories', e);
    }
  }
  return cleaned;
}

export function addVaultCategory(
  rawName: string,
  currentCards?: StoredCard[]
): { ok: boolean; categories: string[]; added?: string; error?: string } {
  const trimmed = rawName.trim();
  const current = loadVaultCategories(currentCards);

  if (!trimmed) {
    return { ok: false, categories: current, error: '카테고리 이름을 입력해 주세요.' };
  }
  if (trimmed === '전체') {
    return { ok: false, categories: current, error: "'전체'는 예약된 필터 이름입니다." };
  }
  if (trimmed.length > 20) {
    return { ok: false, categories: current, error: '카테고리 이름은 20자 이내로 입력해 주세요.' };
  }
  if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, categories: current, error: '이미 존재하는 카테고리입니다.' };
  }

  const fallbackIdx = current.indexOf(FALLBACK_CATEGORY);
  const next =
    fallbackIdx >= 0
      ? [...current.slice(0, fallbackIdx), trimmed, ...current.slice(fallbackIdx)]
      : [...current, trimmed];

  const saved = saveVaultCategories(next);
  return { ok: true, categories: saved, added: trimmed };
}

export function renameVaultCategory(
  oldName: string,
  rawNewName: string,
  currentCards?: StoredCard[]
): {
  ok: boolean;
  categories: string[];
  renamed?: string;
  conflictTarget?: string;
  updatedCount?: number;
  error?: string;
} {
  const trimmed = rawNewName.trim();
  const current = loadVaultCategories(currentCards);

  if (oldName === '전체') {
    return { ok: false, categories: current, error: "'전체' 필터는 이름을 변경할 수 없습니다." };
  }
  if (!trimmed) {
    return { ok: false, categories: current, error: '새 카테고리 이름을 입력해 주세요.' };
  }
  if (trimmed === '전체') {
    return { ok: false, categories: current, error: "'전체'는 사용할 수 없는 이름입니다." };
  }
  if (trimmed.length > 20) {
    return { ok: false, categories: current, error: '카테고리 이름은 20자 이내로 입력해 주세요.' };
  }

  const conflicting = current.find(
    (c) => c !== oldName && c.toLowerCase() === trimmed.toLowerCase()
  );
  if (conflicting) {
    return {
      ok: false,
      categories: current,
      conflictTarget: conflicting,
      error: `이미 '${conflicting}' 카테고리가 존재합니다. 병합 기능으로 통합할 수 있습니다.`,
    };
  }

  const updatedCount = currentCards
    ? currentCards.filter((c) => c.category === oldName).length
    : 0;

  const next = current.map((c) => (c === oldName ? trimmed : c));
  const saved = saveVaultCategories(next);
  return { ok: true, categories: saved, renamed: trimmed, updatedCount };
}

export function mergeVaultCategories(
  sourceName: string,
  targetName: string,
  currentCards?: StoredCard[]
): {
  ok: boolean;
  categories: string[];
  target?: string;
  movedCount?: number;
  error?: string;
} {
  const cleanSource = sourceName.trim();
  const cleanTarget = targetName.trim();
  const current = loadVaultCategories(currentCards);

  if (!cleanSource || !cleanTarget) {
    return { ok: false, categories: current, error: '병합할 카테고리를 선택해 주세요.' };
  }
  if (cleanSource === '전체' || cleanTarget === '전체') {
    return { ok: false, categories: current, error: "'전체' 필터는 병합할 수 없습니다." };
  }
  if (cleanSource === cleanTarget) {
    return { ok: false, categories: current, error: '동일한 카테고리로 병합할 수 없습니다.' };
  }

  const resolvedTarget =
    current.find((c) => c.toLowerCase() === cleanTarget.toLowerCase()) || cleanTarget;

  if (resolvedTarget === cleanSource) {
    return { ok: false, categories: current, error: '동일한 카테고리로 병합할 수 없습니다.' };
  }

  const movedCount = currentCards
    ? currentCards.filter((c) => c.category === cleanSource).length
    : 0;

  const withoutSource = current.filter((c) => c !== cleanSource);
  const next = withoutSource.includes(resolvedTarget)
    ? withoutSource
    : [...withoutSource, resolvedTarget];

  const saved = saveVaultCategories(next);
  return { ok: true, categories: saved, target: resolvedTarget, movedCount };
}

export function getDeleteFallbackCategory(
  targetName: string,
  currentCategories: string[]
): string {
  const others = currentCategories.filter((c) => c !== targetName);
  if (others.includes(FALLBACK_CATEGORY)) {
    return FALLBACK_CATEGORY;
  }
  return others[0] || FALLBACK_CATEGORY;
}

export function deleteVaultCategory(
  targetName: string,
  currentCards?: StoredCard[]
): {
  ok: boolean;
  categories: string[];
  fallback: string;
  movedCount: number;
  error?: string;
} {
  const current = loadVaultCategories(currentCards);

  if (targetName === '전체') {
    return {
      ok: false,
      categories: current,
      fallback: FALLBACK_CATEGORY,
      movedCount: 0,
      error: "'전체' 필터는 삭제할 수 없습니다.",
    };
  }

  if (current.length <= 1) {
    return {
      ok: false,
      categories: current,
      fallback: current[0] || FALLBACK_CATEGORY,
      movedCount: 0,
      error: '최소 1개의 카테고리는 유지되어야 합니다.',
    };
  }

  const fallback = getDeleteFallbackCategory(targetName, current);
  const movedCount = currentCards
    ? currentCards.filter((c) => c.category === targetName).length
    : 0;

  const updatedCards = currentCards?.map((c) =>
    c.category === targetName ? { ...c, category: fallback } : c
  );

  const remaining = current.filter((c) => c !== targetName);
  const next =
    movedCount > 0 && !remaining.includes(fallback)
      ? [...remaining, fallback]
      : remaining.length > 0
        ? remaining
        : [fallback];

  // Ensure any other active card categories remain intact
  const mergedWithCards = updatedCards
    ? sanitizeCategoryList([
        ...next,
        ...updatedCards.map((c) => c.category).filter(Boolean),
      ])
    : next;

  const saved = saveVaultCategories(mergedWithCards);
  return { ok: true, categories: saved, fallback, movedCount };
}

export function resetVaultCategories(): string[] {
  const defaults = [...DEFAULT_VAULT_CATEGORIES];
  return saveVaultCategories(defaults);
}

export function clearStoredCategories(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CATEGORIES_STORAGE_KEY);
    notifyCategoriesUpdated();
  } catch {
    // Ignore storage cleanup errors
  }
}
