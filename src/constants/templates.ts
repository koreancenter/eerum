import { CardTheme, CardFeatures, CardLayoutType } from '../types/card';
import { parseHexColor, getContrastRatio } from '../utils/cardThemeHarmony';

export interface ThemePresetDefinition {
  id: CardTheme;
  name: string;
  nameEn: string;
  description: string;
  canvasBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentName: string;
  borderClass: string;
  hairlineClass: string;
  hoverHighlight: string;
  qrBg: string;
  dotColor: string;
  isLight: boolean;
}

export interface LayoutPresetDefinition {
  id: CardLayoutType;
  name: string;
  aspectRatio: string;
  description: string;
}

export function isVerticalLayout(layoutType?: CardLayoutType): boolean {
  return layoutType === 'vertical_atelier' || layoutType === 'serenity_vertical';
}

export const LAYOUT_PRESETS: LayoutPresetDefinition[] = [
  {
    id: 'editorial_minimal',
    name: '에디토리얼 미니멀',
    aspectRatio: '9:5',
    description: '비대칭 2단 그리드와 국·영문 조화가 돋보이는 건축적 미니멀 레이아웃'
  },
  {
    id: 'monogram_executive',
    name: '모노그램 이그제큐티브',
    aspectRatio: '9:5',
    description: '상단 중앙 실(Seal) 모노그램과 클래식 세리프 중심의 임원용 대칭 구도'
  },
  {
    id: 'swiss_typo_bold',
    name: '스위스 타이포 볼드',
    aspectRatio: '9:5',
    description: '고대비 그로테스크 서체와 정교한 마이크로 그리드의 모더니즘 레이아웃'
  },
  {
    id: 'warm_organic',
    name: '매트 오가닉 페이퍼',
    aspectRatio: '9:5',
    description: '여백의 미와 매트 파인아트 지류 감성을 극대화한 정제된 밸런스'
  },
  {
    id: 'vertical_atelier',
    name: '버티컬 아틀리에',
    aspectRatio: '5:8',
    description: '건축가·디렉터·크리에이터를 위한 절제된 수직형 아틀리에 포맷'
  },
  {
    id: 'serenity_vertical',
    name: '세레니티 버티컬',
    aspectRatio: '5:8',
    description: '여백의 미와 타이포그래피에 집중한 절제된 세로형 구도의 프리셋'
  }
];

