/**
 * @license
 * EERUM Personal & Non-Profit Use License
 * Copyright (c) 2026 Korean Center. All rights reserved.
 * Permitted for personal and non-profit use. Redistribution, modification, sale, and commercial use prohibited.
 */

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { PrintConfig, StoredCard } from './types/card';
import { saveStoredCards } from './utils/initialCards';
import { shareOrCopyLink } from './utils/share';
import { WelcomeCard } from './components/WelcomeCard';
import { lazyWithRetry, LazyErrorBoundary } from './utils/lazyWithRetry';
import { getCardShareUrl } from '@/utils/cardSerializer';
import { useModalState } from './hooks/useModalState';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useCardVault, type ActiveTab } from './hooks/useCardVault';
import { usePublicCardRoute } from './hooks/usePublicCardRoute';
import { toBackupPayloadFromP2P, type P2PVaultTransferPayload } from './utils/p2pSync';
import { AppThemeSelector } from './components/AppThemeSelector';
import { applyAppTheme, loadStoredAppTheme } from './constants/appThemes';
import { ACCOUNT_CHANGED_EVENT } from './utils/localAccount';
import { getAccountCardThemeMapKey } from './utils/accountStorage';
import {
  CARD_THEME_MAP_UPDATED_EVENT,
  loadCardThemeMap,
  resolveCardWithStoredTheme,
  resolveCardsWithStoredThemes,
  type CardThemeMap,
} from './utils/cardThemeStorage';
import {
  Check,
  CreditCard,
  FolderArchive,
  ArrowLeft,
  Smartphone,
  Lock,
  Fingerprint,
  Settings,
  LogOut,
  RotateCcw,
  BookmarkPlus,
  KeyRound,
  Download,
  Upload,
  HardDriveDownload,
  Compass,
  UserCheck,
  UserPlus,
  ChevronDown,
  X,
  Plus,
} from 'lucide-react';

