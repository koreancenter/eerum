import React, { useState } from 'react';
import { CardData, CardTheme } from '../types/card';
import { generateStandaloneHtml } from '../utils/htmlExport';
import { X, Copy, Download, Check, ArrowLeft } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardData;
  theme?: CardTheme;
  slug?: string;
  isSubModal?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  card,
  theme = 'pure_white',
  slug,
  isSubModal = false,
}) => {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="독립형 HTML 배포"
        className="w-full max-w-[500px] max-h-[88dvh] sm:h-[540px] flex flex-col bg-[#111113] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0 bg-[#0A0A0B]">
          <div className="flex items-center gap-2.5 min-w-0">
            {isSubModal && (
              <button
                type="button"
                onClick={onClose}
                className="min-w-[36px] min-h-[36px] -ml-1 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                title="공유 화면으로 돌아가기"
                aria-label="공유 화면으로 돌아가기"
              >
                <ArrowLeft className="w-4 h-4 stroke-[1.75]" />
              </button>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white tracking-tight truncate">
                독립형 HTML 파일 배포
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">
                별도 서버나 빌드 없이 동작하는 단일 <code className="text-zinc-200 font-mono">index.html</code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            title="닫기"
            aria-label="닫기"
          >
            <X className="w-5 h-5 stroke-[1.75]" />
          </button>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="px-5 sm:px-6 pt-4 shrink-0">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('deploy')}
              className={`py-2 px-3 rounded-lg cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                activeTab === 'deploy'
                  ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white font-medium'
              }`}
            >
              배포 안내
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`py-2 px-3 rounded-lg cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                activeTab === 'code'
                  ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white font-medium'
              }`}
            >
              소스코드 미리보기
            </button>
          </div>
        </div>

        {/* Body Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col">
          {activeTab === 'deploy' ? (
            <div className="divide-y divide-white/[0.08]">
              <div className="py-3.5 first:pt-1">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className="font-semibold text-white">01. Cloudflare Pages</span>
                  <span aria-hidden="true" className="text-zinc-400">·</span>
                  <span className="text-zinc-300">권장</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  다운로드한 <code className="font-mono text-zinc-300">index.html</code> 파일을 업로드하면 즉시 글로벌 CDN으로 무료 배포됩니다.
                </p>
              </div>

              <div className="py-3.5">
                <div className="font-semibold text-white text-xs mb-1">
                  02. GitHub Pages
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  저장소 루트에 파일을 올리고 개인 도메인 또는 무료 주소를 연결할 수 있습니다.
                </p>
              </div>

              <div className="py-3.5 last:pb-1">
                <div className="font-semibold text-white text-xs mb-1">
                  03. 자체 웹 호스팅
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  사내 웹 서버, S3, FTP 루트 경로에 단일 파일을 업로드해 바로 운영할 수 있습니다.
                </p>
              </div>

              <div className="pt-3.5 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>권장 경로</span>
                <span className="font-mono text-zinc-300 select-all">{displaySlug}</span>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[220px] flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0 text-[11px] text-zinc-400">
                <span className="font-mono tabular-nums">
                  index.html · {htmlCode.length.toLocaleString()} bytes
                </span>
                <span>단일 독립 실행 파일</span>
              </div>
              <div className="flex-1 min-h-0 bg-[#0A0A0B] border border-white/[0.08] rounded-2xl p-3.5 font-mono text-xs overflow-auto leading-relaxed text-zinc-300 selection:bg-white/20 selection:text-white">
                <pre className="font-mono text-xs leading-relaxed whitespace-pre">
                  {htmlCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="px-5 sm:px-6 py-4 border-t border-white/10 bg-[#0A0A0B] flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            {isSubModal ? '취소' : '닫기'}
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
              title="코드 복사"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
              <span>{copied ? '복사됨' : '코드 복사'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-neutral-950 bg-white hover:bg-zinc-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-[0.98] shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
              title="HTML 다운로드"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>다운로드</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