export const LUXURY_THEME_PRESETS: ThemePresetDefinition[] = [
  {
    id: 'pure_white',
    name: '퓨어 화이트 (Pure White)',
    nameEn: 'Pure White & Deep Warm Charcoal',
    description: '깨끗한 퓨어 화이트 지류(#F8F7F4)와 딥 차콜 활자',
    canvasBg: 'bg-[#F8F7F4]',
    textPrimary: 'text-[#1C1B1A]',
    textSecondary: 'text-[#5C5955]',
    textMuted: 'text-[#5C5955]',
    accent: '#1C1B1A',
    accentName: '딥 웜 차콜 (#1C1B1A)',
    borderClass: 'border-[#1C1B1A]/10',
    hairlineClass: 'border-[#1C1B1A]/10',
    hoverHighlight: 'hover:bg-[#1C1B1A]/5',
    qrBg: 'bg-[#FAF8F4]',
    dotColor: '#F8F7F4',
    isLight: true
  },
  {
    id: 'warm_paper',
    name: '웜 페이퍼 (Warm Paper)',
    nameEn: 'Warm Cotton Paper & Deep Charcoal',
    description: '차분한 웜 페이퍼 지류(#E5DFD3)와 딥 차콜 활자',
    canvasBg: 'bg-[#E5DFD3]',
    textPrimary: 'text-[#181715]',
    textSecondary: 'text-[#524F49]',
    textMuted: 'text-[#524F49]',
    accent: '#181715',
    accentName: '딥 차콜 (#181715)',
    borderClass: 'border-black/10',
    hairlineClass: 'border-black/10',
    hoverHighlight: 'hover:bg-black/5',
    qrBg: 'bg-[#F5F2EC]',
    dotColor: '#E5DFD3',
    isLight: true
  },
  {
    id: 'classic_navy',
    name: '클래식 네이비 (Classic Navy)',
    nameEn: 'Classic Diplomatic Navy & Platinum',
    description: '깊이 있는 클래식 네이비(#14233C)와 실버 화이트 활자',
    canvasBg: 'bg-[#14233C]',
    textPrimary: 'text-[#FAFAFA]',
    textSecondary: 'text-zinc-300',
    textMuted: 'text-zinc-300',
    accent: '#E4E4E7',
    accentName: '플래티넘 실버 (#E4E4E7)',
    borderClass: 'border-white/10',
    hairlineClass: 'border-white/10',
    hoverHighlight: 'hover:bg-white/10',
    qrBg: 'bg-[#121214]',
    dotColor: '#14233C',
    isLight: false
  },
  {
    id: 'deep_forest',
    name: '딥 포레스트 (Deep Forest)',
    nameEn: 'Deep Evergreen Forest & Platinum',
    description: '차분한 딥 포레스트(#142B22)와 소프트 플래티넘 서체',
    canvasBg: 'bg-[#142B22]',
    textPrimary: 'text-[#FAFAFA]',
    textSecondary: 'text-zinc-300',
    textMuted: 'text-zinc-300',
    accent: '#E4E4E7',
    accentName: '소프트 플래티넘 (#E4E4E7)',
    borderClass: 'border-white/10',
    hairlineClass: 'border-white/10',
    hoverHighlight: 'hover:bg-white/10',
    qrBg: 'bg-[#121214]',
    dotColor: '#142B22',
    isLight: false
  },
  {
    id: 'sumi_ink',
    name: '수묵 블랙 (Sumi Ink)',
    nameEn: 'Rich Carbon Black & Crisp White',
    description: '깊은 카본 블랙 캔버스(#0D0D0F)와 매트 화이트 활자',
    canvasBg: 'bg-[#0D0D0F]',
    textPrimary: 'text-[#FAFAFA]',
    textSecondary: 'text-zinc-400',
    textMuted: 'text-zinc-400',
    accent: '#FAFAFA',
    accentName: '매트 화이트 (#FAFAFA)',
    borderClass: 'border-white/10',
    hairlineClass: 'border-white/10',
    hoverHighlight: 'hover:bg-white/10',
    qrBg: 'bg-[#121214]',
    dotColor: '#0D0D0F',
    isLight: false
  }
];

export interface ResolvedThemeStyle {
  cardBg: string;
  canvasHex: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHairline: string;
  tagline: string;
  hoverHighlight: string;
  sheen: string;
  qrBg: string;
  isLight: boolean;
}

const HARMONIZED_TEXT_PRIMARY =
  'text-[var(--card-text-primary,var(--card-fallback-text-primary))]';
const HARMONIZED_TEXT_SECONDARY =
  'text-[var(--card-text-secondary,var(--card-fallback-text-secondary))]';
const HARMONIZED_TEXT_MUTED =
  'text-[var(--card-text-muted,var(--card-fallback-text-muted))]';
const HARMONIZED_HAIRLINE =
  'border-[var(--card-hairline,var(--card-fallback-hairline))]';
const HARMONIZED_HOVER =
  'hover:bg-[var(--card-hover-bg,var(--card-fallback-hover-bg))]';
const HARMONIZED_BORDER_LIGHT =
  'border-[var(--card-border,var(--card-fallback-border))] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.45)]';
const HARMONIZED_BORDER_DARK =
  'border-[var(--card-border,var(--card-fallback-border))] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.85)]';

export function normalizeHexColor(value?: string): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/^#/, '');
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
  return null;
}

