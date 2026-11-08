/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { PrintConfig, StoredCard } from './types/card';
import {
  loadUserCards,
  saveUserCards,
  saveStoredCards,
  normalizeStoredCards,
  SAMPLE_CARDS,
  clearAllLocalData,
  hasLocalWalletInitialized,
} from './utils/initialCards';
import { WelcomeCard } from './components/WelcomeCard';
import { AppModals } from './components/AppModals';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { lazyWithRetry, LazyErrorBoundary } from './utils/lazyWithRetry';

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

import {
  APP_BASE_DOMAIN,
  resolvePublicRouteCard,
  getCardShareUrl,
  getRouteSlug,
  isPublicSlugRoute,
  isPlatformHost,
  normalizeDomain,
  sanitizeCardForVault,
} from '@/utils/cardSerializer';
import { pullWalletFromEdge, pushWalletToEdge } from './utils/syncWallet';
import { useAutoLock } from './hooks/useAutoLock';
import { useModalState } from './hooks/useModalState';
import { verifyBiometric } from './utils/biometrics';
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
} from 'lucide-react';

type ActiveTab = 'my-card' | 'vault';

export default function App() {
  const [cards, setCards] = useState<StoredCard[]>(() => loadUserCards());
  const [activeTab, setActiveTab] = useState<ActiveTab>('my-card');

  // Strictly isolated selection states:
  // 1) selectedMyCardId: exclusively references personal cards (`isMyCard === true`)
  const [selectedMyCardId, setSelectedMyCardId] = useState<string>(() => {
    const loadedMyCards = loadUserCards().filter((c) => c.isMyCard);
    const defaultCard = loadedMyCards.find((c) => c.isDefault) || loadedMyCards[0];
    return defaultCard?.id || '';
  });
  // 2) selectedVaultCardId: exclusively references third-party Vault cards (`isMyCard === false`) when viewing Vault detail
  const [selectedVaultCardId, setSelectedVaultCardId] = useState<string | null>(null);
  // 3) modalTargetCardId: transient target for Share / QR / Print / Export modals so selectedMyCardId is never mutated
  const [modalTargetCardId, setModalTargetCardId] = useState<string | null>(null);

  // External Public Shared Landing State (strictly isolated from internal studio & vault views)
  const [publicCard, setPublicCard] = useState<StoredCard | null>(null);
  const [isPublicExternalView, setIsPublicExternalView] = useState<boolean>(false);

  const [isSamplePreview, setIsSamplePreview] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Card targeted for deletion confirmation
  const [cardPendingDelete, setCardPendingDelete] = useState<StoredCard | null>(null);

  // Centralized Lightweight Modal Manager Hook
  const modals = useModalState();

  // Local-First 4-Digit PIN App Lock with Auto-Lock (Manual, Visibility, Idle 5m)
  const { isLocked, lockApp, unlockApp, isPinConfigured, refreshPinStatus } = useAutoLock();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  const requireUnlock = (action: () => void) => {
    if (isPinConfigured && isLocked) {
      lockApp();
    } else {
      action();
    }
  };

  // Optional Biometric Unlock handler with automatic cryptographic vault rehydration
  const handleBiometricUnlock = async () => {
    const res = await verifyBiometric();
    if (res.success) {
      unlockApp();
      const decrypted = loadUserCards();
      if (decrypted && decrypted.length > 0) {
        setCards(decrypted);
      }
      showToast('생체 인증(Biometrics)으로 잠금이 해제되었습니다.');
    } else if (res.error && !res.error.includes('취소')) {
      showToast(res.error);
    }
  };

  // Strictly isolated personal cards collection (`isMyCard === true`)
  const myCards = cards.filter((c) => c.isMyCard);

  // Synchronize selectedMyCardId strictly with myCards (`isMyCard === true`)
  useEffect(() => {
    if (myCards.length === 0) {
      if (selectedMyCardId !== '') {
        setSelectedMyCardId('');
      }
      return;
    }
    if (!myCards.some((c) => c.id === selectedMyCardId)) {
      const defaultMyCard = myCards.find((c) => c.isDefault) || myCards[0];
      if (defaultMyCard) {
        setSelectedMyCardId(defaultMyCard.id);
      }
    }
  }, [myCards, selectedMyCardId]);

  // Clear temporary modal target card once Share/QR/Print/Export modals close
  useEffect(() => {
    if (
      modalTargetCardId &&
      !modals.isShareOpen &&
      !modals.isQrOpen &&
      !modals.isPrintOpen &&
      !modals.isExportOpen
    ) {
      setModalTargetCardId(null);
    }
  }, [
    modalTargetCardId,
    modals.isShareOpen,
    modals.isQrOpen,
    modals.isPrintOpen,
    modals.isExportOpen,
  ]);

  // Persist cards to localStorage ONLY when unlocked (prevents wiping encrypted vault while locked)
  useEffect(() => {
    if (isPinConfigured && isLocked) return;
    saveUserCards(cards);
  }, [cards, isPinConfigured, isLocked]);

  // 1. URL Sync Detection & Initialization (Cross-device anonymous wallet)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const syncId = searchParams.get('sync');
    if (syncId) {
      pullWalletFromEdge(syncId).then((remoteCards) => {
        if (remoteCards && Array.isArray(remoteCards) && remoteCards.length > 0) {
          const normalized = normalizeStoredCards(remoteCards);
          setCards(normalized);
          saveStoredCards(normalized);
          setPublicCard(null);
          setIsPublicExternalView(false);
          setSelectedVaultCardId(null);
          setActiveTab('vault');
          showToast('기기 보관함이 성공적으로 동기화되었습니다.');
        }
        const url = new URL(window.location.href);
        url.searchParams.delete('sync');
        window.history.replaceState({}, document.title, url.pathname + (url.search || ''));
      });
    }
  }, [showToast]);

  // 2. Automatic background sync of wallet to Cloudflare edge (skipped while locked)
  useEffect(() => {
    if (isPinConfigured && isLocked) return;
    if (!cards || cards.length === 0) return;
    const timer = setTimeout(() => {
      pushWalletToEdge(cards);
    }, 800);
    return () => clearTimeout(timer);
  }, [cards, isPinConfigured, isLocked]);

  // 3. Public URL Route Evaluation (Runs ONLY on initial load & browser Back/Forward, NEVER on cards state mutations)
  const evaluatePublicRoute = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      if (!isPublicSlugRoute()) {
        setPublicCard(null);
        setIsPublicExternalView(false);
        return;
      }

      const localMyCards = loadUserCards().filter((c) => c.isMyCard);
      const localOwnedMatch = resolvePublicRouteCard(localMyCards, []);
      if (localOwnedMatch) {
        setPublicCard(null);
        setIsPublicExternalView(false);
        setSelectedVaultCardId(null);
        setSelectedMyCardId(localOwnedMatch.id);
        setActiveTab('my-card');
        return;
      }

      const slug = getRouteSlug();
      const hostname = window.location.hostname.toLowerCase();
      const customDomainParam = !isPlatformHost(hostname) ? normalizeDomain(hostname) : null;
      const sampleFallback = resolvePublicRouteCard([], SAMPLE_CARDS);

      const endpoint = customDomainParam
        ? `/api/resolve?domain=${encodeURIComponent(customDomainParam)}`
        : slug
          ? `/api/cards?slug=${encodeURIComponent(slug)}`
          : null;

      if (!endpoint) {
        if (sampleFallback) {
          setPublicCard(sampleFallback);
          setIsPublicExternalView(true);
          setIsFlipped(false);
        }
        return;
      }

      fetch(endpoint)
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          const remoteCard: StoredCard | null = payload?.card || sampleFallback || null;
          if (!remoteCard) return;

          const currentMyCards = loadUserCards().filter((c) => c.isMyCard);
          const isOwnedByLocalUser = currentMyCards.some(
            (c) =>
              c.id === remoteCard.id ||
              (Boolean(remoteCard.owner_key) && c.owner_key === remoteCard.owner_key)
          );

          if (isOwnedByLocalUser) {
            const owned =
              currentMyCards.find(
                (c) =>
                  c.id === remoteCard.id ||
                  (Boolean(remoteCard.owner_key) && c.owner_key === remoteCard.owner_key)
              ) || currentMyCards[0];
            setPublicCard(null);
            setIsPublicExternalView(false);
            setSelectedVaultCardId(null);
            if (owned) setSelectedMyCardId(owned.id);
            setActiveTab('my-card');
          } else {
            setPublicCard(remoteCard);
            setIsPublicExternalView(true);
            setIsFlipped(false);
          }
        })
        .catch(() => {
          if (sampleFallback) {
            setPublicCard(sampleFallback);
            setIsPublicExternalView(true);
            setIsFlipped(false);
          }
        });
    } catch (e) {
      console.error('URL routing error', e);
    }
  }, []);

  useEffect(() => {
    evaluatePublicRoute();
    window.addEventListener('popstate', evaluatePublicRoute);
    return () => window.removeEventListener('popstate', evaluatePublicRoute);
  }, [evaluatePublicRoute]);

  const cleanPublicUrlToRoot = () => {
    if (typeof window !== 'undefined' && isPublicSlugRoute()) {
      window.history.replaceState({}, document.title, '/');
    }
    setPublicCard(null);
    setIsPublicExternalView(false);
  };

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
      setSelectedVaultCardId(null);
      setIsFlipped(false);
      const preferredMyCard =
        (targetMyCardId ? myCards.find((c) => c.id === targetMyCardId) : undefined) ||
        myCards.find((c) => c.isDefault) ||
        myCards[0];
      setSelectedMyCardId(preferredMyCard?.id || '');
      setActiveTab('my-card');
      return;
    }

    requireUnlock(() => {
      cleanPublicUrlToRoot();
      setSelectedVaultCardId(null);
      setIsFlipped(false);
      setActiveTab('vault');
    });
  };

  // Resolved personal card strictly from `myCards` (`isMyCard === true`), or sample card when `isSamplePreview` is active
  const currentMyCard: StoredCard | undefined =
    isSamplePreview
      ? SAMPLE_CARDS[0]
      : myCards.length > 0
        ? myCards.find((c) => c.id === selectedMyCardId) ||
          myCards.find((c) => c.isDefault) ||
          myCards[0]
        : undefined;

  // Resolved Vault detail card strictly restricted to third-party cards (`!c.isMyCard`)
  const selectedVaultCard: StoredCard | undefined = selectedVaultCardId
    ? cards.find((c) => c.id === selectedVaultCardId && !c.isMyCard)
    : undefined;

  // Clear stale selectedVaultCardId if the target Vault card was deleted while unlocked
  useEffect(() => {
    if (selectedVaultCardId && !(isPinConfigured && isLocked) && !selectedVaultCard) {
      setSelectedVaultCardId(null);
    }
  }, [selectedVaultCardId, isPinConfigured, isLocked, selectedVaultCard]);

  // Target card for Share / QR / Print / Export modals
  const modalTargetCard: StoredCard | undefined =
    (modalTargetCardId ? cards.find((c) => c.id === modalTargetCardId) : undefined) ||
    (isPublicExternalView && publicCard
      ? publicCard
      : activeTab === 'vault' && selectedVaultCard
        ? selectedVaultCard
        : currentMyCard);

  // Strict visitor classification:
  // True ONLY when an unauthenticated external visitor (no local wallet/cards/PIN) visits a public shared link (/card/:slug)
  const hasLocalUserSession =
    cards.length > 0 || isPinConfigured || hasLocalWalletInitialized();
  const isUnauthenticatedExternalVisitor =
    isPublicExternalView && Boolean(publicCard) && !hasLocalUserSession;

  // Print Config
  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    layout: 'single-card',
    size: 'kr-standard',
    theme: 'pure_white',
    showCropMarks: true,
    scale: 1,
  });

  // Personal My Card Switcher (never mutates URL into a public slug route)
  const handleSelectMyCard = (id: string) => {
    const matchedMy = myCards.find((c) => c.id === id);
    if (!matchedMy) return;
    setSelectedMyCardId(matchedMy.id);
    setIsFlipped(false);
  };

  // Create New Personal My Card (`isMyCard: true`)
  const handleOpenCreateModal = () => {
    setShowWelcomeIntro(false);
    setIsSamplePreview(false);
    requireUnlock(() => {
      const defaultSlug = `card-${String(Date.now()).slice(-4)}`;
      const newCardTemplate: StoredCard = {
        id: `my-card-${Date.now()}`,
        isMyCard: true,
        isDefault: myCards.length === 0,
        slug: defaultSlug,
        owner_key: `key_${Date.now()}`,
        theme: currentMyCard?.theme || 'pure_white',
        layout_type: 'editorial_minimal',
        card_features: {
          show_en_name: true,
          show_sub_org: true,
          show_address: true,
          monogram_text: '',
        },
        category: '글로벌 네트워크',
        createdAt: new Date().toISOString().split('T')[0],
        notes: '내 디지털 명함',
        details: {
          en_name: '',
          sub_org: '',
          address: '',
          address_en: '',
          slogan: '',
          show_address: true,
          show_en_name: true,
        },
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
      modals.openEditor(newCardTemplate, true);
    });
  };

  // Create New Third-Party Vault Card via Full Editor (`isMyCard: false` — never overwrites My Card)
  const handleOpenCreateVaultCardModal = () => {
    requireUnlock(() => {
      const newVaultTemplate: StoredCard = {
        id: `vault-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
        details: {
          en_name: '',
          sub_org: '',
          address: '',
          address_en: '',
          slogan: '',
          show_address: true,
          show_en_name: true,
        },
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
      modals.openEditor(newVaultTemplate, true);
    });
  };

  const handleCreateMyOwnCard = () => {
    handleTabChange('my-card');
    handleOpenCreateModal();
  };

  // Bulk import contacts into the Vault
  const handleImportCards = (newCards: StoredCard[]) => {
    requireUnlock(() => {
      setCards((prev) => {
        const safeImported = newCards.map((nc) => sanitizeCardForVault(nc));
        return [...safeImported, ...prev];
      });
      showToast(`${newCards.length}개의 연락처가 보관함에 등록되었습니다.`);
    });
  };

  // Register an externally shared card (/card/:slug) directly into the internal Vault and show VaultDetailView
  const handleRegisterSharedCardToVault = (sourceCard: StoredCard) => {
    requireUnlock(() => {
      const existingVaultCopy = cards.find(
        (c) =>
          !c.isMyCard &&
          c.data.name === sourceCard.data.name &&
          c.data.phone === sourceCard.data.phone &&
          c.data.email === sourceCard.data.email
      );

      const isolatedVaultId =
        existingVaultCopy?.id ||
        `vault-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const sanitized = sanitizeCardForVault(sourceCard, {
        id: isolatedVaultId,
        category: existingVaultCopy?.category || sourceCard.category || 'VIP 파트너',
        notes: existingVaultCopy?.notes || sourceCard.notes || '공유 링크로 등록됨',
      });

      const isFirstEverCard = cards.length === 0;

      setCards((prev) => {
        const existsInVault = prev.some((c) => !c.isMyCard && c.id === sanitized.id);
        if (existsInVault) {
          return prev.map((c) => (!c.isMyCard && c.id === sanitized.id ? sanitized : c));
        }
        return [sanitized, ...prev];
      });

      cleanPublicUrlToRoot();
      setIsSamplePreview(false);
      setIsFlipped(false);
      setActiveTab('vault');
      setSelectedVaultCardId(sanitized.id);
      showToast(`'${sanitized.data.name}' 명함이 보관함에 등록되었습니다.`);

      if (
        isFirstEverCard &&
        !isPinConfigured &&
        typeof window !== 'undefined' &&
        localStorage.getItem('lazy_pin_dismissed') !== 'true'
      ) {
        setTimeout(() => {
          modals.openLazyPin();
        }, 450);
      }
    });
  };

  const handleShare = async (cardToShare?: StoredCard) => {
    const targetCard = cardToShare || modalTargetCard;
    if (!targetCard) return;
    const targetUrl = getCardShareUrl(targetCard);
    const displayUrl = targetCard.data.websiteDisplay || targetUrl;
    const displayName = targetCard.data.name || targetCard.data.nameKr;
    const displayOrg = targetCard.data.organizationKr || targetCard.data.organization;
    const displayTitle = targetCard.data.titleKr || targetCard.data.title;
    const shareData = {
      title: displayOrg ? `${displayName} — ${displayOrg}` : displayName,
      text: [displayOrg, displayTitle, displayName, '디지털 명함'].filter(Boolean).join(' '),
      url: targetUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(targetUrl);
          showToast(`명함 링크(${displayUrl})가 복사되었습니다`);
        }
      }
    } else {
      navigator.clipboard.writeText(targetUrl);
      showToast(`명함 링크(${displayUrl})가 복사되었습니다`);
    }
  };

  const handleSaveCard = (savedCard: StoredCard) => {
    const isFirstEverCard = cards.length === 0;

    if (savedCard.isMyCard) {
      const hadNoMyCards = myCards.length === 0;
      const shouldBeDefault = Boolean(savedCard.isDefault) || hadNoMyCards;
      const normalizedMyCard: StoredCard = {
        ...savedCard,
        id: savedCard.id || `my-card-${Date.now()}`,
        isMyCard: true,
        isDefault: shouldBeDefault,
        owner_key: savedCard.owner_key || `key_${Date.now()}`,
      };

      setCards((prev) => {
        let nextCards = [...prev];
        if (shouldBeDefault) {
          nextCards = nextCards.map((c) =>
            c.isMyCard ? { ...c, isDefault: false } : c
          );
        }
        const exists = nextCards.some((c) => c.isMyCard && c.id === normalizedMyCard.id);
        return exists
          ? nextCards.map((c) =>
              c.isMyCard && c.id === normalizedMyCard.id ? normalizedMyCard : c
            )
          : [normalizedMyCard, ...nextCards];
      });

      setSelectedMyCardId(normalizedMyCard.id);
      setIsSamplePreview(false);
      cleanPublicUrlToRoot();

      if (activeTab !== 'vault') {
        setSelectedVaultCardId(null);
        setActiveTab('my-card');
      }

      showToast(
        modals.isCreatingCard
          ? '새로운 내 명함이 생성되었습니다.'
          : '내 명함 정보가 수정되었습니다.'
      );
    } else {
      // Third-party Vault card registration or update:
      // 1. Guarantee an isolated unique ID that never collides with any existing `isMyCard: true` card
      const existingVaultEntry = cards.find((c) => !c.isMyCard && c.id === savedCard.id);
      const collidesWithMyCard = cards.some((c) => c.isMyCard && c.id === savedCard.id);
      const safeVaultId =
        existingVaultEntry && !collidesWithMyCard
          ? existingVaultEntry.id
          : savedCard.id &&
              !collidesWithMyCard &&
              (savedCard.id.startsWith('vault-card-') || savedCard.id.startsWith('photo-card-'))
            ? savedCard.id
            : `vault-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const sanitizedVaultCard = sanitizeCardForVault(savedCard, {
        id: safeVaultId,
        category: savedCard.category,
        notes: savedCard.notes,
      });

      // 2. Update/insert ONLY as a non-MyCard entry; never mutate myCards or selectedMyCardId
      setCards((prev) => {
        const existsInVault = prev.some((c) => !c.isMyCard && c.id === sanitizedVaultCard.id);
        return existsInVault
          ? prev.map((c) =>
              !c.isMyCard && c.id === sanitizedVaultCard.id ? sanitizedVaultCard : c
            )
          : [sanitizedVaultCard, ...prev];
      });

      cleanPublicUrlToRoot();
      setIsSamplePreview(false);
      setIsFlipped(false);

      // 3. Remain in Vault Detail mode (`activeTab === 'vault'` + `selectedVaultCardId`)
      setActiveTab('vault');
      setSelectedVaultCardId(sanitizedVaultCard.id);

      showToast(
        existingVaultEntry
          ? '보관 명함 정보가 수정되었습니다.'
          : `'${sanitizedVaultCard.data.name}' 명함이 보관함에 등록되었습니다.`
      );
    }

    if (
      isFirstEverCard &&
      !isPinConfigured &&
      typeof window !== 'undefined' &&
      localStorage.getItem('lazy_pin_dismissed') !== 'true'
    ) {
      setTimeout(() => {
        modals.openLazyPin();
      }, 450);
    }
  };

  const handleConfirmReset = () => {
    clearAllLocalData();
    cleanPublicUrlToRoot();
    setCards([]);
    setSelectedMyCardId('');
    setSelectedVaultCardId(null);
    setModalTargetCardId(null);
    setIsSamplePreview(false);
    setActiveTab('my-card');
    refreshPinStatus();
    unlockApp();
    showToast('모든 로컬 데이터가 안전하게 초기화되었습니다.');
  };

  const handleRequestDeleteCard = (card: StoredCard) => {
    requireUnlock(() => {
      setCardPendingDelete(card);
    });
  };

  const handleDeleteCard = (cardId: string) => {
    const target = cards.find((c) => c.id === cardId);
    if (!target) return;

    setCards((prev) => {
      const remaining = prev.filter((c) => c.id !== cardId);
      if (target.isMyCard && target.isDefault) {
        const firstRemainingMy = remaining.find((c) => c.isMyCard);
        if (firstRemainingMy) {
          return remaining.map((c) =>
            c.id === firstRemainingMy.id ? { ...c, isDefault: true } : c
          );
        }
      }
      return remaining;
    });

    if (target.isMyCard) {
      const remainingMyCards = myCards.filter((c) => c.id !== cardId);
      if (remainingMyCards.length === 0) {
        setSelectedMyCardId('');
        setShowWelcomeIntro(true);
      } else if (selectedMyCardId === cardId) {
        const nextCard = remainingMyCards.find((c) => c.isDefault) || remainingMyCards[0];
        setSelectedMyCardId(nextCard?.id || '');
      }
    }

    if (selectedVaultCardId === cardId) {
      setSelectedVaultCardId(null);
    }
    showToast(target.isMyCard ? '내 명함이 삭제되었습니다.' : '명함이 삭제되었습니다.');
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    const affectedCount = cards.filter((c) => c.category === oldName).length;
    setCards((prev) =>
      prev.map((c) => (c.category === oldName ? { ...c, category: newName } : c))
    );
    showToast(
      affectedCount > 0
        ? `'${oldName}' 분류가 '${newName}'(으)로 변경되어 명함 ${affectedCount}장에 반영되었습니다.`
        : `'${oldName}' 카테고리가 '${newName}'(으)로 변경되었습니다.`
    );
  };

  const handleMergeCategories = (sourceCategory: string, targetCategory: string) => {
    const movedCount = cards.filter((c) => c.category === sourceCategory).length;
    setCards((prev) =>
      prev.map((c) =>
        c.category === sourceCategory ? { ...c, category: targetCategory } : c
      )
    );
    showToast(
      movedCount > 0
        ? `'${sourceCategory}'의 명함 ${movedCount}장이 '${targetCategory}'(으)로 병합되었습니다.`
        : `'${sourceCategory}' 카테고리가 '${targetCategory}'(으)로 병합되었습니다.`
    );
  };

  const handleDeleteCategory = (deletedName: string, fallbackCategory: string) => {
    const movedCount = cards.filter((c) => c.category === deletedName).length;
    setCards((prev) =>
      prev.map((c) => (c.category === deletedName ? { ...c, category: fallbackCategory } : c))
    );
    showToast(
      movedCount > 0
        ? `'${deletedName}' 삭제 후 명함 ${movedCount}장이 '${fallbackCategory}'(으)로 이동되었습니다.`
        : `'${deletedName}' 카테고리가 삭제되었습니다.`
    );
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
        (activeTab === 'vault' && Boolean(selectedVaultCard));
      if (e.code === 'Space' && isSingleCardViewport) {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedVaultCard, isPublicExternalView]);

  const isMyCardTabActive = !isPublicExternalView && activeTab === 'my-card';
  const isVaultTabActive = !isPublicExternalView && activeTab === 'vault';
  const isVaultDetailActive =
    isVaultTabActive && Boolean(selectedVaultCardId) && (Boolean(selectedVaultCard) || (isPinConfigured && isLocked));
  const isIntroLandingView =
    !isPublicExternalView &&
    activeTab === 'my-card' &&
    !isSamplePreview &&
    (showWelcomeIntro || myCards.length === 0 || !currentMyCard);

  return (
    <>
      {/* SCREEN UI CONTAINER */}
      <div
        id="screen-app-container"
        className={`${
          isIntroLandingView
            ? 'h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden'
            : 'min-h-[100dvh] overflow-x-clip'
        } w-full max-w-[100vw] bg-[#0A0A0B] text-neutral-100 flex flex-col justify-between selection:bg-neutral-100 selection:text-neutral-950 font-sans pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]`}
      >
        {/* Top Minimalist Luxury Header */}
        <header className="shrink-0 sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0A0A0B]/90 backdrop-blur-xl px-4 sm:px-8 py-2 sm:py-2.5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(0.625rem+env(safe-area-inset-top,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] flex items-center justify-between main-app-header">
          {isUnauthenticatedExternalVisitor ? (
            /* Public Unauthenticated Visitor Header: Muted Brand Watermark Only */
            <>
              <div className="w-full flex items-center justify-center py-0.5 header-brand-mark">
                <span className="text-xs text-zinc-400 tracking-widest uppercase font-medium select-none font-sans">
                  GOGUMA CARD STUDIO
                </span>
              </div>
              <div className="hidden header-landscape-mini items-center bg-[#121214]/90 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 shadow-2xl">
                <span className="text-[10px] font-semibold text-white/80 tracking-widest uppercase">
                  GOGUMA
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Left Spacer for Header Balance */}
              <div className="flex-1 flex items-center justify-start header-full-nav" />

              {/* Compressed Mini Icon in Landscape Mode */}
              <div className="hidden header-landscape-mini items-center gap-1 bg-[#121214]/90 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-2xl">
                <button
                  onClick={() => {
                    if (isMyCardTabActive) {
                      handleTabChange('vault');
                    } else {
                      handleTabChange('my-card');
                    }
                  }}
                  className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isMyCardTabActive ? '보관함으로 전환' : '내 명함으로 전환'}
                  aria-label="화면 전환"
                >
                  {isMyCardTabActive ? (
                    <FolderArchive className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
                {isPinConfigured && (
                  <button
                    onClick={() => {
                      lockApp();
                      showToast('화면이 보안 잠금되었습니다.');
                    }}
                    className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="즉시 화면 잠금"
                    aria-label="화면 잠금"
                  >
                    <Lock className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
                <button
                  onClick={modals.toggleSettings}
                  className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                    isMyCardTabActive
                      ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>내 명함</span>
                </button>

                <button
                  onClick={() => handleTabChange('vault')}
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                    isVaultTabActive
                      ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>명함 보관함</span>
                  {isPinConfigured && isLocked && <Lock className="w-3 h-3 text-white" />}
                  <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                    {cards.length}
                  </span>
                </button>
              </nav>

              {/* Right Header: Minimal Security Lock & Consolidated Settings */}
              <div
                className="flex-1 flex items-center justify-end gap-1.5 sm:gap-2 min-h-[32px] relative header-full-nav"
                ref={modals.settingsMenuRef}
              >
                {isPinConfigured && (
                  <button
                    onClick={() => {
                      lockApp();
                      showToast('화면이 보안 잠금되었습니다.');
                    }}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                    title="즉시 화면 잠금 (Lock Screen)"
                    aria-label="화면 잠금"
                  >
                    <Lock className="w-4 h-4 text-white" />
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={modals.toggleSettings}
                    aria-expanded={modals.isSettingsOpen}
                    aria-haspopup="menu"
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                    title="보안 및 기기 설정"
                    aria-label="설정 메뉴"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {modals.isSettingsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#121214] border border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                      <button
                        onClick={() => {
                          modals.closeSettings();
                          modals.openPinConfig(isPinConfigured ? 'change' : 'setup');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
                      >
                        <Lock className="w-3.5 h-3.5 text-white" />
                        <span>{isPinConfigured ? 'PIN 번호 변경 / 관리' : '4자리 PIN 보안 설정'}</span>
                      </button>

                      <button
                        onClick={() => {
                          modals.closeSettings();
                          modals.openBiometrics();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
                      >
                        <Fingerprint className="w-3.5 h-3.5 text-white" />
                        <span>생체 인증 (Face ID / 지문)</span>
                      </button>

                      <div className="my-1 border-t border-white/10" />

                      <button
                        onClick={() => {
                          modals.closeSettings();
                          modals.openSync();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-white" />
                        <span>기기 연결 및 동기화</span>
                      </button>

                      <div className="my-1 border-t border-white/10" />

                      <button
                        onClick={() => {
                          modals.closeSettings();
                          setShowWelcomeIntro(true);
                          setIsSamplePreview(false);
                          setActiveTab('my-card');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-white" />
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
                        className="w-full aspect-[9/5] rounded-2xl bg-[#121214] border border-white/10"
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
                  onClick={() => handleRegisterSharedCardToVault(publicCard)}
                  className="inline-flex items-center gap-2 text-xs font-medium text-neutral-950 bg-white hover:bg-zinc-200 transition-all tracking-wide py-2.5 px-5 rounded-xl active:scale-95 cursor-pointer shadow-lg"
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
                    className="inline-flex items-center gap-2 text-xs text-zinc-200 hover:text-white transition-all tracking-wide py-2.5 px-5 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/[0.04] active:scale-95 group cursor-pointer shadow-lg"
                  >
                    <span>나만의 럭셔리 디지털 명함 만들기</span>
                    <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 font-sans">
                      ↗
                    </span>
                  </a>
                )}
              </div>
            </div>
          ) : isVaultDetailActive ? (
            /* ================= INTERNAL VAULT DETAIL VIEW (`activeTab === 'vault' && !card.isMyCard`) ================= */
            <div className="w-full flex flex-col items-center space-y-2 sm:space-y-4 animate-in fade-in duration-200">
              {/* Vault Header Rail Guard Clause: Rendered ONLY when activeTab === 'vault' and viewing a non-MyCard Vault entry */}
              {activeTab === 'vault' && (!selectedVaultCard || !selectedVaultCard.isMyCard) && (
                <div className="flex items-center justify-between w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setSelectedVaultCardId(null);
                    }}
                    className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer py-1.5 px-2 -ml-2 rounded-lg hover:bg-white/[0.05]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>보관함 목록으로</span>
                  </button>
                  {selectedVaultCard && !selectedVaultCard.isMyCard && !(isPinConfigured && isLocked) && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#121318] border border-white/10 text-zinc-300 font-mono">
                      보관 명함 ({selectedVaultCard.category})
                    </span>
                  )}
                </div>
              )}

              {isPinConfigured && isLocked ? (
                <div className="w-full max-w-lg mx-auto py-16 px-6 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-5 shadow-2xl">
                    <Lock className="w-7 h-7 stroke-[1.5]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                    명함 보관함이 잠겨 있습니다
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
                    공용 기기 및 타인의 무단 열람을 방지하기 위해 보관함이 4자리 보안 PIN으로 보호되고 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={lockApp}
                    className="px-6 py-3 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4 stroke-[1.75] text-neutral-900" />
                    <span>보안 PIN 입력하여 잠금 해제</span>
                  </button>
                </div>
              ) : selectedVaultCard && !selectedVaultCard.isMyCard ? (
                <div className="w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] flex justify-center">
                  <LazyErrorBoundary resetKey={selectedVaultCard.id}>
                    <Suspense
                      fallback={
                        <div
                          className="w-full aspect-[9/5] rounded-2xl bg-[#121214] border border-white/10"
                          aria-hidden="true"
                        />
                      }
                    >
                      <CardContainer
                        data={selectedVaultCard.data}
                        theme={selectedVaultCard.theme}
                        layout_type={selectedVaultCard.layout_type}
                        card_features={selectedVaultCard.card_features}
                        isPhotoCard={
                          selectedVaultCard.isPhotoCard || selectedVaultCard.creation_mode === 'photo'
                        }
                        photoUrl={selectedVaultCard.scannedImage || selectedVaultCard.front_image_url}
                        backPhotoUrl={
                          selectedVaultCard.scannedImageBack || selectedVaultCard.back_image_url
                        }
                        html_front={selectedVaultCard.html_front}
                        html_back={selectedVaultCard.html_back}
                        isFlipped={isFlipped}
                        onFlip={() => setIsFlipped((prev) => !prev)}
                        onOpenShare={() => {
                          setModalTargetCardId(selectedVaultCard.id);
                          modals.openShare();
                        }}
                        onOpenEdit={() => {
                          requireUnlock(() => {
                            modals.openEditor(selectedVaultCard, false);
                          });
                        }}
                        isOwner={true}
                        cardUrl={getCardShareUrl(selectedVaultCard)}
                        onShowToast={showToast}
                      />
                    </Suspense>
                  </LazyErrorBoundary>
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
                  cards={cards}
                  isLocked={isPinConfigured && isLocked}
                  onUnlockRequest={lockApp}
                  onSelectCard={(selected) => {
                    if (selected.isMyCard) {
                      handleTabChange('my-card', selected.id);
                    } else {
                      setIsFlipped(false);
                      setSelectedVaultCardId(selected.id);
                      setActiveTab('vault');
                    }
                  }}
                  onEditCard={(cardToEdit) => {
                    requireUnlock(() => {
                      modals.openEditor(cardToEdit, false);
                    });
                  }}
                  onDeleteCard={(id) => {
                    requireUnlock(() => {
                      const c = cards.find((x) => x.id === id);
                      if (c) {
                        handleRequestDeleteCard(c);
                      } else {
                        handleDeleteCard(id);
                      }
                    });
                  }}
                  onExportCard={(cardToExport) => {
                    setModalTargetCardId(cardToExport.id);
                    modals.openExport();
                  }}
                  onOpenScan={() => {
                    requireUnlock(() => {
                      modals.openScan();
                    });
                  }}
                  onOpenImportContacts={() => {
                    requireUnlock(() => {
                      modals.openImportContacts();
                    });
                  }}
                  onOpenSync={modals.openSync}
                  onOpenEditor={handleOpenCreateVaultCardModal}
                  onRenameCategory={(oldName, newName) => {
                    requireUnlock(() => {
                      handleRenameCategory(oldName, newName);
                    });
                  }}
                  onMergeCategories={(sourceCategory, targetCategory) => {
                    requireUnlock(() => {
                      handleMergeCategories(sourceCategory, targetCategory);
                    });
                  }}
                  onDeleteCategory={(deletedName, fallbackCategory) => {
                    requireUnlock(() => {
                      handleDeleteCategory(deletedName, fallbackCategory);
                    });
                  }}
                  onShowToast={showToast}
                />
              </Suspense>
            </LazyErrorBoundary>
          ) : (
            /* ================= MY CARDS STUDIO & CAROUSEL VIEW (`activeTab === 'my-card'`) ================= */
            <div className="w-full min-h-0 flex flex-col items-center justify-center">
              {!isSamplePreview && (showWelcomeIntro || myCards.length === 0) ? (
                <WelcomeCard
                  onCreateFirstCard={() => {
                    markFirstLaunchDone();
                    handleOpenCreateModal();
                  }}
                  onExploreSample={() => {
                    markFirstLaunchDone();
                    setShowWelcomeIntro(false);
                    setIsSamplePreview(true);
                  }}
                  onViewMyCards={myCards.length > 0 ? () => {
                    markFirstLaunchDone();
                    setShowWelcomeIntro(false);
                  } : undefined}
                  hasExistingCards={myCards.length > 0}
                />
              ) : isSamplePreview && currentMyCard ? (
                <div className="w-full flex flex-col items-center space-y-2 sm:space-y-4">
                  <div className="w-full max-w-[540px] px-1 py-0.5 flex items-center justify-between text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-normal">
                      <span className="text-white text-[8px] leading-none" aria-hidden="true">
                        ●
                      </span>
                      <span>샘플 모드</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleOpenCreateModal}
                        className="p-1.5 rounded-lg text-white hover:text-neutral-200 hover:bg-white/5 transition-all cursor-pointer active:scale-90 flex items-center justify-center"
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
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer active:scale-90 flex items-center justify-center"
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
                            className="w-full aspect-[9/5] rounded-2xl bg-[#121214] border border-white/10"
                            aria-hidden="true"
                          />
                        }
                      >
                        <CardContainer
                          data={currentMyCard.data}
                          theme={currentMyCard.theme}
                          layout_type={currentMyCard.layout_type}
                          card_features={currentMyCard.card_features}
                          isPhotoCard={currentMyCard.isPhotoCard}
                          photoUrl={currentMyCard.scannedImage}
                          backPhotoUrl={currentMyCard.scannedImageBack}
                          isFlipped={isFlipped}
                          onFlip={() => setIsFlipped((prev) => !prev)}
                          onOpenShare={() => {
                            setModalTargetCardId(currentMyCard.id);
                            modals.openShare();
                          }}
                          onOpenEdit={handleOpenCreateModal}
                          onDelete={!isSamplePreview ? () => handleRequestDeleteCard(currentMyCard) : undefined}
                        />
                      </Suspense>
                    </LazyErrorBoundary>
                  </div>
                </div>
              ) : !currentMyCard ? (
                <WelcomeCard
                  onCreateFirstCard={() => {
                    markFirstLaunchDone();
                    handleOpenCreateModal();
                  }}
                  onExploreSample={() => {
                    markFirstLaunchDone();
                    setIsSamplePreview(true);
                  }}
                  onViewMyCards={myCards.length > 0 ? () => {
                    markFirstLaunchDone();
                    setShowWelcomeIntro(false);
                  } : undefined}
                  hasExistingCards={myCards.length > 0}
                />
              ) : (
                <LazyErrorBoundary resetKey={currentMyCard.id}>
                  <Suspense
                    fallback={
                      <div
                        className="w-full max-w-[540px] aspect-[9/5] rounded-2xl bg-[#121214] border border-white/10"
                        aria-hidden="true"
                      />
                    }
                  >
                    <CardNavigator
                      cards={myCards}
                      activeCardId={currentMyCard.id}
                      onSelectCard={handleSelectMyCard}
                      onCreateNewCard={handleOpenCreateModal}
                      onOpenEdit={(cardToEdit) => {
                        requireUnlock(() => {
                          modals.openEditor(cardToEdit, false);
                        });
                      }}
                      onOpenShare={(cardToShare) => {
                        setModalTargetCardId(cardToShare.id);
                        modals.openShare();
                      }}
                      onDeleteCard={(cardToDelete) => {
                        handleRequestDeleteCard(cardToDelete);
                      }}
                      mode="carousel"
                    />
                  </Suspense>
                </LazyErrorBoundary>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="shrink-0 border-t border-white/[0.08] py-2 sm:py-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] px-4 sm:px-8 font-sans text-xs">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-3">
            <p className="text-[10px] sm:text-[11px] text-white/50 tracking-widest font-light font-sans whitespace-nowrap select-none">
              © {new Date().getFullYear()} GOGUMA CARD STUDIO
            </p>

            <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => modals.openLegal('privacy')}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white cursor-pointer active:scale-95 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                title="개인정보처리방침"
                aria-label="개인정보처리방침"
              >
                <ShieldCheck className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>

              <button
                type="button"
                onClick={() => modals.openLegal('terms')}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white cursor-pointer active:scale-95 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                title="서비스 이용약관"
                aria-label="서비스 이용약관"
              >
                <FileText className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>

              <button
                type="button"
                onClick={() => modals.openLegal('licenses')}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 flex items-center justify-center text-white/60 hover:text-white cursor-pointer active:scale-95 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                title="오픈소스 라이선스"
                aria-label="오픈소스 라이선스"
              >
                <Code2 className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>

              {!isUnauthenticatedExternalVisitor && (
                <button
                  type="button"
                  onClick={modals.openReset}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 flex items-center justify-center text-white/50 hover:text-white cursor-pointer active:scale-95 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                  title="로컬 데이터 초기화"
                  aria-label="로컬 데이터 초기화"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
              )}
            </div>
          </div>
        </footer>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#121214] border border-white/15 text-white text-xs font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <Check className="w-4 h-4 text-white shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Declarative Centralized Modals Container */}
        {((isLocked && isPinConfigured) ||
          modals.isShareOpen ||
          modals.isQrOpen ||
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
          modals.isResetOpen) && (
          <AppModals
            modals={modals}
            activeCard={modalTargetCard}
            existingCards={cards}
            onImportCards={handleImportCards}
            isOwner={!isPublicExternalView}
            printConfig={printConfig}
            setPrintConfig={setPrintConfig}
            onSaveCard={handleSaveCard}
            onDeleteCard={(cardId) => {
              const c = cards.find((x) => x.id === cardId);
              if (c) {
                handleRequestDeleteCard(c);
              }
            }}
            onConfirmReset={handleConfirmReset}
            isLocked={isLocked}
            isPinConfigured={isPinConfigured}
            unlockApp={unlockApp}
            refreshPinStatus={refreshPinStatus}
            setCards={setCards}
            showToast={showToast}
            onBiometricUnlock={handleBiometricUnlock}
          />
        )}

        {/* Card Deletion Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={Boolean(cardPendingDelete)}
          onClose={() => setCardPendingDelete(null)}
          onConfirm={() => {
            if (cardPendingDelete) {
              handleDeleteCard(cardPendingDelete.id);
              setCardPendingDelete(null);
            }
          }}
          title={cardPendingDelete?.isMyCard ? '내 명함 삭제' : '명함 삭제'}
          cardName={cardPendingDelete?.data?.name || cardPendingDelete?.data?.nameKr}
          description={
            cardPendingDelete?.isMyCard
              ? '내 명함을 삭제하시겠습니까? 삭제된 명함은 복구할 수 없습니다.'
              : '보관된 명함을 삭제하시겠습니까? 삭제된 명함은 복구할 수 없습니다.'
          }
        />
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
