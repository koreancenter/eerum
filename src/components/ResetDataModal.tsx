import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useLocale } from '../hooks/useLocale';

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const ResetDataModal: React.FC<ResetDataModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  const { isEn, t } = useLocale();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--app-overlay)] backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-[var(--app-shadow)] p-6 sm:p-7 relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors cursor-pointer"
          aria-label={t.common.close}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Destructive Warning Icon */}
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Title */}
        <h3 id="reset-modal-title" className="text-lg font-bold text-[var(--app-text)] tracking-tight">
          {isEn ? 'Reset All Local Data' : '로컬 데이터 전체 초기화'}
        </h3>

        {/* Warning Details */}
        <div className="mt-3.5 space-y-2 text-xs text-[var(--app-text-muted)] leading-relaxed text-left p-3.5 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] w-full">
          <p className="font-semibold text-[var(--app-text)] flex items-center gap-1.5">
            <span>
              {isEn
                ? 'Warning: All data will be permanently deleted from this browser.'
                : '주의: 모든 데이터가 브라우저에서 영구 삭제됩니다.'}
            </span>
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[var(--app-text-muted)] text-[11px]">
            <li>
              {isEn
                ? 'All created personal cards and saved vault contacts'
                : '직접 생성한 내 명함 및 보관된 명함 전체'}
            </li>
            <li>
              {isEn
                ? '4-digit security PIN hashes and biometric credentials'
                : '설정된 4자리 보안 PIN 해시값 및 생체 인증 정보'}
            </li>
            <li>
              {isEn
                ? 'Device sync session IDs and local preferences'
                : '기기 간 동기화 세션 ID 및 환경 설정'}
            </li>
          </ul>
        </div>

        <p className="text-[11px] text-[var(--app-text-muted)] mt-3 text-center leading-normal">
          {isEn
            ? 'Deleted data cannot be recovered. After reset, the app returns to its initial visitor state.'
            : '삭제된 데이터는 복구할 수 없습니다. 초기화 후 서비스는 초기 방문자 상태로 되돌아갑니다.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full mt-6">
          <button
            onClick={() => {
              onConfirmReset();
              onClose();
            }}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isEn ? 'Delete All & Reset' : '전체 데이터 삭제 및 초기화'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors text-xs font-medium cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