const AppModals = lazyWithRetry(() =>
  import('./components/AppModals').then((m) => ({ default: m.AppModals }))
);
const DeleteConfirmModal = lazyWithRetry(() =>
  import('./components/DeleteConfirmModal').then((m) => ({ default: m.DeleteConfirmModal }))
);
const CardContainer = lazyWithRetry(() =>
  import('./components/CardContainer').then((m) => ({ default: m.CardContainer }))
);
const CardNavigator = lazyWithRetry(() =>
  import('./components/CardNavigator').then((m) => ({ default: m.CardNavigator }))
);
const ThemeSelector = lazyWithRetry(() =>
  import('./components/ThemeSelector').then((m) => ({ default: m.ThemeSelector }))
);
const PrintSheet = lazyWithRetry(() =>
  import('./components/PrintSheet').then((m) => ({ default: m.PrintSheet }))
);
const VaultView = lazyWithRetry(() =>
  import('./components/VaultView').then((m) => ({ default: m.VaultView }))
);
const CardPersonalMemo = lazyWithRetry(() =>
  import('./components/CardPersonalMemo').then((m) => ({ default: m.CardPersonalMemo }))
);
const PWAInstallModal = lazyWithRetry(() =>
  import('./components/PWAInstallModal').then((m) => ({ default: m.PWAInstallModal }))
);

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('my-card');
  const [isSamplePreview, setIsSamplePreview] = useState<boolean>(false);
  const [sampleMyCards, setSampleMyCards] = useState<StoredCard[]>([]);
  const [sampleVaultCards, setSampleVaultCards] = useState<StoredCard[]>([]);
  const [selectedSampleMyCardId, setSelectedSampleMyCardId] = useState<string>('');
  const [selectedSampleVaultCardId, setSelectedSampleVaultCardId] = useState<string | null>(null);
  const [sampleModalCardId, setSampleModalCardId] = useState<string | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isMemoOpen, setIsMemoOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const pwa = usePWAInstall();
  const [isPWAInstallOpen, setIsPWAInstallOpen] = useState<boolean>(false);

  const [themeMap, setThemeMap] = useState<CardThemeMap>(() => loadCardThemeMap());

  useEffect(() => {
    const syncThemeMap = () => setThemeMap(loadCardThemeMap());
    const handleStorage = (e: StorageEvent) => {
      const accountThemeKey = getAccountCardThemeMapKey();
      if (e.key === null || (accountThemeKey && e.key === accountThemeKey)) {
        syncThemeMap();
      }
    };
    window.addEventListener(CARD_THEME_MAP_UPDATED_EVENT, syncThemeMap);
    window.addEventListener(ACCOUNT_CHANGED_EVENT, syncThemeMap);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CARD_THEME_MAP_UPDATED_EVENT, syncThemeMap);
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, syncThemeMap);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    layout: 'single-card',
    size: 'kr-standard',
    theme: 'pure_white',
    showCropMarks: true,
    scale: 1,
  });

  // Tracks legacy welcome intro toggle; active authentication is governed by vault.activeAccount
  const [, setShowWelcomeIntro] = useState<boolean>(false);

  useEffect(() => {
    applyAppTheme(loadStoredAppTheme(), false);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  const modals = useModalState();

  const cleanPublicRouteRef = useRef<() => void>(() => {});
  const handleCleanPublicRoute = useCallback(() => {
    cleanPublicRouteRef.current();
  }, []);

  const activeSampleMyCard =
    sampleMyCards.find((c) => c.id === selectedSampleMyCardId) || sampleMyCards[0] || null;

  const vault = useCardVault({
    modals,
    showToast,
    activeTab,
    setActiveTab,
    setIsSamplePreview,
    setIsFlipped,
    setShowWelcomeIntro,
    onCleanPublicRoute: handleCleanPublicRoute,
    preferredNewCardTheme: isSamplePreview ? activeSampleMyCard?.theme : undefined,
  });

  useEffect(() => {
    setThemeMap(loadCardThemeMap(vault.activeAccountId));
  }, [vault.activeAccountId]);

  // Close Account Profile dropdown on outside click or Escape
  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAccountMenuOpen]);

  // Clear ephemeral sample state once signed into a real local account
  useEffect(() => {
    if (vault.activeAccount) {
      setIsSamplePreview(false);
      setSampleMyCards([]);
      setSampleVaultCards([]);
      setSelectedSampleMyCardId('');
      setSelectedSampleVaultCardId(null);
      setSampleModalCardId(null);
      setIsAccountMenuOpen(false);
    }
  }, [vault.activeAccount]);

  const enterSampleSandbox = useCallback(async () => {
    const { SAMPLE_MY_CARDS, SAMPLE_VAULT_CARDS } = await import('./constants/sampleCards');
    const clonedMy = SAMPLE_MY_CARDS.map((c) => ({ ...c, data: { ...c.data } }));
    const clonedVault = SAMPLE_VAULT_CARDS.map((c) => ({ ...c, data: { ...c.data } }));
    setSampleMyCards(clonedMy);
    setSampleVaultCards(clonedVault);
    setSelectedSampleMyCardId(clonedMy[0]?.id || '');
    setSelectedSampleVaultCardId(null);
    setSampleModalCardId(null);
    setIsFlipped(false);
    setIsMemoOpen(false);
    setActiveTab('my-card');
    setShowWelcomeIntro(false);
    setIsSamplePreview(true);
  }, []);

  const exitSampleToCreateAccount = useCallback(
    (toastMsg?: string) => {
      setIsSamplePreview(false);
      setSampleMyCards([]);
      setSampleVaultCards([]);
      setSelectedSampleMyCardId('');
      setSelectedSampleVaultCardId(null);
      setSampleModalCardId(null);
      setIsFlipped(false);
      setIsMemoOpen(false);
      setActiveTab('my-card');
      if (toastMsg) {
        showToast(toastMsg);
      }
      modals.openCreateAccount();
    },
    [modals.openCreateAccount, showToast]
  );

  const handleResolveOwnedMyCard = useCallback(
    (ownedCardId?: string) => {
      vault.setSelectedVaultCardId(null);
      if (ownedCardId) {
        vault.setSelectedMyCardId(ownedCardId);
      }
      setActiveTab('my-card');
    },
    [vault.setSelectedVaultCardId, vault.setSelectedMyCardId]
  );

  const handleApplySyncedCards = useCallback(
    (normalized: StoredCard[]) => {
      const withStoredThemes = resolveCardsWithStoredThemes(normalized);
      vault.setCards(withStoredThemes);
      saveStoredCards(withStoredThemes);
      vault.setSelectedVaultCardId(null);
      setActiveTab('vault');
    },
    [vault.setCards, vault.setSelectedVaultCardId]
  );

  const handleDetectP2PRoom = useCallback(
    (roomId: string) => {
      setShowWelcomeIntro(false);
      setIsSamplePreview(false);
      modals.openP2PReceive(roomId);
    },
    [modals.openP2PReceive]
  );

  const handleApplyP2PTransfer = useCallback(
    (p2pPayload: P2PVaultTransferPayload, mode: 'merge' | 'replace') => {
      const backupPayload = toBackupPayloadFromP2P(p2pPayload);
      vault.handleRestoreVaultBackup(backupPayload, mode, {
        updateNewerDuplicates: false,
      });
      setShowWelcomeIntro(false);
      setIsSamplePreview(false);
      const hasIncomingMyCards = p2pPayload.cards.some((c) => Boolean(c.isMyCard));
      if (!hasIncomingMyCards && vault.myCards.length === 0) {
        setActiveTab('vault');
      }
    },
    [vault.handleRestoreVaultBackup, vault.myCards.length]
  );

  const handleResetFlip = useCallback(() => {
    setIsFlipped(false);
  }, []);

  const {
    publicCard,
    isPublicExternalView,
    isUnauthenticatedExternalVisitor,
    cleanPublicUrlToRoot,
  } = usePublicCardRoute({
    hasLocalCards: vault.cards.length > 0,
    isAuthenticatedAccount: Boolean(vault.activeAccount),
    isPinConfigured: vault.isPinConfigured,
    showToast,
    onResolveOwnedMyCard: handleResolveOwnedMyCard,
    onApplySyncedCards: handleApplySyncedCards,
    onDetectP2PRoom: handleDetectP2PRoom,
    onResetFlip: handleResetFlip,
  });

  const [pendingQuickQr, setPendingQuickQr] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('mode') === 'quick-qr';
  });

  // Clean ?mode=quick-qr from URL once captured on mount
  useEffect(() => {
    if (!pendingQuickQr || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('mode') === 'quick-qr') {
      url.searchParams.delete('mode');
      window.history.replaceState({}, document.title, url.pathname + (url.search || ''));
    }
  }, [pendingQuickQr]);

  // Launch Quick-QR Pass immediately once unlocked and personal cards are available
  useEffect(() => {
    if (!pendingQuickQr) return;
    if (vault.isPinConfigured && vault.isLocked) return;

    setShowWelcomeIntro(false);
    setIsSamplePreview(false);
    setActiveTab('my-card');

    if (vault.myCards.length > 0) {
      const targetCard =
        vault.myCards.find((c) => c.id === vault.selectedMyCardId) ||
        vault.myCards.find((c) => c.isDefault) ||
        vault.myCards[0];
      if (targetCard) {
        vault.setSelectedMyCardId(targetCard.id);
        vault.setModalTargetCardId(targetCard.id);
        modals.openQuickQr();
      }
      setPendingQuickQr(false);
    } else {
      setPendingQuickQr(false);
      showToast('등록된 내 명함이 없습니다. 먼저 명함을 만들어 주세요.');
    }
  }, [
    pendingQuickQr,
    vault.isPinConfigured,
    vault.isLocked,
    vault.myCards,
    vault.selectedMyCardId,
    vault.setSelectedMyCardId,
    vault.setModalTargetCardId,
    modals.openQuickQr,
    showToast,
  ]);

  useEffect(() => {
    cleanPublicRouteRef.current = cleanPublicUrlToRoot;
  }, [cleanPublicUrlToRoot]);

  /**
   * Explicit Tab Change Handler (`handleTabChange`)
   * - Switching to 'my-card' clears any active Vault detail card and force-resets `selectedMyCardId`
   *   to the requested personal card or the user's primary default `isMyCard === true` card.
   * - Switching to 'vault' requires unlock (when PIN is configured) and returns to the Vault list/grid.
   */
  const handleTabChange = (nextTab: ActiveTab, targetMyCardId?: string) => {
    setIsAccountMenuOpen(false);
    if (isSamplePreview) {
      cleanPublicUrlToRoot();
      setIsFlipped(false);
      setIsMemoOpen(false);
      setSelectedSampleVaultCardId(null);
      setActiveTab(nextTab);
      return;
    }

    if (!vault.activeAccount) {
      modals.openCreateAccount();
      return;
    }

    setShowWelcomeIntro(false);
    setIsSamplePreview(false);
    if (nextTab === 'my-card') {
      cleanPublicUrlToRoot();
      vault.setSelectedVaultCardId(null);
      setIsFlipped(false);
      const preferredMyCard =
        (targetMyCardId ? vault.myCards.find((c) => c.id === targetMyCardId) : undefined) ||
        vault.myCards.find((c) => c.isDefault) ||
        vault.myCards[0];
      vault.setSelectedMyCardId(preferredMyCard?.id || '');
      setActiveTab('my-card');
      return;
    }

    vault.requireUnlock(() => {
      cleanPublicUrlToRoot();
      vault.setSelectedVaultCardId(null);
      setIsFlipped(false);
      setActiveTab('vault');
    });
  };

  const handleCreateMyOwnCard = () => {
    cleanPublicUrlToRoot();
    if (!vault.activeAccount) {
      setIsSamplePreview(false);
      modals.openCreateAccount();
      return;
    }
    handleTabChange('my-card');
    vault.handleOpenCreateModal();
  };

  const resolvedMyCards = React.useMemo(
    () => vault.myCards.map((c) => resolveCardWithStoredTheme(c, themeMap)),
    [vault.myCards, themeMap]
  );

  const resolvedVaultCards = React.useMemo(
    () => vault.vaultCards.map((c) => resolveCardWithStoredTheme(c, themeMap)),
    [vault.vaultCards, themeMap]
  );

  const resolvedSelectedVaultCard = React.useMemo(
    () =>
      vault.selectedVaultCard
        ? resolveCardWithStoredTheme(vault.selectedVaultCard, themeMap)
        : undefined,
    [vault.selectedVaultCard, themeMap]
  );

  const resolvedPublicCard = React.useMemo(
    () => (publicCard ? resolveCardWithStoredTheme(publicCard, themeMap) : null),
    [publicCard, themeMap]
  );

  const activeSampleVaultCard = React.useMemo(
    () =>
      selectedSampleVaultCardId
        ? sampleVaultCards.find((c) => c.id === selectedSampleVaultCardId)
        : undefined,
    [sampleVaultCards, selectedSampleVaultCardId]
  );

  // Resolved personal card strictly from `myCards` (`isMyCard === true`), or sample card when `isSamplePreview` is active
  const currentMyCard: StoredCard | undefined = isSamplePreview
    ? activeSampleMyCard || undefined
    : resolvedMyCards.length > 0
      ? resolvedMyCards.find((c) => c.id === vault.selectedMyCardId) ||
        resolvedMyCards.find((c) => c.isDefault) ||
        resolvedMyCards[0]
      : undefined;

  // Target card for Share / QR / Print / Export modals
  const modalTargetCard: StoredCard | undefined = isSamplePreview
    ? (sampleModalCardId
        ? [...sampleMyCards, ...sampleVaultCards].find((c) => c.id === sampleModalCardId)
        : undefined) ||
      (activeTab === 'vault' && activeSampleVaultCard ? activeSampleVaultCard : currentMyCard)
    : (vault.modalTargetCardId
        ? (() => {
            const found = vault.cards.find((c) => c.id === vault.modalTargetCardId);
            return found ? resolveCardWithStoredTheme(found, themeMap) : undefined;
          })()
        : undefined) ||
      (isPublicExternalView && resolvedPublicCard
        ? resolvedPublicCard
        : activeTab === 'vault' && resolvedSelectedVaultCard
          ? resolvedSelectedVaultCard
          : currentMyCard);

  // Automatically sync print theme when viewing a card in detail view
  const activeDetailCard: StoredCard | undefined =
    isPublicExternalView && resolvedPublicCard
      ? resolvedPublicCard
      : isSamplePreview
        ? activeTab === 'vault' && activeSampleVaultCard
          ? activeSampleVaultCard
          : currentMyCard
        : activeTab === 'vault' && resolvedSelectedVaultCard
          ? resolvedSelectedVaultCard
          : activeTab === 'my-card'
            ? currentMyCard
            : undefined;

  useEffect(() => {
    if (!activeDetailCard?.theme) return;
    setPrintConfig((prev) =>
      prev.theme === activeDetailCard.theme ? prev : { ...prev, theme: activeDetailCard.theme }
    );
  }, [activeDetailCard?.id, activeDetailCard?.theme]);

  const handleShare = async (cardToShare?: StoredCard) => {
    const targetCard = cardToShare || modalTargetCard;
    if (!targetCard) return;
    const targetUrl = getCardShareUrl(targetCard);
    const displayUrl = targetCard.data.websiteDisplay || targetUrl;
    const displayName = targetCard.data.name || targetCard.data.nameKr;
    const displayOrg = targetCard.data.organizationKr || targetCard.data.organization;
    const displayTitle = targetCard.data.titleKr || targetCard.data.title;

    await shareOrCopyLink({
      title: displayOrg ? `${displayName} — ${displayOrg}` : displayName,
      text: [displayOrg, displayTitle, displayName, '디지털 명함'].filter(Boolean).join(' '),
      url: targetUrl,
      onCopied: () => showToast(`명함 링크(${displayUrl})가 복사되었습니다`),
      onCopyError: () => showToast('명함 링크 복사에 실패했습니다.'),
    });
  };

  // Keyboard shortcut: Space to flip card in active single-card views
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const isSingleCardViewport =
        isPublicExternalView ||
        activeTab === 'my-card' ||
        (activeTab === 'vault' && Boolean(vault.selectedVaultCard));
      if (e.code === 'Space' && isSingleCardViewport) {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, vault.selectedVaultCard, isPublicExternalView]);

  const isMyCardTabActive = !isPublicExternalView && activeTab === 'my-card';
  const isVaultTabActive = !isPublicExternalView && activeTab === 'vault';
  const isVaultDetailActive =
    isVaultTabActive &&
    (isSamplePreview
      ? Boolean(activeSampleVaultCard)
      : Boolean(vault.selectedVaultCardId) &&
        (Boolean(vault.selectedVaultCard) || (vault.isPinConfigured && vault.isLocked)));
  const isLoggedOutLanding =
    !isPublicExternalView && !vault.activeAccount && !isSamplePreview;
  const headerVaultCount = isSamplePreview ? sampleVaultCards.length : vault.vaultCards.length;

  return (
    <>
      {/* SCREEN UI CONTAINER */}
      <div
        id="screen-app-container"
        className="min-h-[100dvh] overflow-x-clip w-full max-w-[100vw] bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col justify-between selection:bg-[var(--app-accent)] selection:text-[var(--app-accent-fg)] font-sans pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
      >
        {/* Top Minimalist Header */}
        <header className="shrink-0 sticky top-0 z-40 w-full border-b border-[var(--app-border)] bg-[var(--app-header-bg)] backdrop-blur-xl px-3 sm:px-8 py-2 sm:py-2.5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(0.625rem+env(safe-area-inset-top,0px))] pl-[calc(0.75rem+env(safe-area-inset-left,0px))] pr-[calc(0.75rem+env(safe-area-inset-right,0px))] sm:pl-[calc(2rem+env(safe-area-inset-left,0px))] sm:pr-[calc(2rem+env(safe-area-inset-right,0px))] flex items-center justify-between gap-1.5 sm:gap-2 main-app-header">
          {isUnauthenticatedExternalVisitor ? (
            /* Public Unauthenticated Visitor Header: Muted Brand Watermark Only */
            <>
              <div className="w-full flex items-center justify-center py-0.5 header-brand-mark">
                <span className="text-xs text-[var(--app-text-muted)] tracking-widest uppercase font-medium select-none font-sans">
                  GOGUMA CARD STUDIO
                </span>
              </div>
              <div className="hidden header-landscape-mini items-center bg-[var(--app-surface)] border border-[var(--app-border)] rounded-full px-3 py-1 shadow-[var(--app-shadow)]">
                <span className="text-[10px] font-semibold text-[var(--app-text)] tracking-widest uppercase">
                  GOGUMA
                </span>
              </div>
            </>
          ) : isLoggedOutLanding ? (
            /* Minimal Unauthenticated Welcome Header: Theme Selector + About Only */
            <>
              <div className="flex items-center gap-2 header-full-nav">
                <span className="text-sm font-black tracking-tight text-[var(--app-text)] select-none">
                  eerum
                </span>
                <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--app-text-muted)]">
                  Local-First Vault
                </span>
              </div>

              <div className="flex items-center justify-end gap-1.5 sm:gap-2 min-h-[32px] header-full-nav">
                <AppThemeSelector />
                <button
                  type="button"
                  onClick={() => modals.openAbout('philosophy')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-xs font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                  title="앱 소개 · Net to Dot 철학"
                  aria-label="앱 소개"
                >
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">앱 소개</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Left Spacer / Brand Indicator for Header Balance on sm+ */}
              <div className="hidden sm:flex sm:flex-1 items-center justify-start header-full-nav">
                <span className="text-xs font-black tracking-tight text-[var(--app-text-muted)] select-none">
                  eerum
                </span>
              </div>

              {/* Compressed Mini Icon in Landscape Mode */}
              <div className="hidden header-landscape-mini items-center gap-1 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-full p-1 shadow-[var(--app-shadow)]">
                <button
                  onClick={() => {
                    if (isMyCardTabActive) {
                      handleTabChange('vault');
                    } else {
                      handleTabChange('my-card');
                    }
                  }}
                  className="p-1.5 rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
                  title={isMyCardTabActive ? '보관함으로 전환' : '내 명함으로 전환'}
                  aria-label="화면 전환"
                >
                  {isMyCardTabActive ? (
                    <FolderArchive className="w-3.5 h-3.5" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5" />
                  )}
                </button>
                {!isSamplePreview && vault.isPinConfigured && (
                  <button
                    onClick={() => {
                      vault.lockApp();
                      showToast('화면이 보안 잠금되었습니다.');
                    }}
                    className="p-1.5 rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
                    title="즉시 화면 잠금"
                    aria-label="화면 잠금"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                )}
                {!isSamplePreview && (
                  <button
                    onClick={modals.toggleSettings}
                    className="p-1.5 rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
                    title="설정"
                    aria-label="설정"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Center Navigation: Switcher (내 명함 vs 명함 보관함) */}
              <nav aria-label="주요 메뉴" className="flex items-center gap-1 sm:gap-1.5 min-w-0 header-full-nav">
                <button
                  onClick={() => handleTabChange('my-card')}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                    isMyCardTabActive
                      ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-sm'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                  <span>내 명함</span>
                </button>

                <button
                  onClick={() => handleTabChange('vault')}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                    isVaultTabActive
                      ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-sm'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5 shrink-0" />
                  <span>명함 보관함</span>
                  {!isSamplePreview && vault.isPinConfigured && vault.isLocked && (
                    <Lock className="w-3 h-3 shrink-0" />
                  )}
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      isVaultTabActive ? 'opacity-85' : 'text-[var(--app-text-muted)]'
                    }`}
                  >
                    {headerVaultCount}
                  </span>
                </button>
              </nav>

              {/* Right Header: Sample CTA OR Logged-In Account Pill, Lock & Settings */}
              <div className="sm:flex-1 flex items-center justify-end gap-1 sm:gap-2 min-h-[32px] relative shrink-0 header-full-nav">
                <AppThemeSelector />

                {isSamplePreview ? (
                  <div className="inline-flex items-center rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] shadow-sm shrink-0">
                    <button
                      type="button"
                      onClick={() => exitSampleToCreateAccount()}
                      className="pl-2.5 sm:pl-3 pr-1.5 sm:pr-2 py-1.5 text-[11px] sm:text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] rounded-l-full transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                    >
                      계정 만들기
                    </button>
                    <span className="h-3.5 w-px bg-[var(--app-border)] shrink-0" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsSamplePreview(false);
                        setSampleMyCards([]);
                        setSampleVaultCards([]);
                        setSelectedSampleMyCardId('');
                        setSelectedSampleVaultCardId(null);
                        setSampleModalCardId(null);
                        setIsFlipped(false);
                        setIsMemoOpen(false);
                        setActiveTab('my-card');
                      }}
                      title="샘플 종료"
                      aria-label="샘플 종료"
                      className="pl-1.5 pr-2 sm:pr-2.5 py-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] rounded-r-full transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Active Local Account Profile Pill & Dropdown */}
                    {vault.activeAccount && (
                      <div className="relative" ref={accountMenuRef}>
                        <button
                          type="button"
                          onClick={() => {
                            modals.closeSettings();
                            setIsAccountMenuOpen((prev) => !prev);
                          }}
                          aria-expanded={isAccountMenuOpen}
                          aria-haspopup="menu"
                          className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                          title={`로컬 계정: ${vault.activeAccount.displayName}`}
                        >
                          <UserCheck className="w-3.5 h-3.5 text-[var(--app-accent)] shrink-0" />
                          <span className="truncate max-w-[72px] sm:max-w-[110px]">
                            {vault.activeAccount.displayName}
                          </span>
                          <ChevronDown
                            className={`w-3 h-3 text-[var(--app-text-muted)] transition-transform duration-150 shrink-0 ${
                              isAccountMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isAccountMenuOpen && (
                          <div
                            role="menu"
                            aria-label="로컬 계정 메뉴"
                            className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--app-text)]"
                          >
                            <div className="px-2.5 py-2 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] mb-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[var(--app-text)] truncate">
                                  {vault.activeAccount.displayName}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-muted)] shrink-0">
                                  {vault.isPinConfigured ? 'PIN 잠금' : '잠금 없음'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--app-text-muted)] mt-1 tabular-nums">
                                내 명함 {vault.myCards.length} · 보관함 {vault.vaultCards.length}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setIsAccountMenuOpen(false);
                                vault.handleLogoutAccount();
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left font-medium"
                            >
                              <LogOut className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                              <span>계정 잠금 / 로그아웃</span>
                            </button>

                            {vault.accountsList.filter((a) => a.id !== vault.activeAccount?.id).length > 0 && (
                              <>
                                <div className="my-1.5 border-t border-[var(--app-border)]" />
                                <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
                                  로컬 계정 전환
                                </p>
                                <div className="max-h-36 overflow-y-auto space-y-0.5">
                                  {vault.accountsList
                                    .filter((a) => a.id !== vault.activeAccount?.id)
                                    .map((acct) => (
                                      <button
                                        key={acct.id}
                                        type="button"
                                        onClick={async () => {
                                          setIsAccountMenuOpen(false);
                                          if (!acct.hasPin) {
                                            await vault.handleLoginAccount(acct.id);
                                          } else {
                                            vault.handleLogoutAccount();
                                            showToast(`'${acct.displayName}' 계정의 PIN을 입력해 주세요.`);
                                          }
                                        }}
                                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                                      >
                                        <span className="truncate">{acct.displayName}</span>
                                        {acct.hasPin && (
                                          <Lock className="w-3 h-3 text-[var(--app-text-muted)] shrink-0" />
                                        )}
                                      </button>
                                    ))}
                                </div>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setIsAccountMenuOpen(false);
                                modals.openCreateAccount();
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 mt-0.5 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                            >
                              <UserPlus className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                              <span>새 로컬 계정 추가</span>
                            </button>

                            <div className="my-1.5 border-t border-[var(--app-border)]" />
                            <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
                              계정 보안 및 백업
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAccountMenuOpen(false);
                                modals.openPinConfig(vault.isPinConfigured ? 'change' : 'setup');
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                              <span>{vault.isPinConfigured ? 'PIN 번호 변경' : '4자리 PIN 설정'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAccountMenuOpen(false);
                                vault.requireUnlock(() => modals.openBackup('export'));
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                            >
                              <HardDriveDownload className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                              <span>암호화 백업 (.eerum)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {vault.isPinConfigured && (
                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          vault.lockApp();
                          showToast('화면이 보안 잠금되었습니다.');
                        }}
                        className="p-2 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                        title="즉시 화면 잠금 (Lock Screen)"
                        aria-label="화면 잠금"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )}

                    <div className="relative" ref={modals.settingsMenuRef}>
                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          modals.toggleSettings();
                        }}
                        aria-expanded={modals.isSettingsOpen}
                        aria-haspopup="menu"
                        className="p-2 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                        title="보안 및 기기 설정"
                        aria-label="설정 메뉴"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      {modals.isSettingsOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--app-text)]">
                          <button
                            onClick={() => {
                              modals.closeSettings();
                              modals.openPinConfig(vault.isPinConfigured ? 'change' : 'setup');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                          >
                            <Lock className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                            <span>{vault.isPinConfigured ? 'PIN 번호 변경 / 관리' : '4자리 PIN 보안 설정'}</span>
                          </button>

                          <button
                            onClick={() => {
                              modals.closeSettings();
                              modals.openBiometrics();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                          >
                            <Fingerprint className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                            <span>생체 인증 (Face ID / 지문)</span>
                          </button>

                          <div className="my-1 border-t border-[var(--app-border)]" />

                          <button
                            onClick={() => {
                              modals.closeSettings();
                              vault.requireUnlock(() => {
                                modals.openBackup('export');
                              });
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                          >
                            <HardDriveDownload className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                            <span>보관함 백업 내보내기 (.eerum)</span>
                          </button>

                          <button
                            onClick={() => {
                              modals.closeSettings();
                              vault.requireUnlock(() => {
                                modals.openBackup('restore');
                              });
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                          >
                            <Upload className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                            <span>백업 파일에서 복원</span>
                          </button>

                          <button
                            onClick={() => {
                              modals.closeSettings();
                              modals.openSync();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                            <span>기기 연결 및 동기화</span>
                          </button>

                          <button
                            onClick={() => {
                              modals.closeSettings();
                              if (pwa.isInstalled) {
                                showToast('이미 독립형 PWA 앱으로 설치되어 실행 중입니다.');
                                setIsPWAInstallOpen(true);
                              } else if (pwa.isInstallable) {
                                pwa.install().then((installed) => {
                                  if (installed) {
                                    showToast('앱이 성공적으로 설치되었습니다.');
                                  } else {
                                    setIsPWAInstallOpen(true);
                                  }
                                });
                              } else {
                                setIsPWAInstallOpen(true);
                              }
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-2.5">
                              <Download className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                              <span>홈 화면에 앱 설치 (PWA)</span>
                            </div>
                            {pwa.isInstalled && (
                              <span className="text-[10px] text-emerald-600 bg-emerald-500/15 px-1.5 py-0.5 rounded font-medium border border-emerald-500/25">
                                설치됨
                              </span>
                            )}
                          </button>

                          <div className="my-1 border-t border-[var(--app-border)]" />

                          <button
                            onClick={() => {
                              modals.closeSettings();
                              modals.openAbout('philosophy');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                          >
                            <Compass className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                            <span>앱 소개 · Net to Dot 철학</span>
                          </button>

                          <button
                            onClick={() => {
                              modals.closeSettings();
                              vault.handleLogoutAccount();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                          >
                            <LogOut className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                            <span>로그아웃 / 계정 전환</span>
                          </button>

                          <button
                            onClick={() => {
                              modals.closeSettings();
                              modals.openReset();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left"
                          >
                            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                            <span>로컬 데이터 초기화</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </header>

        {/* Main Showcase Viewport */}
        <main
          className={`flex-1 flex flex-col items-center ${
            isLoggedOutLanding
              ? 'justify-center px-4 sm:px-6 py-4 sm:py-6'
              : activeTab === 'vault' && !isVaultDetailActive && !isPublicExternalView
                ? 'justify-start px-3 sm:px-4 py-2 sm:py-5'
                : 'justify-center px-3 sm:px-4 py-2 sm:py-5'
          } max-w-6xl mx-auto w-full min-w-0`}
        >
          {isPublicExternalView && resolvedPublicCard ? (
            /* ================= PUBLIC SHARED CARD LANDING VIEW (/card/:slug) ================= */
            <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
              <div className="w-full max-w-[540px] flex justify-center">
                <LazyErrorBoundary resetKey={resolvedPublicCard.id}>
                  <Suspense
                    fallback={
                      <div
                        className="w-full aspect-[9/5] rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]"
                        aria-hidden="true"
                      />
                    }
                  >
                    <CardContainer
                      data={resolvedPublicCard.data}
                      theme={resolvedPublicCard.theme}
                      layout_type={resolvedPublicCard.layout_type}
                      card_features={resolvedPublicCard.card_features}
                      isPhotoCard={resolvedPublicCard.isPhotoCard || resolvedPublicCard.creation_mode === 'photo'}
                      photoUrl={resolvedPublicCard.scannedImage || resolvedPublicCard.front_image_url}
                      backPhotoUrl={resolvedPublicCard.scannedImageBack || resolvedPublicCard.back_image_url}
                      html_front={resolvedPublicCard.html_front}
                      html_back={resolvedPublicCard.html_back}
                      isFlipped={isFlipped}
                      onFlip={() => setIsFlipped((prev) => !prev)}
                      onOpenShare={() => handleShare(resolvedPublicCard)}
                      isOwner={false}
                      cardUrl={getCardShareUrl(resolvedPublicCard)}
                      onShowToast={showToast}
                    />
                  </Suspense>
                </LazyErrorBoundary>
              </div>

              <div className="mt-6 mb-2 flex flex-col items-center gap-3 text-center">
                {/* Save Shared Card to Internal Vault Action */}
                <button
                  type="button"
                  onClick={() => vault.handleRegisterSharedCardToVault(resolvedPublicCard)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--app-accent-fg)] bg-[var(--app-accent)] hover:opacity-90 transition-all tracking-wide py-2.5 px-5 rounded-xl active:scale-95 cursor-pointer shadow-[var(--app-shadow)]"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 stroke-[1.75]" />
                  <span>명함 보관함에 등록</span>
                </button>

                {/* External Landing Viral CTA: STRICTLY shown ONLY to unauthenticated external visitors */}
                {isUnauthenticatedExternalVisitor && (
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCreateMyOwnCard();
                    }}
                    className="inline-flex items-center gap-2 text-xs text-[var(--app-text)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-subtle)] transition-all tracking-wide py-2.5 px-5 rounded-full border border-[var(--app-border)] active:scale-95 group cursor-pointer shadow-sm"
                  >
                    <span>나만의 럭셔리 디지털 명함 만들기</span>
                    <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 font-sans">
                      ↗
                    </span>
                  </a>
                )}

                <a
                  href="https://nettodot.org/pages/chapter01/abstract"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pt-1 text-[10px] font-mono tracking-[0.14em] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
                >
                  eerum · Net to Dot Movement ↗
                </a>
              </div>
            </div>
          ) : isLoggedOutLanding ? (
            /* ================= UNAUTHENTICATED LOCAL VAULT ENTRY / LOGIN SCREEN ================= */
            <WelcomeCard
              accounts={vault.accountsList}
              onOpenCreateAccount={modals.openCreateAccount}
              onExploreSample={enterSampleSandbox}
              onLoginAccount={vault.handleLoginAccount}
              onBiometricLoginAccount={vault.handleBiometricLoginAccount}
              onDeleteAccount={vault.handleDeleteLocalAccount}
            />
          ) : isSamplePreview ? (
            /* ================= FULL READ-ONLY SAMPLE SANDBOX (MY CARD + VAULT) ================= */
            activeTab === 'vault' ? (
              activeSampleVaultCard ? (
                <div className="w-full flex flex-col items-center space-y-2 sm:space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFlipped(false);
                        setSelectedSampleVaultCardId(null);
                      }}
                      className="flex items-center gap-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors cursor-pointer py-1.5 px-2 -ml-2 rounded-lg hover:bg-[var(--app-surface-subtle)]"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>샘플 보관함 목록으로</span>
                    </button>
                  </div>

                  <div className="w-full flex flex-col items-center gap-3 pb-6">
                    <LazyErrorBoundary resetKey={activeSampleVaultCard.id}>
                      <Suspense
                        fallback={
                          <div
                            className="w-full max-w-[540px] aspect-[9/5] rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]"
                            aria-hidden="true"
                          />
                        }
                      >
                        <CardNavigator
                          variant="vault"
                          cards={sampleVaultCards}
                          activeCardId={activeSampleVaultCard.id}
                          onSelectCard={(selectedId) => {
                            setIsFlipped(false);
                            setSelectedSampleVaultCardId(selectedId);
                          }}
                          onOpenShare={(cardToShare) => {
                            setSampleModalCardId(cardToShare.id);
                            modals.openShare();
                          }}
                          onOpenEdit={() =>
                            exitSampleToCreateAccount(
                              '샘플 명함은 수정할 수 없습니다. 로컬 계정을 만들어 보세요.'
                            )
                          }
                          getCardUrl={getCardShareUrl}
                          onShowToast={showToast}
                          mode="carousel"
                        />
                      </Suspense>
                    </LazyErrorBoundary>
                  </div>
                </div>
              ) : (
                <LazyErrorBoundary resetKey="sample-vault">
                  <Suspense
                    fallback={<div className="w-full max-w-6xl min-h-[320px]" aria-hidden="true" />}
                  >
                    <VaultView
                      isSampleMode={true}
                      onRequestCreateAccount={() => exitSampleToCreateAccount()}
                      cards={sampleVaultCards}
                      onSelectCard={(selected) => {
                        setIsFlipped(false);
                        setSelectedSampleVaultCardId(selected.id);
                      }}
                      onEditCard={() =>
                        exitSampleToCreateAccount(
                          '샘플 명함은 수정할 수 없습니다. 로컬 계정을 만들어 보세요.'
                        )
                      }
                      onDeleteCard={() =>
                        exitSampleToCreateAccount(
                          '샘플 모드에서는 삭제할 수 없습니다. 로컬 계정을 만들어 보세요.'
                        )
                      }
                      onExportCard={(cardToExport) => {
                        setSampleModalCardId(cardToExport.id);
                        modals.openExport();
                      }}
                      onOpenScan={() =>
                        exitSampleToCreateAccount(
                          '새 명함을 등록하려면 로컬 계정을 먼저 만들어 주세요.'
                        )
                      }
                      onOpenEditor={() =>
                        exitSampleToCreateAccount(
                          '새 명함을 등록하려면 로컬 계정을 먼저 만들어 주세요.'
                        )
                      }
                      onShowToast={showToast}
                    />
                  </Suspense>
                </LazyErrorBoundary>
              )
            ) : (
              /* Sample Sandbox: My Card View with Ephemeral ThemeSelector + CardNavigator */
              <div className="w-full min-h-0 flex flex-col items-center gap-3 sm:gap-4">
                {activeSampleMyCard && (
                  <Suspense fallback={null}>
                    <ThemeSelector
                      currentTheme={activeSampleMyCard.theme}
                      onSelectTheme={(nextTheme) => {
                        setSampleMyCards((prev) =>
                          prev.map((c) =>
                            c.id === activeSampleMyCard.id
                              ? { ...c, theme: nextTheme, customBgColor: undefined }
                              : c
                          )
                        );
                      }}
                    />
                  </Suspense>
                )}

                {activeSampleMyCard && (
                  <LazyErrorBoundary resetKey={activeSampleMyCard.id}>
                    <Suspense
                      fallback={
                        <div
                          className="w-full max-w-[540px] aspect-[9/5] rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]"
                          aria-hidden="true"
                        />
                      }
                    >
                      <CardNavigator
                        cards={sampleMyCards}
                        activeCardId={activeSampleMyCard.id}
                        onSelectCard={(selectedId) => {
                          setIsFlipped(false);
                          setSelectedSampleMyCardId(selectedId);
                        }}
                        onCreateNewCard={() =>
                          exitSampleToCreateAccount(
                            '나만의 명함을 만들려면 로컬 계정을 먼저 만들어 주세요.'
                          )
                        }
                        onOpenEdit={() =>
                          exitSampleToCreateAccount(
                            '샘플 명함은 편집할 수 없습니다. 로컬 계정을 만들어 나만의 명함을 제작해 보세요.'
                          )
                        }
                        onOpenShare={(cardToShare) => {
                          setSampleModalCardId(cardToShare.id);
                          modals.openShare();
                        }}
                        onOpenQuickQr={(cardForQuickQr) => {
                          setSampleModalCardId(cardForQuickQr.id);
                          modals.openQuickQr();
                        }}
                        onOpenNfc={(cardForNfc) => {
                          setSampleModalCardId(cardForNfc.id);
                          modals.openNfc();
                        }}
                        onOpenPrint={(cardForPrint) => {
                          setSampleModalCardId(cardForPrint.id);
                          modals.openPrint();
                        }}
                        onShowToast={showToast}
                        mode="carousel"
                      />
                    </Suspense>
                  </LazyErrorBoundary>
                )}
              </div>
            )
          ) : isVaultDetailActive ? (
            /* ================= INTERNAL VAULT DETAIL VIEW (`activeTab === 'vault' && !card.isMyCard`) ================= */
            <div className="w-full flex flex-col items-center space-y-2 sm:space-y-4 animate-in fade-in duration-200">
              {/* Vault Header Rail Guard Clause: Rendered ONLY when activeTab === 'vault' and viewing a non-MyCard Vault entry */}
              {activeTab === 'vault' && (!vault.selectedVaultCard || !vault.selectedVaultCard.isMyCard) && (
                <div className="flex items-center justify-between w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setIsMemoOpen(false);
                      vault.setSelectedVaultCardId(null);
                    }}
                    className="flex items-center gap-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors cursor-pointer py-1.5 px-2 -ml-2 rounded-lg hover:bg-[var(--app-surface-subtle)]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>보관함 목록으로</span>
                  </button>
                </div>
              )}

              {vault.isPinConfigured && vault.isLocked ? (
                <div className="w-full max-w-lg mx-auto py-16 px-6 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-text)] mb-5 shadow-[var(--app-shadow)]">
                    <Lock className="w-7 h-7 stroke-[1.5]" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--app-text)] mb-2 tracking-tight">
                    명함 보관함이 잠겨 있습니다
                  </h3>
                  <p className="text-xs text-[var(--app-text-muted)] max-w-sm mb-6 leading-relaxed">
                    공용 기기 및 타인의 무단 열람을 방지하기 위해 보관함이 4자리 보안 PIN으로 보호되고 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={vault.lockApp}
                    className="px-6 py-3 rounded-2xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] font-semibold text-xs transition-all cursor-pointer shadow-[var(--app-shadow)] active:scale-95 flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4 stroke-[1.75]" />
                    <span>보안 PIN 입력하여 잠금 해제</span>
                  </button>
                </div>
              ) : resolvedSelectedVaultCard && !resolvedSelectedVaultCard.isMyCard ? (
                <div className="w-full flex flex-col items-center gap-3 sm:gap-4 pb-6">
                  <LazyErrorBoundary resetKey={resolvedSelectedVaultCard.id}>
                    <Suspense
                      fallback={
                        <div
                          className="w-full max-w-[540px] aspect-[9/5] rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]"
                          aria-hidden="true"
                        />
                      }
                    >
                      <CardNavigator
                        variant="vault"
                        cards={resolvedVaultCards}
                        activeCardId={resolvedSelectedVaultCard.id}
                        onSelectCard={(selectedId) => {
                          setIsFlipped(false);
                          setIsMemoOpen(false);
                          vault.setSelectedVaultCardId(selectedId);
                        }}
                        onOpenShare={(cardToShare) => {
                          vault.handleRecordCardInteraction(cardToShare.id);
                          vault.setModalTargetCardId(cardToShare.id);
                          modals.openShare();
                        }}
                        onOpenEdit={(cardToEdit) => {
                          vault.requireUnlock(() => {
                            modals.openEditor(cardToEdit, false);
                          });
                        }}
                        getCardUrl={getCardShareUrl}
                        onShowToast={showToast}
                        onInteraction={(interactedCard) => {
                          vault.handleRecordCardInteraction(interactedCard.id);
                        }}
                        onToggleMemo={() => setIsMemoOpen((prev) => !prev)}
                        isMemoOpen={isMemoOpen}
                        mode="carousel"
                      />
                    </Suspense>
                  </LazyErrorBoundary>

                  {/* Personal Memo Editor (hidden by default; toggled via Memo button) */}
                  {isMemoOpen && (
                    <Suspense fallback={null}>
                      <CardPersonalMemo
                        card={resolvedSelectedVaultCard}
                        onSaveContext={(context) =>
                          vault.handleUpdateVaultContext(resolvedSelectedVaultCard.id, context)
                        }
                      />
                    </Suspense>
                  )}
                </div>
              ) : null}
            </div>
          ) : activeTab === 'vault' ? (
            /* ================= INTERNAL VAULT LIST / GRID VIEW ================= */
            <LazyErrorBoundary resetKey="vault">
              <Suspense
                fallback={<div className="w-full max-w-6xl min-h-[320px]" aria-hidden="true" />}
              >
                <VaultView
                  cards={resolvedVaultCards}
                  isLocked={vault.isPinConfigured && vault.isLocked}
                  onUnlockRequest={vault.lockApp}
                  onSelectCard={(selected) => {
                    if (selected.isMyCard) {
                      handleTabChange('my-card', selected.id);
                    } else {
                      vault.handleRecordCardInteraction(selected.id);
                      setIsFlipped(false);
                      setIsMemoOpen(false);
                      vault.setSelectedVaultCardId(selected.id);
                      setActiveTab('vault');
                    }
                  }}
                  onEditCard={(cardToEdit) => {
                    vault.requireUnlock(() => {
                      modals.openEditor(cardToEdit, false);
                    });
                  }}
                  onDeleteCard={(id) => {
                    vault.requireUnlock(() => {
                      const c = vault.cards.find((x) => x.id === id);
                      if (c) {
                        vault.handleRequestDeleteCard(c);
                      } else {
                        vault.handleDeleteCard(id);
                      }
                    });
                  }}
                  onExportCard={(cardToExport) => {
                    vault.handleRecordCardInteraction(cardToExport.id);
                    vault.setModalTargetCardId(cardToExport.id);
                    modals.openExport();
                  }}
                  onRecordInteraction={vault.handleRecordCardInteraction}
                  onOpenScan={() => {
                    vault.requireUnlock(() => {
                      modals.openScan();
                    });
                  }}
                  onOpenImportContacts={() => {
                    vault.requireUnlock(() => {
                      modals.openImportContacts();
                    });
                  }}
                  onOpenSync={modals.openSync}
                  onOpenEditor={vault.handleOpenCreateVaultCardModal}
                  onRenameCategory={(oldName, newName) => {
                    vault.requireUnlock(() => {
                      vault.handleRenameCategory(oldName, newName);
                    });
                  }}
                  onMergeCategories={(sourceCategory, targetCategory) => {
                    vault.requireUnlock(() => {
                      vault.handleMergeCategories(sourceCategory, targetCategory);
                    });
                  }}
                  onDeleteCategory={(deletedName, fallbackCategory) => {
                    vault.requireUnlock(() => {
                      vault.handleDeleteCategory(deletedName, fallbackCategory);
                    });
                  }}
                  onMergeDuplicateCards={vault.handleMergeDuplicateCards}
                  onShowToast={showToast}
                  totalSavedCardsCount={vault.cards.length}
                  onOpenBackup={(tab = 'export') => {
                    vault.requireUnlock(() => {
                      modals.openBackup(tab);
                    });
                  }}
                />
              </Suspense>
            </LazyErrorBoundary>
          ) : (
            /* ================= MY CARDS STUDIO & CAROUSEL VIEW (`activeTab === 'my-card'`) ================= */
            <div className="w-full min-h-0 flex flex-col items-center justify-center">
              {resolvedMyCards.length === 0 && !(vault.isPinConfigured && vault.isLocked) ? (
                <section
                  aria-label="내 명함 시작하기"
                  className="w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] mx-auto rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] px-6 py-12 sm:px-10 sm:py-16 flex flex-col items-center text-center animate-in fade-in duration-300"
                >
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--app-text)]">
                    내 명함이 아직 없습니다
                  </h2>
                  <p className="text-xs text-[var(--app-text-muted)] mt-1.5 leading-relaxed max-w-xs">
                    첫 번째 디지털 명함을 만들어 QR·링크로 바로 공유해 보세요.
                  </p>

                  <button
                    type="button"
                    onClick={vault.handleOpenCreateModal}
                    className="mt-6 h-11 px-6 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                  >
                    <Plus className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />
                    <span>내 명함 만들기</span>
                  </button>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-[var(--app-text-muted)]">
                    <button
                      type="button"
                      onClick={() => {
                        vault.requireUnlock(() => {
                          modals.openImportContacts();
                        });
                      }}
                      className="hover:text-[var(--app-text)] underline underline-offset-4 decoration-[var(--app-border)] hover:decoration-[var(--app-text-muted)] transition-colors cursor-pointer py-1 whitespace-nowrap"
                    >
                      주소록 가져오기 (.vcf)
                    </button>
                    <span aria-hidden="true" className="opacity-45">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        vault.requireUnlock(() => {
                          modals.openBackup('restore');
                        });
                      }}
                      className="hover:text-[var(--app-text)] underline underline-offset-4 decoration-[var(--app-border)] hover:decoration-[var(--app-text-muted)] transition-colors cursor-pointer py-1 whitespace-nowrap"
                    >
                      백업 파일 복원 (.eerum)
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  <LazyErrorBoundary resetKey={currentMyCard?.id || 'my-card-empty'}>
                    <Suspense
                      fallback={
                        <div
                          className="w-full max-w-[540px] aspect-[9/5] rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]"
                          aria-hidden="true"
                        />
                      }
                    >
                      <CardNavigator
                        cards={resolvedMyCards}
                        activeCardId={currentMyCard?.id || ''}
                        onSelectCard={vault.handleSelectMyCard}
                        onCreateNewCard={vault.handleOpenCreateModal}
                        onOpenEdit={(cardToEdit) => {
                          vault.requireUnlock(() => {
                            modals.openEditor(cardToEdit, false);
                          });
                        }}
                        onOpenShare={(cardToShare) => {
                          vault.setModalTargetCardId(cardToShare.id);
                          modals.openShare();
                        }}
                        onOpenQuickQr={(cardForQuickQr) => {
                          vault.setModalTargetCardId(cardForQuickQr.id);
                          modals.openQuickQr();
                        }}
                        onOpenNfc={(cardForNfc) => {
                          vault.setModalTargetCardId(cardForNfc.id);
                          modals.openNfc();
                        }}
                        onOpenPrint={(cardForPrint) => {
                          vault.setModalTargetCardId(cardForPrint.id);
                          modals.openPrint();
                        }}
                        onDeleteCard={(cardToDelete) => {
                          vault.handleRequestDeleteCard(cardToDelete);
                        }}
                        onShowToast={showToast}
                        mode="carousel"
                      />
                    </Suspense>
                  </LazyErrorBoundary>

                  {vault.showOnboardingImportPrompt &&
                    vault.vaultCards.length === 0 &&
                    !(vault.isPinConfigured && vault.isLocked) && (
                      <aside
                        aria-label="다음 단계 안내"
                        className="w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] mt-5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] p-4 sm:p-5 relative animate-in fade-in slide-in-from-bottom-2 duration-200"
                      >
                        <button
                          type="button"
                          onClick={vault.dismissOnboardingImportPrompt}
                          aria-label="안내 닫기"
                          title="닫기"
                          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5 stroke-[1.75]" />
                        </button>

                        <div className="pr-8">
                          <h3 className="text-sm font-semibold tracking-tight text-[var(--app-text)]">
                            내 명함이 완성되었습니다
                          </h3>
                          <p className="text-xs text-[var(--app-text-muted)] mt-1 leading-relaxed">
                            이제 기존 휴대폰 주소록이나 실물 명함을 가져와 나만의 보관함을 채워보세요.
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              vault.requireUnlock(() => {
                                modals.openImportContacts();
                              });
                            }}
                            className="h-9 px-3.5 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] whitespace-nowrap"
                          >
                            주소록 가져오기
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              vault.requireUnlock(() => {
                                modals.openScan();
                              });
                            }}
                            className="h-9 px-3.5 rounded-xl bg-[var(--app-surface-subtle)] hover:bg-[var(--app-highlight)]/60 border border-[var(--app-border)] text-[var(--app-text)] text-xs font-medium transition-colors cursor-pointer active:scale-[0.98] whitespace-nowrap"
                          >
                            실물 명함 스캔
                          </button>
                        </div>
                      </aside>
                    )}
                </>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="shrink-0 border-t border-[var(--app-border)] py-2.5 sm:py-3 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] px-4 sm:px-8 font-sans">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-center">
            {isUnauthenticatedExternalVisitor ? (
              <a
                href="https://nettodot.org/pages/chapter01/abstract"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono tracking-[0.12em] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors py-1 px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              >
                eerum · Net to Dot Movement ↗
              </a>
            ) : (
              <button
                type="button"
                onClick={() => modals.openAbout('philosophy')}
                className="text-[11px] font-mono tracking-[0.12em] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors py-1 px-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              >
                eerum · Net to Dot Movement
              </button>
            )}
          </div>
        </footer>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-medium shadow-[var(--app-shadow)] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <Check className="w-4 h-4 text-[var(--app-accent)] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Declarative Centralized Modals Container */}
        {((vault.isLocked && vault.isPinConfigured && Boolean(vault.activeAccount)) ||
          modals.isCreateAccountOpen ||
          modals.isShareOpen ||
          modals.isQrOpen ||
          modals.isQuickQrOpen ||
          modals.isNfcOpen ||
          modals.isEmailSignatureOpen ||
          modals.isPrintOpen ||
          modals.isExportOpen ||
          modals.isScanOpen ||
          modals.isImportContactsOpen ||
          modals.isEditorOpen ||
          modals.isSyncOpen ||
          Boolean(modals.p2pReceiveRoomId) ||
          modals.isPinConfigOpen ||
          modals.isBiometricsOpen ||
          modals.isLazyPinOpen ||
          modals.isLegalOpen ||
          modals.isAboutOpen ||
          modals.isResetOpen ||
          modals.isBackupOpen) && (
          <Suspense fallback={null}>
            <AppModals
              modals={modals}
              activeCard={modalTargetCard}
              existingCards={isSamplePreview ? sampleVaultCards : vault.cards}
              isSamplePreview={isSamplePreview}
              activeAccountName={vault.activeAccount?.displayName}
              onLogoutAccount={vault.handleLogoutAccount}
              onCreateLocalAccount={vault.handleCreateLocalAccount}
              onImportCards={vault.handleImportCards}
              onRestoreBackup={vault.handleRestoreVaultBackup}
              onApplyP2PPayload={handleApplyP2PTransfer}
              isOwner={!isPublicExternalView}
              printConfig={printConfig}
              setPrintConfig={setPrintConfig}
              onSaveCard={vault.handleSaveCard}
              onDeleteCard={(cardId) => {
                const c = vault.cards.find((x) => x.id === cardId);
                if (c) {
                  vault.handleRequestDeleteCard(c);
                }
              }}
              onConfirmReset={vault.handleConfirmReset}
              isLocked={vault.isLocked}
              isPinConfigured={vault.isPinConfigured}
              unlockApp={vault.unlockApp}
              refreshPinStatus={vault.refreshPinStatus}
              setCards={vault.setCards}
              showToast={showToast}
              onBiometricUnlock={vault.handleBiometricUnlock}
            />
          </Suspense>
        )}

        {/* Card Deletion Confirmation Modal */}
        {vault.cardPendingDelete && (
          <Suspense fallback={null}>
            <DeleteConfirmModal
              isOpen={Boolean(vault.cardPendingDelete)}
              onClose={() => vault.setCardPendingDelete(null)}
              onConfirm={() => {
                if (vault.cardPendingDelete) {
                  vault.handleDeleteCard(vault.cardPendingDelete.id);
                  vault.setCardPendingDelete(null);
                }
              }}
              title={vault.cardPendingDelete?.isMyCard ? '내 명함 삭제' : '명함 삭제'}
              cardName={vault.cardPendingDelete?.data?.name || vault.cardPendingDelete?.data?.nameKr}
              description={
                vault.cardPendingDelete?.isMyCard
                  ? '내 명함을 삭제하시겠습니까? 삭제된 명함은 복구할 수 없습니다.'
                  : '보관된 명함을 삭제하시겠습니까? 삭제된 명함은 복구할 수 없습니다.'
              }
            />
          </Suspense>
        )}

        {/* PWA Installation & Step-by-Step Guide Modal */}
        {isPWAInstallOpen && (
          <Suspense fallback={null}>
            <PWAInstallModal
              isOpen={isPWAInstallOpen}
              onClose={() => setIsPWAInstallOpen(false)}
              isInstallable={pwa.isInstallable}
              isInstalled={pwa.isInstalled}
              isIOS={pwa.isIOS}
              onInstall={pwa.install}
            />
          </Suspense>
        )}
      </div>

      {/* PRINT-ONLY VECTOR CONTAINER (Triggered on window.print()) */}
      {modalTargetCard && (
        <LazyErrorBoundary variant="silent" resetKey={modalTargetCard.id}>
          <Suspense fallback={null}>
            <PrintSheet data={modalTargetCard.data} config={printConfig} />
          </Suspense>
        </LazyErrorBoundary>
      )}
    </>
  );
}
