import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Copy,
  Check,
  X,
  Wifi,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { StoredCard } from '../types/card';
import { getOrCreateSyncId } from '../utils/syncWallet';
import { formatBytesReadable } from '../utils/vaultBackup';
import {
  type P2PConnectionStatus,
  extractP2PRoomIdFromInput,
  isWebRTCP2PSupported,
  startP2PSender,
} from '../utils/p2pSync';

type SyncModalTab = 'p2p' | 'cloud';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards?: StoredCard[];
  categories?: string[];
  onJoinP2PRoom?: (roomId: string) => void;
  onShowToast?: (msg: string) => void;
}

function getSenderStatusText(status: P2PConnectionStatus): string {
  switch (status) {
    case 'initializing':
      return 'P2P 연결 코드 생성 중...';
    case 'waiting':
      return '상대 기기 스캔 대기 중';
    case 'connecting':
      return '상대 기기와 직접 연결 중...';
    case 'connected':
    case 'transferring':
      return 'P2P 직접 연결됨';
    case 'completed':
      return '전송 완료';
    case 'expired':
      return '연결 코드 유효 시간 만료';
    case 'error':
      return '연결 오류';
  }
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  cards = [],
  categories,
  onJoinP2PRoom,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<SyncModalTab>('p2p');
  const [p2pSubMode, setP2pSubMode] = useState<'send' | 'receive'>('send');
  const [manualRoomInput, setManualRoomInput] = useState('');
  const [manualRoomError, setManualRoomError] = useState<string | null>(null);

  // P2P Sender state
  const p2pSupported = useMemo(() => isWebRTCP2PSupported(), []);
  const [senderSeed, setSenderSeed] = useState(0);
  const [p2pRoomId, setP2PRoomId] = useState('');
  const [p2pUrl, setP2PUrl] = useState('');
  const [p2pQrSrc, setP2PQrSrc] = useState('');
  const [p2pStatus, setP2PStatus] = useState<P2PConnectionStatus>('initializing');
  const [p2pProgress, setP2PProgress] = useState(0);
  const [p2pTransferredBytes, setP2PTransferredBytes] = useState(0);
  const [p2pTotalBytes, setP2PTotalBytes] = useState(0);
  const [p2pError, setP2PError] = useState<string | null>(null);
  const [copiedP2P, setCopiedP2P] = useState(false);

  // Cloud Relay (?sync=) state
  const [cloudQrSrc, setCloudQrSrc] = useState('');
  const [copiedCloud, setCopiedCloud] = useState(false);
  const syncId = getOrCreateSyncId();
  const syncUrl = typeof window !== 'undefined' ? `${window.location.origin}?sync=${syncId}` : '';

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('p2p');
    setP2pSubMode('send');
    setManualRoomInput('');
    setManualRoomError(null);
  }, [isOpen]);

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

  // Start WebRTC P2P Sender session when on P2P send tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'p2p' || p2pSubMode !== 'send' || !p2pSupported) {
      return;
    }

    if (cards.length === 0) {
      setP2PStatus('error');
      setP2PError('전송할 명함 데이터가 없습니다.');
      return;
    }

    setP2PStatus('initializing');
    setP2PProgress(0);
    setP2PTransferredBytes(0);
    setP2PTotalBytes(0);
    setP2PError(null);
    setP2PQrSrc('');

    const session = startP2PSender({
      cards,
      categories,
      onRoomReady: ({ roomId, pairingUrl }) => {
        setP2PRoomId(roomId);
        setP2PUrl(pairingUrl);
      },
      onStatusChange: (nextStatus) => {
        setP2PStatus(nextStatus);
      },
      onProgress: (pct, transferred, total) => {
        setP2PProgress(pct);
        setP2PTransferredBytes(transferred);
        if (total > 0) setP2PTotalBytes(total);
      },
      onComplete: ({ cardCount }) => {
        onShowToast?.(`P2P 직접 전송으로 명함 ${cardCount}장을 안전하게 보냈습니다.`);
      },
      onError: (msg) => {
        setP2PError(msg);
      },
    });

    setP2PRoomId(session.roomId);
    setP2PUrl(session.pairingUrl);

    return () => {
      session.close();
    };
  }, [isOpen, activeTab, p2pSubMode, p2pSupported, senderSeed, cards, categories, onShowToast]);

  // Render P2P pairing QR
  useEffect(() => {
    if (!isOpen || !p2pUrl) return;
    let active = true;
    QRCode.toDataURL(p2pUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0A0A0B',
        light: '#FAFAFA',
      },
    }).then((dataUrl) => {
      if (active) setP2PQrSrc(dataUrl);
    });
    return () => {
      active = false;
    };
  }, [isOpen, p2pUrl]);

  // Render Cloud Relay QR
  useEffect(() => {
    if (!isOpen || !syncUrl) return;
    let active = true;
    QRCode.toDataURL(syncUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0A0A0B',
        light: '#FAFAFA',
      },
    }).then((dataUrl) => {
      if (active) setCloudQrSrc(dataUrl);
    });
    return () => {
      active = false;
    };
  }, [isOpen, syncUrl]);

  if (!isOpen) return null;

  const handleCopyP2P = () => {
    if (!p2pUrl) return;
    navigator.clipboard.writeText(p2pUrl);
    setCopiedP2P(true);
    setTimeout(() => setCopiedP2P(false), 2000);
  };

  const handleCopyCloud = () => {
    if (!syncUrl) return;
    navigator.clipboard.writeText(syncUrl);
    setCopiedCloud(true);
    setTimeout(() => setCopiedCloud(false), 2000);
  };

  const handleJoinManualRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setManualRoomError(null);
    const parsedRoomId = extractP2PRoomIdFromInput(manualRoomInput);
    if (!parsedRoomId) {
      setManualRoomError('올바른 6~32자 P2P 연결 코드 또는 페어링 URL을 입력해 주세요.');
      return;
    }
    onClose();
    onJoinP2PRoom?.(parsedRoomId);
  };

  const statusToneClass =
    p2pStatus === 'completed' || p2pStatus === 'connected' || p2pStatus === 'transferring'
      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
      : p2pStatus === 'expired' || p2pStatus === 'error'
        ? 'text-rose-700 dark:text-rose-200 bg-rose-500/10 border-rose-500/30'
        : 'text-[var(--app-text)] bg-[var(--app-surface-subtle)] border-[var(--app-border)]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-sync-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl w-full max-w-md relative shadow-2xl text-[var(--app-text)] overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--app-border)] flex items-start justify-between gap-3 bg-[var(--app-bg)]">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--app-text-muted)] block mb-1">
              CROSS-DEVICE VAULT TRANSFER
            </span>
            <h3
              id="device-sync-modal-title"
              className="text-base font-bold text-[var(--app-text)] tracking-tight"
            >
              기기 연결 및 보관함 전송
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Tab Switcher */}
        <div className="px-5 pt-3 border-b border-[var(--app-border)] flex gap-5">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'p2p'}
            onClick={() => setActiveTab('p2p')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'p2p'
                ? 'border-[var(--app-accent)] text-[var(--app-text)]'
                : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>P2P 직접 전송</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              권장
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cloud'}
            onClick={() => setActiveTab('cloud')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-[var(--app-accent)] text-[var(--app-text)]'
                : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>클라우드 릴레이 동기화</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'p2p' ? (
            <div className="space-y-4">
              {/* Sub-mode switcher: Send QR vs Enter Room Code */}
              {onJoinP2PRoom && (
                <div className="flex items-center justify-between text-[11px] bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setP2pSubMode('send')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      p2pSubMode === 'send'
                        ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-xs border border-[var(--app-border)]'
                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    이 기기에서 보내기 (QR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setP2pSubMode('receive')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      p2pSubMode === 'receive'
                        ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-xs border border-[var(--app-border)]'
                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    연결 코드로 받기
                  </button>
                </div>
              )}

              {p2pSubMode === 'send' ? (
                <>
                  <div className="rounded-xl bg-[var(--app-bg)] border border-[var(--app-border)] p-3 flex items-start gap-2 text-[11px] text-[var(--app-text-muted)]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-[var(--app-text)]">Zero-Server 직접 전송:</strong> 서버에 명함 데이터를 저장하지 않고 WebRTC 암호화 채널로 기기 간 직접 전송합니다.
                    </p>
                  </div>

                  {/* Live Status & Progress */}
                  <div className={`rounded-xl border p-3 space-y-2 ${statusToneClass}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold inline-flex items-center gap-1.5">
                        {p2pStatus === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {(p2pStatus === 'expired' || p2pStatus === 'error') && (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        <span>{getSenderStatusText(p2pStatus)}</span>
                      </span>
                      <span className="font-mono text-[10px] opacity-80">
                        코드 {p2pRoomId || '...'}
                      </span>
                    </div>

                    {/* Real-time progress bar */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-[var(--app-accent)] transition-all duration-150 ease-out"
                          style={{ width: `${p2pProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono opacity-80">
                        <span>
                          {p2pTotalBytes > 0
                            ? `${formatBytesReadable(p2pTransferredBytes)} / ${formatBytesReadable(p2pTotalBytes)}`
                            : `보관함 ${cards.length}장 대기`}
                        </span>
                        <span className="tabular-nums font-semibold">{p2pProgress}%</span>
                      </div>
                    </div>
                  </div>

                  {p2pError && (
                    <div
                      role="alert"
                      className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-[11px] text-rose-700 dark:text-rose-200 flex items-center justify-between gap-2"
                    >
                      <span>{p2pError}</span>
                      <button
                        type="button"
                        onClick={() => setSenderSeed((prev) => prev + 1)}
                        className="shrink-0 px-2.5 py-1 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] font-medium cursor-pointer inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>새 코드</span>
                      </button>
                    </div>
                  )}

                  {/* Pairing QR Code */}
                  {p2pQrSrc && p2pStatus !== 'expired' && p2pStatus !== 'error' && (
                    <div className="text-center space-y-3">
                      <div className="bg-[#FAFAFA] border border-black/5 p-3 rounded-xl inline-block mx-auto shadow-md">
                        <img src={p2pQrSrc} alt="P2P Pairing QR" className="w-44 h-44 block" />
                      </div>
                      <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                        받는 기기의 카메라로 QR을 스캔하거나 아래 링크를 여세요. (보안 유효시간 60초)
                      </p>
                    </div>
                  )}

                  {/* Copyable Pairing URL & Refresh */}
                  <div className="flex items-center gap-2 bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-xl p-2 px-3 text-xs">
                    <span className="truncate text-[var(--app-text-muted)] font-mono flex-1 text-[11px]">
                      {p2pUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyP2P}
                      className="text-[var(--app-text)] hover:bg-[var(--app-border)] rounded-lg p-1.5 transition flex items-center gap-1 cursor-pointer"
                      title="P2P 페어링 링크 복사"
                      aria-label="P2P 페어링 링크 복사"
                    >
                      {copiedP2P ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSenderSeed((prev) => prev + 1)}
                      className="text-[var(--app-text)] hover:bg-[var(--app-border)] rounded-lg p-1.5 transition flex items-center gap-1 cursor-pointer"
                      title="새 연결 코드 생성"
                      aria-label="새 연결 코드 생성"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleJoinManualRoom} className="space-y-3">
                  <div className="rounded-xl bg-[var(--app-bg)] border border-[var(--app-border)] p-3.5 space-y-2.5">
                    <label
                      htmlFor="p2p-manual-room-input"
                      className="block text-[11px] font-medium text-[var(--app-text)]"
                    >
                      송신 기기의 연결 코드 또는 페어링 링크 입력
                    </label>
                    <input
                      id="p2p-manual-room-input"
                      type="text"
                      value={manualRoomInput}
                      onChange={(e) => {
                        setManualRoomInput(e.target.value);
                        setManualRoomError(null);
                      }}
                      placeholder="예: a8k3m9x2p1 또는 https://.../?p2p=..."
                      className="w-full h-10 px-3 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]/70 focus:outline-none focus:border-[var(--app-accent)] font-mono text-xs"
                    />
                    {manualRoomError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400">
                        {manualRoomError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!manualRoomInput.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--app-accent)] hover:opacity-90 disabled:opacity-40 text-[var(--app-accent-fg)] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>P2P 수신 연결 시작</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Tab 2: Cloud Relay Sync (Async QR via ?sync=) */
            <div className="space-y-4 text-center">
              <div className="rounded-xl bg-[var(--app-bg)] border border-[var(--app-border)] p-3 text-left text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                두 기기가 동시에 켜져 있지 않을 때 사용하는 비동기 릴레이 동기화입니다. QR 코드를 스캔하면 D1 릴레이에 보관된 동기화 보관함을 불러옵니다.
              </div>

              {cloudQrSrc && (
                <div className="bg-[#FAFAFA] border border-black/5 p-3 rounded-xl inline-block mx-auto shadow-md">
                  <img src={cloudQrSrc} alt="Cloud Relay Sync QR" className="w-44 h-44 block" />
                </div>
              )}

              <div className="flex items-center gap-2 bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-xl p-2 px-3 text-xs text-left">
                <span className="truncate text-[var(--app-text-muted)] font-mono flex-1 text-[11px]">
                  {syncUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCloud}
                  className="text-[var(--app-text)] hover:bg-[var(--app-border)] rounded-lg p-1.5 transition flex items-center gap-1 cursor-pointer"
                  title="동기화 링크 복사"
                  aria-label="동기화 링크 복사"
                >
                  {copiedCloud ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};