export function resolveThemeStyles(
  theme: CardTheme | undefined,
  customBgColor?: string
): ResolvedThemeStyle {
  const customHex = normalizeHexColor(customBgColor);
  if (customHex) {
    const rgb = parseHexColor(customHex, { r: 248, g: 247, b: 244 });
    const darkContrast = getContrastRatio({ r: 18, g: 18, b: 17 }, rgb);
    const lightContrast = getContrastRatio({ r: 250, g: 250, b: 250 }, rgb);
    const isLight = darkContrast >= lightContrast;

    return {
      cardBg: '',
      canvasHex: customHex,
      border: isLight ? HARMONIZED_BORDER_LIGHT : HARMONIZED_BORDER_DARK,
      textPrimary: HARMONIZED_TEXT_PRIMARY,
      textSecondary: HARMONIZED_TEXT_SECONDARY,
      textMuted: HARMONIZED_TEXT_MUTED,
      accent: isLight ? '#1C1B1A' : '#FAFAFA',
      accentHairline: HARMONIZED_HAIRLINE,
      tagline: HARMONIZED_TEXT_PRIMARY,
      hoverHighlight: HARMONIZED_HOVER,
      sheen: isLight
        ? 'from-black/[0.025] via-transparent to-transparent'
        : 'from-white/[0.04] via-transparent to-transparent',
      qrBg: isLight ? 'bg-[#FAF8F4]' : 'bg-[#121214]',
      isLight,
    };
  }

  const t = (theme || 'pure_white') as string;

  if (t === 'pure_white' || t === 'cotton') {
    return {
      cardBg: 'bg-[#F8F7F4]',
      canvasHex: '#F8F7F4',
      border: HARMONIZED_BORDER_LIGHT,
      textPrimary: HARMONIZED_TEXT_PRIMARY,
      textSecondary: HARMONIZED_TEXT_SECONDARY,
      textMuted: HARMONIZED_TEXT_MUTED,
      accent: '#1C1B1A',
      accentHairline: HARMONIZED_HAIRLINE,
      tagline: HARMONIZED_TEXT_PRIMARY,
      hoverHighlight: HARMONIZED_HOVER,
      sheen: 'from-[#1C1B1A]/[0.025] via-transparent to-transparent',
      qrBg: 'bg-[#FAF8F4]',
      isLight: true
    };
  }

  if (t === 'sumi_ink') {
    return {
      cardBg: 'bg-[#0D0D0F]',
      canvasHex: '#0D0D0F',
      border: HARMONIZED_BORDER_DARK,
      textPrimary: HARMONIZED_TEXT_PRIMARY,
      textSecondary: HARMONIZED_TEXT_SECONDARY,
      textMuted: HARMONIZED_TEXT_MUTED,
      accent: '#FAFAFA',
      accentHairline: HARMONIZED_HAIRLINE,
      tagline: HARMONIZED_TEXT_PRIMARY,
      hoverHighlight: HARMONIZED_HOVER,
      sheen: 'from-white/[0.04] via-transparent to-transparent',
      qrBg: 'bg-[#121214]',
      isLight: false
    };
  }

  if (t === 'warm_paper' || t === 'sand') {
    return {
      cardBg: 'bg-[#E5DFD3]',
      canvasHex: '#E5DFD3',
      border: HARMONIZED_BORDER_LIGHT,
      textPrimary: HARMONIZED_TEXT_PRIMARY,
      textSecondary: HARMONIZED_TEXT_SECONDARY,
      textMuted: HARMONIZED_TEXT_MUTED,
      accent: '#181715',
      accentHairline: HARMONIZED_HAIRLINE,
      tagline: HARMONIZED_TEXT_PRIMARY,
      hoverHighlight: HARMONIZED_HOVER,
      sheen: 'from-white/50 via-transparent to-transparent',
      qrBg: 'bg-[#F5F2EC]',
      isLight: true
    };
  }

  if (t === 'deep_forest' || t === 'emerald') {
    return {
      cardBg: 'bg-[#142B22]',
      canvasHex: '#142B22',
      border: HARMONIZED_BORDER_DARK,
      textPrimary: HARMONIZED_TEXT_PRIMARY,
      textSecondary: HARMONIZED_TEXT_SECONDARY,
      textMuted: HARMONIZED_TEXT_MUTED,
      accent: '#E4E4E7',
      accentHairline: HARMONIZED_HAIRLINE,
      tagline: HARMONIZED_TEXT_PRIMARY,
      hoverHighlight: HARMONIZED_HOVER,
      sheen: 'from-white/[0.04] via-transparent to-transparent',
      qrBg: 'bg-[#121214]',
      isLight: false
    };
  }

  if (t === 'classic_navy' || t === 'navy') {
    return {
      cardBg: 'bg-[#14233C]',
      canvasHex: '#14233C',
      border: HARMONIZED_BORDER_DARK,
      textPrimary: HARMONIZED_TEXT_PRIMARY,
      textSecondary: HARMONIZED_TEXT_SECONDARY,
      textMuted: HARMONIZED_TEXT_MUTED,
      accent: '#E4E4E7',
      accentHairline: HARMONIZED_HAIRLINE,
      tagline: HARMONIZED_TEXT_PRIMARY,
      hoverHighlight: HARMONIZED_HOVER,
      sheen: 'from-white/[0.04] via-transparent to-transparent',
      qrBg: 'bg-[#121214]',
      isLight: false
    };
  }

  if (t === 'obsidian' || t === 'titanium' || t === 'slate') {
    return {
      cardBg: 'bg-[#121214]',
      canvasHex: '#121214',
      border: HARMONIZED_BORDER_DARK,
      textPrimary: HARMONIZED_TEXT_PRIMARY,
      textSecondary: HARMONIZED_TEXT_SECONDARY,
      textMuted: HARMONIZED_TEXT_MUTED,
      accent: '#FAFAFA',
      accentHairline: HARMONIZED_HAIRLINE,
      tagline: HARMONIZED_TEXT_PRIMARY,
      hoverHighlight: HARMONIZED_HOVER,
      sheen: 'from-white/[0.03] via-transparent to-transparent',
      qrBg: 'bg-[#0A0A0B]',
      isLight: false
    };
  }

  // Default fallback (including any retired legacy theme string) -> Pure White (#F8F7F4)
  return {
    cardBg: 'bg-[#F8F7F4]',
    canvasHex: '#F8F7F4',
    border: HARMONIZED_BORDER_LIGHT,
    textPrimary: HARMONIZED_TEXT_PRIMARY,
    textSecondary: HARMONIZED_TEXT_SECONDARY,
    textMuted: HARMONIZED_TEXT_MUTED,
    accent: '#1C1B1A',
    accentHairline: HARMONIZED_HAIRLINE,
    tagline: HARMONIZED_TEXT_PRIMARY,
    hoverHighlight: HARMONIZED_HOVER,
    sheen: 'from-[#1C1B1A]/[0.025] via-transparent to-transparent',
    qrBg: 'bg-[#FAF8F4]',
    isLight: true
  };
}

export const DEFAULT_CARD_FEATURES: CardFeatures = {
  show_en_name: true,
  show_sub_org: true,
  show_address: true,
  custom_logo: '',
  monogram_text: '',
  custom_bg_color: '',
  custom_bg_image: ''
};

export function generateMonogram(name: string, subName?: string): string {
  const candidates = [name, subName].map((s) => (s || '').trim()).filter(Boolean);
  if (candidates.length === 0) return 'GC';

  for (const text of candidates) {
    const latinParts = text
      .replace(/[^a-zA-Z\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (latinParts.length >= 2) {
      return (latinParts[0][0] + latinParts[latinParts.length - 1][0]).toUpperCase();
    }
    if (latinParts.length === 1 && latinParts[0].length >= 1) {
      return latinParts[0].slice(0, 2).toUpperCase();
    }
  }

  const primary = candidates[0].replace(/\s+/g, '');
  if (primary.length >= 3) {
    return primary.slice(-2);
  }
  return primary.slice(0, 2) || 'GC';
}
