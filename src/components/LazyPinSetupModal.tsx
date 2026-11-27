import React from 'react';
import { Lock, ShieldCheck, X, ArrowRight } from 'lucide-react';
import { useLocale } from '../hooks/useLocale';

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
  const { isEn, t } = useLocale();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--app-overlay)] backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-2xl p-6 sm:p-7 relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lazy-pin-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
          aria-label={t.common.close}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Security Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-[var(--app-highlight)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-highlight-fg)] mb-4 shadow-sm">
          <Lock className="w-7 h-7" />
        </div>

        {/* Title */}
        <h3 id="lazy-pin-title" className="text-lg font-bold text-[var(--app-text)] tracking-tight">
          {isEn ? 'Protect with a 4-Digit PIN?' : '4자리 PIN 번호로 보호하시겠습니까?'}
        </h3>

        {/* Subtitle */}
        <p className="text-xs text-[var(--app-text-muted)] font-medium mt-1">
          {isEn
            ? 'Your first card has been saved safely to local storage.'
            : '첫 번째 명함이 기기 로컬 저장소에 안전하게 등록되었습니다.'}
        </p>

        {/* Body Description */}
        <p className="text-xs text-[var(--app-text-muted)] leading-relaxed mt-3.5 max-w-sm">
          {isEn
            ? 'To prevent unauthorized edits on shared devices, set a 4-digit PIN to lock your vault and card editor.'
            : '공용 기기 사용이나 타인의 무단 수정을 방지하려면 4자리 PIN 번호를 설정해 명함 편집 및 보관함을 암호화 잠금할 수 있습니다.'}
        </p>

        <div className="w-full mt-4 p-3 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-left flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[var(--app-text)] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[var(--app-text-muted)] leading-snug">
            {isEn
              ? 'Your PIN is never sent to any server and is verified locally with a SHA-256 hash. You can change it anytime in Settings.'
              : 'PIN 번호는 서버에 저장되지 않고 단말기 내 브라우저에서 안전한 SHA-256 해시로만 검증됩니다. 상단 설정 메뉴에서 언제든 변경할 수 있습니다.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full mt-6">
          <button
            onClick={onProceedSetup}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 whitespace-nowrap"
          >
            <span>{isEn ? 'Set 4-Digit PIN' : '4자리 PIN 설정하기'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors text-xs font-medium cursor-pointer whitespace-nowrap"
          >
            {isEn ? 'Maybe Later' : '나중에 하기'}
          </button>
        </div>
      </div>
    </div>
  );
};
