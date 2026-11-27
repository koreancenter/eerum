import React from 'react';
import { useLocale } from '../hooks/useLocale';

interface LocaleToggleProps {
  className?: string;
}

export const LocaleToggle: React.FC<LocaleToggleProps> = ({ className = '' }) => {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="group"
      aria-label={t.header.languageToggleAria}
      className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-xs font-medium tracking-wider select-none shrink-0 ${className}`}
    >
      <button
        type="button"
        onClick={() => setLocale('ko')}
        aria-pressed={locale === 'ko'}
        className={`px-1 py-0.5 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
          locale === 'ko'
            ? 'text-[var(--app-text)] font-semibold'
            : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
        }`}
      >
        KO
      </button>
      <span aria-hidden="true" className="text-[var(--app-text-muted)]/40 text-[10px]">
        |
      </span>
      <button
        type="button"
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        className={`px-1 py-0.5 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
          locale === 'en'
            ? 'text-[var(--app-text)] font-semibold'
            : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
        }`}
      >
        EN
      </button>
    </div>
  );
};
