import React, { useState, useEffect, useRef } from 'react';
import { StoredCard } from '../types/card';
import { Check, Calendar, MapPin } from 'lucide-react';

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

function getTodayIsoDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const CardPersonalMemo: React.FC<CardPersonalMemoProps> = ({
  card,
  onSaveMemo,
  onSaveContext,
}) => {
  const incomingMemo = card.memo ?? card.notes ?? '';
  const incomingMetAt = card.metAt ?? '';
  const incomingMetLocation = card.metLocation ?? '';

  const [metAt, setMetAt] = useState<string>(incomingMetAt);
  const [metLocation, setMetLocation] = useState<string>(incomingMetLocation);
  const [memoText, setMemoText] = useState<string>(incomingMemo);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevCardIdRef = useRef<string>(card.id);
  const lastSavedRef = useRef<{ metAt: string; metLocation: string; memo: string }>({
    metAt: incomingMetAt,
    metLocation: incomingMetLocation,
    memo: incomingMemo,
  });
  const savedIndicatorTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevCardIdRef.current !== card.id) {
      prevCardIdRef.current = card.id;
      lastSavedRef.current = {
        metAt: incomingMetAt,
        metLocation: incomingMetLocation,
        memo: incomingMemo,
      };
      setMetAt(incomingMetAt);
      setMetLocation(incomingMetLocation);
      setMemoText(incomingMemo);
      setJustSaved(false);
    } else if (
      incomingMemo !== lastSavedRef.current.memo ||
      incomingMetAt !== lastSavedRef.current.metAt ||
      incomingMetLocation !== lastSavedRef.current.metLocation
    ) {
      lastSavedRef.current = {
        metAt: incomingMetAt,
        metLocation: incomingMetLocation,
        memo: incomingMemo,
      };
      setMetAt(incomingMetAt);
      setMetLocation(incomingMetLocation);
      setMemoText(incomingMemo);
    }
  }, [card.id, incomingMemo, incomingMetAt, incomingMetLocation]);

  useEffect(() => {
    return () => {
      if (savedIndicatorTimerRef.current) {
        window.clearTimeout(savedIndicatorTimerRef.current);
      }
    };
  }, []);

  const flashSaved = () => {
    setJustSaved(true);
    if (savedIndicatorTimerRef.current) {
      window.clearTimeout(savedIndicatorTimerRef.current);
    }
    savedIndicatorTimerRef.current = window.setTimeout(() => {
      setJustSaved(false);
    }, 1800);
  };

  const emitSave = (next: { metAt: string; metLocation: string; memo: string }) => {
    lastSavedRef.current = next;
    if (onSaveContext) {
      onSaveContext(next);
    } else if (onSaveMemo) {
      onSaveMemo(next.memo);
    }
    flashSaved();
  };

  const handleMetAtChange = (nextDate: string) => {
    setMetAt(nextDate);
    emitSave({
      metAt: nextDate,
      metLocation,
      memo: memoText,
    });
  };

  const handleMetLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextLocation = e.target.value;
    setMetLocation(nextLocation);
    emitSave({
      metAt,
      metLocation: nextLocation,
      memo: memoText,
    });
  };

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextMemo = e.target.value;
    setMemoText(nextMemo);
    emitSave({
      metAt,
      metLocation,
      memo: nextMemo,
    });
  };

  const handleBlurTrim = () => {
    const trimmedLoc = metLocation.trim();
    const trimmedMemo = memoText.trim();
    if (trimmedLoc !== metLocation || trimmedMemo !== memoText) {
      setMetLocation(trimmedLoc);
      setMemoText(trimmedMemo);
      emitSave({
        metAt,
        metLocation: trimmedLoc,
        memo: trimmedMemo,
      });
    }
  };

  const hasAnyContent =
    metAt.trim().length > 0 ||
    metLocation.trim().length > 0 ||
    memoText.trim().length > 0;

  return (
    <section
      aria-label="만남 기록 및 개인 메모"
      className="w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] p-3.5 sm:p-4.5 shadow-[var(--app-shadow)] flex flex-col gap-3 transition-all duration-200 animate-in fade-in slide-in-from-top-2"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--app-border)]">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-[var(--app-text)] tracking-tight">
            만남 기록 · 개인 메모
          </h4>
          <span className="text-[10px] text-[var(--app-text-muted)]">자동 저장</span>
        </div>

        {/* Instant Auto-Save Checkmark Indicator */}
        <span
          title={justSaved || hasAnyContent ? '저장됨' : '미입력'}
          aria-label={justSaved || hasAnyContent ? '저장됨' : '미입력'}
          className={`inline-flex items-center gap-1 text-[11px] transition-colors duration-200 ${
            justSaved
              ? 'text-emerald-500'
              : hasAnyContent
                ? 'text-emerald-500/80'
                : 'text-[var(--app-text-muted)] opacity-50'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[2.2]" />
        </span>
      </div>

      {/* Meeting Context Fields: Date & Location/Event */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`vault-met-at-${card.id}`}
              className="text-[11px] text-[var(--app-text-muted)] inline-flex items-center gap-1"
            >
              <Calendar className="w-3 h-3 text-[var(--app-text-muted)]" />
              <span>만난 날짜</span>
            </label>
            {metAt !== getTodayIsoDate() && (
              <button
                type="button"
                onClick={() => handleMetAtChange(getTodayIsoDate())}
                className="text-[10px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] underline underline-offset-2 cursor-pointer"
              >
                오늘
              </button>
            )}
          </div>
          <input
            id={`vault-met-at-${card.id}`}
            type="date"
            value={metAt}
            onChange={(e) => handleMetAtChange(e.target.value)}
            className="w-full h-9 px-3 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text)] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/35 focus:border-[var(--app-accent)]"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`vault-met-location-${card.id}`}
            className="text-[11px] text-[var(--app-text-muted)] inline-flex items-center gap-1"
          >
            <MapPin className="w-3 h-3 text-[var(--app-text-muted)]" />
            <span>만난 장소 / 행사</span>
          </label>
          <input
            id={`vault-met-location-${card.id}`}
            type="text"
            value={metLocation}
            onChange={handleMetLocationChange}
            onBlur={handleBlurTrim}
            placeholder="예: COEX AI 서밋, 강남 미팅"
            className="w-full h-9 px-3 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text)] text-xs placeholder:text-[var(--app-text-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/35 focus:border-[var(--app-accent)]"
          />
        </div>
      </div>

      {/* Textarea Editor */}
      <div className="relative space-y-1">
        <label htmlFor={`vault-memo-${card.id}`} className="text-[11px] text-[var(--app-text-muted)] block">
          메모
        </label>
        <textarea
          id={`vault-memo-${card.id}`}
          ref={textareaRef}
          value={memoText}
          onChange={handleMemoChange}
          onBlur={handleBlurTrim}
          placeholder="대화 핵심 내용, 주요 관심사, 후속 팔로업 일정을 자유롭게 기록하세요. (보관함 검색에 포함됩니다)"
          rows={3}
          className="w-full min-h-[88px] max-h-[240px] p-3 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text)] text-xs sm:text-[13px] leading-relaxed placeholder:text-[var(--app-text-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/35 focus:border-[var(--app-accent)] transition-all resize-y font-sans"
        />
      </div>
    </section>
  );
};
