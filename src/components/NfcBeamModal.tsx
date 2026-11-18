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
} from 'lucide-react';
import { StoredCard } from '@/types/card';
import { getCardShareUrl, getCardDisplayUrl } from '@/utils/cardSerializer';
import {
  beamCardOverNfc,
  buildCardNdefRecords,
  estimateNdefPayloadBytes,
  getWebNfcSupport,
  parseWebNfcError,
  type NfcPayloadMode,
} from '@/utils/webNfc';

type NfcBeamStatus = 'idle' | 'writing' | 'success' | 'error';

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
  const [copied, setCopied] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const support = useMemo(() => (isOpen ? getWebNfcSupport() : { supported: false }), [isOpen]);
  const cardUrl = getCardShareUrl(card);
  const displayUrl = getCardDisplayUrl(card) || cardUrl.replace(/^https?:\/\//i, '');
  const primaryName = (card.data.name || card.data.nameKr || '디지털 명함').trim();
  const subtitle = [
    card.data.titleKr || card.data.title,
    card.data.organizationKr || card.data.organization,
  ]
    .filter(Boolean)
    .join(' · ');

  const estimatedBytes = useMemo(() => {
    if (!isOpen) return 0;
    return estimateNdefPayloadBytes(buildCardNdefRecords(card, payloadMode));
  }, [isOpen, card, payloadMode]);

  // Cancel any active NFC write on unmount or close
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

  const handleCopyFallback = async () => {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied(true);
      onShowToast?.('명함 링크가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast?.('링크 복사에 실패했습니다.');
    }
  };

  const handleCloseSafely = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--app-overlay)] backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
      onClick={handleCloseSafely}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Web NFC 명함 전송"
        className="relative w-full max-w-[400px] max-h-[92dvh] overflow-y-auto bg-[var(--app-surface)] border border-[var(--app-border)] rounded-3xl px-5 py-6 sm:px-7 sm:py-7 shadow-2xl flex flex-col items-center my-auto text-[var(--app-text)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleCloseSafely}
          className="absolute top-3.5 right-3.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] rounded-full hover:bg-[var(--app-surface-subtle)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          title="닫기"
          aria-label="닫기"
        >
          <X className="w-4 h-4 stroke-[1.75]" />
        </button>

        {/* Header */}
        <div className="w-full text-center px-8 mb-5">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--app-text-muted)] mb-1">
            <Nfc className="w-3.5 h-3.5 text-[var(--app-accent)]" />
            <span>WEB NFC BEAM</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-[var(--app-text)] tracking-tight truncate">
            {primaryName}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--app-text-muted)] mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        {/* NDEF Payload Format Selector */}
        <div className="w-full space-y-2 mb-5">
          <div
            role="tablist"
            aria-label="NFC 전송 데이터 형식"
            className="w-full grid grid-cols-3 p-1 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={payloadMode === 'url'}
              disabled={status === 'writing'}
              onClick={() => {
                setPayloadMode('url');
                if (status === 'success' || status === 'error') {
                  setStatus('idle');
                  setErrorMessage('');
                }
              }}
              className={`py-2 px-2 rounded-lg text-[11px] cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                payloadMode === 'url'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
              }`}
            >
              명함 링크
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={payloadMode === 'vcard'}
              disabled={status === 'writing'}
              onClick={() => {
                setPayloadMode('vcard');
                if (status === 'success' || status === 'error') {
                  setStatus('idle');
                  setErrorMessage('');
                }
              }}
              className={`py-2 px-2 rounded-lg text-[11px] cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                payloadMode === 'vcard'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
              }`}
            >
              연락처 vCard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={payloadMode === 'both'}
              disabled={status === 'writing'}
              onClick={() => {
                setPayloadMode('both');
                if (status === 'success' || status === 'error') {
                  setStatus('idle');
                  setErrorMessage('');
                }
              }}
              className={`py-2 px-2 rounded-lg text-[11px] cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                payloadMode === 'both'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
              }`}
            >
              링크 + 연락처
            </button>
          </div>

          <p className="text-[11px] text-[var(--app-text-muted)] text-center">
            {payloadMode === 'url'
              ? `태핑 즉시 ${displayUrl} 명함 페이지가 열립니다`
              : payloadMode === 'vcard'
                ? '오프라인에서도 연락처(.vcf) 정보가 바로 전달됩니다'
                : '웹 명함 링크와 연락처 데이터를 함께 전송합니다'}
            <span className="ml-1.5 font-mono opacity-80">({estimatedBytes} B)</span>
          </p>
        </div>

        {/* NFC Stage */}
        {!support.supported ? (
          <div className="w-full rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-5 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-text)]">
              <Nfc className="w-6 h-6 stroke-[1.5]" />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[var(--app-text)]">
                {support.reason === 'insecure-context'
                  ? 'HTTPS 보안 연결이 필요합니다'
                  : '현재 브라우저에서 Web NFC를 지원하지 않습니다'}
              </p>
              <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                Web NFC 직접 전송은 Android용 Chrome (HTTPS) 및 설치된 PWA 앱에서 지원됩니다.
                아래 Quick QR 패스나 링크 복사로 즉시 명함을 공유할 수 있습니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {onOpenQuickQr && (
                <button
                  type="button"
                  onClick={() => {
                    handleCloseSafely();
                    onOpenQuickQr();
                  }}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 shrink-0" />
                  <span>Quick QR 열기</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyFallback}
                className={`min-h-[42px] px-3 py-2 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-border)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                  onOpenQuickQr ? '' : 'col-span-2'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>링크 복사</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-5 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              {status === 'writing' && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border border-[var(--app-accent)]/40 animate-ping"
                />
              )}
              <div
                className={`relative w-14 h-14 rounded-2xl border flex items-center justify-center ${
                  status === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
                    : status === 'error'
                      ? 'bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300'
                      : status === 'writing'
                        ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] border-[var(--app-accent)]'
                        : 'bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text)]'
                }`}
              >
                {status === 'writing' ? (
                  <SmartphoneNfc className="w-6 h-6 stroke-[1.75]" />
                ) : status === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 stroke-[1.75]" />
                ) : status === 'error' ? (
                  <AlertCircle className="w-6 h-6 stroke-[1.75]" />
                ) : (
                  <Nfc className="w-6 h-6 stroke-[1.75]" />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--app-text)]">
                {status === 'writing'
                  ? 'NFC 기기 또는 태그를 대기 중입니다...'
                  : status === 'success'
                    ? '명함 데이터 전송 완료'
                    : status === 'error'
                      ? 'NFC 전송에 실패했습니다'
                      : 'NFC로 내 명함 바로 보내기'}
              </p>
              <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                {status === 'writing'
                  ? '상대방 스마트폰 뒷면 상단 또는 NFC 태그에 기기를 1~2초간 가까이 대세요.'
                  : status === 'success'
                    ? '상대방 기기에서 바로 명함 링크 또는 연락처를 확인할 수 있습니다.'
                    : status === 'error'
                      ? errorMessage
                      : '전송 시작을 누른 뒤 상대방 NFC 지원 스마트폰이나 명함 태그에 가까이 대세요.'}
              </p>
            </div>

            {status === 'writing' ? (
              <button
                type="button"
                onClick={handleCancelBeam}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-border)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>NFC 대기 취소</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleStartBeam}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99]"
                >
                  <SmartphoneNfc className="w-4 h-4 stroke-[2] shrink-0" />
                  <span>
                    {status === 'success'
                      ? '다시 NFC 전송하기'
                      : status === 'error'
                        ? 'NFC 전송 다시 시도'
                        : 'NFC 전송 시작'}
                  </span>
                </button>

                {status === 'error' && onOpenQuickQr && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseSafely();
                      onOpenQuickQr();
                    }}
                    className="w-full min-h-[38px] px-3 py-2 rounded-xl bg-[var(--app-surface)] hover:bg-[var(--app-border)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                    <span>Quick QR 패스로 전환</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
