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
  Mic,
  UserPlus,
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

interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

const getSpeechRecognitionClass = () => {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as IWindowSpeechRecognition;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
};

interface VaultViewProps {
  cards: StoredCard[];
  onSelectCard: (card: StoredCard) => void;
  onEditCard: (card: StoredCard) => void;
  onDeleteCard: (cardId: string) => void;
  onExportCard: (card: StoredCard) => void;
  onOpenScan: () => void;
  onOpenEditor: () => void;
  onOpenImportContacts?: () => void;
  onOpenSync?: () => void;
  isLocked?: boolean;
  onUnlockRequest?: () => void;
  onRenameCategory?: (oldName: string, newName: string) => void;
  onMergeCategories?: (sourceCategory: string, targetCategory: string) => void;
  onDeleteCategory?: (deletedName: string, fallbackCategory: string) => void;
  onShowToast?: (msg: string) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  cards,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onExportCard,
  onOpenScan,
  onOpenImportContacts,
  isLocked = false,
  onUnlockRequest,
  onRenameCategory,
  onMergeCategories,
  onDeleteCategory,
  onShowToast,
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

  // Web Speech API Voice Search States
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [localToast, setLocalToast] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const toastTimerRef = useRef<number | null>(null);

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

  // Graceful Toast notification (invokes parent prop and displays local fallback alert)
  const triggerToast = useCallback(
    (msg: string) => {
      if (onShowToast) {
        onShowToast(msg);
      }
      setLocalToast(msg);
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setLocalToast(null);
      }, 2800);
    },
    [onShowToast]
  );

  // Web Speech API lifecycle & unmount cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const stopVoiceSearch = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setVoiceFeedback(null);
  }, []);

  const toggleVoiceSearch = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognitionClass();

    if (!SpeechRecognitionClass) {
      triggerToast(
        '현재 브라우저에서는 음성 검색(Web Speech API)을 지원하지 않습니다. Chrome 또는 Safari 최신 버전을 권장합니다.'
      );
      return;
    }

    if (isListening) {
      stopVoiceSearch();
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      // Set recognition language to 'ko-KR' (or fallback to browser default)
      const selectedLang: string = 'ko-KR';
      const browserDefaultLang: string =
        (typeof navigator !== 'undefined' && navigator.language) || 'ko-KR';
      recognition.lang = selectedLang || browserDefaultLang;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceFeedback('말씀하세요... (듣는 중)');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0]?.transcript || '';
          } else {
            interimTranscript += item[0]?.transcript || '';
          }
        }

        const activeText = (finalTranscript || interimTranscript).trim();
        if (activeText) {
          // Automatically populate search state (`searchQuery`) upon `onresult` event to filter the card list instantaneously
          setSearchQuery(activeText);
          setDebouncedSearchQuery(activeText);
          setVoiceFeedback(`인식됨: "${activeText}"`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice search error:', event.error);
        setIsListening(false);
        setVoiceFeedback(null);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          triggerToast('마이크 사용 권한이 차단되었습니다. 브라우저 설정에서 마이크 권한을 허용해 주세요.');
        } else if (event.error === 'no-speech') {
          triggerToast('음성이 감지되지 않았습니다. 마이크에 대고 다시 말씀해 주세요.');
        } else if (event.error === 'network') {
          triggerToast('음성 인식 네트워크 연결에 실패했습니다.');
        } else if (event.error !== 'aborted') {
          triggerToast(`음성 검색에 실패했습니다 (${event.error})`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setTimeout(() => {
          setVoiceFeedback(null);
        }, 1200);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start voice search:', err);
      setIsListening(false);
      setVoiceFeedback(null);
      triggerToast('음성 검색을 시작하지 못했습니다. 마이크 설정을 확인해 주세요.');
    }
  }, [isListening, stopVoiceSearch, triggerToast]);

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
    <div className="w-full max-w-full min-w-0 flex flex-col gap-3 sm:gap-3.5 animate-in fade-in duration-300">
      {/* 2-Row Header Layout (Row 1: Section Title & Combined Action Bar with Search, Row 2: Category Filter Chips) */}
      <header
        aria-label="명함 보관함 검색 및 필터 도구 모음"
        className="w-full max-w-full min-w-0 flex flex-col gap-2.5 sm:gap-3 pb-3 border-b border-white/10"
      >
        {/* Row 1: Section Title/Count on Left + Combined Action Controls (Search, Manage, View Toggle, Add) on Right */}
        <div className="w-full max-w-full min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
          {/* Left: Section Title & Count ("보관 명함 3") */}
          <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="font-semibold text-white tracking-tight">
                {selectedCategory === '전체' ? '보관 명함' : selectedCategory}
              </span>
              <span className="font-mono tabular-nums text-zinc-300 font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px]">
                {filteredCards.length}
              </span>
            </div>

            {/* Mobile-Only Action Button Cluster (< sm) */}
            <div className="flex sm:hidden items-center justify-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openCategoryPanel(false)}
                aria-expanded={isCategoryPanelOpen}
                aria-label="카테고리 관리 패널 열기"
                title="카테고리 이름 변경·병합·삭제 관리"
                className={`h-8.5 px-2.5 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                  isCategoryPanelOpen
                    ? 'bg-white text-neutral-950 border-white font-semibold'
                    : 'bg-[#121214] hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
                <span>관리</span>
              </button>

              <div
                role="group"
                aria-label="보관함 보기 방식"
                className="grid grid-cols-2 p-0.5 h-8.5 bg-[#121214] rounded-xl border border-white/10 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  aria-pressed={viewMode === 'cards'}
                  aria-label="카드 뷰"
                  title="카드 뷰"
                  className={`w-7.5 h-full rounded-lg flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                    viewMode === 'cards'
                      ? 'bg-white/12 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  aria-label="리스트 뷰"
                  title="리스트 뷰"
                  className={`w-7.5 h-full rounded-lg flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                    viewMode === 'list'
                      ? 'bg-white/12 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
              </div>

              {onOpenImportContacts && (
                <button
                  type="button"
                  onClick={onOpenImportContacts}
                  aria-label="연락처 대량 가져오기"
                  title="vCard(.vcf) 또는 주소록에서 명함 가져오기"
                  className="h-8.5 px-2 rounded-xl bg-[#121214] hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white inline-flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
              )}

              <button
                type="button"
                onClick={onOpenScan}
                aria-label="실물 명함 사진 등록"
                title="실물 명함 사진 등록"
                className="h-8.5 px-2.5 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 inline-flex items-center justify-center gap-1 shadow-sm cursor-pointer active:scale-95 shrink-0 font-semibold text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                <span className="whitespace-nowrap">추가</span>
              </button>
            </div>
          </div>

          {/* Right on Desktop / Responsive on Mobile: Search Bar + (Desktop Action Controls) */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 md:gap-3 w-full sm:w-auto">
            {/* 1. Search Bar (Combines Input + Clear + Voice Search Mic Button 🎙️, max-width 320px on desktop) */}
            <div className="relative w-full sm:w-60 md:w-72 lg:w-80 sm:max-w-[320px] shrink min-w-0">
              <Search
                className={`w-3.5 h-3.5 stroke-[1.75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${
                  isListening ? 'text-rose-400' : 'text-zinc-400'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isListening
                    ? (voiceFeedback || '말씀하세요... (음성 듣는 중)')
                    : '이름, 회사, 직함, 메모 검색'
                }
                aria-label="명함 보관함 검색"
                className={`w-full h-9 sm:h-9.5 pl-8.5 pr-20 rounded-xl bg-[#121214] border text-xs text-neutral-200 placeholder:text-zinc-400 focus:outline-none transition-all duration-200 ${
                  isListening
                    ? 'border-rose-500/50 ring-2 ring-rose-500/20 placeholder:text-rose-300/80 shadow-[0_0_16px_rgba(244,63,94,0.18)]'
                    : 'border-white/10 focus:ring-1 focus:ring-white/20 focus:border-white/20'
                }`}
              />

              {/* Right Controls: Clear Query + Web Speech Voice Search Button (🎙️) */}
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="w-5 h-5 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                    aria-label="검색어 지우기"
                    title="검색어 지우기"
                  >
                    <X className="w-3.5 h-3.5 stroke-[1.5]" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleVoiceSearch}
                  aria-label={isListening ? '음성 검색 중지' : '음성으로 검색'}
                  title={
                    isListening
                      ? '음성 인식 중 (클릭하여 중지)'
                      : '음성 검색 (클릭하여 한국어 음성으로 검색 🎙️)'
                  }
                  className={`h-6.5 px-1.5 rounded-lg inline-flex items-center justify-center gap-1 text-[11px] cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                    isListening
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 ring-2 ring-rose-500/30 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.35)] font-medium'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95'
                  }`}
                >
                  <Mic
                    className={`w-3 h-3 stroke-[1.75] ${
                      isListening ? 'text-rose-400 animate-bounce' : ''
                    }`}
                  />
                  <span className="text-[11px] leading-none" aria-hidden="true">
                    🎙️
                  </span>
                  {isListening && (
                    <span className="text-[9px] font-semibold text-rose-300 pl-0.5 animate-pulse hidden sm:inline">
                      듣는 중
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Desktop Action Controls (Category Manage, View Switcher, Add Card) */}
            <div className="hidden sm:flex items-center justify-end gap-2 md:gap-2.5 shrink-0">
              {/* 2. Category Management Button */}
              <button
                type="button"
                onClick={() => openCategoryPanel(false)}
                aria-expanded={isCategoryPanelOpen}
                aria-label="카테고리 관리 패널 열기"
                title="카테고리 이름 변경·병합·삭제 관리"
                className={`h-9 sm:h-9.5 px-2.5 sm:px-3 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                  isCategoryPanelOpen
                    ? 'bg-white text-neutral-950 border-white font-semibold'
                    : 'bg-[#121214] hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
                <span className="hidden md:inline">카테고리 관리</span>
                <span className="md:hidden">관리</span>
              </button>

              {/* 3. Grid/List View Switcher Button */}
              <div
                role="group"
                aria-label="보관함 보기 방식"
                className="grid grid-cols-2 p-0.5 h-9 sm:h-9.5 bg-[#121214] rounded-xl border border-white/10 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  aria-pressed={viewMode === 'cards'}
                  aria-label="카드 뷰"
                  title="카드 뷰"
                  className={`w-8 sm:w-8.5 h-full rounded-lg flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                    viewMode === 'cards'
                      ? 'bg-white/12 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  aria-label="리스트 뷰"
                  title="리스트 뷰"
                  className={`w-8 sm:w-8.5 h-full rounded-lg flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                    viewMode === 'list'
                      ? 'bg-white/12 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
              </div>

              {/* Import Contacts Button */}
              {onOpenImportContacts && (
                <button
                  type="button"
                  onClick={onOpenImportContacts}
                  aria-label="연락처 대량 가져오기"
                  title="vCard (.vcf) 및 주소록에서 명함 일괄 가져오기"
                  className="h-9 sm:h-9.5 px-2.5 sm:px-3 rounded-xl border border-white/10 bg-[#121214] hover:bg-white/10 text-zinc-300 hover:text-white inline-flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 shrink-0 text-xs font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
                  <span className="hidden lg:inline">연락처 가져오기</span>
                  <span className="lg:hidden">가져오기</span>
                </button>
              )}

              {/* 4. "+ Add Card" Button */}
              <button
                type="button"
                onClick={onOpenScan}
                aria-label="실물 명함 사진 등록"
                title="실물 명함 사진 등록"
                className="h-9 sm:h-9.5 px-3 sm:px-3.5 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95 shrink-0 font-semibold text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                <span className="whitespace-nowrap">명함 추가</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Dedicated Full-Width Horizontal Scrolling Track for Category Filter Chips */}
        <div className="w-full max-w-full min-w-0">
          <div
            ref={categoryScrollRef}
            role="tablist"
            aria-label="보관함 카테고리 필터"
            className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide overscroll-x-contain touch-pan-x touch-pinch-zoom flex items-center gap-2 py-1.5 px-0.5"
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
                  onClick={(e) => {
                    setSelectedCategory(cat);
                    e.currentTarget.scrollIntoView({
                      behavior: 'smooth',
                      inline: 'nearest',
                      block: 'nearest',
                    });
                  }}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0 text-xs transition-colors cursor-pointer font-medium touch-pan-x touch-pinch-zoom focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
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
                className="min-h-[36px] pl-3 pr-1.5 py-1 rounded-full bg-[#161618] border border-white/25 inline-flex items-center gap-1 shrink-0 touch-pan-x touch-pinch-zoom"
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
                  className="w-28 sm:w-32 bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none touch-pan-x touch-pinch-zoom"
                />
                <button
                  type="submit"
                  disabled={!inlineCategoryName.trim()}
                  aria-label="카테고리 저장"
                  title="저장"
                  className="w-6 h-6 rounded-full bg-white hover:bg-zinc-200 disabled:opacity-35 text-neutral-950 flex items-center justify-center cursor-pointer shrink-0 touch-pan-x touch-pinch-zoom"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelInlineAdd}
                  aria-label="추가 취소"
                  title="취소"
                  className="w-6 h-6 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer shrink-0 touch-pan-x touch-pinch-zoom"
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
                className="min-h-[36px] px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 text-xs text-zinc-300 hover:text-white bg-[#121214] hover:bg-white/10 border border-dashed border-white/20 hover:border-white/35 transition-colors cursor-pointer inline-flex items-center gap-1 touch-pan-x touch-pinch-zoom focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2]" />
                <span>추가</span>
              </button>
            )}

            {/* Trailing flex spacer prevents right-edge clipping on mobile WebKit/Blink */}
            <span className="w-2 shrink-0" aria-hidden="true" />
          </div>

          {inlineAddError && (
            <p role="alert" className="mt-1 text-[11px] text-amber-300/90 pl-1">
              {inlineAddError}
            </p>
          )}
        </div>
      </header>

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
        /* ================= CARDS GALLERY VIEW (2-Column Mobile Grid, 3-Column Desktop) ================= */
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3.5 min-w-0">
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

      {/* Web Speech Voice Search & Mic Permission Toast Notification */}
      {localToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#161618]/95 border border-white/15 text-white text-xs font-medium shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2 pointer-events-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 animate-ping" />
          <span>{localToast}</span>
        </div>
      )}
    </div>
  );
};
