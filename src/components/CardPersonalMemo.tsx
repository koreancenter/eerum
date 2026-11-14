import React, { useState, useEffect, useRef } from 'react';
import { StoredCard } from '../types/card';
import { Check } from 'lucide-react';

interface CardPersonalMemoProps {
  card: StoredCard;
  onSaveMemo: (newNotes: string) => void;
}

export const CardPersonalMemo: React.FC<CardPersonalMemoProps> = ({
  card,
  onSaveMemo,
}) => {
  const [memoText, setMemoText] = useState<string>(card.notes || '');
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevCardIdRef = useRef<string>(card.id);
  const lastSavedRef = useRef<string>(card.notes || '');
  const savedIndicatorTimerRef = useRef<number | null>(null);

  // Sync state only when switching cards or when card.notes is modified externally
  useEffect(() => {
    const incomingNotes = card.notes || '';
    if (prevCardIdRef.current !== card.id) {
      prevCardIdRef.current = card.id;
      lastSavedRef.current = incomingNotes;
      setMemoText(incomingNotes);
      setJustSaved(false);
    } else if (incomingNotes !== lastSavedRef.current) {
      lastSavedRef.current = incomingNotes;
      setMemoText(incomingNotes);
    }
  }, [card.id, card.notes]);

  useEffect(() => {
    return () => {
      if (savedIndicatorTimerRef.current) {
        window.clearTimeout(savedIndicatorTimerRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    setMemoText(nextValue);
    lastSavedRef.current = nextValue;
    onSaveMemo(nextValue);

    setJustSaved(true);
    if (savedIndicatorTimerRef.current) {
      window.clearTimeout(savedIndicatorTimerRef.current);
    }
    savedIndicatorTimerRef.current = window.setTimeout(() => {
      setJustSaved(false);
    }, 1800);
  };

  const handleBlur = () => {
    const trimmed = memoText.trim();
    if (trimmed !== memoText) {
      setMemoText(trimmed);
      lastSavedRef.current = trimmed;
      onSaveMemo(trimmed);
    }
  };

  return (
    <section
      aria-label="명함 개인 메모"
      className="w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] rounded-2xl bg-[#121214] border border-white/10 p-3.5 sm:p-4.5 shadow-xl flex flex-col gap-3 transition-all duration-200 animate-in fade-in slide-in-from-top-2"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
        <h4 className="text-xs font-semibold text-white tracking-tight">개인 메모</h4>

        {/* Instant Auto-Save Checkmark Indicator */}
        <span
          title={justSaved || memoText.trim().length > 0 ? '저장됨' : '미입력'}
          aria-label={justSaved || memoText.trim().length > 0 ? '저장됨' : '미입력'}
          className={`inline-flex items-center justify-center transition-colors duration-200 ${
            justSaved || memoText.trim().length > 0 ? 'text-emerald-400' : 'text-zinc-600'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[2.2]" />
        </span>
      </div>

      {/* Textarea Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={memoText}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="이 명함에 대한 연락처 특징, 만난 날짜 및 장소, 주요 관심사, 후속 미팅 계획 등을 자유롭게 기록하세요. (입력 즉시 자동 저장됩니다)"
          rows={3}
          className="w-full min-h-[96px] max-h-[240px] p-3 rounded-xl bg-[#161618] border border-white/10 text-neutral-100 text-xs sm:text-[13px] leading-relaxed placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/25 focus:border-white/25 transition-all resize-y font-sans"
        />
      </div>
    </section>
  );
};
