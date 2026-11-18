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
  ArrowUpDown,
  ChevronDown,
  GitMerge,
  ShieldAlert,
  Download,
  UserPlus,
} from 'lucide-react';

import { PhotoArchiveModal } from './PhotoArchiveModal';
import {
  VaultCardItem,
  VaultCardListRow,
  VaultCardMobileListItem,
} from './VaultCardItem';
import { CategoryManagementPanel } from './CategoryManagementPanel';
import { DuplicateMergeModal } from './DuplicateMergeModal';
import {
  CATEGORIES_UPDATED_EVENT,
  loadVaultCategories,
  addVaultCategory,
  renameVaultCategory,
  mergeVaultCategories,
  deleteVaultCategory,
  resetVaultCategories,
} from '../utils/categories';
import { matchesAnySearchField } from '../utils/koreanSearch';
import { detectDuplicateVaultGroups } from '../utils/duplicateDetector';
import {
  BACKUP_UPDATED_EVENT,
  getLastBackupAt,
  shouldShowBackupNudge,
  dismissBackupNudge,
} from '../utils/vaultBackup';
import { downloadBatchVCard } from '../utils/cardExporter';
import {
  type VaultViewScope,
  type VaultSortOption,
  SORT_OPTIONS,
  RECENT_WINDOW_DAYS,
  filterCardsByScope,
  isRecentVaultCard,
  sortVaultCards,
} from '../utils/cardSorting';

