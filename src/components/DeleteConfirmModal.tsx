import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  cardName?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '내 명함 삭제',
  description = '선택한 명함을 삭제하시겠습니까? 삭제된 명함은 복구할 수 없습니다.',
  cardName,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#121214] border border-white/10 shadow-2xl p-5 sm:p-6 relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Badge */}
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3.5">
          <Trash2 className="w-5 h-5 stroke-[1.75]" />
        </div>

        {/* Title */}
        <h3 id="delete-confirm-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
          {title}
        </h3>

        {/* Card Name highlight if provided */}
        {cardName && (
          <p className="text-xs text-white/80 font-medium mt-1 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] max-w-full truncate">
            {cardName}
          </p>
        )}

        {/* Description */}
        <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed text-balance">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 sm:py-2.5 px-4 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10 text-xs font-medium transition-all cursor-pointer active:scale-95 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2 sm:py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap shadow-lg shadow-rose-950/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>삭제하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
