import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StoredCard } from '../types/card';
import {
  X,
  ArrowUpDown,
  ShieldAlert,
  Download,
} from 'lucide-react';

import { PhotoArchiveModal } from './PhotoArchiveModal';
import {
  VaultCardItem,
  VaultCardListRow,
  VaultCardMobileListItem,
} from './VaultCardItem';
import { CategoryManagementPanel } from './CategoryManagementPanel';
import { DuplicateMergeModal } from './DuplicateMergeModal';
import { LockedAccountView } from './LockedAccountView';
import { VaultToolbar } from './vault/VaultToolbar';
import { VaultEmptyState } from './vault/VaultEmptyState';
import {
  CATEGORIES_UPDATED_EVENT,
  DEFAULT_VAULT_CATEGORIES,
  loadVaultCategories,
  addVaultCategory,
  renameVaultCategory,
  mergeVaultCategories,
  deleteVaultCategory,
  resetVaultCategories,
} from '../utils/categories';
import { getAccountScopedKey, getAccountVaultSortKey } from '../utils/accountStorage';
import { matchesAnySearchField } from '../utils/koreanSearch';
import { detectDuplicateVaultGroups } from '../utils/duplicateDetector';
import {
  BACKUP_UPDATED_EVENT,
  getLastBackupAt,
  shouldShowBackupNudge,
  dismissBackupNudge,
} from '../utils/vaultBackup';
import {
  type VaultSortOption,
  sortVaultCards,
} from '../utils/cardSorting';
import { useLocale } from '../hooks/useLocale';

export type { VaultSortOption };
export type VaultViewMode = 'grid' | 'list';

const VAULT_VIEW_MODE_SESSION_KEY = 'eerum_vault_view_mode';
const VAULT_CATEGORY_SESSION_PREFIX = 'eerum_vault_selected_category';
const VAULT_SORT_SESSION_PREFIX = 'eerum_vault_sort_by';

const isValidVaultSortOption = (val: string | null): val is VaultSortOption =>
  val === 'smart' ||
  val === 'frequency' ||
  val === 'newest' ||
  val === 'oldest' ||
  val === 'name' ||
  val === 'company';