export type { VaultSortOption, VaultViewScope };

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
  onRecordInteraction?: (cardId: string) => void;
  onOpenScan: () => void;
  onOpenEditor: () => void;
  onOpenImportContacts?: () => void;
  onOpenSync?: () => void;
  isLocked?: boolean;
  onUnlockRequest?: () => void;
  onRenameCategory?: (oldName: string, newName: string) => void;
  onMergeCategories?: (sourceCategory: string, targetCategory: string) => void;
  onDeleteCategory?: (deletedName: string, fallbackCategory: string) => void;
  onMergeDuplicateCards?: (mergedCard: StoredCard, duplicateCardIds: string[]) => void;
  onShowToast?: (msg: string) => void;
  totalSavedCardsCount?: number;
  onOpenBackup?: (tab?: 'export' | 'restore') => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  cards: rawCards,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onExportCard,
  onRecordInteraction,
  onOpenScan,
  onOpenImportContacts,
  isLocked = false,
  onUnlockRequest,
  onRenameCategory,
  onMergeCategories,
  onDeleteCategory,
  onMergeDuplicateCards,
  onShowToast,
  totalSavedCardsCount,
  onOpenBackup,
}) => {
  // Defensive filter: strictly isolate Vault cards from personal cards (`isMyCard: true` belongs exclusively to '내 명함')
  const cards = useMemo(() => rawCards.filter((c) => !c.isMyCard), [rawCards]);
  const cardsRef = useRef<StoredCard[]>(cards);
  cardsRef.current = cards;

  // Non-intrusive Backup Safety Nudge state (shows when >= 3 cards and never backed up or > 30 days)
  const effectiveTotalCardsCount = totalSavedCardsCount ?? cards.length;
  const [showBackupNudge, setShowBackupNudge] = useState<boolean>(() =>
    shouldShowBackupNudge(effectiveTotalCardsCount)
  );
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<number | null>(() =>
    getLastBackupAt()
  );

  useEffect(() => {
    const syncBackupNudge = () => {
      setLastBackupTimestamp(getLastBackupAt());
      setShowBackupNudge(shouldShowBackupNudge(effectiveTotalCardsCount));
    };
    syncBackupNudge();
    window.addEventListener(BACKUP_UPDATED_EVENT, syncBackupNudge);
    return () => window.removeEventListener(BACKUP_UPDATED_EVENT, syncBackupNudge);
  }, [effectiveTotalCardsCount]);

  // Duplicate contact detection (Vault-only, normalized phone/email)
  const duplicateGroups = useMemo(() => detectDuplicateVaultGroups(cards), [cards]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState<boolean>(false);

  // Dynamic categories persisted in localStorage
  const [categories, setCategories] = useState<string[]>(() =>
    loadVaultCategories(cards)
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [photoArchiveCardId, setPhotoArchiveCardId] = useState<string | null>(null);

  // Vault view scope ('all' | 'recent') persisted in localStorage
  const [viewScope, setViewScope] = useState<VaultViewScope>(() => {
    if (typeof window !== 'undefined') {
      const savedScope = localStorage.getItem('eerum_vault_view_scope');
      if (savedScope === 'recent' || savedScope === 'all') {
        return savedScope;
      }
    }
    return 'all';
  });

  // Sorting state persisted in localStorage (defaults to automated 'smart' ranking)
  const [sortBy, setSortBy] = useState<VaultSortOption>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eerum_vault_sort_by');
      if (
        saved === 'smart' ||
        saved === 'frequency' ||
        saved === 'newest' ||
        saved === 'oldest' ||
        saved === 'name' ||
        saved === 'company'
      ) {
        return saved;
      }
    }
    return 'smart';
  });
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState<boolean>(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Persist view scope & sort preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('eerum_vault_view_scope', viewScope);
    }
  }, [viewScope]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('eerum_vault_sort_by', sortBy);
    }
  }, [sortBy]);

  // Outside click and Escape handler for Sort Dropdown
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

  // Keep latest prop callbacks in a ref so memoized item handlers maintain permanently stable identities
  const latestHandlersRef = useRef({
    onSelectCard,
    onEditCard,
    onDeleteCard,
    onExportCard,
    onRecordInteraction,
  });
  latestHandlersRef.current = {
    onSelectCard,
    onEditCard,
    onDeleteCard,
    onExportCard,
    onRecordInteraction,
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

  const handleRecordInteraction = useCallback((cardId: string) => {
    latestHandlersRef.current.onRecordInteraction?.(cardId);
  }, []);

  const handleOpenPhotoArchive = useCallback((card: StoredCard) => {
    latestHandlersRef.current.onRecordInteraction?.(card.id);
    setPhotoArchiveCardId(card.id);
  }, []);

  const handleClosePhotoArchive = useCallback(() => {
    setPhotoArchiveCardId(null);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
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

  const recentCardsCount = useMemo(
    () => cards.filter((c) => isRecentVaultCard(c)).length,
    [cards]
  );

  // Instant scope ('all' | 'recent') + multi-field Korean choseong search + category filter
  const filteredCards = useMemo(() => {
    const scopedCards = filterCardsByScope(cards, viewScope);
    const q = searchQuery.trim();
    const isAllCategories = selectedCategory === '전체';

    if (isAllCategories && !q) {
      return scopedCards;
    }

    return scopedCards.filter((c) => {
      if (!isAllCategories && c.category !== selectedCategory) {
        return false;
      }
      if (!q) {
        return true;
      }

      const d = c.data;
      return matchesAnySearchField(
        [
          d.name,
          d.nameKr,
          d.nameEn,
          d.details?.en_name,
          c.details?.en_name,
          d.organization,
          d.organizationKr,
          d.subOrg,
          d.details?.sub_org,
          c.details?.sub_org,
          d.title,
          d.titleKr,
          d.phone,
          d.phoneRaw,
          d.email,
          c.category,
          c.notes,
          c.memo,
          c.metAt,
          c.metLocation,
        ],
        q,
        [d.phone, d.phoneRaw]
      );
    });
  }, [cards, viewScope, selectedCategory, searchQuery]);

  // Automated sorting by interaction frequency, creation date, name, or company
  const sortedCards = useMemo(
    () => sortVaultCards(filteredCards, sortBy),
    [filteredCards, sortBy]
  );

  const currentSortOption = useMemo(
    () => SORT_OPTIONS.find((opt) => opt.id === sortBy) || SORT_OPTIONS[0],
    [sortBy]
  );

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
        {/* Row 1: Action Toolbar (Desktop: Recent/All Switcher on Left, Search+Sort+Actions on Right; Mobile: Recent/All + Actions on Top, Search+Sort Below) */}
        <div className="w-full max-w-full min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
          {/* Desktop Recent / All View Switcher (sm+) */}
          <div
            role="group"
            aria-label="보관함 명함 보기 범위"
            className="hidden sm:grid grid-cols-2 p-0.5 h-9 sm:h-9.5 bg-[#121214] rounded-xl border border-white/10 shrink-0"
          >
            <button
              type="button"
              onClick={() => setViewScope('all')}
              aria-pressed={viewScope === 'all'}
              title={`보관함 전체 명함 (${cards.length}명)`}
              className={`px-3 h-full rounded-lg text-xs font-medium flex items-center justify-center cursor-pointer transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                viewScope === 'all'
                  ? 'bg-white/12 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setViewScope('recent')}
              aria-pressed={viewScope === 'recent'}
              title={`최근 ${RECENT_WINDOW_DAYS}일 내 등록하거나 열람·연락한 명함 (${recentCardsCount}명)`}
              className={`px-3 h-full rounded-lg text-xs font-medium flex items-center justify-center cursor-pointer transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                viewScope === 'recent'
                  ? 'bg-white/12 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              최근
            </button>
          </div>

          {/* Mobile-Only Top Row: Recent/All Switcher on Left + Action Cluster on Right (< sm) */}
          <div className="flex sm:hidden items-center justify-between gap-1.5 shrink-0 w-full">
            <div
              role="group"
              aria-label="보관함 명함 보기 범위"
              className="grid grid-cols-2 p-0.5 h-8.5 bg-[#121214] rounded-xl border border-white/10 shrink-0"
            >
              <button
                type="button"
                onClick={() => setViewScope('all')}
                aria-pressed={viewScope === 'all'}
                title={`보관함 전체 명함 (${cards.length}명)`}
                className={`px-2.5 h-full rounded-lg text-[11px] font-medium flex items-center justify-center cursor-pointer transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                  viewScope === 'all'
                    ? 'bg-white/12 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setViewScope('recent')}
                aria-pressed={viewScope === 'recent'}
                title={`최근 ${RECENT_WINDOW_DAYS}일 내 등록하거나 열람·연락한 명함 (${recentCardsCount}명)`}
                className={`px-2.5 h-full rounded-lg text-[11px] font-medium flex items-center justify-center cursor-pointer transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                  viewScope === 'recent'
                    ? 'bg-white/12 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                최근
              </button>
            </div>

            <div className="flex items-center justify-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openCategoryPanel(false)}
                aria-expanded={isCategoryPanelOpen}
                aria-label="카테고리 관리"
                title="카테고리 관리"
                className={`w-8.5 h-8.5 rounded-xl border text-xs font-medium shrink-0 inline-flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                  isCategoryPanelOpen
                    ? 'bg-white text-neutral-950 border-white font-semibold'
                    : 'bg-[#121214] hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
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

            {cards.length > 0 && (
              <button
                type="button"
                disabled={sortedCards.length === 0}
                onClick={() => {
                  const count = downloadBatchVCard(sortedCards);
                  if (count > 0) {
                    triggerToast(`${count}명의 연락처를 .vcf 파일로 내보냈습니다.`);
                  }
                }}
                aria-label={
                  selectedCategory !== '전체' || searchQuery.trim()
                    ? `필터 연락처 저장 (.vcf · ${sortedCards.length}명)`
                    : `전체 연락처 저장 (.vcf · ${sortedCards.length}명)`
                }
                title={
                  selectedCategory !== '전체' || searchQuery.trim()
                    ? `필터 연락처 저장 (.vcf · ${sortedCards.length}명)`
                    : `전체 연락처 저장 (.vcf · ${sortedCards.length}명)`
                }
                className="w-8.5 h-8.5 rounded-xl border border-white/10 bg-[#121214] hover:bg-white/10 text-zinc-300 hover:text-white inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
              >
                <UserPlus className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
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

          {/* Right on Desktop / Responsive on Mobile: Search Bar + Sort Dropdown + (Desktop Action Controls) */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 md:gap-3 w-full sm:w-auto sm:flex-1 sm:min-w-0">
            {/* 1. Search Bar + Sort Dropdown Cluster */}
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto sm:flex-1 sm:justify-end min-w-0">
              <div className="relative flex-1 sm:w-44 md:w-56 lg:w-64 sm:max-w-[280px] min-w-0">
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
                      : '이름·초성, 회사, 만남 장소, 메모 검색'
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
                        : '음성 검색 (클릭하여 한국어 음성으로 검색)'
                    }
                    className={`h-6.5 ${isListening ? 'px-2' : 'w-6.5'} rounded-lg inline-flex items-center justify-center gap-1 text-[11px] cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                      isListening
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 ring-2 ring-rose-500/30 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.35)] font-medium'
                        : 'text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95'
                    }`}
                  >
                    <Mic
                      className={`w-3.5 h-3.5 stroke-[1.75] ${
                        isListening ? 'text-rose-400 animate-bounce' : ''
                      }`}
                    />
                    {isListening && (
                      <span className="text-[9px] font-semibold text-rose-300 pl-0.5 animate-pulse hidden sm:inline">
                        듣는 중
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Sort Dropdown Menu (등록순 / 이름순 / 카테고리별) */}
              <div className="relative shrink-0" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                  aria-expanded={isSortDropdownOpen}
                  aria-haspopup="listbox"
                  aria-label={`명함 정렬: ${currentSortOption.label}`}
                  title="명함 정렬 기준 변경"
                  className="h-9 sm:h-9.5 px-2.5 sm:px-3 rounded-xl bg-[#121214] hover:bg-white/10 border border-white/10 text-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 transition-colors text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 stroke-[1.75] text-zinc-400 shrink-0" />
                  <span className="text-zinc-200">{currentSortOption.label}</span>
                  <ChevronDown
                    className={`w-3 h-3 stroke-[2] text-zinc-400 transition-transform duration-200 shrink-0 ${
                      isSortDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isSortDropdownOpen && (
                  <div
                    role="listbox"
                    aria-label="정렬 옵션"
                    className="absolute right-0 mt-1.5 w-48 py-1.5 rounded-2xl bg-[#121214]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-3 py-1 mb-1 border-b border-white/[0.06]">
                      <p className="text-[10px] font-sans font-medium text-zinc-400">자동 · 기준별 정렬</p>
                    </div>
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = sortBy === opt.id;
                      return (
                        <button
                          key={opt.id}
                          role="option"
                          aria-selected={isSelected}
                          type="button"
                          onClick={() => {
                            setSortBy(opt.id);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                            isSelected
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="leading-snug">{opt.label}</div>
                            {opt.description && (
                              <div className="text-[10px] text-zinc-500 leading-tight mt-0.5">
                                {opt.description}
                              </div>
                            )}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[2] text-white shrink-0" />}
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
                onClick={() => openCategoryPanel(false)}
                aria-expanded={isCategoryPanelOpen}
                aria-label="카테고리 관리"
                title="카테고리 관리"
                className={`w-9 sm:w-9.5 h-9 sm:h-9.5 rounded-xl border text-xs font-medium shrink-0 inline-flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                  isCategoryPanelOpen
                    ? 'bg-white text-neutral-950 border-white font-semibold'
                    : 'bg-[#121214] hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
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

              {/* 4. Icon-only Batch .vcf Export Button */}
              {cards.length > 0 && (
                <button
                  type="button"
                  disabled={sortedCards.length === 0}
                  onClick={() => {
                    const count = downloadBatchVCard(sortedCards);
                    if (count > 0) {
                      triggerToast(`${count}명의 연락처를 .vcf 파일로 내보냈습니다.`);
                    }
                  }}
                  aria-label={
                    selectedCategory !== '전체' || searchQuery.trim()
                      ? `필터 연락처 저장 (.vcf · ${sortedCards.length}명)`
                      : `전체 연락처 저장 (.vcf · ${sortedCards.length}명)`
                  }
                  title={
                    selectedCategory !== '전체' || searchQuery.trim()
                      ? `필터 연락처 저장 (.vcf · ${sortedCards.length}명)`
                      : `전체 연락처 저장 (.vcf · ${sortedCards.length}명)`
                  }
                  className="w-9 sm:w-9.5 h-9 sm:h-9.5 rounded-xl border border-white/10 bg-[#121214] hover:bg-white/10 text-zinc-300 hover:text-white inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
                </button>
              )}

              {/* 5. "+ Add Card" Button */}
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

        {/* Duplicate Contact Cleanup Bar (only shown when duplicates exist) */}
        {duplicateGroups.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsDuplicateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 text-amber-200 hover:text-amber-100 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/40"
            >
              <GitMerge className="w-3.5 h-3.5 stroke-[1.8] text-amber-300 shrink-0" />
              <span className="tabular-nums">
                중복 연락처 {duplicateGroups.length}건 정리
              </span>
            </button>
          </div>
        )}

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

      {/* Non-Intrusive Local-First Backup Safety Nudge */}
      {showBackupNudge && onOpenBackup && (
        <aside
          aria-label="보관함 안전 백업 안내"
          className="w-full rounded-2xl bg-[#121214] border border-white/10 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg animate-in fade-in duration-200"
        >
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 text-zinc-200 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-3.5 h-3.5 stroke-[1.75]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-100 leading-snug">
                {lastBackupTimestamp
                  ? '마지막 백업 이후 30일이 지났습니다.'
                  : `소중한 명함 ${effectiveTotalCardsCount}장을 기기 분실·초기화에 대비해 백업해 두세요.`}
              </p>
              <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                계정 없이 암호화된 로컬 백업 파일(.eerum)로 언제든 안전하게 복원할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenBackup('export')}
              className="h-8 px-3 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 stroke-[2]" />
              <span>백업 저장</span>
            </button>
            <button
              type="button"
              onClick={() => {
                dismissBackupNudge();
                setShowBackupNudge(false);
              }}
              aria-label="백업 안내 닫기"
              title="나중에 하기"
              className="w-8 h-8 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 inline-flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          </div>
        </aside>
      )}

      {/* Content Rendering: Cards Grid or List Table */}
      {sortedCards.length === 0 ? (
        viewScope === 'recent' && cards.length > 0 && !searchQuery.trim() ? (
          <div className="py-20 text-center space-y-3 p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/60">
            <p className="text-sm font-semibold text-neutral-300">
              {selectedCategory !== '전체'
                ? `'${selectedCategory}' 카테고리에 최근 ${RECENT_WINDOW_DAYS}일 내 활동한 명함이 없습니다.`
                : `최근 ${RECENT_WINDOW_DAYS}일 내 등록하거나 교류한 명함이 없습니다.`}
            </p>
            <p className="text-xs text-zinc-400">
              명함을 열람하거나 전화·문자·메모 기록을 남기면 최근 명함에 자동으로 모입니다.
            </p>
            <button
              type="button"
              onClick={() => setViewScope('all')}
              className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white text-neutral-950 text-xs font-semibold hover:bg-zinc-200 cursor-pointer"
            >
              <span>전체 명함 보기</span>
            </button>
          </div>
        ) : (
          <div className="py-20 text-center space-y-3 p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/60">
            <p className="text-sm font-semibold text-neutral-300">
              {selectedCategory !== '전체' && !searchQuery.trim()
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
        )
      ) : viewMode === 'cards' ? (
        /* ================= CARDS GALLERY VIEW (2-Column Mobile Grid, 3-Column Desktop) ================= */
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3.5 min-w-0">
          {sortedCards.map((card) => (
            <VaultCardItem
              key={card.id}
              card={card}
              onSelectCard={handleSelectCard}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
              onExportCard={handleExportCard}
              onOpenPhotoArchive={handleOpenPhotoArchive}
              onRecordInteraction={handleRecordInteraction}
            />
          ))}
        </div>
      ) : (
        /* ================= EDITORIAL LIST VIEW (Compact Mobile Rows + Desktop Table) ================= */
        <div className="rounded-xl sm:rounded-2xl border border-zinc-800/80 bg-[#121214] overflow-hidden shadow-xl">
          {/* Mobile Compact Horizontal List Items (< md) */}
          <div className="md:hidden divide-y divide-zinc-800/80">
            {sortedCards.map((card) => (
              <VaultCardMobileListItem
                key={card.id}
                card={card}
                onSelectCard={handleSelectCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
                onExportCard={handleExportCard}
                onOpenPhotoArchive={handleOpenPhotoArchive}
                onRecordInteraction={handleRecordInteraction}
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
                {sortedCards.map((card) => (
                  <VaultCardListRow
                    key={card.id}
                    card={card}
                    onSelectCard={handleSelectCard}
                    onEditCard={handleEditCard}
                    onDeleteCard={handleDeleteCard}
                    onExportCard={handleExportCard}
                    onOpenPhotoArchive={handleOpenPhotoArchive}
                    onRecordInteraction={handleRecordInteraction}
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

      {/* Side-by-Side Duplicate Contact Comparison & Smart Merge Modal */}
      <DuplicateMergeModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        duplicateGroups={duplicateGroups}
        onMergeGroup={(mergedCard, duplicateCardIds) => {
          onMergeDuplicateCards?.(mergedCard, duplicateCardIds);
        }}
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
