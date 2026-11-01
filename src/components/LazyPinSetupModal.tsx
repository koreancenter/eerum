import React from 'react';
import { Lock, ShieldCheck, X, ArrowRight } from 'lucide-react';

interface LazyPinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedSetup: () => void;
}

export const LazyPinSetupModal: React.FC<LazyPinSetupModalProps> = ({
  isOpen,
  onClose,
  onProceedSetup,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-2xl bg-[#121214] border border-white/10 shadow-2xl p-6 sm:p-7 relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lazy-pin-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Security Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-4 shadow-lg shadow-black/40">
          <Lock className="w-7 h-7 text-white" />
        </div>

        {/* Title */}
        <h3 id="lazy-pin-title" className="text-lg font-bold text-white tracking-tight">
          4자리 PIN 번호로 보호하시겠습니까?
        </h3>

        {/* Subtitle */}
        <p className="text-xs text-zinc-400 font-medium mt-1">
          첫 번째 명함이 기기 로컬 저장소에 안전하게 등록되었습니다.
        </p>

        {/* Body Description */}
        <p className="text-xs text-neutral-300 leading-relaxed mt-3.5 max-w-sm">
          공유 기기 사용이나 타인의 무단 수정을 방지하려면 4자리 PIN 번호를 설정해 명함 편집 및 보관함을 암호화 잠금할 수 있습니다.
        </p>

        <div className="w-full mt-4 p-3 rounded-xl bg-black/40 border border-white/5 text-left flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
          <p className="text-[11px] text-neutral-400 leading-snug">
            PIN 번호는 서버에 저장되지 않고 단말기 내 브라우저에서 안전한 SHA-256 해시로만 검증됩니다. 상단 설정 메뉴에서 언제든 변경할 수 있습니다.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full mt-6">
          <button
            onClick={onProceedSetup}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95 whitespace-nowrap"
          >
            <span>4자리 PIN 설정하기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-white/10 hover:border-white/20 text-neutral-300 hover:text-white transition-colors text-xs font-medium cursor-pointer whitespace-nowrap"
          >
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  );
};
