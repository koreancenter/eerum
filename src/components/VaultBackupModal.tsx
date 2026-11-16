import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  Upload,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  FileKey2,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  RefreshCw,
} from 'lucide-react';
import { StoredCard } from '../types/card';
import { getActiveSessionPin } from '../utils/vaultSession';
import { verifyPin } from '../utils/pinLock';
import { loadVaultCategories } from '../utils/categories';
import {
  type VaultBackupPayloadV1,
  type ParsedBackupFile,
  type BackupRestoreMode,
  getLastBackupAt,
  createEncryptedBackupContent,
  downloadVaultBackupFile,
  recordBackupCompleted,
  parseBackupFileText,
  decryptBackupEnvelope,
  computeBackupRestorePreview,
} from '../utils/vaultBackup';

export type BackupModalTab = 'export' | 'restore';

interface VaultBackupModalProps {
  isOpen: boolean;
  initialTab?: BackupModalTab;
  onClose: () => void;
  cards: StoredCard[];
  categories: string[];
  isPinConfigured: boolean;
  onRestoreBackup: (payload: VaultBackupPayloadV1, mode: BackupRestoreMode) => void;
  onShowToast: (msg: string) => void;
}

function formatDateTimeKr(input: string | number | null): string {
  if (!input) return '기록 없음';
  const date = typeof input === 'number' ? new Date(input) : new Date(input);
  if (Number.isNaN(date.getTime())) return '알 수 없음';
  return date.toLocaleString('ko-KR', {
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
  const [activeTab, setActiveTab] = useState<BackupModalTab>(initialTab);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(() => getLastBackupAt());

  // Export state
  const [useCustomPassphrase, setUseCustomPassphrase] = useState(false);
  const [exportSecret, setExportSecret] = useState('');
  const [exportSecretConfirm, setExportSecretConfirm] = useState('');
  const [showExportSecret, setShowExportSecret] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Restore state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedBackupFile | null>(null);
  const [decryptSecret, setDecryptSecret] = useState('');
  const [showDecryptSecret, setShowDecryptSecret] = useState(false);
  const [decryptedPayload, setDecryptedPayload] = useState<VaultBackupPayloadV1 | null>(null);
  const [restoreMode, setRestoreMode] = useState<BackupRestoreMode>('merge');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const sessionPin = isOpen ? getActiveSessionPin() : null;
  const needsManualSecretForExport = !isPinConfigured || !sessionPin || useCustomPassphrase;
  const effectiveCategories = useMemo(
    () => (categories.length > 0 ? categories : loadVaultCategories(cards)),
    [categories, cards]
  );

  const myCardCount = useMemo(() => cards.filter((c) => c.isMyCard).length, [cards]);
  const vaultCardCount = cards.length - myCardCount;

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setLastBackupAt(getLastBackupAt());
      setUseCustomPassphrase(false);
      setExportSecret('');
      setExportSecretConfirm('');
      setShowExportSecret(false);
      setExportError(null);
      setSelectedFileName(null);
      setParsedFile(null);
      setDecryptSecret('');
      setShowDecryptSecret(false);
      setDecryptedPayload(null);
      setRestoreMode('merge');
      setRestoreError(null);
    }
  }, [isOpen, initialTab]);

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
    return computeBackupRestorePreview(decryptedPayload, cards, effectiveCategories);
  }, [decryptedPayload, cards, effectiveCategories]);

  if (!isOpen) return null;

  const handleExportBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setExportError(null);

    if (cards.length === 0) {
      setExportError('백업할 명함 데이터가 없습니다.');
      return;
    }

    let secretToUse = sessionPin || '';
    let encryptedWithPinFlag = Boolean(isPinConfigured && !useCustomPassphrase);

    if (needsManualSecretForExport) {
      if (isPinConfigured && !useCustomPassphrase && !sessionPin) {
        if (!exportSecret.trim()) {
          setExportError('현재 설정된 4자리 앱 PIN을 입력해 주세요.');
          return;
        }
        const pinMatched = await verifyPin(exportSecret.trim());
        if (!pinMatched) {
          setExportError('앱 PIN 번호가 일치하지 않습니다.');
          return;
        }
        secretToUse = exportSecret.trim();
        encryptedWithPinFlag = true;
      } else {
        if (exportSecret.trim().length < 4) {
          setExportError('백업 암호는 최소 4자 이상 입력해 주세요.');
          return;
        }
        if (exportSecret !== exportSecretConfirm) {
          setExportError('백업 암호 확인이 일치하지 않습니다.');
          return;
        }
        secretToUse = exportSecret;
        encryptedWithPinFlag = false;
      }
    }

    setIsExporting(true);
    try {
      const content = await createEncryptedBackupContent(
        cards,
        effectiveCategories,
        secretToUse,
        encryptedWithPinFlag
      );
      const filename = downloadVaultBackupFile(content, 'eerum');
      const now = Date.now();
      recordBackupCompleted(now);
      setLastBackupAt(now);
      setExportSecret('');
      setExportSecretConfirm('');
      onShowToast(`암호화된 백업 파일(${filename})이 저장되었습니다.`);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : '백업 파일 생성 중 오류가 발생했습니다.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const processSelectedFile = async (file: File) => {
    setRestoreError(null);
    setDecryptedPayload(null);
    setParsedFile(null);
    setDecryptSecret('');
    setSelectedFileName(file.name);

    try {
      const text = await file.text();
      const parsed = parseBackupFileText(text);
      setParsedFile(parsed);
      if (parsed.kind === 'plain') {
        setDecryptedPayload(parsed.payload);
      }
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : '백업 파일을 해석할 수 없습니다.');
    }
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
      setRestoreError('복호화할 PIN 또는 백업 암호를 입력해 주세요.');
      return;
    }

    setIsDecrypting(true);
    try {
      const payload = await decryptBackupEnvelope(parsedFile.envelope, secret);
      setDecryptedPayload(payload);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : '복호화에 실패했습니다.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleConfirmRestore = () => {
    if (!decryptedPayload) return;
    onRestoreBackup(decryptedPayload, restoreMode);
    onClose();
  };

  const resetRestoreSelection = () => {
    setSelectedFileName(null);
    setParsedFile(null);
    setDecryptedPayload(null);
    setDecryptSecret('');
    setRestoreError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-backup-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.08] flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 block mb-1">
              LOCAL-FIRST ENCRYPTED BACKUP
            </span>
            <h3 id="vault-backup-modal-title" className="text-base font-bold text-white tracking-tight">
              보관함 암호화 백업 및 복원
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="px-5 pt-3">
          <div
            role="tablist"
            aria-label="백업 작업 선택"
            className="grid grid-cols-2 p-1 rounded-xl bg-[#0A0A0B] border border-white/10 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'export'}
              onClick={() => setActiveTab('export')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>백업 내보내기</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'restore'}
              onClick={() => setActiveTab('restore')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'restore'
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>백업에서 복원</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'export' ? (
            <form onSubmit={handleExportBackup} className="space-y-4">
              {/* Vault Snapshot Summary */}
              <div className="rounded-xl bg-[#0A0A0B] border border-white/10 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">현재 보관 데이터</span>
                  <span className="font-mono text-white font-semibold tabular-nums">
                    총 {cards.length}장
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] text-center">
                  <div className="rounded-lg bg-white/[0.02] p-2 border border-white/[0.05]">
                    <div className="text-[10px] text-zinc-400">내 명함</div>
                    <div className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                      {myCardCount}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/[0.02] p-2 border border-white/[0.05]">
                    <div className="text-[10px] text-zinc-400">보관 명함</div>
                    <div className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                      {vaultCardCount}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/[0.02] p-2 border border-white/[0.05]">
                    <div className="text-[10px] text-zinc-400">카테고리</div>
                    <div className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                      {effectiveCategories.length}
                    </div>
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>마지막 백업</span>
                  <span className="font-mono text-zinc-300">{formatDateTimeKr(lastBackupAt)}</span>
                </div>
              </div>

              {/* Encryption Configuration */}
              <div className="rounded-xl bg-white/[0.02] border border-white/10 p-3.5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="text-white font-semibold">AES-GCM 256-bit 온디바이스 암호화</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {isPinConfigured && !useCustomPassphrase
                        ? sessionPin
                          ? '현재 활성화된 4자리 앱 PIN 키로 안전하게 암호화된 .eerum 파일을 생성합니다.'
                          : '현재 앱 PIN을 확인한 뒤 PBKDF2-SHA256 키로 암호화된 .eerum 파일을 생성합니다.'
                        : '백업 전용 암호를 설정하여 .eerum 파일을 암호화합니다. 복원 시 동일한 암호가 필요합니다.'}
                    </p>
                  </div>
                </div>

                {isPinConfigured && (
                  <label className="flex items-center gap-2 pt-1 text-[11px] text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useCustomPassphrase}
                      onChange={(e) => {
                        setUseCustomPassphrase(e.target.checked);
                        setExportSecret('');
                        setExportSecretConfirm('');
                        setExportError(null);
                      }}
                      className="rounded border-white/20 bg-[#0A0A0B] text-white focus:ring-0"
                    />
                    <span>앱 PIN 대신 별도의 백업 암호 사용하기</span>
                  </label>
                )}

                {needsManualSecretForExport && (
                  <div className="space-y-2.5 pt-1">
                    {isPinConfigured && !useCustomPassphrase && !sessionPin ? (
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          현재 4자리 앱 PIN 확인
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
                            placeholder="4자리 PIN 입력"
                            className="w-full h-9.5 pl-3 pr-9 rounded-xl bg-[#0A0A0B] border border-white/15 text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowExportSecret((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                            aria-label="암호 표시 전환"
                          >
                            {showExportSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            백업 암호 설정 (최소 4자)
                          </label>
                          <div className="relative">
                            <input
                              type={showExportSecret ? 'text' : 'password'}
                              value={exportSecret}
                              onChange={(e) => {
                                setExportSecret(e.target.value);
                                setExportError(null);
                              }}
                              placeholder="복원 시 입력할 암호"
                              className="w-full h-9.5 pl-3 pr-9 rounded-xl bg-[#0A0A0B] border border-white/15 text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                            />
                            <button
                              type="button"
                              onClick={() => setShowExportSecret((prev) => !prev)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                              aria-label="암호 표시 전환"
                            >
                              {showExportSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            백업 암호 확인
                          </label>
                          <input
                            type={showExportSecret ? 'text' : 'password'}
                            value={exportSecretConfirm}
                            onChange={(e) => {
                              setExportSecretConfirm(e.target.value);
                              setExportError(null);
                            }}
                            placeholder="동일한 암호 다시 입력"
                            className="w-full h-9.5 px-3 rounded-xl bg-[#0A0A0B] border border-white/15 text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {exportError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-3 py-2 text-[11px] text-rose-200 flex items-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{exportError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isExporting || cards.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] shadow-lg"
              >
                <Download className="w-4 h-4 stroke-[2]" />
                <span>{isExporting ? '암호화 백업 생성 중...' : '암호화 백업 파일 저장 (.eerum)'}</span>
              </button>
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
                      ? 'border-white/60 bg-white/[0.06]'
                      : 'border-white/15 hover:border-white/35 bg-[#0A0A0B]'
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-white">
                    <FileKey2 className="w-5 h-5" />
                  </div>
                  <p className="text-white font-semibold mb-1">
                    백업 파일(.eerum / .json) 선택
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    클릭하거나 파일을 이곳에 끌어다 놓아 복원을 시작하세요.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-[#0A0A0B] border border-white/10 p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileKey2 className="w-4 h-4 text-zinc-300 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{selectedFileName}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {parsedFile.kind === 'encrypted' ? 'AES-GCM 암호화됨' : '일반 JSON 백업'}
                        {parsedFile.kind === 'encrypted' && typeof parsedFile.cardCount === 'number'
                          ? ` · 명함 ${parsedFile.cardCount}장`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetRestoreSelection}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[11px] cursor-pointer shrink-0"
                  >
                    파일 변경
                  </button>
                </div>
              )}

              {/* Step 2: Decrypt Prompt when file is encrypted and not yet decrypted */}
              {parsedFile?.kind === 'encrypted' && !decryptedPayload && (
                <form onSubmit={(e) => handleDecryptFile(e)} className="space-y-3">
                  <div className="rounded-xl bg-white/[0.02] border border-white/10 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <Lock className="w-3.5 h-3.5 text-zinc-300" />
                      <span>백업 파일 복호화</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      내보낼 때 사용한 4자리 앱 PIN 또는 백업 암호를 입력하세요.
                    </p>
                    <div className="relative">
                      <input
                        type={showDecryptSecret ? 'text' : 'password'}
                        value={decryptSecret}
                        onChange={(e) => {
                          setDecryptSecret(e.target.value);
                          setRestoreError(null);
                        }}
                        placeholder="PIN 또는 백업 암호 입력"
                        className="w-full h-9.5 pl-3 pr-9 rounded-xl bg-[#0A0A0B] border border-white/15 text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDecryptSecret((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                        aria-label="암호 표시 전환"
                      >
                        {showDecryptSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {sessionPin && (
                      <button
                        type="button"
                        onClick={() => {
                          setDecryptSecret(sessionPin);
                          void handleDecryptFile(undefined, sessionPin);
                        }}
                        className="text-[11px] text-zinc-300 hover:text-white underline underline-offset-2 cursor-pointer"
                      >
                        현재 앱 PIN으로 바로 복호화하기
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isDecrypting || !decryptSecret.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-neutral-950 font-semibold text-xs cursor-pointer"
                  >
                    {isDecrypting ? '복호화 검증 중...' : '복호화 및 내용 확인'}
                  </button>
                </form>
              )}

              {/* Step 3: Preview & Merge/Replace Choice */}
              {decryptedPayload && restorePreview && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-[#0A0A0B] border border-emerald-500/25 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>백업 스키마 검증 완료</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {formatDateTimeKr(restorePreview.exportedAt)}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-300 grid grid-cols-2 gap-y-1 pt-1 border-t border-white/[0.06]">
                      <span>포함된 총 명함:</span>
                      <span className="text-right font-mono font-semibold text-white">
                        {restorePreview.totalIncoming}장 (내 명함 {restorePreview.incomingMyCards} · 보관 {restorePreview.incomingVaultCards})
                      </span>
                      <span>중복 (ID/슬러그 일치):</span>
                      <span className="text-right font-mono text-zinc-400">
                        {restorePreview.duplicateCount}장
                      </span>
                      <span>병합 시 신규 추가:</span>
                      <span className="text-right font-mono font-semibold text-emerald-300">
                        +{restorePreview.newCardsCount}장 (카테고리 +{restorePreview.newCategoriesCount})
                      </span>
                    </div>
                  </div>

                  {/* Merge vs Replace Mode Selector */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-zinc-400">복원 방식 선택</p>

                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                        restoreMode === 'merge'
                          ? 'bg-white/[0.07] border-white/40 text-white'
                          : 'bg-[#0A0A0B] border-white/10 text-zinc-300 hover:border-white/25'
                      }`}
                    >
                      <GitMerge className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                      <div className="space-y-0.5">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>병합 (Merge · 중복 건너뛰기)</span>
                          <span className="text-[10px] font-mono text-emerald-300">권장</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          기존 명함과 카테고리를 보존하고, 중복되지 않는 새 명함만 안전하게 추가합니다.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestoreMode('replace')}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                        restoreMode === 'replace'
                          ? 'bg-amber-500/10 border-amber-400/45 text-white'
                          : 'bg-[#0A0A0B] border-white/10 text-zinc-300 hover:border-white/25'
                      }`}
                    >
                      <RefreshCw className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
                      <div className="space-y-0.5">
                        <div className="font-semibold">전체 교체 (Replace)</div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          현재 기기의 모든 명함과 카테고리를 지우고 백업 파일의 상태로 완전히 복원합니다.
                        </p>
                      </div>
                    </button>
                  </div>

                  {restoreMode === 'replace' && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-[11px] text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        현재 기기에만 저장된 기존 명함 {cards.length}장이 백업 내용으로 대체됩니다.
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-xs cursor-pointer active:scale-[0.99] shadow-lg ${
                      restoreMode === 'replace'
                        ? 'bg-amber-300 hover:bg-amber-200 text-neutral-950'
                        : 'bg-white hover:bg-zinc-200 text-neutral-950'
                    }`}
                  >
                    {restoreMode === 'merge'
                      ? `병합 복원 실행 (+${restorePreview.newCardsCount}장)`
                      : `전체 교체 복원 실행 (${restorePreview.totalIncoming}장)`}
                  </button>
                </div>
              )}

              {restoreError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-3 py-2 text-[11px] text-rose-200 flex items-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
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
