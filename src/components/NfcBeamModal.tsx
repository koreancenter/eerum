import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Nfc,
  SmartphoneNfc,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Copy,
  Check,
  Loader2,
  UserPlus,
  Share2,
  Sparkles,
} from 'lucide-react';
import { StoredCard } from '@/types/card';
import { getCardShareUrl, getCardDisplayUrl } from '@/utils/cardSerializer';
import { downloadVCard } from '@/utils/cardExporter';
import { shareOrCopyLink } from '@/utils/share';
import {
  beamCardOverNfc,
  buildCardNdefRecords,
  estimateNdefPayloadBytes,
  getWebNfcSupport,
  parseWebNfcError,
  type NfcPayloadMode,
} from '@/utils/webNfc';

type NfcBeamStatus = 'idle' | 'writing' | 'success' | 'error';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: 'release', listener: () => void) => void;
  removeEventListener?: (type: 'release', listener: () => void) => void;
}

export interface NfcBeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: StoredCard;
  onOpenQuickQr?: () => void;
  onShowToast?: (msg: string) => void;
}

export const NfcBeamModal: React.FC<NfcBeamModalProps> = ({
  isOpen,
  onClose,
  card,
  onOpenQuickQr,
  onShowToast,
}) => {
  const [payloadMode, setPayloadMode] = useState<NfcPayloadMode>('url');
  const [status, setStatus] = useState<NfcBeamStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [sharedLink, setSharedLink] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const support = useMemo(() => (isOpen ? getWebNfcSupport() : { supported: false }), [isOpen]);
  const cardUrl = getCardShareUrl(card);
  const displayUrl = getCardDisplayUrl(card) || cardUrl.replace(/^https?:\/\//i, '');
  const data = card.data;
  const primaryName = (data.name || data.nameKr || '디지털 명함').trim();
  const primaryTitle = (data.titleKr || data.title || '').trim();
  const primaryOrg = (data.organizationKr || data.organization || '').trim();

  const estimatedBytes = useMemo(() => {
    if (!isOpen) return 0;
    return estimateNdefPayloadBytes(buildCardNdefRecords(card, payloadMode));
  }, [isOpen, card, payloadMode]);

  // Screen Wake Lock API: prevent screen dimming during in-person NFC tap
  useEffect(() => {
    if (!isOpen) return;
    let isDisposed = false;

    const requestWakeLock = async () => {
      if (typeof navigator === 'undefined') return;
      const navWithWakeLock = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      };
      if (!navWithWakeLock.wakeLock || typeof navWithWakeLock.wakeLock.request !== 'function') {
        return;
      }

      try {
        if (wakeLockRef.current && !wakeLockRef.current.released) {
          return;
        }
        const sentinel = await navWithWakeLock.wakeLock.request('screen');
        if (isDisposed) {
          sentinel.release().catch(() => {});
          return;
        }
        wakeLockRef.current = sentinel;
        setIsWakeLockActive(true);
        sentinel.addEventListener?.('release', () => {
          if (!isDisposed) {
            setIsWakeLockActive(false);
          }
        });
      } catch {
        if (!isDisposed) {
          setIsWakeLockActive(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isDisposed) {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDisposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        wakeLockRef.current.release().catch(() => {});
      }
      wakeLockRef.current = null;
      setIsWakeLockActive(false);
    };
  }, [isOpen]);

  // Cancel any active NFC write on unmount or close and handle Escape
  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setStatus('idle');
      setErrorMessage('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        abortControllerRef.current?.abort();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectMode = (nextMode: NfcPayloadMode) => {
    if (status === 'writing') return;
    setPayloadMode(nextMode);
    if (status === 'success' || status === 'error') {
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const handleCancelBeam = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus('idle');
    setErrorMessage('');
  };

  const handleStartBeam = async () => {
    if (!support.supported) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus('writing');
    setErrorMessage('');

    try {
      await beamCardOverNfc({
        card,
        mode: payloadMode,
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        setStatus('success');
        onShowToast?.(`${primaryName}님의 명함이 NFC로 전송되었습니다.`);
      }
    } catch (err) {
      const parsed = parseWebNfcError(err);
      if (parsed.cancelled) {
        setStatus('idle');
        setErrorMessage('');
      } else {
        setStatus('error');
        setErrorMessage(parsed.message);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleSaveVCard = () => {
    downloadVCard(data);
    onShowToast?.(`${primaryName}님의 연락처(.vcf)가 저장되었습니다.`);
  };

  const handleWebShare = async () => {
    await shareOrCopyLink({
      title: primaryOrg ? `${primaryName} — ${primaryOrg}` : primaryName,
      text: [primaryOrg, primaryTitle, primaryName, '디지털 명함'].filter(Boolean).join(' '),
      url: cardUrl,
      onCopied: () => {
        setSharedLink(true);
        setTimeout(() => setSharedLink(false), 2000);
        onShowToast?.('명함 링크가 클립보드에 복사되었습니다.');
      },
      onCopyError: () => onShowToast?.('명함 링크 복사에 실패했습니다.'),
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopiedLink(true);
      onShowToast?.('명함 링크가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      onShowToast?.('링크 복사에 실패했습니다.');
    }
  };

  const handleCloseSafely = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    onClose();
  };

  const handleSwitchToQuickQr = () => {
    handleCloseSafely();
    onOpenQuickQr?.();
  };

  const captionText =
    payloadMode === 'vcard'
      ? `${data.phone || data.email || displayUrl} · ${estimatedBytes} B`
      : `${displayUrl} · ${estimatedBytes} B`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="NFC 명함 패스"
      className="fixed inset-0 z-50 bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col justify-between overflow-y-auto pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] animate-in fade-in duration-150"
    >
      {/* Top Pass Header (Identical Spec to Quick QR Pass) */}
      <div className="w-full max-w-md mx-auto px-5 pt-3 pb-1 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isWakeLockActive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[10px] text-emerald-700 dark:text-emerald-300 font-medium whitespace-nowrap">
              <Sparkles className="w-2.5 h-2.5 shrink-0" />
              <span>화면 켜짐 유지</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCloseSafely}
          className="min-w-[44px] min-h-[44px] -mr-2 rounded-xl flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          title="NFC 공유 닫기"
          aria-label="NFC 공유 닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Pass Body (Exact 290px Geometry & Vertical Rhythm of Quick QR) */}
      <div className="w-full max-w-md mx-auto px-5 py-2 pb-6 flex-1 flex flex-col items-center justify-center gap-3.5 sm:gap-4">
        {/* Minimal Border-Bottom Payload Type Switcher */}
        <div
          role="tablist"
          aria-label="NFC 전송 데이터 형식"
          className="w-full max-w-[290px] flex items-center justify-center gap-5 border-b border-[var(--app-border)]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={payloadMode === 'url'}
            disabled={status === 'writing'}
            onClick={() => handleSelectMode('url')}
            className={`relative pb-2.5 text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 focus-visible:outline-none ${
              payloadMode === 'url'
                ? 'text-[var(--app-text)] font-semibold'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
            }`}
          >
            명함 링크
            {payloadMode === 'url' && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--app-accent)]" />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={payloadMode === 'vcard'}
            disabled={status === 'writing'}
            onClick={() => handleSelectMode('vcard')}
            className={`relative pb-2.5 text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 focus-visible:outline-none ${
              payloadMode === 'vcard'
                ? 'text-[var(--app-text)] font-semibold'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
            }`}
          >
            연락처(.vcf)
            {payloadMode === 'vcard' && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--app-accent)]" />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={payloadMode === 'both'}
            disabled={status === 'writing'}
            onClick={() => handleSelectMode('both')}
            className={`relative pb-2.5 text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 focus-visible:outline-none ${
              payloadMode === 'both'
                ? 'text-[var(--app-text)] font-semibold'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
            }`}
          >
            링크 + 연락처
            {payloadMode === 'both' && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--app-accent)]" />
            )}
          </button>
        </div>

        {/* 290x290 Square NFC Plate (Matches Quick QR Plate Proportions) */}
        <div className="w-full max-w-[290px] aspect-square bg-[var(--app-surface)] rounded-xl p-6 shadow-[var(--app-shadow)] ring-1 ring-black/5 border border-[var(--app-border)] flex flex-col items-center justify-center text-center">
          {!support.supported ? (
            <div className="w-full flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-text-muted)]">
                <Nfc className="w-6 h-6 stroke-[1.5]" />
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-[var(--app-text)] tracking-tight">
                  {support.reason === 'insecure-context'
                    ? 'HTTPS 연결 필요'
                    : 'Web NFC 미지원'}
                </p>
                <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed max-w-[210px] mx-auto">
                  Android Chrome 또는 설치된 PWA에서 직접 NFC 전송이 가능합니다.
                </p>
              </div>

              {onOpenQuickQr && (
                <button
                  type="button"
                  onClick={handleSwitchToQuickQr}
                  className="h-9 px-4 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                >
                  <QrCode className="w-3.5 h-3.5 shrink-0" />
                  <span>Quick QR 열기</span>
                </button>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center gap-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                {status === 'writing' && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full border border-[var(--app-accent)]/40 animate-ping"
                  />
                )}
                <div
                  className={`relative w-14 h-14 rounded-2xl border flex items-center justify-center transition-colors ${
                    status === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
                      : status === 'error'
                        ? 'bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300'
                        : status === 'writing'
                          ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] border-[var(--app-accent)]'
                          : 'bg-[var(--app-surface-subtle)] border-[var(--app-border)] text-[var(--app-text)]'
                  }`}
                >
                  {status === 'writing' ? (
                    <SmartphoneNfc className="w-6 h-6 stroke-[1.75]" />
                  ) : status === 'success' ? (
                    <CheckCircle2 className="w-6 h-6 stroke-[1.75]" />
                  ) : status === 'error' ? (
                    <AlertCircle className="w-6 h-6 stroke-[1.75]" />
                  ) : (
                    <Nfc className="w-6 h-6 stroke-[1.5]" />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--app-text)] tracking-tight">
                  {status === 'writing'
                    ? 'NFC 대기 중...'
                    : status === 'success'
                      ? '전송 완료'
                      : status === 'error'
                        ? 'NFC 전송 실패'
                        : 'NFC 전송 준비'}
                </p>
                <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed max-w-[215px] mx-auto line-clamp-2">
                  {status === 'writing'
                    ? '상대방 기기 뒷면이나 태그에 1~2초간 가까이 대세요.'
                    : status === 'success'
                      ? '상대방 기기에서 바로 명함을 확인할 수 있습니다.'
                      : status === 'error'
                        ? errorMessage
                        : '시작 버튼을 누른 뒤 기기를 가까이 대세요.'}
                </p>
              </div>

              {status === 'writing' ? (
                <button
                  type="button"
                  onClick={handleCancelBeam}
                  className="h-9 px-4 rounded-xl bg-[var(--app-surface-subtle)] hover:bg-[var(--app-border)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>대기 취소</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartBeam}
                  className="h-9 px-4 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                >
                  <SmartphoneNfc className="w-3.5 h-3.5 stroke-[2] shrink-0" />
                  <span>
                    {status === 'success'
                      ? '다시 전송'
                      : status === 'error'
                        ? '다시 시도'
                        : 'NFC 전송 시작'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Monospace URL / Payload Caption */}
        <p className="text-xs text-[var(--app-text-muted)] font-mono truncate max-w-full px-2">
          {captionText}
        </p>

        {/* Centered Icon-Only Bottom Toolbar (Matches Quick QR Pass Toolbar) */}
        <div
          role="toolbar"
          aria-label="NFC 공유 빠른 작업"
          className="w-full flex items-center justify-center gap-1.5 sm:gap-2.5 pt-1"
        >
          <button
            type="button"
            onClick={handleSaveVCard}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title="연락처 저장 (.vcf)"
            aria-label="연락처 저장 (.vcf)"
          >
            <UserPlus className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={handleWebShare}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title={sharedLink ? '링크 복사됨' : '공유하기'}
            aria-label={sharedLink ? '링크 복사됨' : '공유하기'}
          >
            {sharedLink ? (
              <Check className="w-4 h-4 stroke-[2] text-emerald-500" />
            ) : (
              <Share2 className="w-4 h-4 stroke-[1.75]" />
            )}
          </button>

          <span className="border-r border-[var(--app-border)] h-3.5 mx-0.5 self-center" aria-hidden="true" />

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title={copiedLink ? '링크 복사됨' : '링크 복사'}
            aria-label={copiedLink ? '링크 복사됨' : '링크 복사'}
          >
            {copiedLink ? (
              <Check className="w-4 h-4 stroke-[2] text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 stroke-[1.75]" />
            )}
          </button>

          {onOpenQuickQr && (
            <button
              type="button"
              onClick={handleSwitchToQuickQr}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              title="Quick QR 패스로 전환"
              aria-label="Quick QR 패스로 전환"
            >
              <QrCode className="w-4 h-4 stroke-[1.75]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
