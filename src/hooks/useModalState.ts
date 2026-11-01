import { useState, useRef, useEffect, useCallback } from 'react';
import { StoredCard } from '../types/card';
import { PinModalMode } from '../components/PinLockModal';
import { LegalDocType } from '../components/LegalModal';

export interface ModalManager {
  // Modal visibility flags
  isShareOpen: boolean;
  isQrOpen: boolean;
  isPrintOpen: boolean;
  isExportOpen: boolean;
  isScanOpen: boolean;
  isEditorOpen: boolean;
  isCreatingCard: boolean;
  editingCard: StoredCard | null;
  isSyncOpen: boolean;
  isSettingsOpen: boolean;
  isPinConfigOpen: boolean;
  pinModalMode: PinModalMode;
  isBiometricsOpen: boolean;
  isLazyPinOpen: boolean;
  isLegalOpen: boolean;
  legalDocType: LegalDocType;
  isResetOpen: boolean;
  isFromShare: boolean;

  // Settings dropdown ref
  settingsMenuRef: React.RefObject<HTMLDivElement | null>;

  // Modal Open/Close Dispatchers
  openShare: () => void;
  closeShare: () => void;
  openQr: (fromShare?: boolean) => void;
  closeQr: () => void;
  openPrint: (fromShare?: boolean) => void;
  closePrint: () => void;
  openExport: (fromShare?: boolean) => void;
  closeExport: () => void;
  openScan: () => void;
  closeScan: () => void;
  openEditor: (card?: StoredCard | null, isCreating?: boolean) => void;
  closeEditor: () => void;
  openSync: () => void;
  closeSync: () => void;
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
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [editingCard, setEditingCard] = useState<StoredCard | null>(null);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPinConfigOpen, setIsPinConfigOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<PinModalMode>('setup');
  const [isBiometricsOpen, setIsBiometricsOpen] = useState(false);
  const [isLazyPinOpen, setIsLazyPinOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalDocType, setLegalDocType] = useState<LegalDocType>('privacy');
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isFromShare, setIsFromShare] = useState(false);

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

  const toggleSettings = useCallback(() => setIsSettingsOpen(prev => !prev), []);
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

  const closeAll = useCallback(() => {
    returnToShareRef.current = false;
    setIsFromShare(false);
    setIsShareOpen(false);
    setIsQrOpen(false);
    setIsPrintOpen(false);
    setIsExportOpen(false);
    setIsScanOpen(false);
    setIsEditorOpen(false);
    setIsSyncOpen(false);
    setIsSettingsOpen(false);
    setIsPinConfigOpen(false);
    setIsBiometricsOpen(false);
    setIsLazyPinOpen(false);
    setIsLegalOpen(false);
    setIsResetOpen(false);
    setEditingCard(null);
    setIsCreatingCard(false);
  }, []);

  return {
    isShareOpen,
    isQrOpen,
    isPrintOpen,
    isExportOpen,
    isScanOpen,
    isEditorOpen,
    isCreatingCard,
    editingCard,
    isSyncOpen,
    isSettingsOpen,
    isPinConfigOpen,
    pinModalMode,
    isBiometricsOpen,
    isLazyPinOpen,
    isLegalOpen,
    legalDocType,
    isResetOpen,
    isFromShare,
    settingsMenuRef,
    openShare,
    closeShare,
    openQr,
    closeQr,
    openPrint,
    closePrint,
    openExport,
    closeExport,
    openScan,
    closeScan,
    openEditor,
    closeEditor,
    openSync,
    closeSync,
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
    closeAll,
  };
}
