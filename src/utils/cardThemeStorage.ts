import { CardTheme, StoredCard } from '../types/card';
import { getAccountCardThemeMapKey, getAccountLastCardThemeKey } from './accountStorage';

export const CARD_THEME_MAP_STORAGE_KEY = 'eerum_card_theme_map_v1';
export const LAST_USED_CARD_THEME_STORAGE_KEY = 'eerum_last_used_card_theme_v1';
export const CARD_THEME_MAP_UPDATED_EVENT = 'eerum:card-theme-map-updated';

const VALID_CARD_THEMES = new Set<CardTheme>([
  'pure_white',
  'warm_paper',
  'classic_navy',
  'deep_forest',
  'sumi_ink',
  'obsidian',
  'cotton',
  'titanium',
  'navy',
  'emerald',
  'sand',
  'slate',
]);

export interface StoredCardThemePreference {
  theme: CardTheme;
  customBgColor?: string;
  updatedAt: number;
}

export type CardThemeMap = Record<string, StoredCardThemePreference>;

function normalizeHex(value?: string): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return '';
  const cleaned = trimmed.replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const expanded = cleaned
      .split('')
      .map((ch) => ch + ch)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  return undefined;
}

export function isValidCardTheme(value: unknown): value is CardTheme {
  return typeof value === 'string' && VALID_CARD_THEMES.has(value as CardTheme);
}

function sanitizePreference(raw: unknown): StoredCardThemePreference | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!isValidCardTheme(obj.theme)) return null;

  const normalizedCustomColor =
    typeof obj.customBgColor === 'string' ? normalizeHex(obj.customBgColor) : undefined;

  return {
    theme: obj.theme,
    ...(normalizedCustomColor !== undefined ? { customBgColor: normalizedCustomColor } : {}),
    updatedAt:
      typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt)
        ? obj.updatedAt
        : Date.now(),
  };
}

