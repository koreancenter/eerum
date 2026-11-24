import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CardTheme, StoredCard } from '../types/card';
import {
  loadUserCards,
  saveUserCards,
  normalizeStoredCards,
  clearAllLocalData,
  clearMemoryDecryptedCards,
} from '../utils/initialCards';
import { generateOwnerKey } from '../utils/ownerKey';
import { isLazyPinPromptEligible } from '../utils/pinLock';
import { APP_BASE_DOMAIN, sanitizeCardForVault } from '@/utils/cardSerializer';
import { loadVaultCategories } from '../utils/categories';
import {
  type VaultBackupPayloadV1,
  type BackupRestoreMode,
  type BackupMergeOptions,
  applyBackupRestore,
  saveLocalRecoverySnapshot,
  recordBackupCompleted,
} from '../utils/vaultBackup';
import {
  isLocalFolderBackupSupported,
  getConnectedDirectoryInfo,
  writeAutoBackupToDirectory,
} from '../utils/localFolderBackup';
import { getActiveSessionPin } from '../utils/vaultSession';
import { useAutoLock } from './useAutoLock';
import type { ModalManager } from './useModalState';
import {
  ACCOUNT_CHANGED_EVENT,
  type CreateLocalAccountParams,
  type LocalAccountActionResult,
  type LocalAccountMeta,
  createLocalAccount,
  deleteLocalAccount,
  getActiveAccountId,
  listLocalAccounts,
  loginLocalAccount,
  loginLocalAccountWithBiometrics,
  logoutLocalAccount,
  syncLocalAccountSecurity,
} from '../utils/localAccount';
import {
  CARD_THEME_MAP_UPDATED_EVENT,
  applyCardThemeMapSnapshot,
  getMostRecentCardTheme,
  removeCardThemePreference,
  resolveCardsWithStoredThemes,
  saveCardThemePreference,
  syncCardThemeMapFromCards,
} from '../utils/cardThemeStorage';

export type ActiveTab = 'my-card' | 'vault';

export interface UseCardVaultOptions {
  modals: ModalManager;
  showToast: (msg: string) => void;
  activeTab: ActiveTab;
  setActiveTab: React.Dispatch<React.SetStateAction<ActiveTab>>;
  setIsSamplePreview: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  setShowWelcomeIntro: React.Dispatch<React.SetStateAction<boolean>>;
  onCleanPublicRoute: () => void;
  preferredNewCardTheme?: CardTheme;
}

