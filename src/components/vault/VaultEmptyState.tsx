import React from 'react';
import { Camera, Plus, UserPlus } from 'lucide-react';
import { useLocale } from '../../hooks/useLocale';

type VaultEmptyStateProps =
  | {
      variant: 'onboarding';
      onOpenImportContacts?: () => void;
      onOpenScan: () => void;
      onOpenEditor: () => void;
    }
  | {
      variant: 'filtered';
      selectedCategory: string;
      searchQuery: string;
      onOpenScan: () => void;
    };

export const VaultEmptyState: React.FC<VaultEmptyStateProps> = (props) => {
  const { t } = useLocale();

  if (props.variant === 'onboarding') {
    return (
      <section
        aria-label={t.vault.onboardingAria}
        className="w-full max-w-4xl mx-auto py-8 sm:py-14 px-1 flex flex-col items-center animate-in fade-in duration-300"
      >
        <div className="text-center max-w-md px-2">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--app-text)]">
            {t.vault.onboardingTitle}
          </h2>
          <p className="text-xs text-[var(--app-text-muted)] mt-1.5 leading-relaxed">
            {t.vault.onboardingDesc}
          </p>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
          <button
            type="button"
            onClick={() => props.onOpenImportContacts?.()}
            className="group text-left p-5 sm:p-6 rounded-2xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] hover:border-[var(--app-text-muted)]/35 shadow-[var(--app-shadow)] transition-all duration-200 cursor-pointer active:scale-[0.99] flex flex-col items-start gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <span className="w-10 h-10 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-fg)] flex items-center justify-center shrink-0">
              <UserPlus className="w-4.5 h-4.5 stroke-[1.75]" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--app-text)] tracking-tight">
                {t.vault.importContactsTitle}
              </h3>
              <p className="text-xs text-[var(--app-text-muted)] mt-1 leading-relaxed">
                {t.vault.importContactsDesc}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={props.onOpenScan}
            className="group text-left p-5 sm:p-6 rounded-2xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] hover:border-[var(--app-text-muted)]/35 shadow-[var(--app-shadow)] transition-all duration-200 cursor-pointer active:scale-[0.99] flex flex-col items-start gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <span className="w-10 h-10 rounded-xl bg-[var(--app-highlight)] text-[var(--app-highlight-fg)] flex items-center justify-center shrink-0">
              <Camera className="w-4.5 h-4.5 stroke-[1.75]" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--app-text)] tracking-tight">
                {t.vault.scanCardCardTitle}
              </h3>
              <p className="text-xs text-[var(--app-text-muted)] mt-1 leading-relaxed">
                {t.vault.scanCardCardDesc}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={props.onOpenEditor}
            className="group text-left p-5 sm:p-6 rounded-2xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] hover:border-[var(--app-text-muted)]/35 shadow-[var(--app-shadow)] transition-all duration-200 cursor-pointer active:scale-[0.99] flex flex-col items-start gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <span className="w-10 h-10 rounded-xl bg-[var(--app-surface-subtle)] group-hover:bg-[var(--app-highlight)] text-[var(--app-text)] group-hover:text-[var(--app-highlight-fg)] border border-[var(--app-border)] group-hover:border-transparent flex items-center justify-center shrink-0 transition-colors">
              <Plus className="w-4.5 h-4.5 stroke-[1.75]" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--app-text)] tracking-tight">
                {t.vault.manualEntryTitle}
              </h3>
              <p className="text-xs text-[var(--app-text-muted)] mt-1 leading-relaxed">
                {t.vault.manualEntryDesc}
              </p>
            </div>
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="py-20 text-center space-y-3 p-8 rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)]">
      <p className="text-sm font-semibold text-[var(--app-text)]">
        {props.selectedCategory !== '전체' && !props.searchQuery.trim()
          ? t.vault.emptyCategoryTitle(props.selectedCategory)
          : t.vault.emptySearchTitle}
      </p>
      <p className="text-xs text-[var(--app-text-muted)]">
        {t.vault.emptyFilteredDesc}
      </p>
      <button
        type="button"
        onClick={props.onOpenScan}
        className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-fg)] text-xs font-semibold hover:opacity-90 cursor-pointer"
      >
        <Plus className="w-4 h-4 stroke-[2]" />
        <span>{t.vault.emptyFilteredCta}</span>
      </button>
    </div>
  );
};
