import React from 'react';
import { Lock, KeyRound } from 'lucide-react';
import { useLocale } from '../hooks/useLocale';

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
  title,
  description,
  buttonLabel,
}) => {
  const { t } = useLocale();
  const resolvedTitle = title ?? t.locked.title;
  const resolvedDescription = description ?? t.locked.description;
  const resolvedButtonLabel = buttonLabel ?? t.locked.buttonLabel;

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
      <h3 className="text-xl font-bold text-[var(--app-text)] mb-2 tracking-tight">{resolvedTitle}</h3>
      <p className="text-xs text-[var(--app-text-muted)] max-w-sm mb-6 leading-relaxed">
        {resolvedDescription}
      </p>
      <button
        type="button"
        onClick={onUnlock}
        className="px-6 py-3 rounded-2xl bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] font-semibold text-xs transition-all cursor-pointer shadow-[var(--app-shadow)] active:scale-95 flex items-center gap-2"
      >
        <KeyRound className="w-4 h-4 stroke-[1.75]" />
        <span>{resolvedButtonLabel}</span>
      </button>
    </div>
  );
};
