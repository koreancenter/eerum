import React, { useState } from 'react';
import { CardData, CardTheme } from '../types/card';
import { generateStandaloneHtml } from '@/utils/cardExporter';
import { X, Copy, Download, Check, ArrowLeft, Mail } from 'lucide-react';
import { useLocale } from '../hooks/useLocale';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardData;
  theme?: CardTheme;
  slug?: string;
  isSubModal?: boolean;
  isMyCard?: boolean;
  onOpenEmailSignature?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  card,
  theme = 'pure_white',
  slug,
  isSubModal = false,
  isMyCard = false,
  onOpenEmailSignature,
}) => {
  const { isEn, t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'deploy' | 'code'>('deploy');

  if (!isOpen) return null;

  const htmlCode = generateStandaloneHtml(card, theme);
  const displaySlug = slug ? `/${slug}` : '/card';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(htmlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([htmlCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'index.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--app-overlay)] backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.modals.exportTitle}
        className="w-full max-w-[500px] max-h-[88dvh] sm:h-[540px] flex flex-col bg-[var(--app-surface)] border border-[var(--app-border)] rounded-3xl overflow-hidden shadow-2xl text-[var(--app-text)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-[var(--app-border)] flex items-center justify-between gap-3 shrink-0 bg-[var(--app-bg)]">
          <div className="flex items-center gap-2.5 min-w-0">
            {isSubModal && (
              <button
                type="button"
                onClick={onClose}
                className="min-w-[36px] min-h-[36px] -ml-1 flex items-center justify-center rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                title={t.modals.backToShare}
                aria-label={t.modals.backToShare}
              >
                <ArrowLeft className="w-4 h-4 stroke-[1.75]" />
              </button>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[var(--app-text)] tracking-tight truncate">
                {t.modals.exportTitle}
              </h3>
              <p className="text-xs text-[var(--app-text-muted)] mt-0.5 truncate">
                {isEn ? (
                  <>
                    Self-contained single <code className="text-[var(--app-text)] font-mono">index.html</code> requiring no server or build
                  </>
                ) : (
                  <>
                    별도 서버나 빌드 없이 동작하는 단일 <code className="text-[var(--app-text)] font-mono">index.html</code>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            title={t.common.close}
            aria-label={t.common.close}
          >
            <X className="w-5 h-5 stroke-[1.75]" />
          </button>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="px-5 sm:px-6 pt-4 shrink-0">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('deploy')}
              className={`py-2 px-3 rounded-lg cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                activeTab === 'deploy'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
              }`}
            >
              {t.modals.exportTabDeploy}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`py-2 px-3 rounded-lg cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                activeTab === 'code'
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium'
              }`}
            >
              {t.modals.exportTabCode}
            </button>
          </div>
        </div>

        {/* Body Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col">
          {activeTab === 'deploy' ? (
            <div className="divide-y divide-[var(--app-border)]">
              <div className="py-3.5 first:pt-1">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className="font-semibold text-[var(--app-text)]">01. Cloudflare Pages</span>
                  <span aria-hidden="true" className="text-[var(--app-text-muted)]">·</span>
                  <span className="text-[var(--app-text-muted)] font-medium">
                    {isEn ? 'Recommended' : '권장'}
                  </span>
                </div>
                <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                  {isEn ? (
                    <>
                      Upload the downloaded <code className="font-mono text-[var(--app-text)]">index.html</code> to deploy globally on a free CDN.
                    </>
                  ) : (
                    <>
                      다운로드한 <code className="font-mono text-[var(--app-text)]">index.html</code> 파일을 업로드하면 즉시 글로벌 CDN으로 무료 배포됩니다.
                    </>
                  )}
                </p>
              </div>

              <div className="py-3.5">
                <div className="font-semibold text-[var(--app-text)] text-xs mb-1">
                  02. GitHub Pages
                </div>
                <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                  {isEn
                    ? 'Commit the file to your repository root and attach a custom domain or free github.io URL.'
                    : '저장소 루트에 파일을 올리고 개인 도메인 또는 무료 주소를 연결할 수 있습니다.'}
                </p>
              </div>

              <div className="py-3.5 last:pb-1">
                <div className="font-semibold text-[var(--app-text)] text-xs mb-1">
                  {isEn ? '03. Self-Hosted Web Server' : '03. 자체 웹 호스팅'}
                </div>
                <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                  {isEn
                    ? 'Drop the single file into any web server, S3 bucket, or FTP root directory.'
                    : '사내 웹 서버, S3, FTP 루트 경로에 단일 파일을 업로드해 바로 운영할 수 있습니다.'}
                </p>
              </div>

              <div className="pt-3.5 text-[11px] text-[var(--app-text-muted)] flex items-center justify-between">
                <span>{isEn ? 'Suggested Path' : '권장 경로'}</span>
                <span className="font-mono text-[var(--app-text)] select-all">{displaySlug}</span>
              </div>

              {isMyCard && onOpenEmailSignature && (
                <div className="pt-3.5">
                  <button
                    type="button"
                    onClick={onOpenEmailSignature}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--app-surface-subtle)] hover:bg-[var(--app-border)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-medium flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[var(--app-text-muted)] shrink-0" />
                      <span>{isEn ? 'Email Signature Generator (Rich HTML)' : '이메일 서명 생성기 (Rich HTML)'}</span>
                    </span>
                    <span className="text-[11px] text-[var(--app-text-muted)]">
                      {isEn ? 'Open →' : '열기 →'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[220px] flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0 text-[11px] text-[var(--app-text-muted)]">
                <span className="font-mono tabular-nums">
                  index.html · {htmlCode.length.toLocaleString()} bytes
                </span>
                <span>{isEn ? 'Standalone Single File' : '단일 독립 실행 파일'}</span>
              </div>
              <div className="flex-1 min-h-0 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl p-3.5 font-mono text-xs overflow-auto leading-relaxed text-[var(--app-text)]">
                <pre className="font-mono text-xs leading-relaxed whitespace-pre">
                  {htmlCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="px-5 sm:px-6 py-4 border-t border-[var(--app-border)] bg-[var(--app-bg)] flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            {isSubModal ? t.common.cancel : t.common.close}
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--app-text)] bg-[var(--app-surface-subtle)] hover:bg-[var(--app-border)] border border-[var(--app-border)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              title={isEn ? 'Copy Code' : '코드 복사'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
              <span>{copied ? t.common.copied : (isEn ? 'Copy Code' : '코드 복사')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--app-accent-fg)] bg-[var(--app-accent)] hover:opacity-90 flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-[0.98] shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              title={isEn ? 'Download HTML' : 'HTML 다운로드'}
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{t.common.download}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
