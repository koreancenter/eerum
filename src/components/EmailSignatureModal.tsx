import React, { useEffect, useState } from 'react';
import {
  X,
  ArrowLeft,
  Mail,
  Copy,
  Check,
  Code2,
  Sun,
  Moon,
  QrCode,
} from 'lucide-react';
import { StoredCard } from '@/types/card';
import {
  copyRichEmailSignature,
  generateEmailSignatureBundle,
  type EmailSignatureBundle,
  type EmailSignatureTheme,
} from '@/utils/emailSignature';

export interface EmailSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: StoredCard;
  isSubModal?: boolean;
  onShowToast?: (msg: string) => void;
}

export const EmailSignatureModal: React.FC<EmailSignatureModalProps> = ({
  isOpen,
  onClose,
  card,
  isSubModal = false,
  onShowToast,
}) => {
  const [signatureTheme, setSignatureTheme] = useState<EmailSignatureTheme>('light');
  const [includeQrBadge, setIncludeQrBadge] = useState<boolean>(true);
  const [showRawHtml, setShowRawHtml] = useState<boolean>(false);
  const [bundle, setBundle] = useState<EmailSignatureBundle | null>(null);
  const [copiedRich, setCopiedRich] = useState<boolean>(false);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    generateEmailSignatureBundle(card, {
      theme: signatureTheme,
      includeQrBadge,
    }).then((result) => {
      if (!cancelled) {
        setBundle(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, card, signatureTheme, includeQrBadge]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyRich = async () => {
    if (!bundle) return;
    try {
      const mode = await copyRichEmailSignature(bundle.html, bundle.plainText);
      setCopiedRich(true);
      onShowToast?.(
        mode === 'text'
          ? 'HTML 서명이 클립보드에 복사되었습니다.'
          : '서식 포함 이메일 서명이 복사되었습니다. Gmail · Apple Mail · Outlook 설정에 바로 붙여넣으세요.'
      );
      window.setTimeout(() => setCopiedRich(false), 2400);
    } catch {
      onShowToast?.('이메일 서명 복사에 실패했습니다.');
    }
  };

  const handleCopyRawHtml = async () => {
    if (!bundle) return;
    try {
      await navigator.clipboard.writeText(bundle.html);
      setCopiedHtml(true);
      onShowToast?.('원본 HTML 테이블 코드가 복사되었습니다.');
      window.setTimeout(() => setCopiedHtml(false), 2000);
    } catch {
      onShowToast?.('HTML 코드 복사에 실패했습니다.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--app-overlay)] backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="HTML 이메일 서명 생성기"
        className="w-full max-w-[600px] max-h-[92dvh] flex flex-col bg-[var(--app-surface)] border border-[var(--app-border)] rounded-3xl overflow-hidden shadow-2xl text-[var(--app-text)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--app-border)] flex items-center justify-between gap-3 shrink-0 bg-[var(--app-bg)]">
          <div className="flex items-center gap-2.5 min-w-0">
            {isSubModal && (
              <button
                type="button"
                onClick={onClose}
                className="min-w-[36px] min-h-[36px] -ml-1 flex items-center justify-center rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                title="돌아가기"
                aria-label="돌아가기"
              >
                <ArrowLeft className="w-4 h-4 stroke-[1.75]" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[var(--app-text-muted)] shrink-0" />
                <h3 className="text-base font-semibold text-[var(--app-text)] tracking-tight truncate">
                  이메일 서명 생성기
                </h3>
              </div>
              <p className="text-[11px] text-[var(--app-text-muted)] mt-0.5 truncate">
                Gmail · Apple Mail · Outlook 호환 인라인 HTML 테이블 서명
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title="닫기"
            aria-label="닫기"
          >
            <X className="w-5 h-5 stroke-[1.75]" />
          </button>
        </div>

        {/* Options Bar */}
        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-[var(--app-border)] flex flex-wrap items-center justify-between gap-2 shrink-0 bg-[var(--app-surface-subtle)]">
          <div
            role="group"
            aria-label="서명 배경 스타일"
            className="inline-flex items-center p-1 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)]"
          >
            <button
              type="button"
              onClick={() => setSignatureTheme('light')}
              className={`px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                signatureTheme === 'light'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>라이트 (권장)</span>
            </button>
            <button
              type="button"
              onClick={() => setSignatureTheme('dark')}
              className={`px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                signatureTheme === 'dark'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>다크</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIncludeQrBadge((prev) => !prev)}
              aria-pressed={includeQrBadge}
              className={`min-h-[34px] px-3 py-1.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                includeQrBadge
                  ? 'bg-[var(--app-highlight)] border-[var(--app-accent)]/30 text-[var(--app-highlight-fg)] font-semibold'
                  : 'bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR 배지</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRawHtml((prev) => !prev)}
              aria-pressed={showRawHtml}
              className={`min-h-[34px] px-3 py-1.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                showRawHtml
                  ? 'bg-[var(--app-highlight)] border-[var(--app-accent)]/30 text-[var(--app-highlight-fg)] font-semibold'
                  : 'bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>HTML 소스</span>
            </button>
          </div>
        </div>

        {/* Scrollable Live Preview & Optional Raw HTML */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[var(--app-text-muted)]">
              <span>메일 본문 미리보기</span>
              <span className="font-mono">Table + Inline CSS</span>
            </div>

            <div
              className={`rounded-2xl border p-4 sm:p-6 overflow-x-auto transition-colors ${
                signatureTheme === 'light'
                  ? 'bg-[#F7F6F2] border-black/10 text-zinc-900'
                  : 'bg-[#09090B] border-white/10 text-zinc-100'
              }`}
            >
              <div
                className={`text-xs mb-3 pb-3 border-b ${
                  signatureTheme === 'light'
                    ? 'text-zinc-500 border-zinc-200/80'
                    : 'text-zinc-500 border-white/10'
                }`}
              >
                감사합니다.
              </div>

              {bundle ? (
                <div
                  className="min-w-[280px]"
                  dangerouslySetInnerHTML={{ __html: bundle.html }}
                />
              ) : (
                <div className="h-28 flex items-center justify-center text-xs text-zinc-400">
                  이메일 서명을 생성하고 있습니다...
                </div>
              )}
            </div>
          </div>

          {showRawHtml && bundle && (
            <div className="space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] text-[var(--app-text-muted)]">
                <span>인라인 HTML 소스코드</span>
                <span className="font-mono tabular-nums">
                  {bundle.html.length.toLocaleString()} bytes
                </span>
              </div>
              <pre className="p-3.5 rounded-2xl bg-[var(--app-bg)] border border-[var(--app-border)] text-[11px] text-[var(--app-text)] font-mono overflow-x-auto max-h-44 leading-relaxed whitespace-pre-wrap break-all select-all">
                {bundle.html}
              </pre>
            </div>
          )}

          <div className="rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-3.5 text-[11px] text-[var(--app-text-muted)] leading-relaxed space-y-1">
            <p className="text-[var(--app-text)] font-medium">사용 방법</p>
            <p>
              1. <strong className="text-[var(--app-text)]">서명 복사 (Rich HTML)</strong>를 누른 뒤 Gmail 설정(서명), Apple Mail(서명), 또는 Outlook 서명 편집창에 그대로 붙여넣기(<code className="font-mono text-[var(--app-text)]">Ctrl+V / Cmd+V</code>)하세요.
            </p>
            <p>
              2. 배지와 QR 코드는 내 디지털 명함 공개 주소(<span className="font-mono text-[var(--app-text)]">{bundle?.shareUrl || ''}</span>)로 바로 연결됩니다.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-[var(--app-border)] bg-[var(--app-bg)] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyRawHtml}
            disabled={!bundle}
            className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--app-text)] bg-[var(--app-surface-subtle)] hover:bg-[var(--app-border)] border border-[var(--app-border)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {copiedHtml ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Code2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{copiedHtml ? 'HTML 복사됨' : 'HTML 코드 복사'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyRich}
            disabled={!bundle}
            className="flex-1 sm:flex-initial min-h-[42px] px-5 py-2 rounded-xl text-xs font-semibold text-[var(--app-accent-fg)] bg-[var(--app-accent)] hover:opacity-90 inline-flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-50 whitespace-nowrap"
          >
            {copiedRich ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <Copy className="w-4 h-4 shrink-0" />
            )}
            <span>{copiedRich ? '서식 포함 서명 복사됨' : '서명 복사 (Rich HTML)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
