import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  GitMerge,
  LayoutGrid,
  List,
  Mic,
  Plus,
  Search,
  SlidersHorizontal,
  UserPlus,
  X,
} from 'lucide-react';
import type { StoredCard } from '../../types/card';
import { SORT_OPTIONS, type VaultSortOption } from '../../utils/cardSorting';
import { downloadBatchVCard } from '../../utils/cardExporter';
import type { VaultViewMode } from '../VaultView';
import { useLocale } from '../../hooks/useLocale';

export interface VaultToolbarProps {
  cardsCount: number;
  sortedCards: StoredCard[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  filterCategories: string[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onClearSearch: () => void;
  isListening: boolean;
  voiceFeedback: string | null;
  onToggleVoiceSearch: () => void;
  sortBy: VaultSortOption;
  onSortByChange: (nextSort: VaultSortOption) => void;
  viewMode: VaultViewMode;
  onViewModeChange: (mode: VaultViewMode) => void;
  isCategoryPanelOpen: boolean;
  onOpenCategoryPanel: (focusAdd?: boolean) => void;
  onOpenScan: () => void;
  duplicateGroupsCount: number;
  onOpenDuplicateModal: () => void;
  categoryScrollRef: React.RefObject<HTMLDivElement | null>;
  isInlineAdding: boolean;
  inlineInputRef: React.RefObject<HTMLInputElement | null>;
  inlineCategoryName: string;
  inlineAddError: string | null;
  onInlineCategoryNameChange: (value: string) => void;
  onClearInlineAddError: () => void;
  onStartInlineAdd: () => void;
  onCancelInlineAdd: () => void;
  onCommitInlineAdd: (e?: React.FormEvent) => void;
  onTriggerToast: (msg: string) => void;
}

export const VaultToolbar: React.FC<VaultToolbarProps> = ({
  cardsCount,
  sortedCards,
  selectedCategory,
  onSelectCategory,
  filterCategories,
  searchQuery,
  onSearchQueryChange,
  onClearSearch,
  isListening,
  voiceFeedback,
  onToggleVoiceSearch,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  isCategoryPanelOpen,
  onOpenCategoryPanel,
  onOpenScan,
  duplicateGroupsCount,
  onOpenDuplicateModal,
  categoryScrollRef,
  isInlineAdding,
  inlineInputRef,
  inlineCategoryName,
  inlineAddError,
  onInlineCategoryNameChange,
  onClearInlineAddError,
  onStartInlineAdd,
  onCancelInlineAdd,
  onCommitInlineAdd,
  onTriggerToast,
}) => {
  const { locale, t } = useLocale();
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState<boolean>(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSortDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target as Node)
      ) {
        setIsSortDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSortDropdownOpen]);

  const currentSortOption = useMemo(
    () => SORT_OPTIONS.find((opt) => opt.id === sortBy) || SORT_OPTIONS[0],
    [sortBy]
  );
  const currentSortLabel = t.vault.sortOptions[currentSortOption.id]?.label || currentSortOption.label;

  const exportLabel =
    selectedCategory !== '전체' || searchQuery.trim()
      ? t.vault.exportFiltered(sortedCards.length)
      : t.vault.exportAll(sortedCards.length);

  const handleBatchVCardExport = () => {
    const count = downloadBatchVCard(sortedCards);
    if (count > 0) {
      onTriggerToast(t.vault.exportedVcfToast(count));
    }
  };

