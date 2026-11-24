import React from 'react';
import { Lock, KeyRound } from 'lucide-react';

interface LockedAccountViewProps {
  onUnlock?: () => void;
  accountName?: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
}

export const LockedAccountView: React.FC<LockedAccountViewProps> = ({
  onUnlock,
  accountName,
  title = '명함 보관함이 잠겨 있습니다',
  description = '공용 기기 및 타인의 무단 열람을 방지하기 위해 보관함이 4자리 보안 PIN으로 보호되고 있습니다.',
  buttonLabel = '보안 PIN 입력하여 잠금 해제',
}) => {
  return (
    <div className="w-full max-w-lg mx-auto py-16 px-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-text)] mb-5 shadow-[var(--app-shadow)]">
        <Lock className="w-7 h-7 stroke-[1.5]" />
      </div>
      {accountName && (
        <span className="text-[11px] font-medium text-[var(--app-text-muted)] mb-1">
          {accountName}
        </span>
      )}
      <h3 className="text-xl font-bold text-[var(--app-text)] mb-2 tracking-tight">{title}</h3>
      <p className="text-xs text-[var(--app-text-muted)] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      <button
        type="button"
        onClick={onUnlock}
        className="px-6 py-3 rounded-2xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] font-semibold text-xs transition-all cursor-pointer shadow-[var(--app-shadow)] active:scale-95 flex items-center gap-2"
      >
        <KeyRound className="w-4 h-4 stroke-[1.75]" />
        <span>{buttonLabel}</span>
      </button>
    </div>
  );
};
