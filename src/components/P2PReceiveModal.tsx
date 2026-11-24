import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Wifi,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  RefreshCw,
  Loader2,
  ArrowDownToLine,
} from 'lucide-react';
import { StoredCard } from '../types/card';
import {
  type P2PConnectionStatus,
  type P2PVaultTransferPayload,
  joinP2PReceiver,
  toBackupPayloadFromP2P,
} from '../utils/p2pSync';
import { computeBackupRestorePreview, formatBytesReadable } from '../utils/vaultBackup';

interface P2PReceiveModalProps {
  isOpen: boolean;
  roomId: string | null;
  existingCards: StoredCard[];
  existingCategories: string[];
  isLocked: boolean;
  isPinConfigured: boolean;
  onApplyPayload: (payload: P2PVaultTransferPayload, mode: 'merge' | 'replace') => void;
  onClose: () => void;
}

function getReceiverStatusLabel(status: P2PConnectionStatus): string {
  switch (status) {
    case 'initializing':
    case 'connecting':
      return '송신 기기와 P2P 연결 협상 중...';
    case 'connected':
      return 'P2P 직접 연결됨';
    case 'transferring':
      return '암호화 채널로 보관함 수신 중...';
    case 'completed':
      return '전송 완료 · SHA-256 무결성 검증됨';
    case 'expired':
      return '연결 코드가 만료되었습니다';
    case 'error':
      return 'P2P 연결에 실패했습니다';
    default:
      return '연결 준비 중...';
  }
}

