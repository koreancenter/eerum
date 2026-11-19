import React, { useState, useEffect, useRef } from 'react';
import { StoredCard } from '../types/card';

export interface VaultMeetingContextUpdate {
  metAt?: string;
  metLocation?: string;
  memo?: string;
}

interface CardPersonalMemoProps {
  card: StoredCard;
  onSaveMemo?: (newNotes: string) => void;
  onSaveContext?: (context: VaultMeetingContextUpdate) => void;
}

export const CardPersonalMemo: React.FC<CardPersonalMemoProps> = ({
  card,
  onSaveMemo,
  onSaveContext,
}) => {
  const incomingMemo = card.memo ?? card.notes ?? '';

  const [memoText, setMemoText] = useState<string>(incomingMemo);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevCardIdRef = useRef<string>(card.id);
  const lastSavedMemoRef = useRef<string>(incomingMemo);

  useEffect(() => {
    if (prevCardIdRef.current !== card.id) {
      prevCardIdRef.current = card.id;
      lastSavedMemoRef.current = incomingMemo;
      setMemoText(incomingMemo);
    } else if (incomingMemo !== lastSavedMemoRef.current) {
      lastSavedMemoRef.current = incomingMemo;
      setMemoText(incomingMemo);
    }
  }, [card.id, incomingMemo]);

  const emitSave = (nextMemo: string) => {
    lastSavedMemoRef.current = nextMemo;
    if (onSaveContext) {
      onSaveContext({ memo: nextMemo });
    } else if (onSaveMemo) {
      onSaveMemo(nextMemo);
    }
  };

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextMemo = e.target.value;
    setMemoText(nextMemo);
    emitSave(nextMemo);
  };

  const handleBlurTrim = () => {
    const trimmedMemo = memoText.trim();
    if (trimmedMemo !== memoText) {
      setMemoText(trimmedMemo);
      emitSave(trimmedMemo);
    }
  };

  return (
    <div className="w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] animate-in fade-in slide-in-from-top-2 duration-200">
      <textarea
        id={`vault-memo-${card.id}`}
        ref={textareaRef}
        aria-label="메모"
        value={memoText}
        onChange={handleMemoChange}
        onBlur={handleBlurTrim}
        placeholder="대화 핵심 내용, 주요 관심사, 후속 팔로업 일정을 자유롭게 기록하세요."
        rows={3}
        className="w-full min-h-[96px] max-h-[260px] px-4 py-3.5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--app-shadow)] text-[var(--app-text)] text-xs sm:text-[13px] leading-relaxed placeholder:text-[var(--app-text-muted)]/65 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/35 focus:border-[var(--app-accent)] transition-colors resize-y font-sans block"
      />
    </div>
  );
};