const getVaultSessionKey = (prefix: string, isSampleMode: boolean): string => {
  if (isSampleMode) return `${prefix}_sample`;
  return getAccountScopedKey(prefix) || prefix;
};

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
  isSampleMode?: boolean;
  onRequestCreateAccount?: () => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  cards: rawCards,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onExportCard,
  onRecordInteraction,
  onOpenScan,
  onOpenEditor,
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
  isSampleMode = false,
  onRequestCreateAccount,
}) => {
  const { locale, t } = useLocale();
  // Defensive filter: strictly isolate Vault cards from personal cards (`isMyCard: true` belongs exclusively to '내 명함')
  const cards = useMemo(() => rawCards.filter((c) => !c.isMyCard), [rawCards]);
  const cardsRef = useRef<StoredCard[]>(cards);
  cardsRef.current = cards;

  // Non-intrusive Backup Safety Nudge state (disabled in Sample Mode)
  const effectiveTotalCardsCount = totalSavedCardsCount ?? cards.length;
  const [showBackupNudge, setShowBackupNudge] = useState<boolean>(() =>
    isSampleMode ? false : shouldShowBackupNudge(effectiveTotalCardsCount)
  );
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<number | null>(() =>
    isSampleMode ? null : getLastBackupAt()
  );

  useEffect(() => {
    if (isSampleMode) {
      setShowBackupNudge(false);
      return;
    }
    const syncBackupNudge = () => {
      setLastBackupTimestamp(getLastBackupAt());
      setShowBackupNudge(shouldShowBackupNudge(effectiveTotalCardsCount));
    };
    syncBackupNudge();
    window.addEventListener(BACKUP_UPDATED_EVENT, syncBackupNudge);
    return () => window.removeEventListener(BACKUP_UPDATED_EVENT, syncBackupNudge);
  }, [effectiveTotalCardsCount, isSampleMode]);

  // Duplicate contact detection (Vault-only, normalized phone/email)
  const duplicateGroups = useMemo(
    () => (isSampleMode ? [] : detectDuplicateVaultGroups(cards)),
    [cards, isSampleMode]
  );
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState<boolean>(false);

  const buildSampleCategories = useCallback((sourceCards: StoredCard[]) => {
    const merged = new Set<string>(DEFAULT_VAULT_CATEGORIES);
    for (const c of sourceCards) {
      if (c.category && c.category.trim()) {
        merged.add(c.category.trim());
      }
    }
    return Array.from(merged);
  }, []);

  // Dynamic categories persisted per account (purely in-memory in sample mode)
  const [categories, setCategories] = useState<string[]>(() =>
    isSampleMode ? buildSampleCategories(cards) : loadVaultCategories(cards)
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (typeof window === 'undefined') return '전체';
    try {
      const saved = sessionStorage.getItem(
        getVaultSessionKey(VAULT_CATEGORY_SESSION_PREFIX, isSampleMode)
      );
      if (saved && (saved === '전체' || categories.includes(saved))) {
        return saved;
      }
    } catch {
      // Ignore sessionStorage errors
    }
    return '전체';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<VaultViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    try {
      const saved = sessionStorage.getItem(VAULT_VIEW_MODE_SESSION_KEY);
      if (saved === 'list') return 'list';
      if (saved === 'grid' || saved === 'cards') return 'grid';
    } catch {
      // Ignore sessionStorage errors
    }
    return 'grid';
  });
  const [photoArchiveCardId, setPhotoArchiveCardId] = useState<string | null>(null);

  // Sorting state persisted in sessionStorage (and localStorage per account when not in sample mode)
  const [sortBy, setSortBy] = useState<VaultSortOption>(() => {
    if (typeof window !== 'undefined') {
      try {
        const sessionSaved = sessionStorage.getItem(
          getVaultSessionKey(VAULT_SORT_SESSION_PREFIX, isSampleMode)
        );
        if (isValidVaultSortOption(sessionSaved)) {
          return sessionSaved;
        }
      } catch {
        // Ignore sessionStorage errors
      }
      if (!isSampleMode) {
        const sortKey = getAccountVaultSortKey();
        const saved = sortKey ? localStorage.getItem(sortKey) : null;
        if (isValidVaultSortOption(saved)) {
          return saved;
        }
      }
    }
    return 'smart';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(VAULT_VIEW_MODE_SESSION_KEY, viewMode);
    } catch {
      // Ignore sessionStorage errors
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        getVaultSessionKey(VAULT_CATEGORY_SESSION_PREFIX, isSampleMode),
        selectedCategory
      );
    } catch {
      // Ignore sessionStorage errors
    }
  }, [selectedCategory, isSampleMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        getVaultSessionKey(VAULT_SORT_SESSION_PREFIX, isSampleMode),
        sortBy
      );
    } catch {
      // Ignore sessionStorage errors
    }
    if (!isSampleMode) {
      const sortKey = getAccountVaultSortKey();
      if (sortKey) {
        localStorage.setItem(sortKey, sortBy);
      }
    }
  }, [sortBy, isSampleMode]);

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

  // Sync dynamic categories from storage and card changes (ephemeral in sample mode)
  useEffect(() => {
    if (isSampleMode) {
      setCategories(buildSampleCategories(cardsRef.current));
      return;
    }
    const syncCategories = () => {
      setCategories(loadVaultCategories(cardsRef.current));
    };
    syncCategories();
    window.addEventListener(CATEGORIES_UPDATED_EVENT, syncCategories);
    return () => window.removeEventListener(CATEGORIES_UPDATED_EVENT, syncCategories);
  }, [cards, isSampleMode, buildSampleCategories]);

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
      triggerToast(t.vault.voiceUnsupported);
      return;
    }

    if (isListening) {
      stopVoiceSearch();
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      const selectedLang: string = locale === 'en' ? 'en-US' : 'ko-KR';
      recognition.lang = selectedLang;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceFeedback(t.vault.voiceListening);
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
          setVoiceFeedback(t.vault.voiceRecognized(activeText));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice search error:', event.error);
        setIsListening(false);
        setVoiceFeedback(null);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          triggerToast(t.vault.voiceMicDenied);
        } else if (event.error === 'no-speech') {
          triggerToast(t.vault.voiceNoSpeech);
        } else if (event.error === 'network') {
          triggerToast(t.vault.voiceNetworkError);
        } else if (event.error !== 'aborted') {
          triggerToast(t.vault.voiceGenericError(String(event.error)));
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
      triggerToast(t.vault.voiceStartFailed);
    }
  }, [isListening, locale, stopVoiceSearch, t.vault, triggerToast]);

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

  // Multi-field Korean choseong search + category filter
  const filteredCards = useMemo(() => {
    const q = searchQuery.trim();
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
  }, [cards, selectedCategory, searchQuery]);

  // Automated sorting by interaction frequency, creation date, name, or company
  const sortedCards = useMemo(
    () => sortVaultCards(filteredCards, sortBy),
    [filteredCards, sortBy]
  );

  // Inline `+` Pill Add Category Handlers
  const handleStartInlineAdd = useCallback(() => {
    if (isSampleMode) {
      triggerToast(t.vault.sampleCategoryAddWarn);
      onRequestCreateAccount?.();
      return;
    }
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
  }, [isSampleMode, onRequestCreateAccount, t.vault.sampleCategoryAddWarn, triggerToast]);

  const handleCancelInlineAdd = useCallback(() => {
    setIsInlineAdding(false);
    setInlineCategoryName('');
    setInlineAddError(null);
  }, []);

  const handleCommitInlineAdd = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (isSampleMode) {
        setIsInlineAdding(false);
        onRequestCreateAccount?.();
        return;
      }
      const res = addVaultCategory(inlineCategoryName, cardsRef.current);
      if (!res.ok || !res.added) {
        setInlineAddError(res.error || t.vault.categoryAddFailed);
        return;
      }
      setCategories(res.categories);
      setSelectedCategory(res.added);
      setIsInlineAdding(false);
      setInlineCategoryName('');
      setInlineAddError(null);
    },
    [inlineCategoryName, isSampleMode, onRequestCreateAccount, t.vault.categoryAddFailed]
  );

  // Category Management Panel Callbacks
  const openCategoryPanel = useCallback(
    (focusAdd = false) => {
      if (isSampleMode) {
        triggerToast(t.vault.sampleCategoryEditWarn);
        onRequestCreateAccount?.();
        return;
      }
      setIsInlineAdding(false);
      setInlineAddError(null);
      setFocusAddInPanel(focusAdd);
      setIsCategoryPanelOpen(true);
    },
    [isSampleMode, onRequestCreateAccount, t.vault.sampleCategoryEditWarn, triggerToast]
  );

  const closeCategoryPanel = useCallback(() => {
    setIsCategoryPanelOpen(false);
    setFocusAddInPanel(false);
  }, []);

  const handlePanelAddCategory = useCallback(
    (rawName: string) => {
      if (isSampleMode) {
        return { ok: false, categories, error: t.vault.sampleEditBlocked };
      }
      const res = addVaultCategory(rawName, cardsRef.current);
      if (res.ok && res.added) {
        setCategories(res.categories);
        setSelectedCategory(res.added);
      }
      return res;
    },
    [isSampleMode, categories, t.vault.sampleEditBlocked]
  );

  const handlePanelRenameCategory = useCallback(
    (oldName: string, newName: string) => {
      if (isSampleMode) {
        return { ok: false, categories, error: t.vault.sampleEditBlocked };
      }
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
    [selectedCategory, onRenameCategory, isSampleMode, categories, t.vault.sampleEditBlocked]
  );

  const handlePanelMergeCategories = useCallback(
    (sourceCategory: string, targetCategory: string) => {
      if (isSampleMode) {
        return { ok: false, categories, movedCount: 0, error: t.vault.sampleEditBlocked };
      }
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
    [selectedCategory, onMergeCategories, isSampleMode, categories, t.vault.sampleEditBlocked]
  );

  const handlePanelDeleteCategory = useCallback(
    (targetCategory: string) => {
      if (isSampleMode) {
        return { ok: false, categories, movedCount: 0, fallback: '기타', error: t.vault.sampleEditBlocked };
      }
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
    [selectedCategory, onDeleteCategory, isSampleMode, categories, t.vault.sampleEditBlocked]
  );

  const handlePanelResetCategories = useCallback(() => {
    if (isSampleMode) return;
    resetVaultCategories();
    setCategories(loadVaultCategories(cardsRef.current));
  }, [isSampleMode]);

  if (isLocked) {
    return <LockedAccountView onUnlock={onUnlockRequest} />;
  }

  if (cards.length === 0) {
    return (
      <VaultEmptyState
        variant="onboarding"
        onOpenImportContacts={onOpenImportContacts}
        onOpenScan={onOpenScan}
        onOpenEditor={onOpenEditor}
      />
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 flex flex-col gap-3 sm:gap-3.5 animate-in fade-in duration-300">
      {/* 2-Row Header Layout (Row 1: Section Title & Combined Action Bar with Search, Row 2: Category Filter Chips) */}
      <VaultToolbar
        cardsCount={cards.length}
        sortedCards={sortedCards}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        filterCategories={filterCategories}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onClearSearch={handleClearSearch}
        isListening={isListening}
        voiceFeedback={voiceFeedback}
        onToggleVoiceSearch={toggleVoiceSearch}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isCategoryPanelOpen={isCategoryPanelOpen}
        onOpenCategoryPanel={openCategoryPanel}
        onOpenScan={onOpenScan}
        duplicateGroupsCount={duplicateGroups.length}
        onOpenDuplicateModal={() => setIsDuplicateModalOpen(true)}
        categoryScrollRef={categoryScrollRef}
        isInlineAdding={isInlineAdding}
        inlineInputRef={inlineInputRef}
        inlineCategoryName={inlineCategoryName}
        inlineAddError={inlineAddError}
        onInlineCategoryNameChange={setInlineCategoryName}
        onClearInlineAddError={() => setInlineAddError(null)}
        onStartInlineAdd={handleStartInlineAdd}
        onCancelInlineAdd={handleCancelInlineAdd}
        onCommitInlineAdd={handleCommitInlineAdd}
        onTriggerToast={triggerToast}
      />

      {/* Non-Intrusive Local-First Backup Safety Nudge */}
      {showBackupNudge && onOpenBackup && (
        <aside
          aria-label={t.vault.backupNudgeAria}
          className="w-full rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-[var(--app-shadow)] animate-in fade-in duration-200"
        >
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-[var(--app-highlight)] text-[var(--app-highlight-fg)] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-3.5 h-3.5 stroke-[1.75]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--app-text)] leading-snug">
                {lastBackupTimestamp
                  ? t.vault.backupNudge30Days
                  : t.vault.backupNudgeCards(effectiveTotalCardsCount)}
              </p>
              <p className="text-[11px] text-[var(--app-text-muted)] leading-snug mt-0.5">
                {t.vault.backupNudgeSub}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenBackup('export')}
              className="h-8 px-3 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 stroke-[2]" />
              <span>{t.vault.backupSaveBtn}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                dismissBackupNudge();
                setShowBackupNudge(false);
              }}
              aria-label={t.vault.backupDismissAria}
              title={t.vault.backupDismissTitle}
              className="w-8 h-8 rounded-xl text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] inline-flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          </div>
        </aside>
      )}

      {/* Content Rendering: Cards Grid or List Table */}
      {sortedCards.length === 0 ? (
        <VaultEmptyState
          variant="filtered"
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onOpenScan={onOpenScan}
        />
      ) : viewMode === 'grid' ? (
        /* ================= CARDS GALLERY VIEW (2-Column Mobile Grid, 3-Column Desktop) ================= */
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3.5 min-w-0">
          {sortedCards.map((card) => (
            <VaultCardItem
              key={card.id}
              card={card}
              searchQuery={searchQuery}
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
        <div className="rounded-xl sm:rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden shadow-[var(--app-shadow)]">
          {/* Mobile Compact Horizontal List Items (< md) */}
          <div className="md:hidden divide-y divide-[var(--app-border)]">
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
                <tr className="border-b border-[var(--app-border)] bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] font-mono text-[10px] uppercase tracking-wider">
                  <th
                    className="py-2.5 px-3.5"
                    aria-sort={sortBy === 'name' ? 'ascending' : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => setSortBy((prev) => (prev === 'name' ? 'smart' : 'name'))}
                      className={`inline-flex items-center gap-1 cursor-pointer transition-colors hover:text-[var(--app-text)] ${
                        sortBy === 'name' ? 'text-[var(--app-text)] font-semibold' : ''
                      }`}
                      title={t.vault.table.sortByNameTitle}
                    >
                      <span>{t.vault.table.name}</span>
                      <ArrowUpDown className="w-3 h-3 stroke-[1.75]" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3.5">{t.vault.table.title}</th>
                  <th
                    className="py-2.5 px-3.5"
                    aria-sort={sortBy === 'company' ? 'ascending' : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => setSortBy((prev) => (prev === 'company' ? 'smart' : 'company'))}
                      className={`inline-flex items-center gap-1 cursor-pointer transition-colors hover:text-[var(--app-text)] ${
                        sortBy === 'company' ? 'text-[var(--app-text)] font-semibold' : ''
                      }`}
                      title={t.vault.table.sortByCompanyTitle}
                    >
                      <span>{t.vault.table.company}</span>
                      <ArrowUpDown className="w-3 h-3 stroke-[1.75]" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3.5">{t.vault.table.category}</th>
                  <th className="py-2.5 px-3.5">{t.vault.table.photo}</th>
                  <th className="py-2.5 px-3.5">{t.vault.table.contact}</th>
                  <th className="py-2.5 px-3.5 text-right">{t.vault.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)] text-[var(--app-text)]">
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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-medium shadow-[var(--app-shadow)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2 pointer-events-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-ping" />
          <span>{localToast}</span>
        </div>
      )}
    </div>
  );
};
