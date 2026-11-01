import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StoredCard } from '../types/card';
import {
  Search,
  LayoutGrid,
  List,
  Lock,
  KeyRound,
  X,
  Plus,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { PhotoArchiveModal } from './PhotoArchiveModal';
import {
  VaultCardItem,
  VaultCardListRow,
  VaultCardMobileListItem,
} from './VaultCardItem';
import { CategoryManagementPanel } from './CategoryManagementPanel';
import {
  CATEGORIES_UPDATED_EVENT,
  loadVaultCategories,
  addVaultCategory,
  renameVaultCategory,
  mergeVaultCategories,
  deleteVaultCategory,
  resetVaultCategories,
} from '../utils/categories';

const SEARCH_DEBOUNCE_MS = 180;

interface VaultViewProps {
  cards: StoredCard[];
  onSelectCard: (card: StoredCard) => void;
  onEditCard: (card: StoredCard) => void;
  onDeleteCard: (cardId: string) => void;
  onExportCard: (card: StoredCard) => void;
  onOpenScan: () => void;
  onOpenEditor: () => void;
  onOpenSync?: () => void;
  isLocked?: boolean;
  onUnlockRequest?: () => void;
  onRenameCategory?: (oldName: string, newName: string) => void;
  onMergeCategories?: (sourceCategory: string, targetCategory: string) => void;
  onDeleteCategory?: (deletedName: string, fallbackCategory: string) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  cards,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onExportCard,
  onOpenScan,
  isLocked = false,
  onUnlockRequest,
  onRenameCategory,
  onMergeCategories,
  onDeleteCategory,
}) => {
  const cardsRef = useRef<StoredCard[]>(cards);
  cardsRef.current = cards;

  // Dynamic categories persisted in localStorage
  const [categories, setCategories] = useState<string[]>(() =>
    loadVaultCategories(cards)
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [photoArchiveCardId, setPhotoArchiveCardId] = useState<string | null>(null);

  // Inline `+` Add Category Input State inside the horizontal category scroll bar
  const [isInlineAdding, setIsInlineAdding] = useState<boolean>(false);
  const [inlineCategoryName, setInlineCategoryName] = useState<string>('');
  const [inlineAddError, setInlineAddError] = useState<string | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Category Management Panel State
  const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState<boolean>(false);
  const [focusAddInPanel, setFocusAddInPanel] = useState<boolean>(false);

  // Sync dynamic categories from storage and card changes
  useEffect(() => {
    const syncCategories = () => {
      setCategories(loadVaultCategories(cardsRef.current));
    };
    syncCategories();
    window.addEventListener(CATEGORIES_UPDATED_EVENT, syncCategories);
    return () => window.removeEventListener(CATEGORIES_UPDATED_EVENT, syncCategories);
  }, [cards]);

  // Ensure selectedCategory falls back to '전체' if removed externally
  useEffect(() => {
    if (selectedCategory !== '전체' && !categories.includes(selectedCategory)) {
      setSelectedCategory('전체');
    }
  }, [selectedCategory, categories]);

  // Debounce searchQuery updates to prevent full list re-filtering & item re-renders on every keystroke
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Keep latest prop callbacks in a ref so memoized item handlers maintain permanently stable identities
  const latestHandlersRef = useRef({
    onSelectCard,
    onEditCard,
    onDeleteCard,
    onExportCard,
  });
  latestHandlersRef.current = {
    onSelectCard,
    onEditCard,
    onDeleteCard,
    onExportCard,
  };

  const handleSelectCard = useCallback((card: StoredCard) => {
    latestHandlersRef.current.onSelectCard(card);
  }, []);

  const handleEditCard = useCallback((card: StoredCard) => {
    latestHandlersRef.current.onEditCard(card);
  }, []);

  const handleDeleteCard = useCallback((cardId: string) => {
    latestHandlersRef.current.onDeleteCard(cardId);
  }, []);

  const handleExportCard = useCallback((card: StoredCard) => {
    latestHandlersRef.current.onExportCard(card);
  }, []);

  const handleOpenPhotoArchive = useCallback((card: StoredCard) => {
    setPhotoArchiveCardId(card.id);
  }, []);

  const handleClosePhotoArchive = useCallback(() => {
    setPhotoArchiveCardId(null);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  }, []);

  const photoArchiveCard = useMemo(
    () => (photoArchiveCardId ? cards.find((c) => c.id === photoArchiveCardId) || null : null),
    [cards, photoArchiveCardId]
  );

  const filterCategories = useMemo(
    () => ['전체', ...categories],
    [categories]
  );

  // Single-pass memoized category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 전체: cards.length };
    for (const cat of categories) {
      counts[cat] = 0;
    }
    for (let i = 0; i < cards.length; i++) {
      const cat = cards[i].category;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    return counts;
  }, [cards, categories]);

  // Memoized search + category filter using debounced search query
  const filteredCards = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    const isAllCategories = selectedCategory === '전체';

    if (isAllCategories && !q) {
      return cards;
    }

    return cards.filter((c) => {
      if (!isAllCategories && c.category !== selectedCategory) {
        return false;
      }
      if (!q) {
        return true;
      }

      const d = c.data;
      return (
        d.name.toLowerCase().includes(q) ||
        Boolean(d.nameEn && d.nameEn.toLowerCase().includes(q)) ||
        d.nameKr.toLowerCase().includes(q) ||
        d.organization.toLowerCase().includes(q) ||
        d.organizationKr.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.titleKr.toLowerCase().includes(q) ||
        Boolean(c.notes && c.notes.toLowerCase().includes(q))
      );
    });
  }, [cards, selectedCategory, debouncedSearchQuery]);

  // Inline `+` Pill Add Category Handlers
  const handleStartInlineAdd = useCallback(() => {
    setInlineAddError(null);
    setInlineCategoryName('');
    setIsInlineAdding(true);
    window.setTimeout(() => {
      if (categoryScrollRef.current) {
        categoryScrollRef.current.scrollTo({
          left: categoryScrollRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
      inlineInputRef.current?.focus();
    }, 40);
  }, []);

  const handleCancelInlineAdd = useCallback(() => {
    setIsInlineAdding(false);
    setInlineCategoryName('');
    setInlineAddError(null);
  }, []);

  const handleCommitInlineAdd = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const res = addVaultCategory(inlineCategoryName, cardsRef.current);
      if (!res.ok || !res.added) {
        setInlineAddError(res.error || '카테고리를 추가할 수 없습니다.');
        return;
      }
      setCategories(res.categories);
      setSelectedCategory(res.added);
      setIsInlineAdding(false);
      setInlineCategoryName('');
      setInlineAddError(null);
    },
    [inlineCategoryName]
  );

  // Category Management Panel Callbacks
  const openCategoryPanel = useCallback((focusAdd = false) => {
    setIsInlineAdding(false);
    setInlineAddError(null);
    setFocusAddInPanel(focusAdd);
    setIsCategoryPanelOpen(true);
  }, []);

  const closeCategoryPanel = useCallback(() => {
    setIsCategoryPanelOpen(false);
    setFocusAddInPanel(false);
  }, []);

  const handlePanelAddCategory = useCallback(
    (rawName: string) => {
      const res = addVaultCategory(rawName, cardsRef.current);
      if (res.ok && res.added) {
        setCategories(res.categories);
        setSelectedCategory(res.added);
      }
      return res;
    },
    []
  );

  const handlePanelRenameCategory = useCallback(
    (oldName: string, newName: string) => {
      const snapshot = cardsRef.current;
      const trimmed = newName.trim();
      const preCheck = renameVaultCategory(oldName, trimmed, snapshot);
      if (!preCheck.ok || !preCheck.renamed) {
        return preCheck;
      }

      const renamed = preCheck.renamed;
      cardsRef.current = snapshot.map((c) =>
        c.category === oldName ? { ...c, category: renamed } : c
      );
      setCategories(preCheck.categories);

      if (selectedCategory === oldName) {
        setSelectedCategory(renamed);
      }
      onRenameCategory?.(oldName, renamed);
      return preCheck;
    },
    [selectedCategory, onRenameCategory]
  );

  const handlePanelMergeCategories = useCallback(
    (sourceCategory: string, targetCategory: string) => {
      const snapshot = cardsRef.current;
      const res = mergeVaultCategories(sourceCategory, targetCategory, snapshot);
      if (!res.ok || !res.target) {
        return res;
      }

      const resolvedTarget = res.target;
      cardsRef.current = snapshot.map((c) =>
        c.category === sourceCategory ? { ...c, category: resolvedTarget } : c
      );
      setCategories(res.categories);

      if (selectedCategory === sourceCategory) {
        setSelectedCategory(resolvedTarget);
      }
      onMergeCategories?.(sourceCategory, resolvedTarget);
      return res;
    },
    [selectedCategory, onMergeCategories]
  );

  const handlePanelDeleteCategory = useCallback(
    (targetCategory: string) => {
      const snapshot = cardsRef.current;
      const res = deleteVaultCategory(targetCategory, snapshot);
      if (!res.ok) {
        return res;
      }

      cardsRef.current = snapshot.map((c) =>
        c.category === targetCategory ? { ...c, category: res.fallback } : c
      );
      setCategories(res.categories);

      if (selectedCategory === targetCategory) {
        setSelectedCategory(res.movedCount > 0 ? res.fallback : '전체');
      }
      onDeleteCategory?.(targetCategory, res.fallback);
      return res;
    },
    [selectedCategory, onDeleteCategory]
  );

  const handlePanelResetCategories = useCallback(() => {
    resetVaultCategories();
    setCategories(loadVaultCategories(cardsRef.current));
  }, []);

  if (isLocked) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-5 shadow-2xl">
          <Lock className="w-7 h-7 stroke-[1.5]" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">명함 보관함이 잠겨 있습니다</h3>
        <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
          공용 기기 및 타인의 무단 열람을 방지하기 위해 보관함이 4자리 보안 PIN으로 보호되고 있습니다.
        </p>
        <button
          type="button"
          onClick={onUnlockRequest}
          className="px-6 py-3 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
        >
          <KeyRound className="w-4 h-4 stroke-[1.75] text-neutral-900" />
          <span>보안 PIN 입력하여 잠금 해제</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto flex flex-col gap-3 sm:gap-3.5 animate-in fade-in duration-300">
      {/* Structured 3-Row Header Control Layout on Mobile (Row 1: Search, Row 2: Right Action Bar, Row 3: Category Scroll Track) */}
      <div
        role="region"
        aria-label="명함 보관함 검색 및 필터 도구 모음"
        className="w-full min-w-0 flex flex-col gap-3 pb-3 border-b border-white/10"
      >
        {/* Row 1 & Row 2 Wrapper: Stacked on Mobile (flex-col gap-3), Side-by-Side on sm+ */}
        <div className="w-full min-w-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Row 1: Full-Width Search Input */}
          <div className="relative w-full min-w-0 sm:max-w-md">
            <Search className="w-4 h-4 stroke-[1.5] text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 회사, 직함, 메모 검색"
              aria-label="명함 보관함 검색"
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-[#121214] border border-white/10 text-xs text-neutral-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="검색어 지우기"
                title="검색어 지우기"
              >
                <X className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
            )}
          </div>

          {/* Row 2: Right-Aligned Action Bar ([Grid/List Toggle] + [+ Add Card Button]) */}
          <div className="w-full sm:w-auto flex items-center justify-end gap-2.5 shrink-0">
            <div
              role="group"
              aria-label="보관함 보기 방식"
              className="grid grid-cols-2 p-0.5 h-9 sm:h-10 bg-[#121214] rounded-xl border border-white/10 shrink-0"
            >
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                aria-label="카드 뷰"
                title="카드 뷰"
                className={`w-9 h-full rounded-lg flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                  viewMode === 'cards'
                    ? 'bg-white/12 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4 stroke-[1.5]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label="리스트 뷰"
                title="리스트 뷰"
                className={`w-9 h-full rounded-lg flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                  viewMode === 'list'
                    ? 'bg-white/12 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenScan}
              aria-label="실물 명함 사진 등록"
              title="실물 명함 사진 등록"
              className="h-9 sm:h-10 px-3.5 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95 shrink-0 font-semibold text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
              <span className="whitespace-nowrap">명함 추가</span>
            </button>
          </div>
        </div>

        {/* Row 3: Dedicated Full-Width Horizontal Scrolling Track for Category Filter Chips */}
        <div className="w-full min-w-0 space-y-1.5">
          <div
            ref={categoryScrollRef}
            role="tablist"
            aria-label="보관함 카테고리 필터"
            className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide touch-pan-x flex items-center gap-2 py-2 px-1"
          >
            {filterCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = categoryCounts[cat] ?? 0;

              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0 text-xs transition-colors cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                    isSelected
                      ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                      : 'bg-[#121214] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`ml-1.5 text-[10px] font-mono tabular-nums ${
                      isSelected ? 'text-neutral-900/80 font-bold' : 'text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Append `+` Add Category Pill Button OR Inline Category Input at the end of the scroll container */}
            {isInlineAdding ? (
              <form
                onSubmit={handleCommitInlineAdd}
                className="min-h-[36px] pl-3 pr-1.5 py-1 rounded-full bg-[#161618] border border-white/25 inline-flex items-center gap-1 shrink-0"
              >
                <input
                  ref={inlineInputRef}
                  type="text"
                  maxLength={20}
                  value={inlineCategoryName}
                  onChange={(e) => {
                    setInlineCategoryName(e.target.value);
                    if (inlineAddError) setInlineAddError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      handleCancelInlineAdd();
                    }
                  }}
                  placeholder="새 카테고리명"
                  aria-label="새 카테고리 이름 입력"
                  className="w-28 sm:w-32 bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inlineCategoryName.trim()}
                  aria-label="카테고리 저장"
                  title="저장"
                  className="w-6 h-6 rounded-full bg-white hover:bg-zinc-200 disabled:opacity-35 text-neutral-950 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelInlineAdd}
                  aria-label="추가 취소"
                  title="취소"
                  className="w-6 h-6 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5 stroke-[1.75]" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={handleStartInlineAdd}
                aria-label="새 카테고리 추가"
                title="새 카테고리 추가"
                className="min-h-[36px] px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 text-xs text-zinc-300 hover:text-white bg-[#121214] hover:bg-white/10 border border-dashed border-white/20 hover:border-white/35 transition-colors cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2]" />
                <span>추가</span>
              </button>
            )}

            <span className="w-px h-4 bg-white/10 shrink-0 mx-0.5" aria-hidden="true" />

            {/* Category Management Panel Trigger (Edit / Merge / Delete Categories) */}
            <button
              type="button"
              onClick={() => openCategoryPanel(false)}
              aria-expanded={isCategoryPanelOpen}
              aria-label="카테고리 관리 패널 열기"
              title="카테고리 이름 변경·병합·삭제 관리"
              className={`min-h-[36px] px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                isCategoryPanelOpen
                  ? 'bg-white text-neutral-950 border-white font-semibold'
                  : 'bg-[#121214] hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>관리</span>
            </button>
          </div>

          {inlineAddError && (
            <p role="alert" className="text-[11px] text-amber-300/90 pl-1">
              {inlineAddError}
            </p>
          )}
        </div>
      </div>

      {/* Content Rendering: Cards Grid or List Table */}
      {filteredCards.length === 0 ? (
        <div className="py-20 text-center space-y-3 p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/60">
          <p className="text-sm font-semibold text-neutral-300">
            {selectedCategory !== '전체' && !debouncedSearchQuery
              ? `'${selectedCategory}' 카테고리에 등록된 명함이 없습니다.`
              : '검색 조건에 일치하는 명함이 없습니다.'}
          </p>
          <p className="text-xs text-zinc-400">실물 명함 사진을 촬영하거나 새 명함을 등록해 보세요.</p>
          <button
            type="button"
            onClick={onOpenScan}
            className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white text-neutral-950 text-xs font-semibold hover:bg-zinc-200 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span>실물 명함 등록</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* ================= CARDS GALLERY VIEW ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5 min-w-0">
          {filteredCards.map((card) => (
            <VaultCardItem
              key={card.id}
              card={card}
              onSelectCard={handleSelectCard}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
              onExportCard={handleExportCard}
              onOpenPhotoArchive={handleOpenPhotoArchive}
            />
          ))}
        </div>
      ) : (
        /* ================= EDITORIAL LIST VIEW (Compact Mobile Rows + Desktop Table) ================= */
        <div className="rounded-xl sm:rounded-2xl border border-zinc-800/80 bg-[#121214] overflow-hidden shadow-xl">
          {/* Mobile Compact Horizontal List Items (< md) */}
          <div className="md:hidden divide-y divide-zinc-800/80">
            {filteredCards.map((card) => (
              <VaultCardMobileListItem
                key={card.id}
                card={card}
                onSelectCard={handleSelectCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
                onExportCard={handleExportCard}
                onOpenPhotoArchive={handleOpenPhotoArchive}
              />
            ))}
          </div>

          {/* Desktop Editorial Table (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-[#0A0A0B] text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">성명</th>
                  <th className="py-2.5 px-3.5">직함</th>
                  <th className="py-2.5 px-3.5">소속 회사/기관</th>
                  <th className="py-2.5 px-3.5">카테고리</th>
                  <th className="py-2.5 px-3.5">실물 보관</th>
                  <th className="py-2.5 px-3.5">연락처</th>
                  <th className="py-2.5 px-3.5 text-right">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-neutral-300">
                {filteredCards.map((card) => (
                  <VaultCardListRow
                    key={card.id}
                    card={card}
                    onSelectCard={handleSelectCard}
                    onEditCard={handleEditCard}
                    onDeleteCard={handleDeleteCard}
                    onExportCard={handleExportCard}
                    onOpenPhotoArchive={handleOpenPhotoArchive}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Photo Archive Lightbox Modal */}
      <PhotoArchiveModal
        isOpen={Boolean(photoArchiveCard)}
        card={photoArchiveCard}
        onClose={handleClosePhotoArchive}
      />

      {/* Slide-Over Category Management Panel (Rename, Merge, Add, Delete, Reset) */}
      <CategoryManagementPanel
        isOpen={isCategoryPanelOpen}
        onClose={closeCategoryPanel}
        categories={categories}
        categoryCounts={categoryCounts}
        totalCardCount={cards.length}
        focusAddOnOpen={focusAddInPanel}
        onAddCategory={handlePanelAddCategory}
        onRenameCategory={handlePanelRenameCategory}
        onMergeCategories={handlePanelMergeCategories}
        onDeleteCategory={handlePanelDeleteCategory}
        onResetCategories={handlePanelResetCategories}
      />
    </div>
  );
};
