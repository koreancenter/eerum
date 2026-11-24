import { useState, useRef, useEffect, useCallback } from 'react';
import { StoredCard } from '../types/card';
import type { PinModalMode } from '../components/PinLockModal';
import type { LegalDocType } from '../components/LegalModal';
import type { BackupModalTab } from '../components/VaultBackupModal';
import type { AboutTab } from '../components/AboutModal';

export interface ModalManager {
  // Modal visibility flags
  isShareOpen: boolean;
  isQrOpen: boolean;
  isQuickQrOpen: boolean;
  isNfcOpen: boolean;
  isEmailSignatureOpen: boolean;
  isPrintOpen: boolean;
  isExportOpen: boolean;
  isScanOpen: boolean;
  isEditorOpen: boolean;
  isCreatingCard: boolean;
  editingCard: StoredCard | null;
  isSyncOpen: boolean;
  p2pReceiveRoomId: string | null;
  isSettingsOpen: boolean;
  isPinConfigOpen: boolean;
  pinModalMode: PinModalMode;
  isBiometricsOpen: boolean;
  isLazyPinOpen: boolean;
  isLegalOpen: boolean;
  legalDocType: LegalDocType;
  isResetOpen: boolean;
  isFromShare: boolean;
  isImportContactsOpen: boolean;
  isBackupOpen: boolean;
  backupInitialTab: BackupModalTab;
  isAboutOpen: boolean;
  aboutInitialTab: AboutTab;
  isCreateAccountOpen: boolean;

  // Settings dropdown ref
  settingsMenuRef: React.RefObject<HTMLDivElement | null>;

  // Modal Open/Close Dispatchers
  openShare: () => void;
  closeShare: () => void;
  openQr: (fromShare?: boolean) => void;
  closeQr: () => void;
  openQuickQr: () => void;
  closeQuickQr: () => void;
  openNfc: () => void;
  closeNfc: () => void;
  openEmailSignature: (fromShare?: boolean) => void;
  closeEmailSignature: () => void;
  openPrint: (fromShare?: boolean) => void;
  closePrint: () => void;
  openExport: (fromShare?: boolean) => void;
  closeExport: () => void;
  openScan: () => void;
  closeScan: () => void;
  openImportContacts: () => void;
  closeImportContacts: () => void;
  openEditor: (card?: StoredCard | null, isCreating?: boolean) => void;
  closeEditor: () => void;
  openSync: () => void;
  closeSync: () => void;
  openP2PReceive: (roomId: string) => void;
  closeP2PReceive: () => void;
  toggleSettings: () => void;
  closeSettings: () => void;
  openPinConfig: (mode?: PinModalMode) => void;
  closePinConfig: () => void;
  openBiometrics: () => void;
  closeBiometrics: () => void;
  openLazyPin: () => void;
  closeLazyPin: () => void;
  openLegal: (docType?: LegalDocType) => void;
  closeLegal: () => void;
  openReset: () => void;
  closeReset: () => void;
  openBackup: (tab?: BackupModalTab) => void;
  closeBackup: () => void;
  openAbout: (tab?: AboutTab) => void;
  closeAbout: () => void;
  openCreateAccount: () => void;
  closeCreateAccount: () => void;
  closeAll: () => void;
}

/**
 * useModalState
 * Lightweight, centralized Modal Manager hook.
 * Supports sub-modal navigation from ShareModal (Print, Export, QR) with automatic return on close.
 */