export function useCardVault({
  modals,
  showToast,
  activeTab,
  setActiveTab,
  setIsSamplePreview,
  setIsFlipped,
  setShowWelcomeIntro,
  onCleanPublicRoute,
  preferredNewCardTheme,
}: UseCardVaultOptions) {
  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => getActiveAccountId());
  const [accountsList, setAccountsList] = useState<LocalAccountMeta[]>(() => listLocalAccounts());

  const activeAccount = useMemo(
    () => accountsList.find((acct) => acct.id === activeAccountId) || null,
    [accountsList, activeAccountId]
  );

  const refreshAccountsList = useCallback(() => {
    setAccountsList(listLocalAccounts());
    setActiveAccountId(getActiveAccountId());
  }, []);

  useEffect(() => {
    const handleAccountChanged = () => {
      setActiveAccountId(getActiveAccountId());
      setAccountsList(listLocalAccounts());
    };
    window.addEventListener(ACCOUNT_CHANGED_EVENT, handleAccountChanged);
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, handleAccountChanged);
  }, []);

  const [cards, setCards] = useState<StoredCard[]>(() =>
    activeAccountId ? loadUserCards(activeAccountId) : []
  );

  // Strictly isolated selection states:
  // 1) selectedMyCardId: exclusively references personal cards (`isMyCard === true`)
  const [selectedMyCardId, setSelectedMyCardId] = useState<string>(() => {
    if (!activeAccountId) return '';
    const loadedMyCards = loadUserCards(activeAccountId).filter((c) => c.isMyCard);
    const defaultCard = loadedMyCards.find((c) => c.isDefault) || loadedMyCards[0];
    return defaultCard?.id || '';
  });
  // 2) selectedVaultCardId: exclusively references third-party Vault cards (`isMyCard === false`) when viewing Vault detail
  const [selectedVaultCardId, setSelectedVaultCardId] = useState<string | null>(null);
  // 3) modalTargetCardId: transient target for Share / QR / Print / Export modals so selectedMyCardId is never mutated
  const [modalTargetCardId, setModalTargetCardId] = useState<string | null>(null);
  // 4) cardPendingDelete: transient target awaiting user confirmation in DeleteConfirmModal
  const [cardPendingDelete, setCardPendingDelete] = useState<StoredCard | null>(null);

  // Local-First 4-Digit PIN App Lock with Auto-Lock (Manual, Visibility, Idle 5m)
  const {
    isLocked,
    lockApp: rawLockApp,
    unlockApp,
    isPinConfigured,
    refreshPinStatus: rawRefreshPinStatus,
  } = useAutoLock(activeAccountId);

  const refreshPinStatus = useCallback(() => {
    rawRefreshPinStatus(activeAccountId);
    if (activeAccountId) {
      syncLocalAccountSecurity(activeAccountId);
      setAccountsList(listLocalAccounts());
    }
  }, [rawRefreshPinStatus, activeAccountId]);

  const autoBackupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearScheduledAutoBackup = useCallback(() => {
    if (autoBackupTimerRef.current !== null) {
      clearTimeout(autoBackupTimerRef.current);
      autoBackupTimerRef.current = null;
    }
  }, []);

  const lockApp = useCallback(() => {
    clearScheduledAutoBackup();
    clearMemoryDecryptedCards();
    setCards([]);
    setSelectedMyCardId('');
    setModalTargetCardId(null);
    modals.closeAll();
    rawLockApp();
  }, [clearScheduledAutoBackup, rawLockApp, modals.closeAll]);

  // Ensure any lock transition (manual, visibilitychange, or 5m idle) wipes plaintext cards from memory
  useEffect(() => {
    if (isPinConfigured && isLocked) {
      clearScheduledAutoBackup();
      clearMemoryDecryptedCards();
      setCards((prev) => (prev.length > 0 ? [] : prev));
      setSelectedMyCardId('');
      setModalTargetCardId(null);
      modals.closeAll();
    }
  }, [isPinConfigured, isLocked, clearScheduledAutoBackup, modals.closeAll]);

  const requireUnlock = useCallback(
    (action: () => void) => {
      if (!activeAccountId) {
        modals.openCreateAccount();
        return;
      }
      if (isPinConfigured && isLocked) {
        lockApp();
      } else {
        action();
      }
    },
    [activeAccountId, isPinConfigured, isLocked, lockApp, modals.openCreateAccount]
  );

  // Optional Biometric Unlock handler with automatic cryptographic vault rehydration
  const handleBiometricUnlock = useCallback(async () => {
    if (!activeAccountId) return;
    const { verifyBiometric } = await import('../utils/biometrics');
    const res = await verifyBiometric(activeAccountId);
    if (res.success) {
      unlockApp(activeAccountId);
      setCards(loadUserCards(activeAccountId));
      showToast('생체 인증(Biometrics)으로 잠금이 해제되었습니다.');
    } else if (res.error && !res.error.includes('취소')) {
      showToast(res.error);
    }
  }, [activeAccountId, unlockApp, showToast]);

  const hydrateSignedInAccount = useCallback(
    (account: LocalAccountMeta, hydratedCards: StoredCard[]) => {
      clearScheduledAutoBackup();
      setActiveAccountId(account.id);
      setAccountsList(listLocalAccounts());
      setCards(hydratedCards);
      const myList = hydratedCards.filter((c) => c.isMyCard);
      const nextDefault = myList.find((c) => c.isDefault) || myList[0];
      setSelectedMyCardId(nextDefault?.id || '');
      setSelectedVaultCardId(null);
      setModalTargetCardId(null);
      setCardPendingDelete(null);
      setIsSamplePreview(false);
      setIsFlipped(false);
      setShowWelcomeIntro(false);
      setActiveTab('my-card');
      rawRefreshPinStatus(account.id);
      unlockApp(account.id);
    },
    [
      clearScheduledAutoBackup,
      setIsSamplePreview,
      setIsFlipped,
      setShowWelcomeIntro,
      setActiveTab,
      rawRefreshPinStatus,
      unlockApp,
    ]
  );

  const handleCreateLocalAccount = useCallback(
    async (params: CreateLocalAccountParams): Promise<LocalAccountActionResult> => {
      const res = await createLocalAccount(params);
      if (res.ok && res.account) {
        hydrateSignedInAccount(res.account, res.cards || []);
        modals.closeCreateAccount();
        showToast(
          res.biometricError
            ? `'${res.account.displayName}' 계정이 생성되었습니다. (${res.biometricError})`
            : `'${res.account.displayName}' 로컬 계정이 준비되었습니다.`
        );
      }
      return res;
    },
    [hydrateSignedInAccount, modals.closeCreateAccount, showToast]
  );

  const handleLoginAccount = useCallback(
    async (accountId: string, pin?: string): Promise<LocalAccountActionResult> => {
      const res = await loginLocalAccount(accountId, pin);
      if (res.ok && res.account) {
        hydrateSignedInAccount(res.account, res.cards || []);
        modals.closeAll();
        showToast(`'${res.account.displayName}' 보관함으로 로그인했습니다.`);
      }
      return res;
    },
    [hydrateSignedInAccount, modals.closeAll, showToast]
  );

  const handleBiometricLoginAccount = useCallback(
    async (accountId: string): Promise<LocalAccountActionResult> => {
      const res = await loginLocalAccountWithBiometrics(accountId);
      if (res.ok && res.account) {
        hydrateSignedInAccount(res.account, res.cards || []);
        modals.closeAll();
        showToast(`생체 인증으로 '${res.account.displayName}' 보관함을 열었습니다.`);
      }
      return res;
    },
    [hydrateSignedInAccount, modals.closeAll, showToast]
  );

  const handleLogoutAccount = useCallback(() => {
    clearScheduledAutoBackup();
    logoutLocalAccount();
    setActiveAccountId(null);
    setAccountsList(listLocalAccounts());
    setCards([]);
    setSelectedMyCardId('');
    setSelectedVaultCardId(null);
    setModalTargetCardId(null);
    setCardPendingDelete(null);
    modals.closeAll();
    setIsSamplePreview(false);
    setIsFlipped(false);
    setActiveTab('my-card');
    setShowWelcomeIntro(true);
    rawRefreshPinStatus(null);
    showToast('로컬 계정에서 안전하게 로그아웃되었습니다.');
  }, [
    clearScheduledAutoBackup,
    modals.closeAll,
    setIsSamplePreview,
    setIsFlipped,
    setActiveTab,
    setShowWelcomeIntro,
    rawRefreshPinStatus,
    showToast,
  ]);

  const handleDeleteLocalAccount = useCallback(
    (accountId: string) => {
      const target = accountsList.find((acct) => acct.id === accountId);
      const wasActive = accountId === activeAccountId;
      deleteLocalAccount(accountId);
      const nextAccounts = listLocalAccounts();
      setAccountsList(nextAccounts);

      if (wasActive) {
        clearScheduledAutoBackup();
        setActiveAccountId(null);
        setCards([]);
        setSelectedMyCardId('');
        setSelectedVaultCardId(null);
        setModalTargetCardId(null);
        setCardPendingDelete(null);
        modals.closeAll();
        setIsSamplePreview(false);
        setIsFlipped(false);
        setActiveTab('my-card');
        setShowWelcomeIntro(true);
        rawRefreshPinStatus(null);
      }

      showToast(
        target ? `'${target.displayName}' 로컬 계정이 삭제되었습니다.` : '로컬 계정이 삭제되었습니다.'
      );
    },
    [
      accountsList,
      activeAccountId,
      clearScheduledAutoBackup,
      modals.closeAll,
      setIsSamplePreview,
      setIsFlipped,
      setActiveTab,
      setShowWelcomeIntro,
      rawRefreshPinStatus,
      showToast,
    ]
  );

  // Strictly isolated personal cards collection (`isMyCard === true`)
  const myCards = useMemo(() => cards.filter((c) => c.isMyCard), [cards]);
  // Strictly isolated third-party Vault cards collection (`isMyCard === false`)
  const vaultCards = useMemo(() => cards.filter((c) => !c.isMyCard), [cards]);

  // Resolved Vault detail card strictly restricted to third-party cards (`!c.isMyCard`)
  const selectedVaultCard: StoredCard | undefined = useMemo(
    () =>
      selectedVaultCardId
        ? cards.find((c) => c.id === selectedVaultCardId && !c.isMyCard)
        : undefined,
    [cards, selectedVaultCardId]
  );

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

  // Clear stale selectedVaultCardId if the target Vault card was deleted while unlocked
  useEffect(() => {
    if (selectedVaultCardId && !(isPinConfigured && isLocked) && !selectedVaultCard) {
      setSelectedVaultCardId(null);
    }
  }, [selectedVaultCardId, isPinConfigured, isLocked, selectedVaultCard]);

  // Clear temporary modal target card once Share/QR/QuickQR/NFC/EmailSignature/Print/Export modals close
  useEffect(() => {
    if (
      modalTargetCardId &&
      !modals.isShareOpen &&
      !modals.isQrOpen &&
      !modals.isQuickQrOpen &&
      !modals.isNfcOpen &&
      !modals.isEmailSignatureOpen &&
      !modals.isPrintOpen &&
      !modals.isExportOpen
    ) {
      setModalTargetCardId(null);
    }
  }, [
    modalTargetCardId,
    modals.isShareOpen,
    modals.isQrOpen,
    modals.isQuickQrOpen,
    modals.isNfcOpen,
    modals.isEmailSignatureOpen,
    modals.isPrintOpen,
    modals.isExportOpen,
  ]);

  const saveStoredCards = useCallback(
    (cardsToSave: StoredCard[]) => {
      if (!activeAccountId) return;
      saveUserCards(cardsToSave, activeAccountId);

      clearScheduledAutoBackup();
      if (
        !isLocalFolderBackupSupported() ||
        (isPinConfigured && isLocked) ||
        !cardsToSave ||
        cardsToSave.length === 0
      ) {
        return;
      }

      const snapshotCards = cardsToSave;
      const targetAccountId = activeAccountId;
      autoBackupTimerRef.current = setTimeout(() => {
        autoBackupTimerRef.current = null;
        void (async () => {
          try {
            const info = await getConnectedDirectoryInfo(targetAccountId);
            if (!info || !info.hasPermission) return;
            const categories = loadVaultCategories(snapshotCards, targetAccountId);
            const wrote = await writeAutoBackupToDirectory(snapshotCards, categories, targetAccountId);
            if (wrote) {
              recordBackupCompleted(Date.now(), targetAccountId);
            }
          } catch {
            // Silent best-effort auto-backup
          }
        })();
      }, 3000);
    },
    [activeAccountId, clearScheduledAutoBackup, isPinConfigured, isLocked]
  );

  useEffect(() => {
    return () => clearScheduledAutoBackup();
  }, [clearScheduledAutoBackup]);

  // Persist cards to localStorage ONLY when an account is signed in and unlocked
  useEffect(() => {
    if (!activeAccountId) return;
    if (isPinConfigured && isLocked) return;
    saveStoredCards(cards);
  }, [activeAccountId, cards, isPinConfigured, isLocked, saveStoredCards]);

  // Keep in-memory cards synced whenever per-card theme mapping in localStorage updates
  useEffect(() => {
    const handleThemeMapSync = () => {
      if (!activeAccountId || (isPinConfigured && isLocked)) return;
      setCards((prev) => resolveCardsWithStoredThemes(prev, activeAccountId));
    };
    window.addEventListener(CARD_THEME_MAP_UPDATED_EVENT, handleThemeMapSync);
    return () => window.removeEventListener(CARD_THEME_MAP_UPDATED_EVENT, handleThemeMapSync);
  }, [activeAccountId, isPinConfigured, isLocked]);

  // Automatic background sync of wallet to Cloudflare edge (skipped while logged out or locked)
  useEffect(() => {
    if (!activeAccountId) return;
    if (isPinConfigured && isLocked) return;
    if (!cards || cards.length === 0) return;
    const targetAccountId = activeAccountId;
    const timer = setTimeout(() => {
      import('../utils/syncWallet').then(({ pushWalletToEdge }) =>
        pushWalletToEdge(cards, targetAccountId)
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [activeAccountId, cards, isPinConfigured, isLocked]);

  const maybeScheduleLazyPinPrompt = useCallback(
    (isFirstEverCard: boolean) => {
      if (isLazyPinPromptEligible(isFirstEverCard, isPinConfigured)) {
        setTimeout(() => {
          modals.openLazyPin();
        }, 450);
      }
    },
    [isPinConfigured, modals.openLazyPin]
  );

  // Personal My Card Switcher (never mutates URL into a public slug route)
  const handleSelectMyCard = useCallback(
    (id: string) => {
      const matchedMy = myCards.find((c) => c.id === id);
      if (!matchedMy) return;
      setSelectedMyCardId(matchedMy.id);
      setIsFlipped(false);
    },
    [myCards, setIsFlipped]
  );

  // Create New Personal My Card (`isMyCard: true`)
  const handleOpenCreateModal = useCallback(() => {
    if (!activeAccountId) {
      modals.openCreateAccount();
      return;
    }
    setShowWelcomeIntro(false);
    setIsSamplePreview(false);
    requireUnlock(() => {
      const defaultSlug = `card-${String(Date.now()).slice(-4)}`;
      const initialOwnerKey = generateOwnerKey();
      const activeMyCard =
        myCards.find((c) => c.id === selectedMyCardId) ||
        myCards.find((c) => c.isDefault) ||
        myCards[0];
      const recentThemePref = getMostRecentCardTheme();
      const resolvedNewTheme: CardTheme =
        preferredNewCardTheme || recentThemePref?.theme || activeMyCard?.theme || 'pure_white';
      const resolvedNewCustomBgColor = preferredNewCardTheme
        ? ''
        : recentThemePref?.customBgColor ?? '';
      const newCardTemplate: StoredCard = {
        id: `my-card-${Date.now()}`,
        isMyCard: true,
        isDefault: myCards.length === 0,
        slug: defaultSlug,
        ownerKey: initialOwnerKey,
        owner_key: initialOwnerKey,
        theme: resolvedNewTheme,
        layout_type: 'editorial_minimal',
        card_features: {
          show_en_name: true,
          show_sub_org: true,
          show_address: true,
          monogram_text: '',
          ...(resolvedNewCustomBgColor ? { custom_bg_color: resolvedNewCustomBgColor } : {}),
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
  }, [
    activeAccountId,
    modals.openCreateAccount,
    setShowWelcomeIntro,
    setIsSamplePreview,
    requireUnlock,
    myCards,
    selectedMyCardId,
    preferredNewCardTheme,
    modals.openEditor,
  ]);

  // Create New Third-Party Vault Card via Full Editor (`isMyCard: false` — never overwrites My Card)
  const handleOpenCreateVaultCardModal = useCallback(() => {
    requireUnlock(() => {
      const recentThemePref = getMostRecentCardTheme();
      const newVaultTemplate: StoredCard = {
        id: `vault-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        isMyCard: false,
        isDefault: false,
        theme: recentThemePref?.theme || 'pure_white',
        layout_type: 'editorial_minimal',
        card_features: {
          show_en_name: true,
          show_sub_org: true,
          show_address: true,
          monogram_text: '',
          ...(recentThemePref?.customBgColor
            ? { custom_bg_color: recentThemePref.customBgColor }
            : {}),
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
  }, [requireUnlock, modals.openEditor]);

  // Bulk import contacts into the Vault
  const handleImportCards = useCallback(
    (newCards: StoredCard[]) => {
      requireUnlock(() => {
        const safeImported = normalizeStoredCards(newCards.map((nc) => sanitizeCardForVault(nc)));
        syncCardThemeMapFromCards(safeImported, { overwriteExisting: false });
        setCards((prev) => [...safeImported, ...prev]);
        showToast(`${newCards.length}개의 연락처가 보관함에 등록되었습니다.`);
      });
    },
    [requireUnlock, showToast]
  );

  // Register an externally shared card (/card/:slug) directly into the internal Vault and show VaultDetailView
  const handleRegisterSharedCardToVault = useCallback(
    (sourceCard: StoredCard) => {
      if (!activeAccountId) {
        showToast('명함을 보관하려면 먼저 로컬 계정을 만들거나 로그인해 주세요.');
        modals.openCreateAccount();
        return;
      }
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
          interactionCount: existingVaultCopy?.interactionCount ?? sourceCard.interactionCount,
          lastInteractedAt: existingVaultCopy?.lastInteractedAt ?? new Date().toISOString(),
        });

        saveCardThemePreference(
          sanitized.id,
          sanitized.theme,
          sanitized.card_features?.custom_bg_color
        );

        const isFirstEverCard = cards.length === 0;

        setCards((prev) => {
          const existsInVault = prev.some((c) => !c.isMyCard && c.id === sanitized.id);
          if (existsInVault) {
            return prev.map((c) => (!c.isMyCard && c.id === sanitized.id ? sanitized : c));
          }
          return [sanitized, ...prev];
        });

        onCleanPublicRoute();
        setIsSamplePreview(false);
        setIsFlipped(false);
        setActiveTab('vault');
        setSelectedVaultCardId(sanitized.id);
        showToast(`'${sanitized.data.name}' 명함이 보관함에 등록되었습니다.`);

        maybeScheduleLazyPinPrompt(isFirstEverCard);
      });
    },
    [
      activeAccountId,
      modals.openCreateAccount,
      requireUnlock,
      cards,
      onCleanPublicRoute,
      setIsSamplePreview,
      setIsFlipped,
      setActiveTab,
      showToast,
      maybeScheduleLazyPinPrompt,
    ]
  );

  const handleSaveCard = useCallback(
    (savedCard: StoredCard) => {
      if (!activeAccountId) {
        modals.openCreateAccount();
        return;
      }
      const isFirstEverCard = cards.length === 0;

      if (savedCard.isMyCard) {
        const hadNoMyCards = myCards.length === 0;
        const shouldBeDefault = Boolean(savedCard.isDefault) || hadNoMyCards;
        const ensuredOwnerKey =
          savedCard.ownerKey || savedCard.owner_key || generateOwnerKey();
        const normalizedMyCard: StoredCard = {
          ...savedCard,
          id: savedCard.id || `my-card-${Date.now()}`,
          isMyCard: true,
          isDefault: shouldBeDefault,
          ownerKey: ensuredOwnerKey,
          owner_key: ensuredOwnerKey,
        };

        saveCardThemePreference(
          normalizedMyCard.id,
          normalizedMyCard.theme,
          normalizedMyCard.card_features?.custom_bg_color
        );

        setCards((prev) => {
          let nextCards = [...prev];
          if (shouldBeDefault) {
            nextCards = nextCards.map((c) =>
              c.isMyCard ? { ...c, isDefault: false } : c
            );
          }
          const exists = nextCards.some((c) => c.isMyCard && c.id === normalizedMyCard.id);
          const updatedList = exists
            ? nextCards.map((c) =>
                c.isMyCard && c.id === normalizedMyCard.id ? normalizedMyCard : c
              )
            : [normalizedMyCard, ...nextCards];
          return normalizeStoredCards(updatedList);
        });

        setSelectedMyCardId(normalizedMyCard.id);
        setIsSamplePreview(false);
        onCleanPublicRoute();

        if (activeTab !== 'vault') {
          setSelectedVaultCardId(null);
          setActiveTab('my-card');
        }

        showToast(
          modals.isCreatingCard
            ? '새로운 내 명함이 생성되었습니다.'
            : '내 명함 정보가 수정되었습니다.'
        );

        if (normalizedMyCard.slug) {
          import('../utils/syncWallet')
            .then(({ publishPublicCardToEdge }) => publishPublicCardToEdge(normalizedMyCard))
            .then((result) => {
              if (result.forbidden) {
                showToast('이미 사용 중인 슬러그이거나 수정 권한이 없습니다. 다른 슬러그를 사용해 주세요.');
                return;
              }
              if (result.ok && result.ownerKey && result.ownerKey !== ensuredOwnerKey) {
                setCards((prev) =>
                  prev.map((c) =>
                    c.isMyCard && c.id === normalizedMyCard.id
                      ? { ...c, ownerKey: result.ownerKey, owner_key: result.ownerKey }
                      : c
                  )
                );
              }
            })
            .catch(() => {
              // Quiet local-first fallback
            });
        }
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

        const nowIso = new Date().toISOString();
        const resolvedMemo = (savedCard.memo ?? savedCard.notes ?? '').trim();
        const sanitizedVaultCard = sanitizeCardForVault(savedCard, {
          id: safeVaultId,
          category: savedCard.category,
          notes: resolvedMemo || undefined,
          memo: resolvedMemo || undefined,
          metAt: savedCard.metAt?.trim() || undefined,
          metLocation: savedCard.metLocation?.trim() || undefined,
          interactionCount:
            existingVaultEntry?.interactionCount ?? savedCard.interactionCount,
          lastInteractedAt:
            existingVaultEntry?.lastInteractedAt ?? savedCard.lastInteractedAt ?? nowIso,
          createdAt: existingVaultEntry?.createdAt || savedCard.createdAt,
          created_at: existingVaultEntry?.created_at || savedCard.created_at || nowIso,
          updatedAt: nowIso,
        });

        saveCardThemePreference(
          sanitizedVaultCard.id,
          sanitizedVaultCard.theme,
          sanitizedVaultCard.card_features?.custom_bg_color
        );

        // 2. Update/insert ONLY as a non-MyCard entry; never mutate myCards or selectedMyCardId
        setCards((prev) => {
          const existsInVault = prev.some((c) => !c.isMyCard && c.id === sanitizedVaultCard.id);
          return existsInVault
            ? prev.map((c) =>
                !c.isMyCard && c.id === sanitizedVaultCard.id ? sanitizedVaultCard : c
              )
            : [sanitizedVaultCard, ...prev];
        });

        onCleanPublicRoute();
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

      maybeScheduleLazyPinPrompt(isFirstEverCard);
    },
    [
      cards,
      myCards.length,
      activeTab,
      modals.isCreatingCard,
      setIsSamplePreview,
      onCleanPublicRoute,
      setActiveTab,
      setIsFlipped,
      showToast,
      maybeScheduleLazyPinPrompt,
    ]
  );

  const handleConfirmReset = useCallback(() => {
    clearScheduledAutoBackup();
    clearAllLocalData();
    onCleanPublicRoute();
    setActiveAccountId(null);
    setAccountsList([]);
    setCards([]);
    setSelectedMyCardId('');
    setSelectedVaultCardId(null);
    setModalTargetCardId(null);
    setCardPendingDelete(null);
    setIsSamplePreview(false);
    setShowWelcomeIntro(true);
    setActiveTab('my-card');
    rawRefreshPinStatus(null);
    unlockApp(null);
    showToast('모든 로컬 데이터가 안전하게 초기화되었습니다.');
  }, [
    clearScheduledAutoBackup,
    onCleanPublicRoute,
    setIsSamplePreview,
    setShowWelcomeIntro,
    setActiveTab,
    rawRefreshPinStatus,
    unlockApp,
    showToast,
  ]);

  const handleRequestDeleteCard = useCallback(
    (card: StoredCard) => {
      requireUnlock(() => {
        setCardPendingDelete(card);
      });
    },
    [requireUnlock]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      const target = cards.find((c) => c.id === cardId);
      if (!target) return;

      removeCardThemePreference(cardId);

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
        } else if (selectedMyCardId === cardId) {
          const nextCard = remainingMyCards.find((c) => c.isDefault) || remainingMyCards[0];
          setSelectedMyCardId(nextCard?.id || '');
        }
      }

      if (selectedVaultCardId === cardId) {
        setSelectedVaultCardId(null);
      }
      showToast(target.isMyCard ? '내 명함이 삭제되었습니다.' : '명함이 삭제되었습니다.');
    },
    [cards, myCards, selectedMyCardId, selectedVaultCardId, showToast]
  );

  const handleRenameCategory = useCallback(
    (oldName: string, newName: string) => {
      const affectedCount = cards.filter((c) => c.category === oldName).length;
      setCards((prev) =>
        prev.map((c) => (c.category === oldName ? { ...c, category: newName } : c))
      );
      showToast(
        affectedCount > 0
          ? `'${oldName}' 분류가 '${newName}'(으)로 변경되어 명함 ${affectedCount}장에 반영되었습니다.`
          : `'${oldName}' 카테고리가 '${newName}'(으)로 변경되었습니다.`
      );
    },
    [cards, showToast]
  );

  const handleMergeCategories = useCallback(
    (sourceCategory: string, targetCategory: string) => {
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
    },
    [cards, showToast]
  );

  const handleDeleteCategory = useCallback(
    (deletedName: string, fallbackCategory: string) => {
      const movedCount = cards.filter((c) => c.category === deletedName).length;
      setCards((prev) =>
        prev.map((c) => (c.category === deletedName ? { ...c, category: fallbackCategory } : c))
      );
      showToast(
        movedCount > 0
          ? `'${deletedName}' 삭제 후 명함 ${movedCount}장이 '${fallbackCategory}'(으)로 이동되었습니다.`
          : `'${deletedName}' 카테고리가 삭제되었습니다.`
      );
    },
    [cards, showToast]
  );

  const handleRecordCardInteraction = useCallback((cardId: string) => {
    if (!cardId) return;
    const nowIso = new Date().toISOString();
    setCards((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        if (c.id !== cardId) return c;
        changed = true;
        const currentCount =
          typeof c.interactionCount === 'number' && Number.isFinite(c.interactionCount)
            ? Math.max(0, Math.floor(c.interactionCount))
            : 0;
        return {
          ...c,
          interactionCount: currentCount + 1,
          lastInteractedAt: nowIso,
        };
      });
      return changed ? next : prev;
    });
  }, []);

  const handleUpdateCardNotes = useCallback((cardId: string, updatedNotes: string) => {
    const nowIso = new Date().toISOString();
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              notes: updatedNotes,
              memo: updatedNotes,
              updatedAt: nowIso,
              interactionCount:
                (typeof c.interactionCount === 'number' && Number.isFinite(c.interactionCount)
                  ? Math.max(0, Math.floor(c.interactionCount))
                  : 0) + 1,
              lastInteractedAt: nowIso,
            }
          : c
      )
    );
  }, []);

  const handleUpdateVaultContext = useCallback(
    (
      cardId: string,
      context: { metAt?: string; metLocation?: string; memo?: string }
    ) => {
      const nowIso = new Date().toISOString();
      setCards((prev) =>
        prev.map((c) => {
          if (c.id !== cardId || c.isMyCard) return c;
          const nextMemo =
            context.memo !== undefined ? context.memo : (c.memo ?? c.notes ?? '');
          const currentCount =
            typeof c.interactionCount === 'number' && Number.isFinite(c.interactionCount)
              ? Math.max(0, Math.floor(c.interactionCount))
              : 0;
          return {
            ...c,
            metAt: context.metAt !== undefined ? context.metAt : c.metAt,
            metLocation:
              context.metLocation !== undefined ? context.metLocation : c.metLocation,
            memo: nextMemo,
            notes: nextMemo,
            updatedAt: nowIso,
            interactionCount: currentCount + 1,
            lastInteractedAt: nowIso,
          };
        })
      );
    },
    []
  );

  const handleMergeDuplicateCards = useCallback(
    (mergedCard: StoredCard, duplicateCardIds: string[]) => {
      if (isPinConfigured && isLocked) {
        lockApp();
        return;
      }
      const removeSet = new Set(duplicateCardIds);
      const safeMerged: StoredCard = {
        ...mergedCard,
        isMyCard: false,
        isDefault: false,
      };
      setCards((prev) =>
        prev
          .filter((c) => c.isMyCard || !removeSet.has(c.id))
          .map((c) => (!c.isMyCard && c.id === safeMerged.id ? safeMerged : c))
      );
      if (selectedVaultCardId && removeSet.has(selectedVaultCardId)) {
        setSelectedVaultCardId(safeMerged.id);
      }
      showToast(
        `중복 연락처 ${duplicateCardIds.length}건을 '${
          safeMerged.data.name || safeMerged.data.nameKr || '대표 명함'
        }'(으)로 병합했습니다.`
      );
    },
    [isPinConfigured, isLocked, lockApp, selectedVaultCardId, showToast]
  );

  const handleRestoreVaultBackup = useCallback(
    (
      payload: VaultBackupPayloadV1,
      mode: BackupRestoreMode,
      mergeOptions?: BackupMergeOptions
    ) => {
      requireUnlock(() => {
        const existingCategories = loadVaultCategories(cards);

        // Save automatic local safety snapshot before destructive replace restore
        if (mode === 'replace' && cards.length > 0) {
          const activePin = getActiveSessionPin();
          void saveLocalRecoverySnapshot(cards, existingCategories, {
            reason: 'pre_restore',
            label: '전체 교체 전 자동 안전 스냅샷',
            secret: activePin,
            encryptedWithPin: Boolean(isPinConfigured && activePin),
          });
        }

        const result = applyBackupRestore(payload, cards, existingCategories, mode, mergeOptions);

        syncCardThemeMapFromCards(result.cards, {
          clearPrevious: mode === 'replace',
          overwriteExisting: mode === 'replace',
        });

        if (payload.cardThemeMap) {
          applyCardThemeMapSnapshot(payload.cardThemeMap, {
            clearPrevious: mode === 'replace',
            overwriteExisting: mode === 'replace' || Boolean(mergeOptions?.updateNewerDuplicates),
          });
        }

        const resolvedCards = resolveCardsWithStoredThemes(result.cards);

        if (mode === 'replace' && payload.appTheme) {
          try {
            localStorage.setItem('eerum_app_theme', payload.appTheme);
            document.documentElement.classList.toggle('dark', payload.appTheme === 'dark');
          } catch {
            // Ignore theme storage errors
          }
        }

        setCards(resolvedCards);
        saveStoredCards(resolvedCards);

        const restoredMyCards = resolvedCards.filter((c) => c.isMyCard);
        const restoredVaultCards = resolvedCards.filter((c) => !c.isMyCard);

        // Strictly isolate selectedMyCardId to personal cards (`isMyCard: true`)
        if (restoredMyCards.length === 0) {
          setSelectedMyCardId('');
        } else if (
          mode === 'replace' ||
          !restoredMyCards.some((c) => c.id === selectedMyCardId)
        ) {
          const nextDefaultMy =
            restoredMyCards.find((c) => c.isDefault) || restoredMyCards[0];
          setSelectedMyCardId(nextDefaultMy?.id || '');
        }

        // Strictly isolate selectedVaultCardId to Vault cards (`isMyCard: false`)
        if (
          mode === 'replace' ||
          (selectedVaultCardId &&
            !restoredVaultCards.some((c) => c.id === selectedVaultCardId))
        ) {
          setSelectedVaultCardId(null);
        }

        setModalTargetCardId(null);
        setCardPendingDelete(null);
        setIsSamplePreview(false);
        setIsFlipped(false);
        if (restoredMyCards.length > 0) {
          setShowWelcomeIntro(false);
        }

        if (mode === 'replace') {
          showToast(`백업 파일의 명함 ${resolvedCards.length}장으로 보관함이 복원되었습니다.`);
        } else if (result.addedCount === 0 && result.updatedCount === 0 && result.skippedCount > 0) {
          showToast(`모든 명함(${result.skippedCount}장)이 이미 최신 상태로 보관함에 있습니다.`);
        } else if (result.updatedCount > 0) {
          showToast(
            `신규 ${result.addedCount}장 추가, ${result.updatedCount}장 업데이트 완료 (건너뜀 ${result.skippedCount}장).`
          );
        } else if (result.skippedCount > 0) {
          showToast(
            `명함 ${result.addedCount}장이 병합 복원되었습니다 (중복 ${result.skippedCount}장 건너뜀).`
          );
        } else {
          showToast(`명함 ${result.addedCount}장이 보관함에 안전하게 복원되었습니다.`);
        }
      });
    },
    [
      requireUnlock,
      cards,
      isPinConfigured,
      selectedMyCardId,
      selectedVaultCardId,
      saveStoredCards,
      setIsSamplePreview,
      setIsFlipped,
      setShowWelcomeIntro,
      showToast,
    ]
  );

  return {
    activeAccountId,
    activeAccount,
    accountsList,
    refreshAccountsList,
    handleCreateLocalAccount,
    handleLoginAccount,
    handleBiometricLoginAccount,
    handleLogoutAccount,
    handleDeleteLocalAccount,
    cards,
    setCards,
    myCards,
    vaultCards,
    selectedMyCardId,
    setSelectedMyCardId,
    selectedVaultCardId,
    setSelectedVaultCardId,
    selectedVaultCard,
    modalTargetCardId,
    setModalTargetCardId,
    cardPendingDelete,
    setCardPendingDelete,
    isLocked,
    isPinConfigured,
    lockApp,
    unlockApp,
    refreshPinStatus,
    requireUnlock,
    handleBiometricUnlock,
    handleSelectMyCard,
    handleOpenCreateModal,
    handleOpenCreateVaultCardModal,
    handleImportCards,
    handleRegisterSharedCardToVault,
    handleSaveCard,
    handleConfirmReset,
    handleRequestDeleteCard,
    handleDeleteCard,
    handleRenameCategory,
    handleMergeCategories,
    handleDeleteCategory,
    handleUpdateCardNotes,
    handleUpdateVaultContext,
    handleRecordCardInteraction,
    handleMergeDuplicateCards,
    handleRestoreVaultBackup,
  };
}
