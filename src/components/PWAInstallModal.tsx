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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#121214] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#0A0A0B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Download className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 id="pwa-install-title" className="text-sm font-bold text-white tracking-tight">
                이룸(eerum) 앱 설치
              </h3>
              <p className="text-[11px] text-zinc-400">
                홈 화면에 추가하여 네이티브 앱처럼 사용하세요
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {isInstalled ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h4 className="text-sm font-semibold text-white">이미 앱이 설치되어 있습니다</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                현재 독립형(Standalone) PWA 환경에서 원활하게 실행 중입니다.
              </p>
            </div>
          ) : isInstallable ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                  원클릭 즉시 설치 지원
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  브라우저 주소창 없이 전체 화면으로 동작하며, 오프라인 환경에서도 안전하게 명함을 확인하고 공유할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 text-xs font-bold tracking-wide transition-all cursor-pointer active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 stroke-[2.2]" />
                <span>지금 앱 설치하기</span>
              </button>
            </div>
          ) : isIOS ? (
            <div className="space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                iOS(아이폰/아이패드) Safari 브라우저에서는 아래 순서대로 간편하게 홈 화면에 추가할 수 있습니다:
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                    1
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-medium text-white flex items-center gap-1.5">
                      Safari 하단 툴바의 <Share className="w-3.5 h-3.5 text-blue-400 inline" /> <strong>공유</strong> 버튼 탭
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      화면 하단 중앙의 네모 위 화살표 아이콘을 누릅니다.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                    2
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-medium text-white flex items-center gap-1.5">
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" /> <strong>'홈 화면에 추가'</strong> 선택
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      공유 메뉴를 아래로 스크롤하여 홈 화면에 추가를 선택합니다.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                    3
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-medium text-white">
                      우측 상단 <strong>'추가'</strong> 탭
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      홈 화면에 이룸 명함 아이콘이 생성되어 바로 실행됩니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-zinc-400" />
                  브라우저 메뉴에서 설치하기
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  브라우저 상단 주소창 우측의 <strong>설치 아이콘(⊕ 또는 모니터 모양)</strong>을 클릭하거나, 브라우저 메뉴(⋮)에서 <strong>'앱 설치'</strong> 또는 <strong>'홈 화면에 추가'</strong>를 선택해 주세요.
                </p>
              </div>
              <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside leading-relaxed pl-1">
                <li>오프라인 캐싱 및 신속한 명함 로딩</li>
                <li>단독 앱 창 및 독립형 환경 지원</li>
                <li>온디바이스 암호화 보관소 연동</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#0A0A0B] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallModal;
