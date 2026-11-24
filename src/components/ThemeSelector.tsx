import React, { useState, useRef, useEffect } from 'react';
import { CardTheme } from '../types/card';

interface ThemeSelectorProps {
  currentTheme: CardTheme;
  onSelectTheme: (theme: CardTheme) => void;
}

export const THEMES: {
  id: CardTheme;
  label: string;
  shortLabel: string;
  previewClass: string;
  dotColor: string;
  accent: string;
  isCurated?: boolean;
}[] = [
  // Curated Luxury Material Themes
  { id: 'pure_white', label: '샴페인 샌드 (Champagne Sand)', shortLabel: '샴페인 샌드', previewClass: 'bg-[#F5F2EC] border-[#1C1B1A]/20', dotColor: '#F5F2EC', accent: '#1C1B1A', isCurated: true },
  { id: 'sumi_ink', label: '수묵 블랙 (Sumi Black)', shortLabel: '수묵 블랙', previewClass: 'bg-[#0A0A0B] border-white/25', dotColor: '#0A0A0B', accent: '#FAFAFA', isCurated: true },
  { id: 'warm_paper', label: '파인 코튼 (Fine Cotton)', shortLabel: '파인 코튼', previewClass: 'bg-[#F5F5F4] border-black/15', dotColor: '#F5F5F4', accent: '#121214', isCurated: true },
  { id: 'deep_forest', label: '딥 포레스트 (Forest)', shortLabel: '포레스트', previewClass: 'bg-[#0D1914] border-white/20', dotColor: '#0D1914', accent: '#E4E4E7', isCurated: true },
  { id: 'classic_navy', label: '클래식 네이비 (Midnight)', shortLabel: '네이비', previewClass: 'bg-[#0B101B] border-white/20', dotColor: '#0B101B', accent: '#E4E4E7', isCurated: true },
  // Classic Archivist Options
  { id: 'obsidian', label: '옵시디언 차콜 (Obsidian)', shortLabel: '차콜', previewClass: 'bg-[#121214] border-zinc-600', dotColor: '#121214', accent: '#FAFAFA' },
  { id: 'sand', label: '스톤 뉴트럴 (Stone Neutral)', shortLabel: '스톤', previewClass: 'bg-[#E7E5E4] border-zinc-400', dotColor: '#E7E5E4', accent: '#27272A' },
  { id: 'titanium', label: '티타늄 그레이 (Titanium)', shortLabel: '티타늄', previewClass: 'bg-[#27272A] border-zinc-500', dotColor: '#27272A', accent: '#A1A1AA' },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onSelectTheme,
}) => {
  const [tappedTooltipId, setTappedTooltipId] = useState<CardTheme | null>(null);
  const tooltipTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current !== null) {
        window.clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  const handleSelect = (themeId: CardTheme) => {
    onSelectTheme(themeId);
    setTappedTooltipId(themeId);
    if (tooltipTimerRef.current !== null) {
      window.clearTimeout(tooltipTimerRef.current);
    }
    tooltipTimerRef.current = window.setTimeout(() => {
      setTappedTooltipId(null);
      tooltipTimerRef.current = null;
    }, 1400);
  };

  return (
    <div
      role="radiogroup"
      aria-label="명함 재질 컬러셋 선택"
      className="inline-flex items-center justify-center gap-1 sm:gap-2 max-w-full"
    >
      {THEMES.map((t, index) => {
        const isSelected = t.id === currentTheme;
        const isTappedTooltip = tappedTooltipId === t.id;
        const tooltipAlignClass =
          index <= 1
            ? 'left-0'
            : index >= THEMES.length - 2
              ? 'right-0'
              : 'left-1/2 -translate-x-1/2';

        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={t.label}
            title={t.label}
            onClick={() => handleSelect(t.id)}
            className="group relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-[var(--app-surface-subtle)] active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-text)]/40"
          >
            <span
              aria-hidden="true"
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border transition-all duration-200 ${
                t.previewClass
              } ${
                isSelected
                  ? 'ring-[1.5px] ring-[var(--app-text)]/70 ring-offset-2 ring-offset-[var(--app-bg)] opacity-100'
                  : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'
              }`}
            />
            <span
              role="tooltip"
              className={`pointer-events-none absolute bottom-full ${tooltipAlignClass} mb-1.5 z-50 px-2.5 py-1 rounded-lg bg-[var(--app-text)] text-[var(--app-bg)] text-[11px] font-medium whitespace-nowrap shadow-md transition-all duration-150 ${
                isTappedTooltip
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0'
              }`}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

