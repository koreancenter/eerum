import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StoredCard, CardCategory } from '../types/card';
import {
  Search,
  LayoutGrid,
  List,
  Lock,
  KeyRound,
  X,
} from 'lucide-react';
import { PhotoArchiveModal } from './PhotoArchiveModal';
import { VaultCardItem, VaultCardListRow } from './VaultCardItem';

const CATEGORIES: readonly CardCategory[] = [
  '전체',
  'VIP 파트너',
  '글로벌 네트워크',
  '공공·기관',
  '투자·금융',
  'IT·기술',
];

const SEARCH_DEBOUNCE_MS = 180;

const CameraPlusIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5" />
    <circle cx="12" cy="13" r="3" />
    <path d="M19 3v6" />
    <path d="M16 6h6" />
  </svg>
);

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
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [photoArchiveCard, setPhotoArchiveCard] = useState<StoredCard | null>(null);

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
    setPhotoArchiveCard(card);
  }, []);

  const handleClosePhotoArchive = useCallback(() => {
    setPhotoArchiveCard(null);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  }, []);

  // Single-pass memoized category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 전체: cards.length };
    for (const cat of CATEGORIES) {
      if (cat !== '전체') counts[cat] = 0;
    }
    for (let i = 0; i < cards.length; i++) {
      const cat = cards[i].category;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    return counts;
  }, [cards]);

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
    <div className="w-full max-w-6xl mx-auto space-y-5 animate-in fade-in duration-300">
      {/* 1. Quiet Luxury Search Bar */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 stroke-[1.5] text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름, 회사, 직함, 메모 검색"
          aria-label="명함 보관함 검색"
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#121214] border border-white/10 text-xs text-neutral-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="검색어 지우기"
            title="검색어 지우기"
          >
            <X className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        )}
      </div>

      {/* 2. Minimalist Wallet Toolbar */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-white/10">
        {/* Left: Category Filter Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs no-scrollbar min-w-0">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] ?? 0;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 text-xs transition-colors cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                  isSelected
                    ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                    : 'bg-[#121214] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`ml-1.5 text-[10px] tabular-nums ${
                    isSelected ? 'text-neutral-900/80 font-bold' : 'text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Icon-Only View Switcher + Minimal Camera-Plus Action */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Thin Linear Icon View Switcher (LayoutGrid / List) */}
          <div
            role="group"
            aria-label="보관함 보기 방식"
            className="flex items-center p-0.5 bg-[#121214] rounded-xl border border-white/10"
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-pressed={viewMode === 'cards'}
              aria-label="카드 뷰"
              title="카드 뷰"
              className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
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
              className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                viewMode === 'list'
                  ? 'bg-white/12 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

          {/* Minimalist Camera-Plus Button */}
          <button
            type="button"
            onClick={onOpenScan}
            aria-label="실물 명함 사진 등록"
            title="실물 명함 사진 등록"
            className="w-10 h-10 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 flex items-center justify-center shadow-sm cursor-pointer active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            <CameraPlusIcon className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* Content Rendering: Cards Grid or List Table */}
      {filteredCards.length === 0 ? (
        <div className="py-20 text-center space-y-3 p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/60">
          <p className="text-sm font-semibold text-neutral-300">검색 조건에 일치하는 명함이 없습니다.</p>
          <p className="text-xs text-zinc-400">실물 명함 사진을 촬영하거나 새 명함을 등록해 보세요.</p>
          <button
            type="button"
            onClick={onOpenScan}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-neutral-950 text-xs font-semibold hover:bg-zinc-200 cursor-pointer"
          >
            <CameraPlusIcon className="w-4 h-4" />
            <span>실물 명함 등록</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* ================= CARDS GALLERY VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
        /* ================= EDITORIAL LIST VIEW ================= */
        <div className="rounded-2xl border border-zinc-800/80 bg-[#121214] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-[#0A0A0B] text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">성명</th>
                  <th className="py-3 px-4">직함</th>
                  <th className="py-3 px-4">소속 회사/기관</th>
                  <th className="py-3 px-4">카테고리</th>
                  <th className="py-3 px-4">실물 보관</th>
                  <th className="py-3 px-4">연락처</th>
                  <th className="py-3 px-4 text-right">액션</th>
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
    </div>
  );
};
