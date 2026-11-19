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
import { AppThemeSelector } from './components/AppThemeSelector';
import { applyAppTheme, loadStoredAppTheme } from './constants/appThemes';
import {
  Check,
  CreditCard,
  FolderArchive,
  ArrowLeft,
  Smartphone,
  Lock,
  ShieldCheck,
  Fingerprint,
  Settings,
  Plus,
  LogOut,
  FileText,
  RotateCcw,
  BookmarkPlus,
  KeyRound,
  Code2,
  Download,
  Upload,
  HardDriveDownload,
  Compass,
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
  const [sampleCards, setSampleCards] = useState<StoredCard[]>([]);
  const [sampleIndex, setSampleIndex] = useState<number>(0);
  const sampleCard = sampleCards[sampleIndex] || null;
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isMemoOpen, setIsMemoOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const pwa = usePWAInstall();
  const [isPWAInstallOpen, setIsPWAInstallOpen] = useState<boolean>(false);

  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    layout: 'single-card',
    size: 'kr-standard',
    theme: 'pure_white',
    showCropMarks: true,
    scale: 1,
  });

  // App opens to Start Screen (WelcomeCard) on first launch
  const [showWelcomeIntro, setShowWelcomeIntro] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const isFirstLaunchDone = localStorage.getItem('eerum_first_launch_done');
      if (!isFirstLaunchDone) {
        return true;
      }
    } catch {
      return true;
    }
    return false;
  });

  const markFirstLaunchDone = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('eerum_first_launch_done', 'true');
      }
    } catch {
      // ignore
    }
  }, []);

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

  const vault = useCardVault({
    modals,
    showToast,
    activeTab,
    setActiveTab,
    setIsSamplePreview,
    setIsFlipped,
    setShowWelcomeIntro,
    onCleanPublicRoute: handleCleanPublicRoute,
    preferredNewCardTheme: isSamplePreview ? sampleCard?.theme : undefined,
  });

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
      vault.setCards(normalized);
      saveStoredCards(normalized);
      vault.setSelectedVaultCardId(null);
      setActiveTab('vault');
    },
    [vault.setCards, vault.setSelectedVaultCardId]
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
    isPinConfigured: vault.isPinConfigured,
    showToast,
    onResolveOwnedMyCard: handleResolveOwnedMyCard,
    onApplySyncedCards: handleApplySyncedCards,
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
    handleTabChange('my-card');
    vault.handleOpenCreateModal();
  };

  // Resolved personal card strictly from `myCards` (`isMyCard === true`), or sample card when `isSamplePreview` is active
  const currentMyCard: StoredCard | undefined =
    isSamplePreview
      ? sampleCard || undefined
      : vault.myCards.length > 0
        ? vault.myCards.find((c) => c.id === vault.selectedMyCardId) ||
          vault.myCards.find((c) => c.isDefault) ||
          vault.myCards[0]
        : undefined;

  // Target card for Share / QR / Print / Export modals
  const modalTargetCard: StoredCard | undefined =
    (vault.modalTargetCardId
      ? vault.cards.find((c) => c.id === vault.modalTargetCardId)
      : undefined) ||
    (isPublicExternalView && publicCard
      ? publicCard
      : activeTab === 'vault' && vault.selectedVaultCard
        ? vault.selectedVaultCard
        : currentMyCard);

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
    Boolean(vault.selectedVaultCardId) &&
    (Boolean(vault.selectedVaultCard) || (vault.isPinConfigured && vault.isLocked));
  const isIntroLandingView =
    !isPublicExternalView &&
    activeTab === 'my-card' &&
    !isSamplePreview &&
    (showWelcomeIntro || vault.myCards.length === 0 || !currentMyCard);

  return (
    <>
      {/* SCREEN UI CONTAINER */}
      <div
        id="screen-app-container"
        className={`${
          isIntroLandingView
            ? 'h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden'
            : 'min-h-[100dvh] overflow-x-clip'
        } w-full max-w-[100vw] bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col justify-between selection:bg-[var(--app-accent)] selection:text-[var(--app-accent-fg)] font-sans pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]`}
      >
        {/* Top Minimalist Header */}
        <header className="shrink-0 sticky top-0 z-40 w-full border-b border-[var(--app-border)] bg-[var(--app-header-bg)] backdrop-blur-xl px-4 sm:px-8 py-2 sm:py-2.5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(0.625rem+env(safe-area-inset-top,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] flex items-center justify-between gap-2 main-app-header">
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
          ) : (
            <>
              {/* Left Spacer for Header Balance on sm+ */}
              <div className="hidden sm:flex sm:flex-1 items-center justify-start header-full-nav" />

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
                {vault.isPinConfigured && (
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
                <button
                  onClick={modals.toggleSettings}
                  className="p-1.5 rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
                  title="설정"
                  aria-label="설정"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Center Navigation: Switcher (내 명함 vs 명함 보관함) */}
              <nav aria-label="주요 메뉴" className="flex items-center gap-1 sm:gap-1.5 header-full-nav">
                <button
                  onClick={() => handleTabChange('my-card')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                    isMyCardTabActive
                      ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-sm'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>내 명함</span>
                </button>

                <button
                  onClick={() => handleTabChange('vault')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                    isVaultTabActive
                      ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-sm'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>명함 보관함</span>
                  {vault.isPinConfigured && vault.isLocked && <Lock className="w-3 h-3" />}
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      isVaultTabActive ? 'opacity-85' : 'text-[var(--app-text-muted)]'
                    }`}
                  >
                    {vault.vaultCards.length}
                  </span>
                </button>
              </nav>

              {/* Right Header: App Theme Selector, Security Lock & Settings */}
              <div className="sm:flex-1 flex items-center justify-end gap-1.5 sm:gap-2 min-h-[32px] relative header-full-nav">
                <AppThemeSelector />

                {vault.isPinConfigured && (
                  <button
                    onClick={() => {
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
                    onClick={modals.toggleSettings}
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
                          setShowWelcomeIntro(true);
                          setIsSamplePreview(false);
                          setActiveTab('my-card');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] transition-colors cursor-pointer text-left"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                        <span>시작 화면으로 돌아가기</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </header>

        {/* Main Showcase Viewport */}
        <main
          className={`flex-1 flex flex-col items-center ${
            isIntroLandingView
              ? 'min-h-0 justify-center px-4 sm:px-6 py-2 overflow-hidden'
              : activeTab === 'vault' && !isVaultDetailActive && !isPublicExternalView
                ? 'justify-start px-3 sm:px-4 py-2 sm:py-5'
                : 'justify-center px-3 sm:px-4 py-2 sm:py-5'
          } max-w-6xl mx-auto w-full min-w-0`}
        >
          {isPublicExternalView && publicCard ? (
            /* ================= PUBLIC SHARED CARD LANDING VIEW (/card/:slug) ================= */
            <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
              <div className="w-full max-w-[540px] flex justify-center">
                <LazyErrorBoundary resetKey={publicCard.id}>
                  <Suspense
                    fallback={
                      <div
                        className="w-full aspect-[9/5] rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]"
                        aria-hidden="true"
                      />
                    }
                  >
                    <CardContainer
                      data={publicCard.data}
                      theme={publicCard.theme}
                      layout_type={publicCard.layout_type}
                      card_features={publicCard.card_features}
                      isPhotoCard={publicCard.isPhotoCard || publicCard.creation_mode === 'photo'}
                      photoUrl={publicCard.scannedImage || publicCard.front_image_url}
                      backPhotoUrl={publicCard.scannedImageBack || publicCard.back_image_url}
                      html_front={publicCard.html_front}
                      html_back={publicCard.html_back}
                      isFlipped={isFlipped}
                      onFlip={() => setIsFlipped((prev) => !prev)}
                      onOpenShare={() => handleShare(publicCard)}
                      isOwner={false}
                      cardUrl={getCardShareUrl(publicCard)}
                      onShowToast={showToast}
                    />
                  </Suspense>
                </LazyErrorBoundary>
              </div>

              <div className="mt-6 mb-2 flex flex-col items-center gap-3 text-center">
                {/* Save Shared Card to Internal Vault Action */}
                <button
                  type="button"
                  onClick={() => vault.handleRegisterSharedCardToVault(publicCard)}
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
              ) : vault.selectedVaultCard && !vault.selectedVaultCard.isMyCard ? (
                <div className="w-full flex flex-col items-center gap-3 sm:gap-4 pb-6">
                  <LazyErrorBoundary resetKey={vault.selectedVaultCard.id}>
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
                        cards={vault.vaultCards}
                        activeCardId={vault.selectedVaultCard.id}
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
                        card={vault.selectedVaultCard}
                        onSaveContext={(context) =>
                          vault.handleUpdateVaultContext(vault.selectedVaultCard!.id, context)
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
                  cards={vault.vaultCards}
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
              {!isSamplePreview && (showWelcomeIntro || vault.myCards.length === 0) ? (
                <WelcomeCard
                  onCreateFirstCard={() => {
                    markFirstLaunchDone();
                    vault.handleOpenCreateModal();
                  }}
                  onExploreSample={async () => {
                    markFirstLaunchDone();
                    const { INITIAL_CARDS } = await import('./constants/sampleCards');
                    setSampleCards(INITIAL_CARDS);
                    setSampleIndex(0);
                    setIsFlipped(false);
                    setShowWelcomeIntro(false);
                    setIsSamplePreview(true);
                  }}
                  onViewMyCards={
                    vault.myCards.length > 0
                      ? () => {
                          markFirstLaunchDone();
                          setShowWelcomeIntro(false);
                        }
                      : undefined
                  }
                  hasExistingCards={vault.myCards.length > 0}
                />
              ) : isSamplePreview && currentMyCard ? (
                <div className="w-full flex flex-col items-center space-y-2 sm:space-y-4">
                  <div className="w-full max-w-[540px] px-1 py-0.5 flex items-center justify-between text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--app-text-muted)] font-normal">
                      <span className="text-[var(--app-accent)] text-[8px] leading-none" aria-hidden="true">
                        ●
                      </span>
                      <span>샘플 모드</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={vault.handleOpenCreateModal}
                        className="p-1.5 rounded-lg text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-all cursor-pointer active:scale-90 flex items-center justify-center"
                        title="내 명함 만들기"
                        aria-label="내 명함 만들기"
                      >
                        <Plus className="w-4 h-4 stroke-[2.2]" />
                      </button>

                      <button
                        onClick={() => {
                          setIsSamplePreview(false);
                          setShowWelcomeIntro(true);
                        }}
                        className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-all cursor-pointer active:scale-90 flex items-center justify-center"
                        title="시작 화면으로"
                        aria-label="시작 화면으로"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="w-full max-w-[540px] flex justify-center">
                    <LazyErrorBoundary resetKey={currentMyCard.id}>
                      <Suspense
                        fallback={
                          <div
                            className="w-full aspect-[9/5] rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]"
                            aria-hidden="true"
                          />
                        }
                      >
                        <CardContainer
                          cardKey={currentMyCard.id}
                          data={currentMyCard.data}
                          theme={currentMyCard.theme}
                          layout_type={currentMyCard.layout_type}
                          card_features={currentMyCard.card_features}
                          isPhotoCard={currentMyCard.isPhotoCard}
                          photoUrl={currentMyCard.scannedImage}
                          backPhotoUrl={currentMyCard.scannedImageBack}
                          html_front={currentMyCard.html_front}
                          html_back={currentMyCard.html_back}
                          isFlipped={isFlipped}
                          onFlip={() => setIsFlipped((prev) => !prev)}
                          onOpenShare={() => {
                            vault.setModalTargetCardId(currentMyCard.id);
                            modals.openShare();
                          }}
                          onOpenEdit={vault.handleOpenCreateModal}
                          onDelete={
                            !isSamplePreview ? () => vault.handleRequestDeleteCard(currentMyCard) : undefined
                          }
                          hasPrev={sampleIndex > 0}
                          hasNext={sampleIndex < sampleCards.length - 1}
                          carouselIndex={sampleIndex}
                          carouselTotal={sampleCards.length}
                          onSwipePrev={() => {
                            if (sampleIndex <= 0) return;
                            setIsFlipped(false);
                            setSampleIndex((prev) => Math.max(0, prev - 1));
                          }}
                          onSwipeNext={() => {
                            if (sampleIndex >= sampleCards.length - 1) return;
                            setIsFlipped(false);
                            setSampleIndex((prev) => Math.min(sampleCards.length - 1, prev + 1));
                          }}
                          onSelectIndex={(idx) => {
                            if (idx < 0 || idx >= sampleCards.length) return;
                            setIsFlipped(false);
                            setSampleIndex(idx);
                          }}
                        />
                      </Suspense>
                    </LazyErrorBoundary>
                  </div>
                </div>
              ) : !currentMyCard ? (
                <WelcomeCard
                  onCreateFirstCard={() => {
                    markFirstLaunchDone();
                    vault.handleOpenCreateModal();
                  }}
                  onExploreSample={async () => {
                    markFirstLaunchDone();
                    const { INITIAL_CARDS } = await import('./constants/sampleCards');
                    setSampleCards(INITIAL_CARDS);
                    setSampleIndex(0);
                    setIsFlipped(false);
                    setIsSamplePreview(true);
                  }}
                  onViewMyCards={
                    vault.myCards.length > 0
                      ? () => {
                          markFirstLaunchDone();
                          setShowWelcomeIntro(false);
                        }
                      : undefined
                  }
                  hasExistingCards={vault.myCards.length > 0}
                />
              ) : (
                <LazyErrorBoundary resetKey={currentMyCard.id}>
                  <Suspense
                    fallback={
                      <div
                        className="w-full max-w-[540px] aspect-[9/5] rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]"
                        aria-hidden="true"
                      />
                    }
                  >
                    <CardNavigator
                      cards={vault.myCards}
                      activeCardId={currentMyCard.id}
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
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="shrink-0 border-t border-[var(--app-border)] py-2 sm:py-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] px-4 sm:px-8 font-sans text-xs">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-center gap-1.5 sm:gap-2.5">
            {isUnauthenticatedExternalVisitor ? (
              <a
                href="https://nettodot.org/pages/chapter01/abstract"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                title="eerum · Net to Dot Movement"
                aria-label="eerum · Net to Dot Movement"
              >
                <span className="text-xs font-semibold leading-none select-none" aria-hidden="true">
                  D
                </span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => modals.openAbout('philosophy')}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                title="eerum · Net to Dot Movement"
                aria-label="eerum · Net to Dot Movement"
              >
                <span className="text-xs font-semibold leading-none select-none" aria-hidden="true">
                  D
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => modals.openLegal('privacy')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              title="개인정보처리방침"
              aria-label="개인정보처리방침"
            >
              <ShieldCheck className="w-4 h-4 stroke-[1.75]" />
            </button>

            <button
              type="button"
              onClick={() => modals.openLegal('terms')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              title="서비스 이용약관"
              aria-label="서비스 이용약관"
            >
              <FileText className="w-4 h-4 stroke-[1.75]" />
            </button>

            <button
              type="button"
              onClick={() => modals.openLegal('licenses')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              title="오픈소스 라이선스"
              aria-label="오픈소스 라이선스"
            >
              <Code2 className="w-4 h-4 stroke-[1.75]" />
            </button>

            {!isUnauthenticatedExternalVisitor && (
              <button
                type="button"
                onClick={modals.openReset}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                title="로컬 데이터 초기화"
                aria-label="로컬 데이터 초기화"
              >
                <RotateCcw className="w-4 h-4 stroke-[1.75]" />
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
        {((vault.isLocked && vault.isPinConfigured) ||
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
              existingCards={vault.cards}
              onImportCards={vault.handleImportCards}
              onRestoreBackup={vault.handleRestoreVaultBackup}
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