  return (
    <header
      aria-label={t.vault.toolbarAria}
      className="w-full max-w-full min-w-0 flex flex-col gap-2.5 sm:gap-3 pb-3 border-b border-[var(--app-border)]"
    >
      {/* Row 1: Action Toolbar (Desktop: Search+Sort on Left, Actions on Right; Mobile: Actions on Top, Search+Sort Below) */}
      <div className="w-full max-w-full min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        {/* Mobile-Only Top Row: Action Cluster on Right (< sm) */}
        <div className="flex sm:hidden items-center justify-end gap-1.5 shrink-0 w-full">
          <div className="flex items-center justify-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenCategoryPanel(false)}
              aria-expanded={isCategoryPanelOpen}
              aria-label={t.vault.manageCategories}
              title={t.vault.manageCategories}
              className={`w-8.5 h-8.5 rounded-xl border text-xs font-medium shrink-0 inline-flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                isCategoryPanelOpen
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] border-transparent font-semibold'
                  : 'bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
            </button>

            <div
              role="group"
              aria-label={t.vault.viewModeAria}
              className="grid grid-cols-2 p-0.5 h-8.5 bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] shrink-0"
            >
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label={t.vault.gridView}
                title={t.vault.gridView}
                className={`w-7.5 h-full rounded-lg flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                  viewMode === 'grid'
                    ? 'bg-[var(--app-highlight)] text-[var(--app-highlight-fg)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                aria-pressed={viewMode === 'list'}
                aria-label={t.vault.listView}
                title={t.vault.listView}
                className={`w-7.5 h-full rounded-lg flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                  viewMode === 'list'
                    ? 'bg-[var(--app-highlight)] text-[var(--app-highlight-fg)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                <List className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
            </div>

            {cardsCount > 0 && (
              <button
                type="button"
                disabled={sortedCards.length === 0}
                onClick={handleBatchVCardExport}
                aria-label={exportLabel}
                title={exportLabel}
                className="w-8.5 h-8.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              >
                <UserPlus className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenScan}
              aria-label={t.vault.scanCardTitle}
              title={t.vault.scanCardTitle}
              className="h-8.5 px-2.5 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] inline-flex items-center justify-center gap-1 shadow-sm cursor-pointer active:scale-95 shrink-0 font-semibold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
              <span className="whitespace-nowrap">{t.vault.addCardMobile}</span>
            </button>
          </div>
        </div>

        {/* Search Bar + Sort Dropdown + (Desktop Action Controls) */}
        <div className="flex items-center justify-between gap-2 sm:gap-2.5 md:gap-3 w-full sm:flex-1 sm:min-w-0">
          {/* 1. Search Bar + Sort Dropdown Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto sm:flex-1 sm:justify-start min-w-0">
            <div className="relative flex-1 sm:w-52 md:w-64 lg:w-72 sm:max-w-[320px] min-w-0">
              <Search
                className={`w-3.5 h-3.5 stroke-[1.75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${
                  isListening ? 'text-rose-500' : 'text-[var(--app-text-muted)]'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder={
                  isListening
                    ? (voiceFeedback || t.vault.listeningPlaceholder)
                    : t.vault.searchPlaceholder
                }
                aria-label={t.vault.searchAria}
                className={`w-full h-9 sm:h-9.5 pl-8.5 pr-20 rounded-xl bg-[var(--app-surface)] border text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:outline-none transition-all duration-200 ${
                  isListening
                    ? 'border-rose-500/50 ring-2 ring-rose-500/20 placeholder:text-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.18)]'
                    : 'border-[var(--app-border)] focus:ring-2 focus:ring-[var(--app-accent)]/30 focus:border-[var(--app-accent)]'
                }`}
              />

              {/* Right Controls: Clear Query + Web Speech Voice Search Button */}
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={onClearSearch}
                    className="w-5 h-5 flex items-center justify-center rounded-md text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer transition-colors"
                    aria-label={t.vault.clearSearch}
                    title={t.vault.clearSearch}
                  >
                    <X className="w-3.5 h-3.5 stroke-[1.5]" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onToggleVoiceSearch}
                  aria-label={isListening ? t.vault.voiceStopAria : t.vault.voiceStartAria}
                  title={
                    isListening
                      ? t.vault.voiceStopTitle
                      : t.vault.voiceStartTitle
                  }
                  className={`h-6.5 ${isListening ? 'px-2' : 'w-6.5'} rounded-lg inline-flex items-center justify-center gap-1 text-[11px] cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                    isListening
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/40 ring-2 ring-rose-500/25 animate-pulse font-medium'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95'
                  }`}
                >
                  <Mic
                    className={`w-3.5 h-3.5 stroke-[1.75] ${
                      isListening ? 'text-rose-500 animate-bounce' : ''
                    }`}
                  />
                  {isListening && (
                    <span className="text-[9px] font-semibold text-rose-500 pl-0.5 animate-pulse hidden sm:inline">
                      {t.vault.listeningBadge}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Sort Dropdown Menu */}
            <div className="relative shrink-0" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                aria-expanded={isSortDropdownOpen}
                aria-haspopup="listbox"
                aria-label={t.vault.sortBtnAria(currentSortLabel)}
                title={t.vault.sortBtnTitle}
                className="h-9 sm:h-9.5 px-2.5 sm:px-3 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] transition-colors text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
              >
                <ArrowUpDown className="w-3.5 h-3.5 stroke-[1.75] text-[var(--app-text-muted)] shrink-0" />
                <span>{currentSortLabel}</span>
                <ChevronDown
                  className={`w-3 h-3 stroke-[2] text-[var(--app-text-muted)] transition-transform duration-200 shrink-0 ${
                    isSortDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isSortDropdownOpen && (
                <div
                  role="listbox"
                  aria-label={t.vault.sortMenuAria}
                  className={`absolute right-0 mt-1.5 ${locale === 'en' ? 'w-44' : 'w-40'} py-1.5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] z-50 animate-in fade-in zoom-in-95 duration-150`}
                >
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = sortBy === opt.id;
                    const optLabel = t.vault.sortOptions[opt.id]?.label || opt.label;
                    return (
                      <button
                        key={opt.id}
                        role="option"
                        aria-selected={isSelected}
                        type="button"
                        onClick={() => {
                          onSortByChange(opt.id);
                          setIsSortDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-[var(--app-highlight)] text-[var(--app-highlight-fg)] font-semibold'
                            : 'text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
                        }`}
                      >
                        <span className="leading-snug truncate">{optLabel}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Action Controls (Category Manage, View Switcher, Add Card) */}
          <div className="hidden sm:flex items-center justify-end gap-2 md:gap-2.5 shrink-0">
            {/* 2. Category Management Button */}
            <button
              type="button"
              onClick={() => onOpenCategoryPanel(false)}
              aria-expanded={isCategoryPanelOpen}
              aria-label={t.vault.manageCategories}
              title={t.vault.manageCategories}
              className={`w-9 sm:w-9.5 h-9 sm:h-9.5 rounded-xl border text-xs font-medium shrink-0 inline-flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                isCategoryPanelOpen
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] border-transparent font-semibold'
                  : 'bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
            </button>

            {/* 3. Grid/List View Switcher Button */}
            <div
              role="group"
              aria-label={t.vault.viewModeAria}
              className="grid grid-cols-2 p-0.5 h-9 sm:h-9.5 bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] shrink-0"
            >
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label={t.vault.gridView}
                title={t.vault.gridView}
                className={`w-8 sm:w-8.5 h-full rounded-lg flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                  viewMode === 'grid'
                    ? 'bg-[var(--app-highlight)] text-[var(--app-highlight-fg)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                aria-pressed={viewMode === 'list'}
                aria-label={t.vault.listView}
                title={t.vault.listView}
                className={`w-8 sm:w-8.5 h-full rounded-lg flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                  viewMode === 'list'
                    ? 'bg-[var(--app-highlight)] text-[var(--app-highlight-fg)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                <List className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
            </div>

            {/* 4. Icon-only Batch .vcf Export Button */}
            {cardsCount > 0 && (
              <button
                type="button"
                disabled={sortedCards.length === 0}
                onClick={handleBatchVCardExport}
                aria-label={exportLabel}
                title={exportLabel}
                className="w-9 sm:w-9.5 h-9 sm:h-9.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              >
                <UserPlus className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
              </button>
            )}

            {/* 5. "+ Add Card" Primary CTA Button */}
            <button
              type="button"
              onClick={onOpenScan}
              aria-label={t.vault.scanCardTitle}
              title={t.vault.scanCardTitle}
              className="h-9 sm:h-9.5 px-3 sm:px-3.5 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95 shrink-0 font-semibold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
              <span className="whitespace-nowrap">{t.vault.addCardDesktop}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate Contact Cleanup Bar (only shown when duplicates exist) */}
      {duplicateGroupsCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onOpenDuplicateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--app-highlight)] hover:opacity-90 border border-[var(--app-border)] text-[var(--app-highlight-fg)] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <GitMerge className="w-3.5 h-3.5 stroke-[1.8] shrink-0" />
            <span className="tabular-nums">{t.vault.duplicatesFound(duplicateGroupsCount)}</span>
          </button>
        </div>
      )}

      {/* Row 3: Dedicated Full-Width Horizontal Scrolling Track for Category Filter Chips */}
      <div className="w-full max-w-full min-w-0">
        <div
          ref={categoryScrollRef}
          role="tablist"
          aria-label={t.vault.categoryFilterAria}
          className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide overscroll-x-contain touch-pan-x touch-pinch-zoom flex items-center gap-2 py-1.5 px-0.5"
        >
          {filterCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const displayCat = cat === '전체' ? t.vault.categoryAllLabel : cat;

            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={(e) => {
                  onSelectCategory(cat);
                  e.currentTarget.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'nearest',
                    block: 'nearest',
                  });
                }}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0 text-xs transition-colors cursor-pointer font-medium touch-pan-x touch-pinch-zoom focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                  isSelected
                    ? 'bg-[var(--app-highlight)] text-[var(--app-highlight-fg)] font-semibold shadow-xs border border-transparent'
                    : 'bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)]'
                }`}
              >
                <span>{displayCat}</span>
              </button>
            );
          })}

