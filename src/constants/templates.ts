import { CardTheme, CardFeatures, CardLayoutType } from '../types/card';

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
    name: '샴페인 샌드 (Champagne Sand)',
    nameEn: 'Warm Champagne Sand & Deep Warm Charcoal',
    description: '따뜻한 매트 샴페인 샌드 지류(#F5F2EC)와 깊이 있는 웜 차콜 활자(#1C1B1A), 섬세한 헤어라인 보더',
    canvasBg: 'bg-[#F5F2EC]',
    textPrimary: 'text-[#1C1B1A]',
    textSecondary: 'text-[#5C5955]',
    textMuted: 'text-[#5C5955]',
    accent: '#1C1B1A',
    accentName: '딥 웜 차콜 (#1C1B1A)',
    borderClass: 'border-[#1C1B1A]/10',
    hairlineClass: 'border-[#1C1B1A]/10',
    hoverHighlight: 'hover:bg-[#1C1B1A]/5',
    qrBg: 'bg-[#FAF8F4]',
    dotColor: '#F5F2EC',
    isLight: true
  },
  {
    id: 'sumi_ink',
    name: '수묵 블랙 (Sumi Black)',
    nameEn: 'Rich Carbon Black & Crisp White',
    description: '깊은 카본 블랙 캔버스(#0A0A0B)와 매트 화이트 활자, 정제된 모노크롬 디테일',
    canvasBg: 'bg-[#0A0A0B]',
    textPrimary: 'text-[#FAFAFA]',
    textSecondary: 'text-zinc-400',
    textMuted: 'text-zinc-400',
    accent: '#FAFAFA',
    accentName: '매트 화이트 (#FAFAFA)',
    borderClass: 'border-white/10',
    hairlineClass: 'border-white/10',
    hoverHighlight: 'hover:bg-white/10',
    qrBg: 'bg-[#121214]',
    dotColor: '#0A0A0B',
    isLight: false
  },
  {
    id: 'warm_paper',
    name: '파인 코튼 (Fine Cotton)',
    nameEn: 'Soft Stone Paper & Deep Charcoal',
    description: '차분한 코튼 스톤 지류(#F5F5F4)와 딥 차콜 활자, 모노크롬 블랙 액센트',
    canvasBg: 'bg-[#F5F5F4]',
    textPrimary: 'text-[#121214]',
    textSecondary: 'text-zinc-600',
    textMuted: 'text-zinc-600',
    accent: '#121214',
    accentName: '딥 차콜 (#121214)',
    borderClass: 'border-black/5',
    hairlineClass: 'border-black/10',
    hoverHighlight: 'hover:bg-black/5',
    qrBg: 'bg-[#FAFAFA]',
    dotColor: '#F5F5F4',
    isLight: true
  },
  {
    id: 'deep_forest',
    name: '딥 포레스트 (Deep Forest)',
    nameEn: 'Muted Obsidian Forest & Platinum',
    description: '절제된 다크 포레스트(#0D1914)와 소프트 플래티넘 서체, 미니멀 실버 디테일',
    canvasBg: 'bg-[#0D1914]',
    textPrimary: 'text-[#FAFAFA]',
    textSecondary: 'text-zinc-400',
    textMuted: 'text-zinc-400',
    accent: '#E4E4E7',
    accentName: '소프트 플래티넘 (#E4E4E7)',
    borderClass: 'border-white/10',
    hairlineClass: 'border-white/10',
    hoverHighlight: 'hover:bg-white/10',
    qrBg: 'bg-[#121214]',
    dotColor: '#0D1914',
    isLight: false
  },
  {
    id: 'classic_navy',
    name: '클래식 네이비 (Classic Navy)',
    nameEn: 'Midnight Slate & Platinum',
    description: '미드나잇 슬레이트(#0B101B)와 실버화이트 활자, 플래티넘 헤어라인',
    canvasBg: 'bg-[#0B101B]',
    textPrimary: 'text-[#FAFAFA]',
    textSecondary: 'text-zinc-400',
    textMuted: 'text-zinc-400',
    accent: '#E4E4E7',
    accentName: '플래티넘 실버 (#E4E4E7)',
    borderClass: 'border-white/10',
    hairlineClass: 'border-white/10',
    hoverHighlight: 'hover:bg-white/10',
    qrBg: 'bg-[#121214]',
    dotColor: '#0B101B',
    isLight: false
  }
];

