import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Download,
  Upload,
  Share2,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  FileKey2,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  RefreshCw,
  History,
  Trash2,
  BookmarkPlus,
  FolderSync,
  FolderCheck,
  KeyRound,
  Unlink,
} from 'lucide-react';
import { StoredCard } from '../types/card';
import { getActiveSessionPin } from '../utils/vaultSession';
import { verifyPin } from '../utils/pinLock';
import { loadVaultCategories } from '../utils/categories';
import {
  type VaultBackupPayloadV1,
  type ParsedBackupFile,
  type BackupRestoreMode,
  type BackupMergeOptions,
  type BackupIntegrityStatus,
  type LocalRecoverySnapshot,
  BACKUP_UPDATED_EVENT,
  getLastBackupAt,
  createEncryptedBackupContent,
  createPlainBackupContent,
  canShareVaultBackupFile,
  shareVaultBackupFile,
  downloadVaultBackupFile,
  recordBackupCompleted,
  parseBackupFileText,
  decryptBackupEnvelope,
  verifyBackupPayloadIntegrity,
  computeBackupRestorePreview,
  estimateBackupSizeBytes,
  formatBytesReadable,
  listLocalRecoverySnapshots,
  saveLocalRecoverySnapshot,
  deleteLocalRecoverySnapshot,
} from '../utils/vaultBackup';
import {
  AUTO_BACKUP_FILENAME,
  isLocalFolderBackupSupported,
  connectBackupDirectory,
  requestBackupDirectoryPermission,
  disconnectBackupDirectory,
  getConnectedDirectoryInfo,
  getLastFolderBackupAt,
  writeAutoBackupToDirectory,
} from '../utils/localFolderBackup';
import { useLocale } from '../hooks/useLocale';

export type BackupModalTab = 'export' | 'restore';

interface VaultBackupModalProps {
  isOpen: boolean;
  initialTab?: BackupModalTab;
  onClose: () => void;
  cards: StoredCard[];
  categories: string[];
  isPinConfigured: boolean;
  onRestoreBackup: (
    payload: VaultBackupPayloadV1,
    mode: BackupRestoreMode,
    mergeOptions?: BackupMergeOptions
  ) => void;
  onShowToast: (msg: string) => void;
}