          {/* Append `+` Add Category Pill Button OR Inline Category Input at the end of the scroll container */}
          {isInlineAdding ? (
            <form
              onSubmit={onCommitInlineAdd}
              className="min-h-[36px] pl-3 pr-1.5 py-1 rounded-full bg-[var(--app-surface)] border border-[var(--app-accent)] inline-flex items-center gap-1 shrink-0 touch-pan-x touch-pinch-zoom"
            >
              <input
                ref={inlineInputRef}
                type="text"
                maxLength={20}
                value={inlineCategoryName}
                onChange={(e) => {
                  onInlineCategoryNameChange(e.target.value);
                  if (inlineAddError) onClearInlineAddError();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancelInlineAdd();
                  }
                }}
                placeholder={t.vault.newCategoryPlaceholder}
                aria-label={t.vault.newCategoryAria}
                className="w-28 sm:w-32 bg-transparent text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:outline-none touch-pan-x touch-pinch-zoom"
              />
              <button
                type="submit"
                disabled={!inlineCategoryName.trim()}
                aria-label={t.vault.saveCategoryAria}
                title={t.common.save}
                className="w-6 h-6 rounded-full bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-35 text-[var(--app-accent-fg)] flex items-center justify-center cursor-pointer shrink-0 touch-pan-x touch-pinch-zoom"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
              <button
                type="button"
                onClick={onCancelInlineAdd}
                aria-label={t.vault.cancelCategoryAria}
                title={t.common.cancel}
                className="w-6 h-6 rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] flex items-center justify-center cursor-pointer shrink-0 touch-pan-x touch-pinch-zoom"
              >
                <X className="w-3.5 h-3.5 stroke-[1.75]" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={onStartInlineAdd}
              aria-label={t.vault.addCategoryAria}
              title={t.vault.addCategoryAria}
              className="min-h-[36px] px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-dashed border-[var(--app-border)] transition-colors cursor-pointer inline-flex items-center gap-1 touch-pan-x touch-pinch-zoom focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" />
              <span>{t.vault.addCategoryBtn}</span>
            </button>
          )}

          {/* Trailing flex spacer prevents right-edge clipping on mobile WebKit/Blink */}
          <span className="w-2 shrink-0" aria-hidden="true" />
        </div>

        {inlineAddError && (
          <p role="alert" className="mt-1 text-[11px] text-rose-500 pl-1">
            {inlineAddError}
          </p>
        )}
      </div>
    </header>
  );
};
