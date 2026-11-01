import React, { useState, useRef, useEffect } from 'react';
import { CardTheme } from '../types/card';
import { ChevronDown, Check } from 'lucide-react';

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
  { id: 'pure_white', label: '샴페인 샌드 (Champagne Sand)', shortLabel: '샴페인 샌드', previewClass: 'bg-[#F5F2EC] border-[#1C1B1A]/15', dotColor: '#F5F2EC', accent: '#1C1B1A', isCurated: true },
  { id: 'sumi_ink', label: '수묵 블랙 (Sumi Black)', shortLabel: '수묵 블랙', previewClass: 'bg-[#0A0A0B] border-white/15', dotColor: '#0A0A0B', accent: '#FAFAFA', isCurated: true },
  { id: 'warm_paper', label: '파인 코튼 (Fine Cotton)', shortLabel: '파인 코튼', previewClass: 'bg-[#F5F5F4] border-black/10', dotColor: '#F5F5F4', accent: '#121214', isCurated: true },
  { id: 'deep_forest', label: '딥 포레스트 (Forest)', shortLabel: '포레스트', previewClass: 'bg-[#0D1914] border-white/15', dotColor: '#0D1914', accent: '#E4E4E7', isCurated: true },
  { id: 'classic_navy', label: '클래식 네이비 (Midnight)', shortLabel: '네이비', previewClass: 'bg-[#0B101B] border-white/15', dotColor: '#0B101B', accent: '#E4E4E7', isCurated: true },
  // Classic Archivist Options
  { id: 'obsidian', label: '옵시디언 차콜', shortLabel: '차콜', previewClass: 'bg-[#121214] border-zinc-700', dotColor: '#121214', accent: '#FAFAFA' },
  { id: 'sand', label: '스톤 뉴트럴', shortLabel: '스톤', previewClass: 'bg-[#F5F5F4] border-zinc-300', dotColor: '#F5F5F4', accent: '#27272A' },
  { id: 'titanium', label: '티타늄 그레이', shortLabel: '티타늄', previewClass: 'bg-[#18181B] border-zinc-600', dotColor: '#18181B', accent: '#A1A1AA' },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onSelectTheme
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTheme = THEMES.find(t => t.id === currentTheme) || THEMES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Refined Luxury Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121214] hover:bg-white/10 border border-white/10 text-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 transition-all text-xs font-medium cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
        title="명함 피니시 및 재질 테마 선택"
        aria-expanded={isOpen}
      >
        <span 
          className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20 shrink-0"
          style={{ backgroundColor: activeTheme.dotColor }}
        />
        <span className="text-[11px] font-sans tracking-tight text-zinc-300">
          {activeTheme.label}
        </span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Bespoke Palette Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 p-2 rounded-2xl bg-[#121214]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 mb-1.5 border-b border-zinc-800/80 flex items-center justify-between">
            <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
              Curated Material Palettes
            </p>
          </div>
          
          <div className="space-y-0.5 max-h-72 overflow-y-auto no-scrollbar">
            <div className="px-2 py-1 text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">
              프리미엄 모노크롬 팔레트
            </div>
            {THEMES.filter(t => t.isCurated).map((t) => {
              const isSelected = t.id === currentTheme;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                    isSelected 
                      ? 'bg-white/10 text-white font-medium' 
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span 
                      className={`w-4 h-4 rounded-full border shadow-xs shrink-0 ${t.previewClass}`} 
                    />
                    <div className="leading-tight">
                      <span className="text-xs text-white block">{t.label}</span>
                      <span className="text-[9px] text-zinc-400 font-mono block">
                        Accent · {t.accent}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}

            <div className="px-2 pt-2.5 pb-1 text-[9px] text-zinc-400 font-semibold uppercase tracking-wider border-t border-zinc-800/80 mt-1">
              아카이브 클래식
            </div>
            {THEMES.filter(t => !t.isCurated).map((t) => {
              const isSelected = t.id === currentTheme;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                    isSelected 
                      ? 'bg-white/10 text-white font-medium' 
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span 
                      className={`w-3.5 h-3.5 rounded-full border shadow-xs shrink-0 ${t.previewClass}`} 
                    />
                    <span className="text-xs text-zinc-300">{t.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