function formatDateTimeLocalized(input: string | number | null, isEn: boolean): string {
  if (!input) return isEn ? 'Never' : '기록 없음';
  const date = typeof input === 'number' ? new Date(input) : new Date(input);
  if (Number.isNaN(date.getTime())) return isEn ? 'Unknown' : '알 수 없음';
  return date.toLocaleString(isEn ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const VaultBackupModal: React.FC<VaultBackupModalProps> = ({
  isOpen,
  initialTab = 'export',
  onClose,
  cards,
  categories,
  isPinConfigured,
  onRestoreBackup,
  onShowToast,
}) => {
  const { isEn, t } = useLocale();
  const [activeTab, setActiveTab] = useState<BackupModalTab>(initialTab);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(() => getLastBackupAt());
  const [snapshots, setSnapshots] = useState<LocalRecoverySnapshot[]>(() =>
    listLocalRecoverySnapshots()
  );

  // Export state
  const [exportFormat, setExportFormat] = useState<'eerum' | 'json'>('eerum');
  const [useCustomPassphrase, setUseCustomPassphrase] = useState(false);
  const [exportSecret, setExportSecret] = useState('');
  const [exportSecretConfirm, setExportSecretConfirm] = useState('');
  const [showExportSecret, setShowExportSecret] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  // Desktop Local Folder Auto-Backup state
  const folderBackupSupported = useMemo(() => isLocalFolderBackupSupported(), []);
  const [folderInfo, setFolderInfo] = useState<{
    folderName: string;
    hasPermission: boolean;
  } | null>(null);
  const [lastFolderBackupAt, setLastFolderBackupAt] = useState<number | null>(() =>
    getLastFolderBackupAt()
  );
  const [isFolderActionBusy, setIsFolderActionBusy] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Restore state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedBackupFile | null>(null);
  const [decryptSecret, setDecryptSecret] = useState('');
  const [showDecryptSecret, setShowDecryptSecret] = useState(false);
  const [decryptedPayload, setDecryptedPayload] = useState<VaultBackupPayloadV1 | null>(null);
  const [integrityStatus, setIntegrityStatus] = useState<BackupIntegrityStatus>('legacy');
  const [restoreMode, setRestoreMode] = useState<BackupRestoreMode>('merge');
  const [updateNewerDuplicates, setUpdateNewerDuplicates] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const sessionPin = isOpen ? getActiveSessionPin() : null;
  const needsManualSecretForExport =
    exportFormat === 'eerum' && (!isPinConfigured || !sessionPin || useCustomPassphrase);
  const canShareBackupFile = useMemo(
    () => (isOpen ? canShareVaultBackupFile(exportFormat) : false),
    [isOpen, exportFormat]
  );
  const effectiveCategories = useMemo(
    () => (categories.length > 0 ? categories : loadVaultCategories(cards)),
    [categories, cards]
  );

  const myCardCount = useMemo(() => cards.filter((c) => c.isMyCard).length, [cards]);
  const vaultCardCount = cards.length - myCardCount;
  const estimatedBackupBytes = useMemo(
    () => (isOpen ? estimateBackupSizeBytes(cards, effectiveCategories) : 0),
    [isOpen, cards, effectiveCategories]
  );

  const refreshFolderBackupStatus = useCallback(async () => {
    if (!folderBackupSupported) {
      setFolderInfo(null);
      return;
    }
    const info = await getConnectedDirectoryInfo();
    setFolderInfo(info);
    setLastFolderBackupAt(getLastFolderBackupAt());
  }, [folderBackupSupported]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setLastBackupAt(getLastBackupAt());
      setSnapshots(listLocalRecoverySnapshots());
      setExportFormat('eerum');
      setUseCustomPassphrase(false);
      setExportSecret('');
      setExportSecretConfirm('');
      setShowExportSecret(false);
      setExportError(null);
      setFolderError(null);
      setSelectedFileName(null);
      setParsedFile(null);
      setDecryptSecret('');
      setShowDecryptSecret(false);
      setDecryptedPayload(null);
      setIntegrityStatus('legacy');
      setRestoreMode('merge');
      setUpdateNewerDuplicates(true);
      setRestoreError(null);
      void refreshFolderBackupStatus();
    }
  }, [isOpen, initialTab, refreshFolderBackupStatus]);

  useEffect(() => {
    if (!isOpen) return;
    const handleBackupUpdated = () => {
      setLastBackupAt(getLastBackupAt());
      setLastFolderBackupAt(getLastFolderBackupAt());
      void refreshFolderBackupStatus();
    };
    window.addEventListener(BACKUP_UPDATED_EVENT, handleBackupUpdated);
    return () => window.removeEventListener(BACKUP_UPDATED_EVENT, handleBackupUpdated);
  }, [isOpen, refreshFolderBackupStatus]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const restorePreview = useMemo(() => {
    if (!decryptedPayload) return null;
    return computeBackupRestorePreview(
      decryptedPayload,
      cards,
      effectiveCategories,
      integrityStatus
    );
  }, [decryptedPayload, cards, effectiveCategories, integrityStatus]);

  if (!isOpen) return null;

  const resolveExportSecret = async (): Promise<{
    secret: string;
    encryptedWithPin: boolean;
  } | null> => {
    let secretToUse = sessionPin || '';
    let encryptedWithPinFlag = Boolean(isPinConfigured && !useCustomPassphrase);

    if (needsManualSecretForExport) {
      if (isPinConfigured && !useCustomPassphrase && !sessionPin) {
        if (!exportSecret.trim()) {
          setExportError(
            isEn ? 'Please enter your current 4-digit app PIN.' : '현재 설정된 4자리 앱 PIN을 입력해 주세요.'
          );
          return null;
        }
        const pinMatched = await verifyPin(exportSecret.trim());
        if (!pinMatched) {
          setExportError(isEn ? 'Incorrect app PIN.' : '앱 PIN 번호가 일치하지 않습니다.');
          return null;
        }
        secretToUse = exportSecret.trim();
        encryptedWithPinFlag = true;
      } else {
        if (exportSecret.trim().length < 4) {
          setExportError(
            isEn ? 'Backup password must be at least 4 characters.' : '백업 암호는 최소 4자 이상 입력해 주세요.'
          );
          return null;
        }
        if (exportSecret !== exportSecretConfirm) {
          setExportError(
            isEn ? 'Backup password confirmation does not match.' : '백업 암호 확인이 일치하지 않습니다.'
          );
          return null;
        }
        secretToUse = exportSecret;
        encryptedWithPinFlag = false;
      }
    }

    return { secret: secretToUse, encryptedWithPin: encryptedWithPinFlag };
  };

  const performExport = async (deliveryMode: 'share' | 'download') => {
    setExportError(null);

    if (cards.length === 0) {
      setExportError(isEn ? 'No card data to back up.' : '백업할 명함 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    try {
      let content: string;

      if (exportFormat === 'json') {
        content = await createPlainBackupContent(cards, effectiveCategories);
      } else {
        const resolved = await resolveExportSecret();
        if (!resolved) {
          setIsExporting(false);
          return;
        }
        content = await createEncryptedBackupContent(
          cards,
          effectiveCategories,
          resolved.secret,
          resolved.encryptedWithPin
        );
      }

      let filename: string;
      let sharedViaSheet = false;

      if (deliveryMode === 'share') {
        try {
          const shareResult = await shareVaultBackupFile(content, exportFormat);
          if (shareResult.outcome === 'aborted') {
            return;
          }
          if (shareResult.outcome === 'shared') {
            filename = shareResult.filename;
            sharedViaSheet = true;
          } else {
            filename = downloadVaultBackupFile(content, exportFormat);
          }
        } catch {
          // If Web Share fails (e.g., transient gesture expiration), fall back cleanly to direct file download
          filename = downloadVaultBackupFile(content, exportFormat);
        }
      } else {
        filename = downloadVaultBackupFile(content, exportFormat);
      }

      const now = Date.now();
      recordBackupCompleted(now);
      setLastBackupAt(now);
      setExportSecret('');
      setExportSecretConfirm('');
      onShowToast(
        sharedViaSheet
          ? exportFormat === 'eerum'
            ? isEn
              ? `Encrypted backup (${filename}) exported via share sheet.`
              : `암호화 백업 파일(${filename}) 공유 시트 내보내기가 완료되었습니다.`
            : isEn
              ? `Standard JSON backup (${filename}) exported via share sheet.`
              : `표준 JSON 백업 파일(${filename}) 공유 시트 내보내기가 완료되었습니다.`
          : exportFormat === 'eerum'
            ? isEn
              ? `Encrypted backup (${filename}) saved.`
              : `암호화된 백업 파일(${filename})이 저장되었습니다.`
            : isEn
              ? `Standard JSON backup (${filename}) saved.`
              : `표준 JSON 백업 파일(${filename})이 저장되었습니다.`
      );
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Failed to create backup file.'
            : '백업 파일 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    await performExport(canShareBackupFile ? 'share' : 'download');
  };

  const handleConnectBackupFolder = async () => {
    setFolderError(null);
    setIsFolderActionBusy(true);
    try {
      const res = await connectBackupDirectory();
      if (!res.ok) {
        if (res.error) {
          setFolderError(res.error);
        }
        return;
      }

      let autoSynced = false;
      if (cards.length > 0) {
        autoSynced = await writeAutoBackupToDirectory(cards, effectiveCategories);
        if (autoSynced) {
          const now = Date.now();
          recordBackupCompleted(now);
          setLastBackupAt(now);
        }
      }

      await refreshFolderBackupStatus();
      onShowToast(
        autoSynced
          ? isEn
            ? `Folder '${res.folderName}' connected and backed up immediately.`
            : `'${res.folderName}' 폴더가 연결되었으며 즉시 자동 백업되었습니다.`
          : isEn
            ? `Folder '${res.folderName}' connected for auto-backup.`
            : `'${res.folderName}' 폴더가 자동 백업 대상으로 연결되었습니다.`
      );
    } finally {
      setIsFolderActionBusy(false);
    }
  };

  const handleReauthorizeBackupFolder = async () => {
    setFolderError(null);
    setIsFolderActionBusy(true);
    try {
      const res = await requestBackupDirectoryPermission();
      if (!res.ok) {
        if (res.error) {
          setFolderError(res.error);
        }
        await refreshFolderBackupStatus();
        return;
      }

      let autoSynced = false;
      if (cards.length > 0) {
        autoSynced = await writeAutoBackupToDirectory(cards, effectiveCategories);
        if (autoSynced) {
          const now = Date.now();
          recordBackupCompleted(now);
          setLastBackupAt(now);
        }
      }

      await refreshFolderBackupStatus();
      onShowToast(
        autoSynced
          ? isEn
            ? `Permission for '${res.folderName}' re-authorized and synced.`
            : `'${res.folderName}' 폴더 권한이 재승인되어 최신 백업을 동기화했습니다.`
          : isEn
            ? `Permission for '${res.folderName}' auto-backup re-authorized.`
            : `'${res.folderName}' 폴더 자동 백업 권한이 재승인되었습니다.`
      );
    } finally {
      setIsFolderActionBusy(false);
    }
  };

  const handleDisconnectBackupFolder = async () => {
    setFolderError(null);
    setIsFolderActionBusy(true);
    try {
      await disconnectBackupDirectory();
      setFolderInfo(null);
      setLastFolderBackupAt(null);
      onShowToast(
        isEn
          ? 'Local folder auto-backup disconnected.'
          : '로컬 폴더 자동 백업 연결이 해제되었습니다.'
      );
    } finally {
      setIsFolderActionBusy(false);
    }
  };

  const handleCreateLocalSnapshot = async () => {
    setExportError(null);
    if (cards.length === 0) {
      setExportError(isEn ? 'No cards to snapshot.' : '스냅샷을 저장할 명함 데이터가 없습니다.');
      return;
    }

    setIsSavingSnapshot(true);
    try {
      const saved = await saveLocalRecoverySnapshot(cards, effectiveCategories, {
        reason: 'manual',
        label: isEn ? 'Manual Safety Snapshot' : '수동 안전 스냅샷',
        secret: sessionPin,
        encryptedWithPin: Boolean(isPinConfigured && sessionPin),
      });
      if (!saved) {
        setExportError(
          isEn
            ? 'Not enough browser storage for a snapshot. Please export a .eerum file instead.'
            : '브라우저 저장 공간이 부족하여 스냅샷을 저장하지 못했습니다. .eerum 파일로 내보내 주세요.'
        );
        return;
      }
      setSnapshots(listLocalRecoverySnapshots());
      const now = Date.now();
      recordBackupCompleted(now);
      setLastBackupAt(now);
      onShowToast(
        isEn
          ? 'Saved a local recovery snapshot of your vault.'
          : '현재 보관함의 로컬 안전 스냅샷이 저장되었습니다.'
      );
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Failed to save snapshot.'
            : '스냅샷 저장에 실패했습니다.'
      );
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const processBackupText = async (text: string, label: string) => {
    setRestoreError(null);
    setDecryptedPayload(null);
    setParsedFile(null);
    setDecryptSecret('');
    setIntegrityStatus('legacy');
    setSelectedFileName(label);

    try {
      const parsed = parseBackupFileText(text);
      setParsedFile(parsed);
      if (parsed.kind === 'plain') {
        const verifiedStatus = await verifyBackupPayloadIntegrity(parsed.payload);
        setIntegrityStatus(verifiedStatus);
        setDecryptedPayload(parsed.payload);
      }
    } catch (err) {
      setRestoreError(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Unable to parse backup file.'
            : '백업 파일을 해석할 수 없습니다.'
      );
    }
  };

  const processSelectedFile = async (file: File) => {
    const text = await file.text();
    await processBackupText(text, file.name);
  };

  const handleLoadSnapshot = async (snapshot: LocalRecoverySnapshot) => {
    const title = `${snapshot.label} (${formatDateTimeLocalized(snapshot.createdAt, isEn)})`;
    await processBackupText(snapshot.content, title);
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    const updated = deleteLocalRecoverySnapshot(snapshotId);
    setSnapshots(updated);
    onShowToast(isEn ? 'Local snapshot deleted.' : '로컬 스냅샷이 삭제되었습니다.');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processSelectedFile(file);
    }
    e.target.value = '';
  };

  const handleDecryptFile = async (e?: React.FormEvent, overrideSecret?: string) => {
    if (e) e.preventDefault();
    if (!parsedFile || parsedFile.kind !== 'encrypted') return;
    setRestoreError(null);

    const secret = overrideSecret ?? decryptSecret;
    if (!secret.trim()) {
      setRestoreError(
        isEn ? 'Please enter the PIN or backup password to decrypt.' : '복호화할 PIN 또는 백업 암호를 입력해 주세요.'
      );
      return;
    }

    setIsDecrypting(true);
    try {
      const payload = await decryptBackupEnvelope(parsedFile.envelope, secret);
      const verifiedStatus = await verifyBackupPayloadIntegrity(payload);
      setIntegrityStatus(verifiedStatus);
      setDecryptedPayload(payload);
    } catch (err) {
      setRestoreError(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Decryption failed.'
            : '복호화에 실패했습니다.'
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleConfirmRestore = () => {
    if (!decryptedPayload) return;
    onRestoreBackup(
      decryptedPayload,
      restoreMode,
      restoreMode === 'merge' ? { updateNewerDuplicates } : undefined
    );
    onClose();
  };

  const resetRestoreSelection = () => {
    setSelectedFileName(null);
    setParsedFile(null);
    setDecryptedPayload(null);
    setDecryptSecret('');
    setIntegrityStatus('legacy');
    setRestoreError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-backup-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--app-border)] flex items-start justify-between gap-3 bg-[var(--app-bg)]">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--app-text-muted)] block mb-1">
              LOCAL-FIRST ENCRYPTED BACKUP
            </span>
            <h3
              id="vault-backup-modal-title"
              className="text-base font-bold text-[var(--app-text)] tracking-tight"
            >
              {isEn ? 'Vault Backup & Restore' : '보관함 백업 및 복원'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="px-5 pt-3 border-b border-[var(--app-border)] flex gap-5">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'export'}
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'border-[var(--app-accent)] text-[var(--app-text)]'
                : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isEn ? 'Export Backup' : '백업 내보내기'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'restore'}
            onClick={() => {
              setSnapshots(listLocalRecoverySnapshots());
              setActiveTab('restore');
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'restore'
                ? 'border-[var(--app-accent)] text-[var(--app-text)]'
                : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isEn ? 'Restore Backup' : '백업에서 복원'}</span>
            {snapshots.length > 0 && (
              <span className="text-[10px] font-mono text-[var(--app-text-muted)]">
                ({snapshots.length})
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'export' ? (
            <form onSubmit={handleExportBackup} className="space-y-4">
              {/* Vault Snapshot Summary */}
              <div className="rounded-xl bg-[var(--app-bg)] border border-[var(--app-border)] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--app-text-muted)]">
                    {isEn ? 'Included Data Summary' : '포함 데이터 요약'}
                  </span>
                  <span className="font-mono text-[var(--app-text)] font-semibold tabular-nums">
                    {isEn
                      ? `${cards.length} cards · ~${formatBytesReadable(estimatedBackupBytes)}`
                      : `총 ${cards.length}장 · 약 ${formatBytesReadable(estimatedBackupBytes)}`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--app-border)] text-center text-[11px]">
                  <div>
                    <div className="text-[10px] text-[var(--app-text-muted)]">{t.header.myCard}</div>
                    <div className="text-sm font-bold text-[var(--app-text)] font-mono tabular-nums mt-0.5">
                      {myCardCount}
                    </div>
                  </div>
                  <div className="border-x border-[var(--app-border)]">
                    <div className="text-[10px] text-[var(--app-text-muted)]">
                      {isEn ? 'Saved Cards' : '보관 명함'}
                    </div>
                    <div className="text-sm font-bold text-[var(--app-text)] font-mono tabular-nums mt-0.5">
                      {vaultCardCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--app-text-muted)]">
                      {isEn ? 'Categories' : '카테고리'}
                    </div>
                    <div className="text-sm font-bold text-[var(--app-text)] font-mono tabular-nums mt-0.5">
                      {effectiveCategories.length}
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-[var(--app-border)] flex items-center justify-between text-[11px] text-[var(--app-text-muted)]">
                  <span>
                    {isEn ? 'Last backup · Includes themes, memos & SHA-256' : '마지막 백업 · 테마/메모/SHA-256 포함'}
                  </span>
                  <span className="font-mono text-[var(--app-text)]">
                    {formatDateTimeLocalized(lastBackupAt, isEn)}
                  </span>
                </div>
              </div>

              {/* Export Format Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--app-text-muted)]">
                    {isEn ? 'Backup Format' : '백업 파일 형식'}
                  </span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setExportFormat('eerum');
                        setExportError(null);
                      }}
                      className={`pb-0.5 border-b transition-colors cursor-pointer ${
                        exportFormat === 'eerum'
                          ? 'border-[var(--app-accent)] text-[var(--app-text)] font-semibold'
                          : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                      }`}
                    >
                      {isEn ? 'Encrypted (.eerum)' : '암호화 (.eerum)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExportFormat('json');
                        setExportError(null);
                      }}
                      className={`pb-0.5 border-b transition-colors cursor-pointer ${
                        exportFormat === 'json'
                          ? 'border-amber-500 text-[var(--app-text)] font-semibold'
                          : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                      }`}
                    >
                      {isEn ? 'Standard JSON (.json)' : '표준 JSON (.json)'}
                    </button>
                  </div>
                </div>

                {exportFormat === 'eerum' ? (
                  <div className="rounded-xl bg-[var(--app-surface-subtle)]/70 border border-[var(--app-border)] p-3.5 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <p className="text-[var(--app-text)] font-semibold">
                          {isEn
                            ? 'AES-GCM 256-bit On-Device Encryption + SHA-256'
                            : 'AES-GCM 256-bit 온디바이스 암호화 + SHA-256 검증'}
                        </p>
                        <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                          {isPinConfigured && !useCustomPassphrase
                            ? sessionPin
                              ? isEn
                                ? 'Encrypts a .eerum archive directly using your active 4-digit app PIN.'
                                : '현재 활성화된 4자리 앱 PIN 키로 안전하게 암호화된 .eerum 파일을 생성합니다.'
                              : isEn
                                ? 'Verify your current app PIN to encrypt the .eerum archive using PBKDF2-SHA256.'
                                : '현재 앱 PIN을 확인한 뒤 PBKDF2-SHA256 키로 암호화된 .eerum 파일을 생성합니다.'
                            : isEn
                              ? 'Set a dedicated backup password to encrypt your .eerum file. Keep it safe for restoring later.'
                              : '백업 전용 암호를 설정하여 .eerum 파일을 암호화합니다. 복원 시 동일한 암호가 필요합니다.'}
                        </p>
                      </div>
                    </div>

                    {isPinConfigured && (
                      <label className="flex items-center gap-2 pt-1 text-[11px] text-[var(--app-text)] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useCustomPassphrase}
                          onChange={(e) => {
                            setUseCustomPassphrase(e.target.checked);
                            setExportSecret('');
                            setExportSecretConfirm('');
                            setExportError(null);
                          }}
                          className="rounded border-[var(--app-border)] accent-[var(--app-accent)]"
                        />
                        <span>
                          {isEn ? 'Use a separate backup password instead of app PIN' : '앱 PIN 대신 별도의 백업 암호 사용하기'}
                        </span>
                      </label>
                    )}

                    {needsManualSecretForExport && (
                      <div className="space-y-2.5 pt-1">
                        {isPinConfigured && !useCustomPassphrase && !sessionPin ? (
                          <div>
                            <label className="block text-[11px] text-[var(--app-text-muted)] mb-1">
                              {isEn ? 'Verify Current 4-Digit App PIN' : '현재 4자리 앱 PIN 확인'}
                            </label>
                            <div className="relative">
                              <input
                                type={showExportSecret ? 'text' : 'password'}
                                inputMode="numeric"
                                maxLength={8}
                                value={exportSecret}
                                onChange={(e) => {
                                  setExportSecret(e.target.value);
                                  setExportError(null);
                                }}
                                placeholder={isEn ? 'Enter 4-digit PIN' : '4자리 PIN 입력'}
                                className="w-full h-9.5 pl-3 pr-9 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]/70 focus:outline-none focus:border-[var(--app-accent)] font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowExportSecret((prev) => !prev)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] hover:text-[var(--app-text)] cursor-pointer"
                                aria-label={isEn ? 'Toggle password visibility' : '암호 표시 전환'}
                              >
                                {showExportSecret ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-[11px] text-[var(--app-text-muted)] mb-1">
                                {isEn ? 'Backup Password (min 4 chars)' : '백업 암호 설정 (최소 4자)'}
                              </label>
                              <div className="relative">
                                <input
                                  type={showExportSecret ? 'text' : 'password'}
                                  value={exportSecret}
                                  onChange={(e) => {
                                    setExportSecret(e.target.value);
                                    setExportError(null);
                                  }}
                                  placeholder={isEn ? 'Password required when restoring' : '복원 시 입력할 암호'}
                                  className="w-full h-9.5 pl-3 pr-9 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]/70 focus:outline-none focus:border-[var(--app-accent)]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowExportSecret((prev) => !prev)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] hover:text-[var(--app-text)] cursor-pointer"
                                  aria-label={isEn ? 'Toggle password visibility' : '암호 표시 전환'}
                                >
                                  {showExportSecret ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] text-[var(--app-text-muted)] mb-1">
                                {isEn ? 'Confirm Backup Password' : '백업 암호 확인'}
                              </label>
                              <input
                                type={showExportSecret ? 'text' : 'password'}
                                value={exportSecretConfirm}
                                onChange={(e) => {
                                  setExportSecretConfirm(e.target.value);
                                  setExportError(null);
                                }}
                                placeholder={isEn ? 'Re-enter the same password' : '동일한 암호 다시 입력'}
                                className="w-full h-9.5 px-3 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]/70 focus:outline-none focus:border-[var(--app-accent)]"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-[var(--app-text)]">
                        {isEn
                          ? 'Unencrypted JSON Export (with SHA-256 Integrity Check)'
                          : '비암호화 JSON 내보내기 (SHA-256 무결성 검증 포함)'}
                      </p>
                      <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                        {isEn
                          ? 'Cards and memos are stored as plain text; keep this file only in a secure private location.'
                          : '명함과 메모가 평문으로 저장되므로 개인 기기·보안 드라이브 등 안전한 위치에만 보관하세요.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {exportError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-200 flex items-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{exportError}</span>
                </div>
              )}

              <div className="space-y-2">
                {canShareBackupFile ? (
                  <>
                    <button
                      type="submit"
                      disabled={isExporting || cards.length === 0}
                      className="w-full py-3 px-4 rounded-xl bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-40 text-[var(--app-accent-fg)] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] shadow-md"
                    >
                      <Share2 className="w-4 h-4 stroke-[2]" />
                      <span>
                        {isExporting
                          ? isEn
                            ? 'Generating backup...'
                            : '백업 파일 생성 중...'
                          : isEn
                            ? 'Save via Share Sheet (Files · iCloud · Drive)'
                            : '공유 시트로 저장 (파일 앱 · iCloud · 메신저)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void performExport('download')}
                      disabled={isExporting || cards.length === 0}
                      className="w-full py-2.5 px-4 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)] disabled:opacity-40 text-[var(--app-text)] font-medium text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                      <span>
                        {exportFormat === 'eerum'
                          ? isEn
                            ? 'Download Directly to Device (.eerum)'
                            : '기기에 직접 파일 다운로드 (.eerum)'
                          : isEn
                            ? 'Download Directly to Device (.json)'
                            : '기기에 직접 파일 다운로드 (.json)'}
                      </span>
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    disabled={isExporting || cards.length === 0}
                    className="w-full py-3 px-4 rounded-xl bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-40 text-[var(--app-accent-fg)] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] shadow-md"
                  >
                    <Download className="w-4 h-4 stroke-[2]" />
                    <span>
                      {isExporting
                        ? isEn
                          ? 'Generating backup...'
                          : '백업 파일 생성 중...'
                        : exportFormat === 'eerum'
                          ? isEn
                            ? 'Save Encrypted Backup (.eerum)'
                            : '암호화 백업 파일 저장 (.eerum)'
                          : isEn
                            ? 'Save Standard JSON Backup (.json)'
                            : '표준 JSON 백업 파일 저장 (.json)'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCreateLocalSnapshot}
                  disabled={isSavingSnapshot || cards.length === 0}
                  className="w-full py-2.5 px-4 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)] disabled:opacity-40 text-[var(--app-text)] font-medium text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                  <span>
                    {isSavingSnapshot
                      ? isEn
                        ? 'Saving local snapshot...'
                        : '로컬 스냅샷 저장 중...'
                      : isEn
                        ? 'Save In-Browser Safety Snapshot (Quick Restore)'
                        : '브라우저 내 안전 스냅샷 저장 (즉시 복구 지점)'}
                  </span>
                </button>
              </div>

              {/* Desktop Local Folder Auto-Backup (File System Access API) */}
              {folderBackupSupported && (
                <div className="rounded-xl bg-[var(--app-bg)] border border-[var(--app-border)] p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {folderInfo?.hasPermission ? (
                        <FolderCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <FolderSync className="w-4 h-4 text-[var(--app-text-muted)] shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-semibold text-[var(--app-text)]">
                          {isEn ? 'Local Folder Auto-Backup (Desktop)' : '로컬 폴더 자동 백업 (PC 전용)'}
                        </p>
                        <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                          {folderInfo
                            ? isEn
                              ? `Automatically syncs changes to ${AUTO_BACKUP_FILENAME}.`
                              : `변경 시 ${AUTO_BACKUP_FILENAME} 파일로 자동 동기화됩니다.`
                            : isEn
                              ? 'Pick a local or synced folder to back up automatically whenever cards change.'
                              : 'PC의 로컬 또는 동기화 드라이브 폴더를 지정해 변경 시마다 자동 백업합니다.'}
                        </p>
                      </div>
                    </div>
                    {folderInfo && (
                      <span
                        className={`shrink-0 text-[10px] font-mono font-medium ${
                          folderInfo.hasPermission
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {folderInfo.hasPermission
                          ? isEn
                            ? 'Auto-sync active'
                            : '자동 동기화 활성'
                          : isEn
                            ? 'Permission needed'
                            : '권한 필요'}
                      </span>
                    )}
                  </div>

                  {folderInfo && (
                    <div className="pt-2 border-t border-[var(--app-border)] space-y-1 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--app-text-muted)]">
                          {isEn ? 'Connected Folder' : '연결된 폴더'}
                        </span>
                        <span className="font-mono font-semibold text-[var(--app-text)] truncate max-w-[200px]">
                          {folderInfo.folderName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--app-text-muted)]">
                          {isEn ? 'Last Auto-Backup' : '마지막 자동 백업'}
                        </span>
                        <span className="font-mono text-[var(--app-text)]">
                          {lastFolderBackupAt
                            ? formatDateTimeLocalized(lastFolderBackupAt, isEn)
                            : isEn
                              ? 'Waiting for next change'
                              : '변경 시 자동 저장 대기'}
                        </span>
                      </div>
                    </div>
                  )}

                  {folderError && (
                    <div
                      role="alert"
                      className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-2.5 py-1.5 text-[11px] text-rose-700 dark:text-rose-200 flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>{folderError}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {folderInfo && !folderInfo.hasPermission && (
                      <button
                        type="button"
                        onClick={() => void handleReauthorizeBackupFolder()}
                        disabled={isFolderActionBusy}
                        className="flex-1 min-w-[120px] py-2 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Re-authorize' : '권한 재승인'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleConnectBackupFolder()}
                      disabled={isFolderActionBusy}
                      className="flex-1 min-w-[120px] py-2 px-3 rounded-lg bg-[var(--app-surface-subtle)] hover:bg-[var(--app-border)] border border-[var(--app-border)] text-[var(--app-text)] font-medium text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <FolderSync className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                      <span>{isEn ? 'Connect / Change Folder' : '폴더 연결 / 변경'}</span>
                    </button>

                    {folderInfo && (
                      <button
                        type="button"
                        onClick={() => void handleDisconnectBackupFolder()}
                        disabled={isFolderActionBusy}
                        className="py-2 px-3 rounded-lg border border-[var(--app-border)] hover:bg-rose-500/10 hover:border-rose-500/30 text-[var(--app-text-muted)] hover:text-rose-600 dark:hover:text-rose-400 font-medium text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Disconnect' : '연결 해제'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".eerum,.json,application/json,text/plain"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {!parsedFile ? (
                <>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) void processSelectedFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                      isDraggingFile
                        ? 'border-[var(--app-accent)] bg-[var(--app-highlight)]/35'
                        : 'border-[var(--app-border)] hover:border-[var(--app-accent)]/60 bg-[var(--app-bg)]'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] flex items-center justify-center mx-auto mb-3 text-[var(--app-text)]">
                      <FileKey2 className="w-5 h-5" />
                    </div>
                    <p className="text-[var(--app-text)] font-semibold mb-1">
                      {isEn ? 'Select Backup File (.eerum / .json)' : '백업 파일(.eerum / .json) 선택'}
                    </p>
                    <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                      {isEn
                        ? 'Click or drag and drop a backup file here to start restoring.'
                        : '클릭하거나 파일을 이곳에 끌어다 놓아 복원을 시작하세요.'}
                    </p>
                  </div>

                  {/* Local Recovery Snapshots */}
                  {snapshots.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-[var(--app-text-muted)]">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <History className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Recent Local Safety Snapshots' : '최근 로컬 안전 스냅샷'}</span>
                        </span>
                        <span className="font-mono text-[10px]">
                          {isEn ? 'Up to 5 kept' : '최대 5개 보관'}
                        </span>
                      </div>
                      <div className="divide-y divide-[var(--app-border)] rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] overflow-hidden">
                        {snapshots.map((snap) => (
                          <div
                            key={snap.id}
                            className="px-3 py-2.5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {snap.encrypted && (
                                  <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                )}
                                <span className="font-medium text-[var(--app-text)] truncate">
                                  {snap.label}
                                </span>
                              </div>
                              <p className="text-[10px] font-mono text-[var(--app-text-muted)] mt-0.5">
                                {formatDateTimeLocalized(snap.createdAt, isEn)} ·{' '}
                                {isEn ? `${snap.cardCount} cards` : `총 ${snap.cardCount}장`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => void handleLoadSnapshot(snap)}
                                className="px-2.5 py-1 rounded-lg bg-[var(--app-surface-subtle)] hover:bg-[var(--app-border)] text-[var(--app-text)] text-[11px] font-medium cursor-pointer"
                              >
                                {isEn ? 'Load' : '불러오기'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSnapshot(snap.id)}
                                className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[var(--app-surface-subtle)] cursor-pointer"
                                title={isEn ? 'Delete snapshot' : '스냅샷 삭제'}
                                aria-label={isEn ? 'Delete snapshot' : '스냅샷 삭제'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl bg-[var(--app-bg)] border border-[var(--app-border)] p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileKey2 className="w-4 h-4 text-[var(--app-text-muted)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[var(--app-text)] font-medium truncate">{selectedFileName}</p>
                      <p className="text-[10px] text-[var(--app-text-muted)] font-mono">
                        {parsedFile.kind === 'encrypted'
                          ? isEn
                            ? 'AES-GCM Encrypted'
                            : 'AES-GCM 암호화됨'
                          : isEn
                            ? 'Plain JSON Backup'
                            : '일반 JSON 백업'}
                        {parsedFile.kind === 'encrypted' && typeof parsedFile.cardCount === 'number'
                          ? isEn
                            ? ` · ${parsedFile.cardCount} cards`
                            : ` · 명함 ${parsedFile.cardCount}장`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetRestoreSelection}
                    className="px-2.5 py-1 rounded-lg bg-[var(--app-surface-subtle)] hover:bg-[var(--app-border)] text-[var(--app-text)] text-[11px] cursor-pointer shrink-0"
                  >
                    {isEn ? 'Change File' : '다시 선택'}
                  </button>
                </div>
              )}

              {/* Step 2: Decrypt Prompt when file is encrypted and not yet decrypted */}
              {parsedFile?.kind === 'encrypted' && !decryptedPayload && (
                <form onSubmit={(e) => handleDecryptFile(e)} className="space-y-3">
                  <div className="rounded-xl bg-[var(--app-surface-subtle)]/70 border border-[var(--app-border)] p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2 text-[var(--app-text)] font-semibold">
                      <Lock className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                      <span>{isEn ? 'Decrypt Backup File' : '백업 파일 복호화'}</span>
                    </div>
                    <p className="text-[11px] text-[var(--app-text-muted)]">
                      {isEn
                        ? 'Enter the 4-digit app PIN or backup password used when exporting.'
                        : '내보낼 때 사용한 4자리 앱 PIN 또는 백업 암호를 입력하세요.'}
                    </p>
                    <div className="relative">
                      <input
                        type={showDecryptSecret ? 'text' : 'password'}
                        value={decryptSecret}
                        onChange={(e) => {
                          setDecryptSecret(e.target.value);
                          setRestoreError(null);
                        }}
                        placeholder={isEn ? 'Enter PIN or backup password' : 'PIN 또는 백업 암호 입력'}
                        className="w-full h-9.5 pl-3 pr-9 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]/70 focus:outline-none focus:border-[var(--app-accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDecryptSecret((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] hover:text-[var(--app-text)] cursor-pointer"
                        aria-label={isEn ? 'Toggle password visibility' : '암호 표시 전환'}
                      >
                        {showDecryptSecret ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {sessionPin && (
                      <button
                        type="button"
                        onClick={() => {
                          setDecryptSecret(sessionPin);
                          void handleDecryptFile(undefined, sessionPin);
                        }}
                        className="text-[11px] text-[var(--app-text)] hover:underline underline-offset-2 cursor-pointer font-medium"
                      >
                        {isEn ? 'Decrypt immediately with current app PIN' : '현재 앱 PIN으로 바로 복호화하기'}
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isDecrypting || !decryptSecret.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-40 text-[var(--app-accent-fg)] font-semibold text-xs cursor-pointer"
                  >
                    {isDecrypting
                      ? isEn
                        ? 'Verifying & decrypting...'
                        : '복호화 검증 중...'
                      : isEn
                        ? 'Decrypt & Inspect'
                        : '복호화 및 내용 확인'}
                  </button>
                </form>
              )}

              {/* Step 3: Preview & Merge/Replace Choice */}
              {decryptedPayload && restorePreview && (
                <div className="space-y-3">
                  <div
                    className={`rounded-xl bg-[var(--app-bg)] border p-3.5 space-y-2 ${
                      restorePreview.integrityStatus === 'mismatch'
                        ? 'border-rose-500/45'
                        : 'border-emerald-500/35'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {restorePreview.integrityStatus === 'mismatch' ? (
                        <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>
                            {isEn ? 'SHA-256 Integrity Mismatch Warning' : 'SHA-256 무결성 불일치 주의'}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {restorePreview.integrityStatus === 'verified'
                              ? isEn
                                ? 'SHA-256 Integrity Verified'
                                : 'SHA-256 무결성 검증 완료'
                              : isEn
                                ? 'Backup Schema Verified'
                                : '백업 스키마 검증 완료'}
                          </span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-[var(--app-text-muted)]">
                        {formatDateTimeLocalized(restorePreview.exportedAt, isEn)}
                      </span>
                    </div>

                    <div className="text-[11px] text-[var(--app-text-muted)] grid grid-cols-2 gap-y-1 pt-1 border-t border-[var(--app-border)]">
                      <span>{isEn ? 'Total Cards Included:' : '포함된 총 명함:'}</span>
                      <span className="text-right font-mono font-semibold text-[var(--app-text)]">
                        {isEn
                          ? `${restorePreview.totalIncoming} (My ${restorePreview.incomingMyCards} · Vault ${restorePreview.incomingVaultCards})`
                          : `${restorePreview.totalIncoming}장 (내 명함 ${restorePreview.incomingMyCards} · 보관 ${restorePreview.incomingVaultCards})`}
                      </span>
                      <span>{isEn ? 'Duplicates (ID/Slug match):' : '중복 (ID/슬러그 일치):'}</span>
                      <span className="text-right font-mono text-[var(--app-text-muted)]">
                        {isEn ? `${restorePreview.duplicateCount}` : `${restorePreview.duplicateCount}장`}
                        {restorePreview.newerDuplicatesCount > 0
                          ? isEn
                            ? ` (${restorePreview.newerDuplicatesCount} newer)`
                            : ` (최신 ${restorePreview.newerDuplicatesCount})`
                          : ''}
                      </span>
                      <span>{isEn ? 'New Additions on Merge:' : '병합 시 신규 추가:'}</span>
                      <span className="text-right font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                        {isEn
                          ? `+${restorePreview.newCardsCount} cards (Categories +${restorePreview.newCategoriesCount})`
                          : `+${restorePreview.newCardsCount}장 (카테고리 +${restorePreview.newCategoriesCount})`}
                      </span>
                      {restorePreview.hasThemePreferences && (
                        <>
                          <span>{isEn ? 'Theme & View Settings:' : '명함 테마/화면 설정:'}</span>
                          <span className="text-right font-mono text-[var(--app-text)]">
                            {isEn ? 'Included' : '포함됨'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Merge vs Replace Mode Selector */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-[var(--app-text-muted)]">
                      {isEn ? 'Choose Restore Mode' : '복원 방식 선택'}
                    </p>

                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                        restoreMode === 'merge'
                          ? 'bg-[var(--app-highlight)]/45 border-[var(--app-accent)]/50 text-[var(--app-text)]'
                          : 'bg-[var(--app-bg)] border-[var(--app-border)] text-[var(--app-text-muted)] hover:border-[var(--app-accent)]/40'
                      }`}
                    >
                      <GitMerge className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[var(--app-text)] flex items-center gap-1.5">
                          <span>{isEn ? 'Smart Merge' : '스마트 병합 (Merge)'}</span>
                          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
                            {isEn ? 'Recommended' : '권장'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                          {isEn
                            ? 'Preserves your existing cards and categories while safely merging new entries.'
                            : '기존 명함과 카테고리를 보존하고 새 명함을 안전하게 합칩니다.'}
                        </p>
                      </div>
                    </button>

                    {restoreMode === 'merge' && restorePreview.newerDuplicatesCount > 0 && (
                      <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--app-bg)] border border-[var(--app-border)] text-[11px] text-[var(--app-text)] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={updateNewerDuplicates}
                          onChange={(e) => setUpdateNewerDuplicates(e.target.checked)}
                          className="rounded border-[var(--app-border)] accent-[var(--app-accent)]"
                        />
                        <span>
                          {isEn
                            ? `Update ${restorePreview.newerDuplicatesCount} duplicate cards that are newer in backup`
                            : `백업이 더 최신인 중복 명함 ${restorePreview.newerDuplicatesCount}장 업데이트`}
                        </span>
                      </label>
                    )}

                    <button
                      type="button"
                      onClick={() => setRestoreMode('replace')}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                        restoreMode === 'replace'
                          ? 'bg-amber-500/15 border-amber-500/50 text-[var(--app-text)]'
                          : 'bg-[var(--app-bg)] border-[var(--app-border)] text-[var(--app-text-muted)] hover:border-[var(--app-accent)]/40'
                      }`}
                    >
                      <RefreshCw className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[var(--app-text)]">
                          {isEn ? 'Full Replace' : '전체 교체 (Replace)'}
                        </div>
                        <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                          {isEn
                            ? 'Clears all cards and categories on this device and restores the exact backup state.'
                            : '현재 기기의 모든 명함과 카테고리를 지우고 백업 파일의 상태로 완전히 복원합니다.'}
                        </p>
                      </div>
                    </button>
                  </div>

                  {restoreMode === 'replace' && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        {isEn
                          ? `${cards.length} existing cards will be replaced; an automatic local snapshot is saved first for recovery.`
                          : `기존 명함 ${cards.length}장이 대체되며, 실수 복구를 위해 교체 직전 로컬 안전 스냅샷이 자동 저장됩니다.`}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-xs cursor-pointer active:scale-[0.99] shadow-md ${
                      restoreMode === 'replace'
                        ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                        : 'bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)]'
                    }`}
                  >
                    {restoreMode === 'merge'
                      ? updateNewerDuplicates && restorePreview.newerDuplicatesCount > 0
                        ? isEn
                          ? `Run Smart Merge (+${restorePreview.newCardsCount} · Update ${restorePreview.newerDuplicatesCount})`
                          : `스마트 병합 실행 (+${restorePreview.newCardsCount} · 갱신 ${restorePreview.newerDuplicatesCount})`
                        : isEn
                          ? `Run Merge Restore (+${restorePreview.newCardsCount} cards)`
                          : `병합 복원 실행 (+${restorePreview.newCardsCount}장)`
                      : isEn
                        ? `Run Full Replace (${restorePreview.totalIncoming} cards)`
                        : `전체 교체 복원 실행 (${restorePreview.totalIncoming}장)`}
                  </button>
                </div>
              )}

              {restoreError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-200 flex items-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
