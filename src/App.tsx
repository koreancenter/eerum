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
import {
  APP_BASE_DOMAIN,
  getCardShareUrl,
  sanitizeCardForVault,
} from '@/utils/cardSerializer';
import { DEFAULT_VAULT_CATEGORIES } from './utils/categories';
import { useModalState } from './hooks/useModalState';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useCardVault, type ActiveTab } from './hooks/useCardVault';
import { usePublicCardRoute } from './hooks/usePublicCardRoute';
import { toBackupPayloadFromP2P, type P2PVaultTransferPayload } from './utils/p2pSync';
import { AppHeader } from './components/AppHeader';
import { LockedAccountView } from './components/LockedAccountView';
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
  ArrowLeft,
  BookmarkPlus,
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
  const [sampleDraftedIds, setSampleDraftedIds] = useState<string[]>([]);
  const [selectedSampleMyCardId, setSelectedSampleMyCardId] = useState<string>('');
  const [selectedSampleVaultCardId, setSelectedSampleVaultCardId] = useState<string | null>(null);
  const [sampleModalCardId, setSampleModalCardId] = useState<string | null>(null);
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

  // Clear ephemeral sample state once signed into a real local account
  useEffect(() => {
    if (vault.activeAccount) {
      setIsSamplePreview(false);
      setSampleMyCards([]);
      setSampleVaultCards([]);
      setSampleDraftedIds([]);
      setSelectedSampleMyCardId('');
      setSelectedSampleVaultCardId(null);
      setSampleModalCardId(null);
    }
  }, [vault.activeAccount]);

  const enterSampleSandbox = useCallback(async () => {
    const { SAMPLE_MY_CARDS, SAMPLE_VAULT_CARDS } = await import('./constants/sampleCards');
    const clonedMy = SAMPLE_MY_CARDS.map((c) => ({ ...c, data: { ...c.data } }));
    const clonedVault = SAMPLE_VAULT_CARDS.map((c) => ({ ...c, data: { ...c.data } }));
    setSampleMyCards(clonedMy);
    setSampleVaultCards(clonedVault);
    setSampleDraftedIds([]);
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
      if (toastMsg) {
        showToast(toastMsg);
      }
      modals.openCreateAccount();
    },
    [modals.openCreateAccount, showToast]
  );

  const sampleDraftCards = React.useMemo(() => {
    if (!isSamplePreview || sampleDraftedIds.length === 0) return [];
    const draftedSet = new Set(sampleDraftedIds);
    return [...sampleMyCards, ...sampleVaultCards].filter((c) => draftedSet.has(c.id));
  }, [isSamplePreview, sampleDraftedIds, sampleMyCards, sampleVaultCards]);

  const sampleCategories = React.useMemo(() => {
    const merged = new Set<string>(DEFAULT_VAULT_CATEGORIES);
    for (const c of sampleVaultCards) {
      if (c.category && c.category.trim()) {
        merged.add(c.category.trim());
      }
    }
    return Array.from(merged);
  }, [sampleVaultCards]);

  const handleOpenSampleCreateMyCard = useCallback(() => {
    const slugSuffix = String(Date.now()).slice(-4);
    const defaultSlug = `card-${slugSuffix}`;
    const template: StoredCard = {
      id: `sample-my-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isMyCard: true,
      isDefault: sampleMyCards.length === 0,
      slug: defaultSlug,
      owner_key: '',
      customDomain: '',
      category: '글로벌 네트워크',
      theme: activeSampleMyCard?.theme || 'pure_white',
      layout_type: 'editorial_minimal',
      card_features: {
        show_en_name: true,
        show_sub_org: true,
        show_address: true,
        monogram_text: '',
      },
      createdAt: new Date().toISOString().split('T')[0],
      notes: '',
      data: {
        organization: '',
        organizationKr: '',
        subOrg: '',
        name: '',
        nameEn: '',
        nameKr: '',
        title: '',
        titleKr: '',
        phone: '',
        phoneRaw: '',
        whatsappUrl: '',
        email: '',
        website: `https://${APP_BASE_DOMAIN}/card/${defaultSlug}`,
        websiteDisplay: `${APP_BASE_DOMAIN}/card/${defaultSlug}`,
        addressLines: [],
        addressKr: '',
        address_en: '',
        addressEn: '',
        details: {
          en_name: '',
          sub_org: '',
          address: '',
          address_en: '',
          slogan: '',
          show_address: true,
          show_en_name: true,
        },
        googleMapsUrl: '',
        naverMapsUrl: '',
        backTitle: '',
        backSubtitle: '',
        backTagline: '',
        backHqAddress: '',
      },
    };
    modals.openEditor(template, true);
  }, [sampleMyCards.length, activeSampleMyCard?.theme, modals.openEditor]);

  const handleOpenSampleCreateVaultCard = useCallback(() => {
    const template: StoredCard = {
      id: `sample-vault-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isMyCard: false,
      isDefault: false,
      theme: 'pure_white',
      layout_type: 'editorial_minimal',
      card_features: {
        show_en_name: true,
        show_sub_org: true,
        show_address: true,
        monogram_text: '',
      },
      category: 'VIP 파트너',
      createdAt: new Date().toISOString().split('T')[0],
      notes: '',
      data: {
        organization: '',
        organizationKr: '',
        subOrg: '',
        name: '',
        nameEn: '',
        nameKr: '',
        title: '',
        titleKr: '',
        phone: '',
        phoneRaw: '',
        whatsappUrl: '',
        email: '',
        website: '',
        websiteDisplay: '',
        addressLines: [],
        addressKr: '',
        address_en: '',
        addressEn: '',
        details: {
          en_name: '',
          sub_org: '',
          address: '',
          address_en: '',
          slogan: '',
          show_address: true,
          show_en_name: true,
        },
        googleMapsUrl: '',
        naverMapsUrl: '',
        backTitle: '',
        backSubtitle: '',
        backTagline: '',
        backHqAddress: '',
      },
    };
    modals.openEditor(template, true);
  }, [modals.openEditor]);

  const handleSaveSampleCard = useCallback(
    (savedCard: StoredCard) => {
      if (savedCard.isMyCard) {
        const normalizedId =
          savedCard.id || `sample-my-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const hadNoMyCards = sampleMyCards.length === 0;
        const shouldBeDefault = Boolean(savedCard.isDefault) || hadNoMyCards;
        const nextMyCard: StoredCard = {
          ...savedCard,
          id: normalizedId,
          isMyCard: true,
          isDefault: shouldBeDefault,
        };

        setSampleMyCards((prev) => {
          const base = shouldBeDefault
            ? prev.map((c) => ({ ...c, isDefault: false }))
            : prev;
          const exists = base.some((c) => c.id === normalizedId);
          return exists
            ? base.map((c) => (c.id === normalizedId ? nextMyCard : c))
            : [nextMyCard, ...base];
        });
        setSelectedSampleMyCardId(normalizedId);
        setIsFlipped(false);
        setSampleDraftedIds((prev) =>
          prev.includes(normalizedId) ? prev : [...prev, normalizedId]
        );
      } else {
        const collidesWithMyCard = sampleMyCards.some((c) => c.id === savedCard.id);
        const safeVaultId =
          savedCard.id && !collidesWithMyCard
            ? savedCard.id
            : `sample-vault-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const nowIso = new Date().toISOString();
        const resolvedMemo = (savedCard.memo ?? savedCard.notes ?? '').trim();
        const sanitizedVaultCard = sanitizeCardForVault(savedCard, {
          id: safeVaultId,
          category: savedCard.category,
          notes: resolvedMemo || undefined,
          memo: resolvedMemo || undefined,
          metAt: savedCard.metAt?.trim() || undefined,
          metLocation: savedCard.metLocation?.trim() || undefined,
          createdAt: savedCard.createdAt || nowIso.split('T')[0],
          created_at: savedCard.created_at || nowIso,
          updatedAt: nowIso,
        });

        setSampleVaultCards((prev) => {
          const exists = prev.some((c) => c.id === sanitizedVaultCard.id);
          return exists
            ? prev.map((c) => (c.id === sanitizedVaultCard.id ? sanitizedVaultCard : c))
            : [sanitizedVaultCard, ...prev];
        });
        setSelectedSampleVaultCardId(sanitizedVaultCard.id);
        setActiveTab('vault');
        setIsFlipped(false);
        setSampleDraftedIds((prev) =>
          prev.includes(sanitizedVaultCard.id) ? prev : [...prev, sanitizedVaultCard.id]
        );
      }

      showToast('체험 모드에 임시 저장되었습니다. 영구 보관하려면 로컬 계정을 만들어 주세요.');
    },
    [sampleMyCards, showToast]
  );

  const handleDeleteSampleCard = useCallback(
    (cardId: string) => {
      const isSampleMy = sampleMyCards.some((c) => c.id === cardId);
      if (isSampleMy) {
        setSampleMyCards((prev) => {
          const next = prev.filter((c) => c.id !== cardId);
          if (selectedSampleMyCardId === cardId) {
            setSelectedSampleMyCardId(next[0]?.id || '');
          }
          return next;
        });
      } else {
        setSampleVaultCards((prev) => prev.filter((c) => c.id !== cardId));
        if (selectedSampleVaultCardId === cardId) {
          setSelectedSampleVaultCardId(null);
        }
      }
      setSampleDraftedIds((prev) => prev.filter((id) => id !== cardId));
      showToast('체험 모드에서 명함이 삭제되었습니다.');
    },
    [sampleMyCards, selectedSampleMyCardId, selectedSampleVaultCardId, showToast]
  );

  const handleImportSampleCards = useCallback(
    (importedCards: StoredCard[]) => {
      if (!importedCards || importedCards.length === 0) return;
      const nowIso = new Date().toISOString();
      const sanitizedBatch = importedCards.map((card, index) =>
        sanitizeCardForVault(card, {
          id:
            card.id && !sampleMyCards.some((m) => m.id === card.id)
              ? card.id
              : `sample-vault-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: card.createdAt || nowIso.split('T')[0],
          created_at: card.created_at || nowIso,
          updatedAt: nowIso,
        })
      );
      setSampleVaultCards((prev) => [...sanitizedBatch, ...prev]);
      setSampleDraftedIds((prev) => {
        const next = new Set(prev);
        sanitizedBatch.forEach((c) => next.add(c.id));
        return Array.from(next);
      });
      setTimeout(() => {
        showToast('체험 모드에 임시 저장되었습니다. 영구 보관하려면 로컬 계정을 만들어 주세요.');
      }, 40);
    },
    [sampleMyCards, showToast]
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
        <AppHeader
          isUnauthenticatedExternalVisitor={isUnauthenticatedExternalVisitor}
          isLoggedOutLanding={isLoggedOutLanding}
          isSamplePreview={isSamplePreview}
          isMyCardTabActive={isMyCardTabActive}
          isVaultTabActive={isVaultTabActive}
          headerVaultCount={headerVaultCount}
          activeAccount={vault.activeAccount}
          accountsList={vault.accountsList}
          myCardsCount={vault.myCards.length}
          vaultCardsCount={vault.vaultCards.length}
          isPinConfigured={vault.isPinConfigured}
          isLocked={vault.isLocked}
          isSettingsOpen={modals.isSettingsOpen}
          settingsMenuRef={modals.settingsMenuRef}
          isPwaInstalled={pwa.isInstalled}
          onTabChange={handleTabChange}
          onExitSampleToCreateAccount={() => exitSampleToCreateAccount()}
          onExitSample={() => {
            setIsSamplePreview(false);
            setSampleMyCards([]);
            setSampleVaultCards([]);
            setSampleDraftedIds([]);
            setSelectedSampleMyCardId('');
            setSelectedSampleVaultCardId(null);
            setSampleModalCardId(null);
            setIsFlipped(false);
            setIsMemoOpen(false);
            setActiveTab('my-card');
          }}
          onLoginAccount={vault.handleLoginAccount}
          onLogoutAccount={vault.handleLogoutAccount}
          onLockApp={vault.lockApp}
          onOpenCreateAccount={modals.openCreateAccount}
          onOpenPinConfig={modals.openPinConfig}
          onOpenBackup={(tab) => {
            vault.requireUnlock(() => {
              modals.openBackup(tab);
            });
          }}
          onToggleSettings={modals.toggleSettings}
          onCloseSettings={modals.closeSettings}
          onOpenBiometrics={modals.openBiometrics}
          onOpenSync={modals.openSync}
          onClickPwaInstall={() => {
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
          onOpenAbout={() => modals.openAbout('philosophy')}
          onOpenLegal={modals.openLegal}
          onOpenReset={modals.openReset}
          onShowToast={showToast}
        />

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
            /* ================= EPHEMERAL INTERACTIVE SAMPLE SANDBOX (MY CARD + VAULT) ================= */
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
                          onOpenEdit={(cardToEdit) => {
                            modals.openEditor(cardToEdit, false);
                          }}
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
                      onEditCard={(cardToEdit) => {
                        modals.openEditor(cardToEdit, false);
                      }}
                      onDeleteCard={handleDeleteSampleCard}
                      onExportCard={(cardToExport) => {
                        setSampleModalCardId(cardToExport.id);
                        modals.openExport();
                      }}
                      onOpenScan={modals.openScan}
                      onOpenEditor={handleOpenSampleCreateVaultCard}
                      onOpenImportContacts={modals.openImportContacts}
                      onShowToast={showToast}
                    />
                  </Suspense>
                </LazyErrorBoundary>
              )
            ) : (
              /* Sample Sandbox: My Card View with Ephemeral ThemeSelector + CardNavigator */
              <div className="w-full min-h-0 flex flex-col items-center gap-3 sm:gap-4">
                {activeSampleMyCard ? (
                  <>
                    <Suspense fallback={null}>
                      <ThemeSelector
                        currentTheme={activeSampleMyCard.theme}
                        onSelectTheme={(nextTheme) => {
                          setSampleMyCards((prev) =>
                            prev.map((c) =>
                              c.id === activeSampleMyCard.id
                                ? {
                                    ...c,
                                    theme: nextTheme,
                                    card_features: c.card_features
                                      ? { ...c.card_features, custom_bg_color: '' }
                                      : undefined,
                                  }
                                : c
                            )
                          );
                        }}
                      />
                    </Suspense>

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
                          onCreateNewCard={handleOpenSampleCreateMyCard}
                          onOpenEdit={(cardToEdit) => {
                            modals.openEditor(cardToEdit, false);
                          }}
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
                          onDeleteCard={(cardToDelete) => {
                            handleDeleteSampleCard(cardToDelete.id);
                          }}
                          onShowToast={showToast}
                          mode="carousel"
                        />
                      </Suspense>
                    </LazyErrorBoundary>
                  </>
                ) : (
                  <section
                    aria-label="체험 모드 내 명함 만들기"
                    className="w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] mx-auto rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] px-6 py-12 sm:px-10 sm:py-16 flex flex-col items-center text-center animate-in fade-in duration-300"
                  >
                    <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--app-text)]">
                      체험 중인 내 명함이 없습니다
                    </h2>
                    <p className="text-xs text-[var(--app-text-muted)] mt-1.5 leading-relaxed max-w-xs">
                      새 명함을 디자인해 보고 마음에 들면 로컬 계정으로 저장해 보세요.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenSampleCreateMyCard}
                      className="mt-6 h-11 px-6 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                    >
                      <Plus className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />
                      <span>내 명함 만들기</span>
                    </button>
                  </section>
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
                <LockedAccountView
                  accountName={vault.activeAccount?.displayName}
                  onUnlock={vault.lockApp}
                />
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
          <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-4">
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

            <nav
              aria-label="약관 및 라이선스"
              className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[11px] text-[var(--app-text-muted)]"
            >
              <button
                type="button"
                onClick={() => modals.openLegal('privacy')}
                className="px-2 py-1 rounded-md hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              >
                개인정보처리방침
              </button>
              <span aria-hidden="true" className="opacity-40 select-none">
                ·
              </span>
              <button
                type="button"
                onClick={() => modals.openLegal('terms')}
                className="px-2 py-1 rounded-md hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              >
                이용약관
              </button>
              <span aria-hidden="true" className="opacity-40 select-none">
                ·
              </span>
              <button
                type="button"
                onClick={() => modals.openLegal('licenses')}
                className="px-2 py-1 rounded-md hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              >
                라이선스 · 오픈소스
              </button>
            </nav>
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
              categories={isSamplePreview ? sampleCategories : undefined}
              isSamplePreview={isSamplePreview}
              sampleDraftCards={isSamplePreview ? sampleDraftCards : undefined}
              activeAccountName={vault.activeAccount?.displayName}
              onLogoutAccount={vault.handleLogoutAccount}
              onCreateLocalAccount={vault.handleCreateLocalAccount}
              onImportCards={isSamplePreview ? handleImportSampleCards : vault.handleImportCards}
              onRestoreBackup={vault.handleRestoreVaultBackup}
              onApplyP2PPayload={handleApplyP2PTransfer}
              isOwner={!isPublicExternalView}
              printConfig={printConfig}
              setPrintConfig={setPrintConfig}
              onSaveCard={isSamplePreview ? handleSaveSampleCard : vault.handleSaveCard}
              onDeleteCard={
                isSamplePreview
                  ? handleDeleteSampleCard
                  : (cardId) => {
                      const c = vault.cards.find((x) => x.id === cardId);
                      if (c) {
                        vault.handleRequestDeleteCard(c);
                      }
                    }
              }
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
