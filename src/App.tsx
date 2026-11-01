/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense } from 'react';
import { PrintConfig, StoredCard } from './types/card';
import {
  loadUserCards,
  saveUserCards,
  saveStoredCards,
  SAMPLE_CARDS,
  clearAllLocalData,
} from './utils/initialCards';
import { WelcomeCard } from './components/WelcomeCard';
import { AppModals } from './components/AppModals';
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
import { APP_BASE_DOMAIN, resolveCardFromLocation, getCardShareUrl, getRouteSlug, isPublicSlugRoute } from './utils/domain';
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
  RotateCcw
} from 'lucide-react';

export default function App() {
  const [cards, setCards] = useState<StoredCard[]>(() => loadUserCards());
  const [publicCard, setPublicCard] = useState<StoredCard | null>(null);
  const [isSamplePreview, setIsSamplePreview] = useState<boolean>(false);
  const [activeCardId, setActiveCardId] = useState<string>(() => {
    const loaded = loadUserCards();
    const defaultCard = loaded.find(c => c.isMyCard && c.isDefault);
    return defaultCard?.id || loaded[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<'my-card' | 'vault'>('my-card');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Centralized Lightweight Modal Manager Hook
  const modals = useModalState();

  // Local-First 4-Digit PIN App Lock with Auto-Lock (Manual, Visibility, Idle 5m)
  const { isLocked, lockApp, unlockApp, isPinConfigured, refreshPinStatus } = useAutoLock();

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

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync cards with local storage
  useEffect(() => {
    saveUserCards(cards);
  }, [cards]);

  // 1. URL Sync Detection & Initialization (Cross-device anonymous wallet)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const syncId = searchParams.get('sync');
    if (syncId) {
      pullWalletFromEdge(syncId).then((remoteCards) => {
        if (remoteCards && Array.isArray(remoteCards) && remoteCards.length > 0) {
          setCards(remoteCards);
          saveStoredCards(remoteCards);
          setActiveTab('vault');
          showToast('기기 보관함이 성공적으로 동기화되었습니다.');
        }
        // Clean up URL query parameter using replaceState without page refresh
        const url = new URL(window.location.href);
        url.searchParams.delete('sync');
        window.history.replaceState({}, document.title, url.pathname + (url.search || ''));
      });
    }
  }, []);

  // 2. Automatic background sync of wallet to Cloudflare edge
  useEffect(() => {
    if (!cards || cards.length === 0) return;
    const timer = setTimeout(() => {
      pushWalletToEdge(cards);
    }, 800);
    return () => clearTimeout(timer);
  }, [cards]);

  // URL query parameter (?card=...), Pathname (/mrpark), & Custom Domain smart routing
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const slug = getRouteSlug();
      const isSlug = isPublicSlugRoute();

      // Attempt to resolve card from user's cards or fallback sample cards
      const matched = resolveCardFromLocation(cards, SAMPLE_CARDS);
      if (matched) {
        setActiveCardId(matched.id);
        if (isSlug && !cards.some(c => c.id === matched.id)) {
          setPublicCard(matched);
        }
        setActiveTab('my-card');
      } else if (slug) {
        // Try fetching remote card from API edge if not locally cached
        fetch(`/api/cards?slug=${encodeURIComponent(slug)}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.card) {
              setPublicCard(data.card);
              setActiveCardId(data.card.id);
              setActiveTab('my-card');
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error('URL routing error', e);
    }
  }, [cards]);

  const activeCard: StoredCard | undefined = 
    publicCard ||
    (cards.length > 0
      ? (cards.find(c => c.id === activeCardId) || cards[0])
      : (isPublicSlugRoute() 
          ? (resolveCardFromLocation(cards, SAMPLE_CARDS) || undefined)
          : (isSamplePreview ? SAMPLE_CARDS[0] : undefined)));

  // Ownership & Public Viewer Detection
  const checkCardOwnership = (cardToCheck: StoredCard | undefined): boolean => {
    if (!cardToCheck) return true;
    if (typeof window === 'undefined') return true;

    try {
      const raw = localStorage.getItem('my_cards') || localStorage.getItem('user_cards');
      const localCards: StoredCard[] = raw ? JSON.parse(raw) : [];

      // Extract all owner_keys from locally saved cards that belong to this user
      const localOwnerKeys = localCards
        .filter(c => c.isMyCard)
        .map(c => c.owner_key)
        .filter((k): k is string => Boolean(k));

      // 1. Check if currentCard.owner_key matches any key stored in localStorage.getItem("my_cards")
      if (cardToCheck.owner_key && localOwnerKeys.includes(cardToCheck.owner_key)) {
        return true;
      }

      // 2. Check if currentCard is locally stored in my_cards with isMyCard: true
      const isLocallyOwned = localCards.some(c => c.isMyCard && c.id === cardToCheck.id);
      if (isLocallyOwned) {
        return true;
      }

      // 3. Or check if the user arrived via a public card slug route without ownership credentials
      const slugRouteActive = isPublicSlugRoute();
      if (slugRouteActive) {
        return false;
      }

      // 4. In studio mode (root URL without public slug):
      // If user has no cards yet, they are in the studio to create their card
      if (localCards.length === 0) {
        return true;
      }

      return Boolean(cardToCheck.isMyCard);
    } catch (e) {
      console.error('Error checking card ownership', e);
      return !isPublicSlugRoute();
    }
  };

  const [isOwner, setIsOwner] = useState<boolean>(() => {
    const initialResolved = resolveCardFromLocation(loadUserCards(), SAMPLE_CARDS);
    return checkCardOwnership(initialResolved || undefined);
  });

  // Re-evaluate ownership whenever activeCard or cards change
  useEffect(() => {
    setIsOwner(checkCardOwnership(activeCard));
  }, [activeCard, cards]);

  const handleCreateMyOwnCard = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
    setPublicCard(null);
    setIsOwner(true);
    setActiveTab('my-card');
    handleOpenCreateModal();
  };

  const myCards = cards.filter(c => c.isMyCard);

  // Print Config for active card
  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    layout: 'single-card',
    size: 'kr-standard',
    theme: 'pure_white',
    showCropMarks: true,
    scale: 1,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Card Switcher Handler
  const handleSelectMyCard = (id: string) => {
    setActiveCardId(id);
    setIsFlipped(false);
    const selectedCard = cards.find(c => c.id === id);
    if (selectedCard && typeof window !== 'undefined') {
      const slug = selectedCard.slug || selectedCard.id;
      const url = new URL(window.location.href);
      url.searchParams.set('card', slug);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Create New My Card (Protected by PIN if locked)
  const handleOpenCreateModal = () => {
    requireUnlock(() => {
      const defaultSlug = `card-${String(Date.now()).slice(-4)}`;
      const newCardTemplate: StoredCard = {
        id: `my-card-${Date.now()}`,
        isMyCard: true,
        isDefault: cards.length === 0,
        slug: defaultSlug,
        owner_key: `key_${Date.now()}`,
        theme: activeCard?.theme || 'pure_white',
        layout_type: 'editorial_minimal',
        card_features: {
          show_en_name: true,
          show_sub_org: true,
          show_address: true,
          monogram_text: ''
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
          show_en_name: true
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
          website: `https://${APP_BASE_DOMAIN}/${defaultSlug}`,
          websiteDisplay: `${APP_BASE_DOMAIN}/${defaultSlug}`,
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
            show_en_name: true
          },
          googleMapsUrl: '',
          naverMapsUrl: '',
          backTitle: '',
          backSubtitle: '',
          backTagline: '',
          backHqAddress: ''
        }
      };
      modals.openEditor(newCardTemplate, true);
    });
  };

  // Set as Primary Default Card
  const handleSetDefaultCard = (id: string) => {
    setCards(prev => prev.map(c => ({
      ...c,
      isDefault: c.id === id
    })));
    showToast('기본 대표 명함으로 지정되었습니다.');
  };

  // Delete Secondary My Card (Protected by PIN if locked)
  const handleDeleteMyCard = (id: string) => {
    requireUnlock(() => {
      const currentMyCards = cards.filter(c => c.isMyCard);
      if (currentMyCards.length <= 1) {
        showToast('최소 1개의 내 명함은 유지되어야 합니다.');
        return;
      }
      setCards(prev => prev.filter(c => c.id !== id));
      if (activeCardId === id) {
        const remaining = currentMyCards.filter(c => c.id !== id);
        setActiveCardId(remaining[0].id);
      }
      showToast('명함이 삭제되었습니다.');
    });
  };

  const handleShare = async () => {
    if (!activeCard) return;
    const targetUrl = getCardShareUrl(activeCard);
    const displayUrl = activeCard.data.websiteDisplay || targetUrl;
    const displayName = activeCard.data.name || activeCard.data.nameKr;
    const displayOrg = activeCard.data.organizationKr || activeCard.data.organization;
    const displayTitle = activeCard.data.titleKr || activeCard.data.title;
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

    setCards(prev => {
      let nextCards = [...prev];
      // If marked as default or is first card, ensure default
      if (savedCard.isDefault || isFirstEverCard) {
        nextCards = nextCards.map(c => ({ ...c, isDefault: false }));
        savedCard.isDefault = true;
      }

      const exists = nextCards.some(c => c.id === savedCard.id);
      if (exists) {
        return nextCards.map(c => c.id === savedCard.id ? savedCard : c);
      } else {
        return [savedCard, ...nextCards];
      }
    });

    setActiveCardId(savedCard.id);
    setIsSamplePreview(false);

    if (savedCard.isMyCard) {
      setActiveTab('my-card');
      showToast(modals.isCreatingCard ? '새로운 내 명함이 생성되었습니다.' : '내 명함 정보가 수정되었습니다.');
    } else {
      showToast(`'${savedCard.data.name}' 명함이 보관함에 등록되었습니다.`);
    }

    // Trigger optional PIN protection prompt ("Lazy Setup") only after user creates and saves first card
    if (isFirstEverCard && !isPinConfigured && typeof window !== 'undefined' && localStorage.getItem('lazy_pin_dismissed') !== 'true') {
      setTimeout(() => {
        modals.openLazyPin();
      }, 450);
    }
  };

  const handleConfirmReset = () => {
    clearAllLocalData();
    setCards([]);
    setActiveCardId('');
    setIsSamplePreview(false);
    setActiveTab('my-card');
    refreshPinStatus();
    unlockApp();
    showToast('모든 로컬 데이터가 안전하게 초기화되었습니다.');
  };

  const handleDeleteCard = (cardId: string) => {
    const target = cards.find(c => c.id === cardId);
    if (!target) return;
    if (target.isMyCard && cards.filter(c => c.isMyCard).length <= 1) {
      showToast('최소 1개의 내 명함은 유지되어야 합니다.');
      return;
    }
    setCards(prev => prev.filter(c => c.id !== cardId));
    if (activeCardId === cardId) {
      const remaining = cards.filter(c => c.id !== cardId);
      if (remaining.length > 0) setActiveCardId(remaining[0].id);
    }
    showToast('명함이 삭제되었습니다.');
  };

  // Keyboard shortcut: Space to flip card in my-card mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' && activeTab === 'my-card') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  return (
    <>
      {/* SCREEN UI CONTAINER */}
      <div 
        id="screen-app-container" 
        className="min-h-[100dvh] bg-[#0A0A0B] text-neutral-100 flex flex-col justify-between selection:bg-neutral-100 selection:text-neutral-950 font-sans pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] overflow-x-hidden"
      >
        {/* Top Minimalist Luxury Header */}
        <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0A0A0B]/90 backdrop-blur-xl px-4 sm:px-8 py-2.5 sm:py-3.5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] flex items-center justify-between main-app-header">
          {!isOwner ? (
            /* Public Visitor Header: Muted Brand Watermark Only */
            <>
              <div className="w-full flex items-center justify-center py-0.5 header-brand-mark">
                <span className="text-xs text-zinc-400 tracking-widest uppercase font-medium select-none font-sans">
                  GOGUMA CARD STUDIO
                </span>
              </div>
              <div className="hidden header-landscape-mini items-center bg-[#121214]/90 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 shadow-2xl">
                <span className="text-[10px] font-semibold text-white/80 tracking-widest uppercase">GOGUMA</span>
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
                    if (activeTab === 'my-card') {
                      requireUnlock(() => setActiveTab('vault'));
                    } else {
                      setActiveTab('my-card');
                    }
                  }}
                  className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={activeTab === 'my-card' ? '보관함으로 전환' : '내 명함으로 전환'}
                  aria-label="화면 전환"
                >
                  {activeTab === 'my-card' ? <FolderArchive className="w-3.5 h-3.5 text-white" /> : <CreditCard className="w-3.5 h-3.5 text-white" />}
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

              {/* Center Navigation: Switcher (내 명함 vs 보관함) */}
              <nav aria-label="주요 메뉴" className="flex items-center gap-1 sm:gap-1.5 header-full-nav">
                <button
                  onClick={() => {
                    setActiveTab('my-card');
                    const defaultCard = myCards.find(c => c.isDefault) || myCards[0];
                    if (defaultCard) setActiveCardId(defaultCard.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                    activeTab === 'my-card'
                      ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>내 명함</span>
                </button>

                <button
                  onClick={() => {
                    requireUnlock(() => {
                      setActiveTab('vault');
                    });
                  }}
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                    activeTab === 'vault'
                      ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>명함 보관함</span>
                  {isPinConfigured && isLocked && (
                    <Lock className="w-3 h-3 text-white" />
                  )}
                  <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                    {cards.length}
                  </span>
                </button>
              </nav>

              {/* Right Header: Minimal Security Lock & Consolidated Settings */}
              <div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-2 min-h-[32px] relative header-full-nav" ref={modals.settingsMenuRef}>
                {/* If PIN configured: Minimalist Lock icon for instant lock */}
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

                {/* Consolidated Settings Popover Trigger */}
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
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </header>

        {/* Main Showcase Viewport */}
        <main className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-2 sm:py-6 max-w-6xl mx-auto w-full">
          
          {!isOwner && activeCard ? (
            /* ================= PUBLIC RECIPIENT VISITOR VIEW MODE ================= */
            <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
              <div className="w-full max-w-[540px] flex justify-center">
                <LazyErrorBoundary resetKey={activeCard.id}>
                  <Suspense
                    fallback={
                      <div
                        className="w-full aspect-[9/5] rounded-2xl bg-[#121214] border border-white/10"
                        aria-hidden="true"
                      />
                    }
                  >
                    <CardContainer 
                      data={activeCard.data} 
                      theme={activeCard.theme} 
                      layout_type={activeCard.layout_type}
                      card_features={activeCard.card_features}
                      isPhotoCard={activeCard.isPhotoCard || activeCard.creation_mode === 'photo'}
                      photoUrl={activeCard.scannedImage || activeCard.front_image_url}
                      backPhotoUrl={activeCard.scannedImageBack || activeCard.back_image_url}
                      html_front={activeCard.html_front}
                      html_back={activeCard.html_back}
                      isFlipped={isFlipped}
                      onFlip={() => setIsFlipped(prev => !prev)}
                      onOpenShare={handleShare}
                      isOwner={false}
                      cardUrl={getCardShareUrl(activeCard)}
                      onShowToast={showToast}
                    />
                  </Suspense>
                </LazyErrorBoundary>
              </div>

              {/* Subtle Viral Footnote */}
              <div className="mt-8 mb-2 text-center">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCreateMyOwnCard();
                  }}
                  className="inline-flex items-center gap-2 text-xs text-zinc-200 hover:text-white transition-all tracking-wide py-2.5 px-5 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/[0.04] active:scale-95 group cursor-pointer shadow-lg"
                >
                  <span>나만의 럭셔리 디지털 명함 만들기</span>
                  <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 font-sans">↗</span>
                </a>
              </div>
            </div>
          ) : activeTab === 'my-card' ? (
            /* ================= VIEW 1: LUXURY CARD SHOWCASE & CAROUSEL ================= */
            <div className="w-full flex flex-col items-center">
              {cards.length === 0 && !isSamplePreview ? (
                /* FIRST-TIME VISITOR LUXURY ONBOARDING STATE */
                <WelcomeCard
                  onCreateFirstCard={handleOpenCreateModal}
                  onExploreSample={() => {
                    setIsSamplePreview(true);
                    setActiveCardId(SAMPLE_CARDS[0].id);
                  }}
                />
              ) : isSamplePreview && cards.length === 0 && activeCard ? (
                /* TEMPORARY SHOWCASE SAMPLE PREVIEW MODE */
                <div className="w-full flex flex-col items-center space-y-2 sm:space-y-4">
                  {/* Luxury Minimalist Showcase Top Bar */}
                  <div className="w-full max-w-[540px] px-1 py-0.5 flex items-center justify-between text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-normal">
                      <span className="text-white text-[8px] leading-none" aria-hidden="true">●</span>
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
                        onClick={() => setIsSamplePreview(false)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer active:scale-90 flex items-center justify-center"
                        title="시작 화면으로"
                        aria-label="시작 화면으로"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Card Canvas */}
                  <div className="w-full max-w-[540px] flex justify-center">
                    <LazyErrorBoundary resetKey={activeCard.id}>
                      <Suspense
                        fallback={
                          <div
                            className="w-full aspect-[9/5] rounded-2xl bg-[#121214] border border-white/10"
                            aria-hidden="true"
                          />
                        }
                      >
                        <CardContainer 
                          data={activeCard.data} 
                          theme={activeCard.theme} 
                          layout_type={activeCard.layout_type}
                          card_features={activeCard.card_features}
                          isPhotoCard={activeCard.isPhotoCard}
                          photoUrl={activeCard.scannedImage}
                          backPhotoUrl={activeCard.scannedImageBack}
                          isFlipped={isFlipped}
                          onFlip={() => setIsFlipped(prev => !prev)}
                          onOpenShare={modals.openShare}
                          onOpenEdit={handleOpenCreateModal}
                        />
                      </Suspense>
                    </LazyErrorBoundary>
                  </div>
                </div>
              ) : !activeCard ? (
                <WelcomeCard
                  onCreateFirstCard={handleOpenCreateModal}
                  onExploreSample={() => {
                    setIsSamplePreview(true);
                    setActiveCardId(SAMPLE_CARDS[0].id);
                  }}
                />
              ) : !activeCard.isMyCard ? (
                /* Context Bar only if viewing someone else's card from vault */
                <div className="w-full flex flex-col items-center space-y-2 sm:space-y-4">
                  <div className="flex items-center justify-between w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] text-xs">
                    <button
                      onClick={() => setActiveTab('vault')}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer py-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>보관함 목록으로</span>
                    </button>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#121318] border border-white/5 text-zinc-400 font-mono">
                      보관 명함 ({activeCard.category})
                    </span>
                  </div>

                  <div className="w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] flex justify-center">
                    <LazyErrorBoundary resetKey={activeCard.id}>
                      <Suspense
                        fallback={
                          <div
                            className="w-full aspect-[9/5] rounded-2xl bg-[#121214] border border-white/10"
                            aria-hidden="true"
                          />
                        }
                      >
                        <CardContainer 
                          data={activeCard.data} 
                          theme={activeCard.theme} 
                          layout_type={activeCard.layout_type}
                          card_features={activeCard.card_features}
                          isPhotoCard={activeCard.isPhotoCard || activeCard.creation_mode === 'photo'}
                          photoUrl={activeCard.scannedImage || activeCard.front_image_url}
                          backPhotoUrl={activeCard.scannedImageBack || activeCard.back_image_url}
                          html_front={activeCard.html_front}
                          html_back={activeCard.html_back}
                          isFlipped={isFlipped}
                          onFlip={() => setIsFlipped(prev => !prev)}
                          onOpenShare={modals.openShare}
                          onOpenEdit={() => {
                            requireUnlock(() => {
                              modals.openEditor(activeCard, false);
                            });
                          }}
                        />
                      </Suspense>
                    </LazyErrorBoundary>
                  </div>
                </div>
              ) : (
                /* Apple Wallet-Style Luxury Horizontal Card Carousel Deck with Ghost Add Card Slot */
                <LazyErrorBoundary resetKey={activeCard.id}>
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
                      activeCardId={activeCard.id}
                      onSelectCard={handleSelectMyCard}
                      onCreateNewCard={handleOpenCreateModal}
                      onOpenEdit={(cardToEdit) => {
                        requireUnlock(() => {
                          modals.openEditor(cardToEdit, false);
                        });
                      }}
                      onOpenShare={(cardToShare) => {
                        setActiveCardId(cardToShare.id);
                        modals.openShare();
                      }}
                      mode="carousel"
                    />
                  </Suspense>
                </LazyErrorBoundary>
              )}
            </div>
          ) : (
            /* ================= VIEW 2: THE VAULT (CARD / LIST) ================= */
            <LazyErrorBoundary resetKey={activeTab}>
              <Suspense fallback={<div className="w-full max-w-6xl min-h-[320px]" aria-hidden="true" />}>
                <VaultView
                  cards={cards}
                  isLocked={isPinConfigured && isLocked}
                  onUnlockRequest={() => {
                    lockApp();
                  }}
                  onSelectCard={(selected) => {
                    setActiveCardId(selected.id);
                    setActiveTab('my-card');
                  }}
                  onEditCard={(cardToEdit) => {
                    requireUnlock(() => {
                      modals.openEditor(cardToEdit, false);
                    });
                  }}
                  onDeleteCard={(id) => {
                    requireUnlock(() => {
                      handleDeleteCard(id);
                    });
                  }}
                  onExportCard={(cardToExport) => {
                    setActiveCardId(cardToExport.id);
                    modals.openExport();
                  }}
                  onOpenScan={() => {
                    requireUnlock(() => {
                      modals.openScan();
                    });
                  }}
                  onOpenSync={modals.openSync}
                  onOpenEditor={() => {
                    requireUnlock(() => {
                      if (activeCard) {
                        modals.openEditor(activeCard, false);
                      } else {
                        handleOpenCreateModal();
                      }
                    });
                  }}
                />
              </Suspense>
            </LazyErrorBoundary>
          )}

        </main>

        {/* Footer */}
        {isOwner ? (
          <footer className="border-t border-white/10 py-2.5 sm:py-6 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] px-4 font-sans text-xs">
            <div className="max-w-xl mx-auto flex flex-col items-center justify-center text-center">
              {/* Luxury Legal Action Buttons (Icon-Only with Tooltips) */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1.5 sm:mb-3">
                <button
                  type="button"
                  onClick={() => modals.openLegal('privacy')}
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-white/30 flex items-center justify-center text-zinc-300 hover:text-white transition-all duration-200 cursor-pointer shadow-sm active:scale-95 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                  title="개인정보처리방침"
                  aria-label="개인정보처리방침"
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:scale-110 transition-transform duration-200" />
                </button>

                <button
                  type="button"
                  onClick={() => modals.openLegal('terms')}
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-white/30 flex items-center justify-center text-zinc-300 hover:text-white transition-all duration-200 cursor-pointer shadow-sm active:scale-95 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                  title="서비스 이용약관"
                  aria-label="서비스 이용약관"
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:scale-110 transition-transform duration-200" />
                </button>

                <button
                  type="button"
                  onClick={modals.openReset}
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-white/30 flex items-center justify-center text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer shadow-sm active:scale-95 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                  title="로컬 데이터 초기화"
                  aria-label="로컬 데이터 초기화"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 group-hover:text-white group-hover:rotate-[-45deg] transition-all duration-200" />
                </button>
              </div>

              {/* Centered Brand Copyright */}
              <p className="text-[10px] sm:text-[11px] text-zinc-400 text-center tracking-wide font-sans">
                © {new Date().getFullYear()} GOGUMA CARD STUDIO
              </p>
            </div>
          </footer>
        ) : (
          <footer className="border-t border-white/10 py-2.5 sm:py-6 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] px-4 font-sans text-xs">
            <div className="max-w-xl mx-auto flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1.5 sm:mb-3">
                <button
                  type="button"
                  onClick={() => modals.openLegal('privacy')}
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-white/30 flex items-center justify-center text-zinc-300 hover:text-white transition-all duration-200 cursor-pointer shadow-sm active:scale-95 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                  title="개인정보처리방침"
                  aria-label="개인정보처리방침"
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:scale-110 transition-transform duration-200" />
                </button>

                <button
                  type="button"
                  onClick={() => modals.openLegal('terms')}
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-white/30 flex items-center justify-center text-zinc-300 hover:text-white transition-all duration-200 cursor-pointer shadow-sm active:scale-95 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                  title="서비스 이용약관"
                  aria-label="서비스 이용약관"
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:scale-110 transition-transform duration-200" />
                </button>
              </div>

              <p className="text-[10px] sm:text-[11px] text-zinc-400 text-center tracking-wide font-sans">
                © {new Date().getFullYear()} GOGUMA CARD STUDIO
              </p>
            </div>
          </footer>
        )}

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

        {/* Declarative Centralized Modals Container (Per-modal lazy-loaded on demand) */}
        {((isLocked && isPinConfigured) ||
          modals.isShareOpen ||
          modals.isQrOpen ||
          modals.isPrintOpen ||
          modals.isExportOpen ||
          modals.isScanOpen ||
          modals.isEditorOpen ||
          modals.isSyncOpen ||
          modals.isPinConfigOpen ||
          modals.isBiometricsOpen ||
          modals.isLazyPinOpen ||
          modals.isLegalOpen ||
          modals.isResetOpen) && (
          <AppModals
            modals={modals}
            activeCard={activeCard}
            isOwner={isOwner}
            printConfig={printConfig}
            setPrintConfig={setPrintConfig}
            onSaveCard={handleSaveCard}
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

      </div>

      {/* PRINT-ONLY VECTOR CONTAINER (Triggered on window.print()) */}
      {activeCard && (
        <LazyErrorBoundary variant="silent" resetKey={activeCard.id}>
          <Suspense fallback={null}>
            <PrintSheet data={activeCard.data} config={printConfig} />
          </Suspense>
        </LazyErrorBoundary>
      )}
    </>
  );
}
