import React from 'react';
import { X, Download, Share, PlusSquare, Smartphone, Monitor, CheckCircle2 } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstall: () => Promise<boolean>;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isInstalled,
  isIOS,
  onInstall,
}) => {
  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await onInstall();
    if (success) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--app-overlay)] backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--app-border)] flex items-center justify-between bg-[var(--app-bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--app-highlight)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-highlight-fg)]">
              <Download className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 id="pwa-install-title" className="text-sm font-bold text-[var(--app-text)] tracking-tight">
                이룸(eerum) 앱 설치
              </h3>
              <p className="text-[11px] text-[var(--app-text-muted)]">
                홈 화면에 추가하여 네이티브 앱처럼 사용하세요
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] cursor-pointer transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {isInstalled ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h4 className="text-sm font-semibold text-[var(--app-text)]">이미 앱이 설치되어 있습니다</h4>
              <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                현재 독립형(Standalone) PWA 환경에서 원활하게 실행 중입니다.
              </p>
            </div>
          ) : isInstallable ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] space-y-2">
                <h4 className="text-xs font-semibold text-[var(--app-text)] flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                  원클릭 즉시 설치 지원
                </h4>
                <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                  브라우저 주소창 없이 전체 화면으로 동작하며, 오프라인 환경에서도 안전하게 명함을 확인하고 공유할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs font-bold tracking-wide transition-all cursor-pointer active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 stroke-[2.2]" />
                <span>지금 앱 설치하기</span>
              </button>
            </div>
          ) : isIOS ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                iOS(아이폰/아이패드) Safari 브라우저에서는 아래 순서대로 간편하게 홈 화면에 추가할 수 있습니다:
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[var(--app-highlight)] text-[var(--app-highlight-fg)] flex items-center justify-center shrink-0 font-bold text-[11px]">
                    1
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-medium text-[var(--app-text)] flex items-center gap-1.5">
                      Safari 하단 툴바의 <Share className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 inline" /> <strong>공유</strong> 버튼 탭
                    </div>
                    <div className="text-[11px] text-[var(--app-text-muted)]">
                      화면 하단 중앙의 네모 위 화살표 아이콘을 누릅니다.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[var(--app-highlight)] text-[var(--app-highlight-fg)] flex items-center justify-center shrink-0 font-bold text-[11px]">
                    2
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-medium text-[var(--app-text)] flex items-center gap-1.5">
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline" /> <strong>'홈 화면에 추가'</strong> 선택
                    </div>
                    <div className="text-[11px] text-[var(--app-text-muted)]">
                      공유 메뉴를 아래로 스크롤하여 홈 화면에 추가를 선택합니다.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[var(--app-highlight)] text-[var(--app-highlight-fg)] flex items-center justify-center shrink-0 font-bold text-[11px]">
                    3
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-medium text-[var(--app-text)]">
                      우측 상단 <strong>'추가'</strong> 탭
                    </div>
                    <div className="text-[11px] text-[var(--app-text-muted)]">
                      홈 화면에 이룸 명함 아이콘이 생성되어 바로 실행됩니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] space-y-2">
                <h4 className="text-xs font-semibold text-[var(--app-text)] flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                  브라우저 메뉴에서 설치하기
                </h4>
                <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                  브라우저 상단 주소창 우측의 <strong className="text-[var(--app-text)]">설치 아이콘(⊕ 또는 모니터 모양)</strong>을 클릭하거나, 브라우저 메뉴(⋮)에서 <strong className="text-[var(--app-text)]">'앱 설치'</strong> 또는 <strong className="text-[var(--app-text)]">'홈 화면에 추가'</strong>를 선택해 주세요.
                </p>
              </div>
              <ul className="text-[11px] text-[var(--app-text-muted)] space-y-1 list-disc list-inside leading-relaxed pl-1">
                <li>오프라인 캐싱 및 신속한 명함 로딩</li>
                <li>단독 앱 창 및 독립형 환경 지원</li>
                <li>온디바이스 암호화 보관소 연동</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--app-border)] bg-[var(--app-bg)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--app-surface-subtle)] hover:bg-[var(--app-border)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-semibold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallModal;