export interface ResolvedThemeStyle {
  cardBg: string;
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

export function resolveThemeStyles(theme: CardTheme | undefined): ResolvedThemeStyle {
  const t = (theme || 'pure_white') as string;

  if (t === 'pure_white' || t === 'cotton') {
    return {
      cardBg: 'bg-[#F5F2EC]',
      border: 'border-[#1C1B1A]/10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.45),0_0_1px_1px_rgba(28,27,26,0.06)]',
      textPrimary: 'text-[#1C1B1A]',
      textSecondary: 'text-[#5C5955]',
      textMuted: 'text-[#5C5955]',
      accent: '#1C1B1A',
      accentHairline: 'border-[#1C1B1A]/10',
      tagline: 'text-[#1C1B1A]',
      hoverHighlight: 'hover:bg-[#1C1B1A]/5',
      sheen: 'from-[#1C1B1A]/[0.025] via-transparent to-transparent',
      qrBg: 'bg-[#FAF8F4]',
      isLight: true
    };
  }

  if (t === 'sumi_ink') {
    return {
      cardBg: 'bg-[#0A0A0B]',
      border: 'border-white/10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.85)]',
      textPrimary: 'text-[#FAFAFA]',
      textSecondary: 'text-zinc-400',
      textMuted: 'text-zinc-400',
      accent: '#FAFAFA',
      accentHairline: 'border-white/10',
      tagline: 'text-[#FAFAFA]',
      hoverHighlight: 'hover:bg-white/10',
      sheen: 'from-white/[0.04] via-transparent to-transparent',
      qrBg: 'bg-[#121214]',
      isLight: false
    };
  }

  if (t === 'warm_paper' || t === 'sand') {
    return {
      cardBg: 'bg-[#F5F5F4]',
      border: 'border-black/5 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.35),0_0_1px_1px_rgba(0,0,0,0.05)]',
      textPrimary: 'text-[#121214]',
      textSecondary: 'text-zinc-600',
      textMuted: 'text-zinc-600',
      accent: '#121214',
      accentHairline: 'border-black/10',
      tagline: 'text-[#121214]',
      hoverHighlight: 'hover:bg-black/5',
      sheen: 'from-white/60 via-transparent to-transparent',
      qrBg: 'bg-[#FAFAFA]',
      isLight: true
    };
  }

  if (t === 'deep_forest' || t === 'emerald') {
    return {
      cardBg: 'bg-[#0D1914]',
      border: 'border-white/10 shadow-2xl',
      textPrimary: 'text-[#FAFAFA]',
      textSecondary: 'text-zinc-400',
      textMuted: 'text-zinc-400',
      accent: '#E4E4E7',
      accentHairline: 'border-white/10',
      tagline: 'text-[#FAFAFA]',
      hoverHighlight: 'hover:bg-white/10',
      sheen: 'from-white/[0.04] via-transparent to-transparent',
      qrBg: 'bg-[#121214]',
      isLight: false
    };
  }

  if (t === 'classic_navy' || t === 'navy') {
    return {
      cardBg: 'bg-[#0B101B]',
      border: 'border-white/10 shadow-2xl',
      textPrimary: 'text-[#FAFAFA]',
      textSecondary: 'text-zinc-400',
      textMuted: 'text-zinc-400',
      accent: '#E4E4E7',
      accentHairline: 'border-white/10',
      tagline: 'text-zinc-200',
      hoverHighlight: 'hover:bg-white/10',
      sheen: 'from-white/[0.04] via-transparent to-transparent',
      qrBg: 'bg-[#121214]',
      isLight: false
    };
  }

  if (t === 'obsidian' || t === 'titanium' || t === 'slate') {
    return {
      cardBg: 'bg-[#121214]',
      border: 'border-zinc-800/80 shadow-2xl',
      textPrimary: 'text-[#FAFAFA]',
      textSecondary: 'text-zinc-400',
      textMuted: 'text-zinc-400',
      accent: '#FAFAFA',
      accentHairline: 'border-zinc-800/80',
      tagline: 'text-zinc-300',
      hoverHighlight: 'hover:bg-white/10',
      sheen: 'from-white/[0.03] via-transparent to-transparent',
      qrBg: 'bg-[#0A0A0B]',
      isLight: false
    };
  }

  // Default fallback (including any retired legacy theme string) -> Warm Champagne Sand (#F5F2EC)
  return {
    cardBg: 'bg-[#F5F2EC]',
    border: 'border-[#1C1B1A]/10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.45),0_0_1px_1px_rgba(28,27,26,0.06)]',
    textPrimary: 'text-[#1C1B1A]',
    textSecondary: 'text-[#5C5955]',
    textMuted: 'text-[#5C5955]',
    accent: '#1C1B1A',
    accentHairline: 'border-[#1C1B1A]/10',
    tagline: 'text-[#1C1B1A]',
    hoverHighlight: 'hover:bg-[#1C1B1A]/5',
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
  monogram_text: ''
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
