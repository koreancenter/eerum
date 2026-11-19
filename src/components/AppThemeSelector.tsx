import React, { useState, useRef, useEffect } from 'react';
import {
  APP_THEMES,
  APP_THEME_UPDATED_EVENT,
  type AppThemeId,
  applyAppTheme,
  getAppThemeDefinition,
  loadStoredAppTheme,
} from '../constants/appThemes';

interface DuotoneSwatchProps {
  accent: string;
  highlight: string;
  size?: 'sm' | 'md';
}

const DuotoneSwatch: React.FC<DuotoneSwatchProps> = ({ accent, highlight, size = 'sm' }) => {
  const dimClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <span
      aria-hidden="true"
      className={`${dimClass} rounded-full shrink-0 inline-block overflow-hidden ring-1 ring-[var(--app-border)]`}
      style={{
        background: `linear-gradient(135deg, ${accent} 50%, ${highlight} 50%)`,
      }}
    />
  );
};

export interface AppThemeSelectorProps {
  onThemeChange?: (themeId: AppThemeId) => void;
}

export const AppThemeSelector: React.FC<AppThemeSelectorProps> = ({ onThemeChange }) => {
  const [currentTheme, setCurrentTheme] = useState<AppThemeId>(() => loadStoredAppTheme());
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync dataset.appTheme and theme-color on initial mount & external updates
  useEffect(() => {
    applyAppTheme(currentTheme, false);
  }, [currentTheme]);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const next = (e as CustomEvent<AppThemeId>).detail;
      if (next) setCurrentTheme(next);
    };
    window.addEventListener(APP_THEME_UPDATED_EVENT, handleSync);
    return () => window.removeEventListener(APP_THEME_UPDATED_EVENT, handleSync);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const activeTheme = getAppThemeDefinition(currentTheme);

  const handleSelect = (themeId: AppThemeId) => {
    setCurrentTheme(themeId);
    applyAppTheme(themeId, true);
    setIsOpen(false);
    onThemeChange?.(themeId);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`앱 화면 테마: ${activeTheme.labelKr} (${activeTheme.labelEn})`}
        className="group relative p-2 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] inline-flex items-center justify-center cursor-pointer active:scale-95 shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
      >
        <DuotoneSwatch accent={activeTheme.accent} highlight={activeTheme.highlight} size="sm" />
        {!isOpen && (
          <span
            role="tooltip"
            className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 px-2.5 py-1 rounded-lg bg-[var(--app-text)] text-[var(--app-bg)] text-[11px] font-medium whitespace-nowrap shadow-md opacity-0 translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 transition-all duration-150"
          >
            {activeTheme.labelKr}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="앱 화면 테마 컬러셋"
          className="absolute right-0 top-full mt-2 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5"
        >
          {APP_THEMES.map((theme, index) => {
            const isSelected = theme.id === currentTheme;
            const tooltipAlignClass =
              index === 0
                ? 'left-0'
                : index === APP_THEMES.length - 1
                  ? 'right-0'
                  : 'left-1/2 -translate-x-1/2';

            return (
              <button
                key={theme.id}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                aria-label={`${theme.labelKr} (${theme.labelEn})`}
                onClick={() => handleSelect(theme.id)}
                className={`group relative w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                  isSelected
                    ? 'bg-[var(--app-highlight)] ring-2 ring-[var(--app-accent)]'
                    : 'hover:bg-[var(--app-surface-subtle)]'
                }`}
              >
                <DuotoneSwatch accent={theme.accent} highlight={theme.highlight} size="md" />
                <span
                  role="tooltip"
                  className={`pointer-events-none absolute top-full ${tooltipAlignClass} mt-2 z-50 px-2.5 py-1 rounded-lg bg-[var(--app-text)] text-[var(--app-bg)] text-[11px] font-medium whitespace-nowrap shadow-md opacity-0 translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 transition-all duration-150`}
                >
                  {theme.labelKr}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AppThemeSelector;