export function loadCardThemeMap(accountId?: string | null): CardThemeMap {
  if (typeof window === 'undefined') return {};
  const mapKey = getAccountCardThemeMapKey(accountId);
  if (!mapKey) return {};
  try {
    const raw = localStorage.getItem(mapKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const result: CardThemeMap = {};
    for (const [cardId, pref] of Object.entries(parsed as Record<string, unknown>)) {
      if (!cardId) continue;
      const sanitized = sanitizePreference(pref);
      if (sanitized) {
        result[cardId] = sanitized;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function writeCardThemeMap(map: CardThemeMap, accountId?: string | null): void {
  if (typeof window === 'undefined') return;
  const mapKey = getAccountCardThemeMapKey(accountId);
  if (!mapKey) return;
  try {
    const entries = Object.entries(map);
    if (entries.length === 0) {
      localStorage.removeItem(mapKey);
    } else {
      localStorage.setItem(mapKey, JSON.stringify(map));
    }
  } catch {
    // Ignore storage write errors in restricted environments
  }
}

export function getCardThemePreference(
  cardId?: string | null,
  accountId?: string | null
): StoredCardThemePreference | null {
  if (!cardId) return null;
  const map = loadCardThemeMap(accountId);
  return map[cardId] || null;
}

export function getMostRecentCardTheme(accountId?: string | null): StoredCardThemePreference | null {
  if (typeof window === 'undefined') return null;
  const lastKey = getAccountLastCardThemeKey(accountId);
  if (!lastKey) return null;
  try {
    const raw = localStorage.getItem(lastKey);
    if (raw) {
      const parsed = sanitizePreference(JSON.parse(raw));
      if (parsed) return parsed;
    }
  } catch {
    // Fall back to scanning map
  }

  const map = loadCardThemeMap(accountId);
  let latest: StoredCardThemePreference | null = null;
  for (const pref of Object.values(map)) {
    if (!latest || pref.updatedAt > latest.updatedAt) {
      latest = pref;
    }
  }
  return latest;
}

export function saveCardThemePreference(
  cardId: string,
  theme: CardTheme,
  customBgColor?: string,
  options?: { updateLastUsed?: boolean; accountId?: string | null }
): void {
  if (typeof window === 'undefined' || !cardId) return;
  const mapKey = getAccountCardThemeMapKey(options?.accountId);
  if (!mapKey) return;

  const resolvedTheme: CardTheme = isValidCardTheme(theme) ? theme : 'pure_white';
  const normalizedColor =
    customBgColor !== undefined ? normalizeHex(customBgColor) : undefined;
  const now = Date.now();

  const preference: StoredCardThemePreference = {
    theme: resolvedTheme,
    ...(normalizedColor !== undefined ? { customBgColor: normalizedColor } : {}),
    updatedAt: now,
  };

  const map = loadCardThemeMap(options?.accountId);
  map[cardId] = preference;
  writeCardThemeMap(map, options?.accountId);

  if (options?.updateLastUsed !== false) {
    const lastKey = getAccountLastCardThemeKey(options?.accountId);
    if (lastKey) {
      try {
        localStorage.setItem(lastKey, JSON.stringify(preference));
      } catch {
        // Ignore storage write errors
      }
    }
  }

  window.dispatchEvent(
    new CustomEvent(CARD_THEME_MAP_UPDATED_EVENT, {
      detail: { cardId, preference },
    })
  );
}

export function syncCardThemeMapFromCards(
  cards: StoredCard[],
  options?: { overwriteExisting?: boolean; clearPrevious?: boolean; accountId?: string | null }
): void {
  if (typeof window === 'undefined') return;
  const mapKey = getAccountCardThemeMapKey(options?.accountId);
  if (!mapKey) return;
  const nextMap: CardThemeMap = options?.clearPrevious ? {} : loadCardThemeMap(options?.accountId);
  const baseTime = Date.now();
  let changed = Boolean(options?.clearPrevious);

  cards.forEach((card, index) => {
    if (!card?.id) return;
    if (!options?.overwriteExisting && nextMap[card.id]) return;

    const resolvedTheme: CardTheme = isValidCardTheme(card.theme) ? card.theme : 'pure_white';
    const normalizedColor =
      card.card_features?.custom_bg_color !== undefined
        ? normalizeHex(card.card_features.custom_bg_color)
        : undefined;

    nextMap[card.id] = {
      theme: resolvedTheme,
      ...(normalizedColor !== undefined ? { customBgColor: normalizedColor } : {}),
      updatedAt: baseTime - index,
    };
    changed = true;
  });

  if (changed) {
    writeCardThemeMap(nextMap, options?.accountId);
    window.dispatchEvent(new CustomEvent(CARD_THEME_MAP_UPDATED_EVENT));
  }
}

export function applyCardThemeMapSnapshot(
  incomingMap: CardThemeMap | undefined,
  options?: { clearPrevious?: boolean; overwriteExisting?: boolean; accountId?: string | null }
): void {
  if (typeof window === 'undefined' || !incomingMap || typeof incomingMap !== 'object') return;
  const mapKey = getAccountCardThemeMapKey(options?.accountId);
  if (!mapKey) return;

  const nextMap: CardThemeMap = options?.clearPrevious ? {} : loadCardThemeMap(options?.accountId);
  let changed = Boolean(options?.clearPrevious);

  for (const [cardId, rawPref] of Object.entries(incomingMap)) {
    if (!cardId) continue;
    const sanitized = sanitizePreference(rawPref);
    if (!sanitized) continue;

    if (!options?.overwriteExisting && nextMap[cardId]) {
      if (sanitized.updatedAt <= nextMap[cardId].updatedAt) {
        continue;
      }
    }

    nextMap[cardId] = sanitized;
    changed = true;
  }

  if (changed) {
    writeCardThemeMap(nextMap, options?.accountId);
    window.dispatchEvent(new CustomEvent(CARD_THEME_MAP_UPDATED_EVENT));
  }
}

export function resolveCardWithStoredTheme(
  card: StoredCard,
  prefMap?: CardThemeMap
): StoredCard {
  const pref = prefMap ? prefMap[card.id] : getCardThemePreference(card.id);
  if (!pref) return card;

  const currentCustomColor = card.card_features?.custom_bg_color;
  const nextCustomColor =
    pref.customBgColor !== undefined ? pref.customBgColor : currentCustomColor;

  const themeChanged = card.theme !== pref.theme;
  const customColorChanged = (currentCustomColor || '') !== (nextCustomColor || '');

  if (!themeChanged && !customColorChanged) {
    return card;
  }

  return {
    ...card,
    theme: pref.theme,
    ...(customColorChanged
      ? {
          card_features: {
            ...card.card_features,
            custom_bg_color: nextCustomColor,
          },
        }
      : {}),
  };
}

export function resolveCardsWithStoredThemes(
  cards: StoredCard[],
  accountId?: string | null
): StoredCard[] {
  if (!Array.isArray(cards) || cards.length === 0) return cards;
  const map = loadCardThemeMap(accountId);
  if (Object.keys(map).length === 0) return cards;

  let anyChanged = false;
  const resolved = cards.map((card) => {
    const updated = resolveCardWithStoredTheme(card, map);
    if (updated !== card) anyChanged = true;
    return updated;
  });

  return anyChanged ? resolved : cards;
}

export function removeCardThemePreference(cardId: string, accountId?: string | null): void {
  if (typeof window === 'undefined' || !cardId) return;
  const mapKey = getAccountCardThemeMapKey(accountId);
  if (!mapKey) return;
  const map = loadCardThemeMap(accountId);
  if (!(cardId in map)) return;
  delete map[cardId];
  writeCardThemeMap(map, accountId);
  window.dispatchEvent(new CustomEvent(CARD_THEME_MAP_UPDATED_EVENT, { detail: { cardId } }));
}

export function clearCardThemePreferences(accountId?: string | null): void {
  if (typeof window === 'undefined') return;
  const mapKey = getAccountCardThemeMapKey(accountId);
  const lastKey = getAccountLastCardThemeKey(accountId);
  try {
    if (mapKey) localStorage.removeItem(mapKey);
    if (lastKey) localStorage.removeItem(lastKey);
  } catch {
    // Ignore storage removal errors
  }
  window.dispatchEvent(new CustomEvent(CARD_THEME_MAP_UPDATED_EVENT));
}
