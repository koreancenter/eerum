export type AppThemeId =
  | 'editorial_cream'
  | 'pop_vermilion'
  | 'cobalt_citrus'
  | 'bottega_sage'
  | 'obsidian_vault';

export interface AppThemeDefinition {
  id: AppThemeId;
  labelKr: string;
  labelEn: string;
  description: string;
  bg: string;
  accent: string;
  highlight: string;
  isDark?: boolean;
}

export const APP_THEME_STORAGE_KEY = 'eerum_app_theme';
export const DEFAULT_APP_THEME: AppThemeId = 'editorial_cream';

export const APP_THEMES: AppThemeDefinition[] = [
  {
    id: 'editorial_cream',
    labelKr: '에디토리얼 크림',
    labelEn: 'Editorial Cream',
    description: 'Warm & Stylish',
    bg: '#FAF7F2',
    accent: '#D95D39',
    highlight: '#F2E2CE',
  },
  {
    id: 'pop_vermilion',
    labelKr: '팝 버밀리온',
    labelEn: 'Pop Vermilion',
    description: 'Energetic & Youthful',
    bg: '#FFFDF5',
    accent: '#E63946',
    highlight: '#FFB703',
  },
  {
    id: 'cobalt_citrus',
    labelKr: '코발트 시트러스',
    labelEn: 'Cobalt Citrus',
    description: 'Fresh & Trendy',
    bg: '#F6F9FF',
    accent: '#1D4ED8',
    highlight: '#FACC15',
  },
  {
    id: 'bottega_sage',
    labelKr: '보테가 세이지',
    labelEn: 'Bottega Sage',
    description: 'Calm & Boutique',
    bg: '#F3F5F1',
    accent: '#1E3A2F',
    highlight: '#E2D4B7',
  },
  {
    id: 'obsidian_vault',
    labelKr: '옵시디언 볼트',
    labelEn: 'Obsidian Vault',
    description: 'Classic Dark',
    bg: '#0A0A0B',
    accent: '#FFFFFF',
    highlight: '#27272A',
    isDark: true,
  },
];

export const APP_THEME_UPDATED_EVENT = 'eerum:app-theme-updated';

export function isValidAppThemeId(value: string | null | undefined): value is AppThemeId {
  return APP_THEMES.some((t) => t.id === value);
}

export function getAppThemeDefinition(themeId: AppThemeId): AppThemeDefinition {
  return APP_THEMES.find((t) => t.id === themeId) || APP_THEMES[0];
}

export function loadStoredAppTheme(): AppThemeId {
  if (typeof window === 'undefined') return DEFAULT_APP_THEME;
  try {
    const saved = localStorage.getItem(APP_THEME_STORAGE_KEY);
    if (isValidAppThemeId(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted environments
  }
  return DEFAULT_APP_THEME;
}

export function applyAppTheme(themeId: AppThemeId, persist = true): AppThemeDefinition {
  const resolved = getAppThemeDefinition(themeId);

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.appTheme = resolved.id;
    const metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolved.bg);
    }
  }

  if (persist && typeof window !== 'undefined') {
    try {
      localStorage.setItem(APP_THEME_STORAGE_KEY, resolved.id);
    } catch {
      // Ignore storage write errors
    }
    window.dispatchEvent(new CustomEvent(APP_THEME_UPDATED_EVENT, { detail: resolved.id }));
  }

  return resolved;
}