export function useModalState(): ModalManager {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isQuickQrOpen, setIsQuickQrOpen] = useState(false);
  const [isNfcOpen, setIsNfcOpen] = useState(false);
  const [isEmailSignatureOpen, setIsEmailSignatureOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [editingCard, setEditingCard] = useState<StoredCard | null>(null);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [p2pReceiveRoomId, setP2pReceiveRoomId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPinConfigOpen, setIsPinConfigOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<PinModalMode>('setup');
  const [isBiometricsOpen, setIsBiometricsOpen] = useState(false);
  const [isLazyPinOpen, setIsLazyPinOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalDocType, setLegalDocType] = useState<LegalDocType>('privacy');
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isFromShare, setIsFromShare] = useState(false);
  const [isImportContactsOpen, setIsImportContactsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [backupInitialTab, setBackupInitialTab] = useState<BackupModalTab>('export');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [aboutInitialTab, setAboutInitialTab] = useState<AboutTab>('philosophy');
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);

  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const isShareOpenRef = useRef(false);
  const returnToShareRef = useRef(false);
  isShareOpenRef.current = isShareOpen;

  // Auto-close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  const openShare = useCallback(() => {
    returnToShareRef.current = false;
    setIsFromShare(false);
    setIsShareOpen(true);
  }, []);

  const closeShare = useCallback(() => {
    returnToShareRef.current = false;
    setIsFromShare(false);
    setIsShareOpen(false);
  }, []);

  const openQr = useCallback((fromShare?: boolean) => {
    const shouldReturn = Boolean(fromShare || isShareOpenRef.current);
    returnToShareRef.current = shouldReturn;
    setIsFromShare(shouldReturn);
    if (shouldReturn) setIsShareOpen(false);
    setIsQrOpen(true);
  }, []);

  const closeQr = useCallback(() => {
    setIsQrOpen(false);
    if (returnToShareRef.current) {
      returnToShareRef.current = false;
      setIsFromShare(false);
      setIsShareOpen(true);
    }
  }, []);

  const openQuickQr = useCallback(() => {
    returnToShareRef.current = false;
    setIsFromShare(false);
    setIsShareOpen(false);
    setIsQuickQrOpen(true);
  }, []);

  const closeQuickQr = useCallback(() => {
    setIsQuickQrOpen(false);
  }, []);

  const openNfc = useCallback(() => {
    returnToShareRef.current = false;
    setIsFromShare(false);
    setIsShareOpen(false);
    setIsNfcOpen(true);
  }, []);

  const closeNfc = useCallback(() => {
    setIsNfcOpen(false);
  }, []);

  const openEmailSignature = useCallback((fromShare?: boolean) => {
    const shouldReturn = Boolean(fromShare || isShareOpenRef.current);
    returnToShareRef.current = shouldReturn;
    setIsFromShare(shouldReturn);
    if (shouldReturn) setIsShareOpen(false);
    setIsExportOpen(false);
    setIsEmailSignatureOpen(true);
  }, []);

  const closeEmailSignature = useCallback(() => {
    setIsEmailSignatureOpen(false);
    if (returnToShareRef.current) {
      returnToShareRef.current = false;
      setIsFromShare(false);
      setIsShareOpen(true);
    }
  }, []);

  const openPrint = useCallback((fromShare?: boolean) => {
    const shouldReturn = Boolean(fromShare || isShareOpenRef.current);
    returnToShareRef.current = shouldReturn;
    setIsFromShare(shouldReturn);
    if (shouldReturn) setIsShareOpen(false);
    setIsPrintOpen(true);
  }, []);

  const closePrint = useCallback(() => {
    setIsPrintOpen(false);
    if (returnToShareRef.current) {
      returnToShareRef.current = false;
      setIsFromShare(false);
      setIsShareOpen(true);
    }
  }, []);

  const openExport = useCallback((fromShare?: boolean) => {
    const shouldReturn = Boolean(fromShare || isShareOpenRef.current);
    returnToShareRef.current = shouldReturn;
    setIsFromShare(shouldReturn);
    if (shouldReturn) setIsShareOpen(false);
    setIsExportOpen(true);
  }, []);

  const closeExport = useCallback(() => {
    setIsExportOpen(false);
    if (returnToShareRef.current) {
      returnToShareRef.current = false;
      setIsFromShare(false);
      setIsShareOpen(true);
    }
  }, []);

  const openScan = useCallback(() => setIsScanOpen(true), []);
  const closeScan = useCallback(() => setIsScanOpen(false), []);
  const openImportContacts = useCallback(() => setIsImportContactsOpen(true), []);
  const closeImportContacts = useCallback(() => setIsImportContactsOpen(false), []);

  const openEditor = useCallback((cardToEdit?: StoredCard | null, creating = false) => {
    setEditingCard(cardToEdit || null);
    setIsCreatingCard(creating);
    setIsEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setEditingCard(null);
    setIsCreatingCard(false);
  }, []);

  const openSync = useCallback(() => setIsSyncOpen(true), []);
  const closeSync = useCallback(() => setIsSyncOpen(false), []);
  const openP2PReceive = useCallback((roomId: string) => setP2pReceiveRoomId(roomId), []);
  const closeP2PReceive = useCallback(() => setP2pReceiveRoomId(null), []);

  const toggleSettings = useCallback(() => setIsSettingsOpen((prev) => !prev), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const openPinConfig = useCallback((mode: PinModalMode = 'setup') => {
    setPinModalMode(mode);
    setIsPinConfigOpen(true);
  }, []);
  const closePinConfig = useCallback(() => setIsPinConfigOpen(false), []);

  const openBiometrics = useCallback(() => setIsBiometricsOpen(true), []);
  const closeBiometrics = useCallback(() => setIsBiometricsOpen(false), []);

  const openLazyPin = useCallback(() => setIsLazyPinOpen(true), []);
  const closeLazyPin = useCallback(() => setIsLazyPinOpen(false), []);

  const openLegal = useCallback((docType: LegalDocType = 'privacy') => {
    setLegalDocType(docType);
    setIsLegalOpen(true);
  }, []);
  const closeLegal = useCallback(() => setIsLegalOpen(false), []);

  const openReset = useCallback(() => setIsResetOpen(true), []);
  const closeReset = useCallback(() => setIsResetOpen(false), []);

  const openBackup = useCallback((tab: BackupModalTab = 'export') => {
    setBackupInitialTab(tab);
    setIsBackupOpen(true);
  }, []);
  const closeBackup = useCallback(() => setIsBackupOpen(false), []);

  const openAbout = useCallback((tab: AboutTab = 'philosophy') => {
    setAboutInitialTab(tab);
    setIsAboutOpen(true);
  }, []);
  const closeAbout = useCallback(() => setIsAboutOpen(false), []);

  const openCreateAccount = useCallback(() => setIsCreateAccountOpen(true), []);
  const closeCreateAccount = useCallback(() => setIsCreateAccountOpen(false), []);

  const closeAll = useCallback(() => {
    returnToShareRef.current = false;
    setIsFromShare(false);
    setIsShareOpen(false);
    setIsQrOpen(false);
    setIsQuickQrOpen(false);
    setIsNfcOpen(false);
    setIsEmailSignatureOpen(false);
    setIsPrintOpen(false);
    setIsExportOpen(false);
    setIsScanOpen(false);
    setIsImportContactsOpen(false);
    setIsEditorOpen(false);
    setIsSyncOpen(false);
    setP2pReceiveRoomId(null);
    setIsSettingsOpen(false);
    setIsPinConfigOpen(false);
    setIsBiometricsOpen(false);
    setIsLazyPinOpen(false);
    setIsLegalOpen(false);
    setIsResetOpen(false);
    setIsBackupOpen(false);
    setIsAboutOpen(false);
    setIsCreateAccountOpen(false);
    setEditingCard(null);
    setIsCreatingCard(false);
  }, []);

  return {
    isShareOpen,
    isQrOpen,
    isQuickQrOpen,
    isNfcOpen,
    isEmailSignatureOpen,
    isPrintOpen,
    isExportOpen,
    isScanOpen,
    isImportContactsOpen,
    isEditorOpen,
    isCreatingCard,
    editingCard,
    isSyncOpen,
    p2pReceiveRoomId,
    isSettingsOpen,
    isPinConfigOpen,
    pinModalMode,
    isBiometricsOpen,
    isLazyPinOpen,
    isLegalOpen,
    legalDocType,
    isResetOpen,
    isFromShare,
    isBackupOpen,
    backupInitialTab,
    isAboutOpen,
    aboutInitialTab,
    isCreateAccountOpen,
    settingsMenuRef,
    openShare,
    closeShare,
    openQr,
    closeQr,
    openQuickQr,
    closeQuickQr,
    openNfc,
    closeNfc,
    openEmailSignature,
    closeEmailSignature,
    openPrint,
    closePrint,
    openExport,
    closeExport,
    openScan,
    closeScan,
    openImportContacts,
    closeImportContacts,
    openEditor,
    closeEditor,
    openSync,
    closeSync,
    openP2PReceive,
    closeP2PReceive,
    toggleSettings,
    closeSettings,
    openPinConfig,
    closePinConfig,
    openBiometrics,
    closeBiometrics,
    openLazyPin,
    closeLazyPin,
    openLegal,
    closeLegal,
    openReset,
    closeReset,
    openBackup,
    closeBackup,
    openAbout,
    closeAbout,
    openCreateAccount,
    closeCreateAccount,
    closeAll,
  };
}