export const P2PReceiveModal: React.FC<P2PReceiveModalProps> = ({
  isOpen,
  roomId,
  existingCards,
  existingCategories,
  isLocked,
  isPinConfigured,
  onApplyPayload,
  onClose,
}) => {
  const [status, setStatus] = useState<P2PConnectionStatus>('connecting');
  const [progress, setProgress] = useState(0);
  const [receivedBytes, setReceivedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [metaInfo, setMetaInfo] = useState<{
    cardCount: number;
    myCardCount: number;
    vaultCardCount: number;
  } | null>(null);
  const [receivedPayload, setReceivedPayload] = useState<P2PVaultTransferPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'merge' | 'replace'>('merge');
  const [retrySeed, setRetrySeed] = useState(0);

  const isWaitingForUnlock = isPinConfigured && isLocked;

  useEffect(() => {
    if (!isOpen || !roomId || isWaitingForUnlock) return;

    setStatus('connecting');
    setProgress(0);
    setReceivedBytes(0);
    setTotalBytes(0);
    setMetaInfo(null);
    setReceivedPayload(null);
    setErrorMessage(null);
    setSelectedMode('merge');

    const session = joinP2PReceiver({
      roomId,
      onStatusChange: (nextStatus) => setStatus(nextStatus),
      onMeta: (meta) => {
        setTotalBytes(meta.totalBytes);
        setMetaInfo({
          cardCount: meta.cardCount,
          myCardCount: meta.myCardCount,
          vaultCardCount: meta.vaultCardCount,
        });
      },
      onProgress: (pct, bytes, total) => {
        setProgress(pct);
        setReceivedBytes(bytes);
        if (total > 0) setTotalBytes(total);
      },
      onPayloadReceived: (payload) => {
        setReceivedPayload(payload);
      },
      onError: (msg) => {
        setErrorMessage(msg);
      },
    });

    return () => {
      session.close();
    };
  }, [isOpen, roomId, isWaitingForUnlock, retrySeed]);

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

  const preview = useMemo(() => {
    if (!receivedPayload) return null;
    const backupLike = toBackupPayloadFromP2P(receivedPayload);
    return computeBackupRestorePreview(
      backupLike,
      existingCards,
      existingCategories,
      'verified'
    );
  }, [receivedPayload, existingCards, existingCategories]);

  if (!isOpen || !roomId || isWaitingForUnlock) return null;

  const handleConfirmApply = () => {
    if (!receivedPayload) return;
    onApplyPayload(receivedPayload, selectedMode);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="p2p-receive-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--app-border)] flex items-start justify-between gap-3 bg-[var(--app-bg)]">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--app-text-muted)] block mb-1">
              ZERO-SERVER WEBRTC P2P TRANSFER
            </span>
            <h3
              id="p2p-receive-modal-title"
              className="text-base font-bold text-[var(--app-text)] tracking-tight"
            >
              P2P 기기 직접 수신
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {!receivedPayload ? (
            <div className="space-y-4">
              {/* Live Connection & Progress Panel */}
              <div className="rounded-xl bg-[var(--app-bg)] border border-[var(--app-border)] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {errorMessage ? (
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : status === 'connected' || status === 'transferring' ? (
                      <ArrowDownToLine className="w-4 h-4 text-emerald-500 shrink-0 animate-bounce" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-[var(--app-accent)] shrink-0 animate-spin" />
                    )}
                    <span className="font-semibold text-[var(--app-text)] truncate">
                      {getReceiverStatusLabel(status)}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--app-text-muted)] shrink-0">
                    #{roomId}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-2 rounded-full bg-[var(--app-surface-subtle)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--app-accent)] transition-all duration-150 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--app-text-muted)]">
                    <span>
                      {metaInfo
                        ? `총 ${metaInfo.cardCount}장 (내 명함 ${metaInfo.myCardCount} · 보관 ${metaInfo.vaultCardCount})`
                        : 'WebRTC DataChannel 핸드셰이크 대기 중'}
                    </span>
                    <span className="tabular-nums font-semibold text-[var(--app-text)]">
                      {progress}%
                      {totalBytes > 0
                        ? ` (${formatBytesReadable(receivedBytes)} / ${formatBytesReadable(totalBytes)})`
                        : ''}
                    </span>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 space-y-2.5 text-[11px]"
                >
                  <p className="text-rose-700 dark:text-rose-200 leading-relaxed">
                    {errorMessage}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRetrySeed((prev) => prev + 1)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)] text-[var(--app-text)] font-medium cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>다시 연결 시도</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3 py-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-[var(--app-surface-subtle)]/60 border border-[var(--app-border)] p-3 flex items-start gap-2 text-[11px] text-[var(--app-text-muted)]">
                <Wifi className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--app-text)]" />
                <p className="leading-relaxed">
                  명함 데이터와 고해상도 사진은 서버를 거치지 않고 송신 기기에서 이 기기로 16KB 청크 단위로 직접 전송됩니다.
                </p>
              </div>
            </div>
          ) : (
            preview && (
              <div className="space-y-4">
                {/* Verified Incoming Summary */}
                <div className="rounded-xl bg-[var(--app-bg)] border border-emerald-500/35 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>수신 완료 · SHA-256 검증됨</span>
                    </span>
                    <span className="text-[10px] font-mono text-[var(--app-text-muted)]">
                      {formatBytesReadable(totalBytes)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--app-border)] text-center text-[11px]">
                    <div>
                      <div className="text-[10px] text-[var(--app-text-muted)]">수신 총 명함</div>
                      <div className="text-sm font-bold text-[var(--app-text)] font-mono tabular-nums mt-0.5">
                        {preview.totalIncoming}장
                      </div>
                    </div>
                    <div className="border-x border-[var(--app-border)]">
                      <div className="text-[10px] text-[var(--app-text-muted)]">내 명함 / 보관</div>
                      <div className="text-sm font-bold text-[var(--app-text)] font-mono tabular-nums mt-0.5">
                        {preview.incomingMyCards} / {preview.incomingVaultCards}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--app-text-muted)]">신규 / 중복</div>
                      <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums mt-0.5">
                        +{preview.newCardsCount} / {preview.duplicateCount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Merge vs Replace Choice */}
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-[var(--app-text-muted)]">
                    이 기기의 보관함에 반영할 방식을 선택하세요
                  </p>

                  <button
                    type="button"
                    onClick={() => setSelectedMode('merge')}
                    className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                      selectedMode === 'merge'
                        ? 'bg-[var(--app-highlight)]/45 border-[var(--app-accent)]/50 text-[var(--app-text)]'
                        : 'bg-[var(--app-bg)] border-[var(--app-border)] text-[var(--app-text-muted)] hover:border-[var(--app-accent)]/40'
                    }`}
                  >
                    <GitMerge className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[var(--app-text)] flex items-center gap-1.5">
                        <span>병합 (중복 건너뛰기)</span>
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
                          권장
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                        기존 명함을 보존하고 새로운 명함 {preview.newCardsCount}장만 추가합니다. (중복 {preview.duplicateCount}장 건너뜀 · 내 명함 격리 유지)
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode('replace')}
                    className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                      selectedMode === 'replace'
                        ? 'bg-amber-500/15 border-amber-500/50 text-[var(--app-text)]'
                        : 'bg-[var(--app-bg)] border-[var(--app-border)] text-[var(--app-text-muted)] hover:border-[var(--app-accent)]/40'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[var(--app-text)]">덮어쓰기</div>
                      <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                        현재 기기의 보관함을 지우고 수신한 명함 {preview.totalIncoming}장으로 완전히 교체합니다.
                      </p>
                    </div>
                  </button>
                </div>

                {selectedMode === 'replace' && existingCards.length > 0 && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      기존 명함 {existingCards.length}장 보호를 위해 덮어쓰기 직전 브라우저 안전 스냅샷이 자동 저장됩니다.
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium text-xs cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApply}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs cursor-pointer active:scale-[0.99] shadow-md ${
                      selectedMode === 'replace'
                        ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                        : 'bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)]'
                    }`}
                  >
                    {selectedMode === 'merge'
                      ? `병합 반영하기 (+${preview.newCardsCount}장)`
                      : `덮어쓰기 실행 (${preview.totalIncoming}장)`}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
