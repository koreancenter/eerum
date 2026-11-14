import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoredCard } from '../types/card';
import {
  FileText,
  Calendar,
  Sparkles,
  MessageSquare,
  Lock,
  Check,
  Save,
  Clock,
  MapPin,
  Tag,
} from 'lucide-react';

interface CardPersonalMemoProps {
  card: StoredCard;
  onSaveMemo: (newNotes: string) => void;
  onShowToast?: (msg: string) => void;
}

export const CardPersonalMemo: React.FC<CardPersonalMemoProps> = ({
  card,
  onSaveMemo,
  onShowToast,
}) => {
  const [memoText, setMemoText] = useState<string>(card.notes || '');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);
  const [selectedMeetingDate, setSelectedMeetingDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when selected card changes
  useEffect(() => {
    setMemoText(card.notes || '');
    setShowDatePicker(false);
    setIsConfirmingClear(false);
  }, [card.id, card.notes]);

  const hasChanges = memoText !== (card.notes || '');

  const handleSave = useCallback(
    (isAutoSave = false) => {
      const trimmed = memoText.trim();
      onSaveMemo(trimmed);
      setMemoText(trimmed);
      if (!isAutoSave && onShowToast) {
        onShowToast('개인 메모가 저장되었습니다.');
      }
    },
    [memoText, onSaveMemo, onShowToast]
  );

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to save
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave(false);
    }
  };

  // Helper to insert snippet at cursor position
  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMemoText((prev) => (prev ? `${prev}\n${snippet}` : snippet));
      return;
    }

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const currentVal = textarea.value;

    const needsNewlineBefore =
      startPos > 0 && currentVal[startPos - 1] !== '\n' && !snippet.startsWith('\n');
    const formattedSnippet = needsNewlineBefore ? `\n${snippet}` : snippet;

    const nextVal =
      currentVal.substring(0, startPos) +
      formattedSnippet +
      currentVal.substring(endPos);

    setMemoText(nextVal);
    setIsConfirmingClear(false);

    // Place cursor right after the inserted snippet
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + formattedSnippet.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Format today's date into readable Korean format: 2026.11.12
  const insertTodayDate = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    insertSnippet(`[${yyyy}.${mm}.${dd} 미팅] `);
  };

  // Custom date insertion from date picker
  const handleInsertSelectedDate = () => {
    if (!selectedMeetingDate) return;
    const parts = selectedMeetingDate.split('-');
    if (parts.length === 3) {
      insertSnippet(`[${parts[0]}.${parts[1]}.${parts[2]} 미팅] `);
    } else {
      insertSnippet(`[${selectedMeetingDate} 미팅] `);
    }
    setShowDatePicker(false);
  };

  const handleConfirmClear = () => {
    setMemoText('');
    onSaveMemo('');
    setIsConfirmingClear(false);
    if (onShowToast) {
      onShowToast('메모가 삭제되었습니다.');
    }
  };

  const cardDisplayName = card.data.name || card.data.nameKr || '해당 연락처';

  return (
    <section
      aria-label="명함 개인 메모"
      className="w-full max-w-[460px] sm:max-w-[500px] md:max-w-[540px] rounded-2xl bg-[#121214] border border-white/10 p-3.5 sm:p-4.5 shadow-xl flex flex-col gap-3 transition-all duration-200"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
            <FileText className="w-3.5 h-3.5 stroke-[1.75]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-semibold text-white tracking-tight">개인 메모</h4>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-white/[0.06] text-zinc-300 border border-white/5">
                <Lock className="w-2.5 h-2.5 stroke-[2]" />
                <span>비공개</span>
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 truncate">
              {cardDisplayName} 님에 대한 나만의 기록
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 shrink-0 text-[11px]">
          {hasChanges ? (
            <span className="text-[10.5px] text-amber-300/90 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>저장 대기 중</span>
            </span>
          ) : memoText ? (
            <span className="text-[10.5px] text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[2.2]" />
              <span>저장됨</span>
            </span>
          ) : null}
          <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
            {memoText.length}자
          </span>
        </div>
      </div>

      {/* Quick insertion toolbar for meeting dates and contact characteristics */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-zinc-500 font-medium mr-0.5 select-none">
          빠른 입력:
        </span>

        {/* 1. Insert Today's Date */}
        <button
          type="button"
          onClick={insertTodayDate}
          className="h-6.5 px-2 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[10.5px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          title="오늘 날짜를 메모에 삽입합니다"
        >
          <Calendar className="w-3 h-3 stroke-[1.75] text-zinc-400" />
          <span>오늘 날짜</span>
        </button>

        {/* 2. Custom Date Picker Popover Trigger */}
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setShowDatePicker((prev) => !prev)}
            className={`h-6.5 px-2 rounded-lg border text-[10.5px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
              showDatePicker
                ? 'bg-white text-neutral-950 border-white'
                : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
            }`}
            title="만난 날짜를 직접 선택하여 삽입합니다"
          >
            <Clock className="w-3 h-3 stroke-[1.75]" />
            <span>날짜 선택</span>
          </button>

          {showDatePicker && (
            <div className="absolute left-0 top-full mt-1.5 p-2 rounded-xl bg-[#18181B] border border-white/15 shadow-2xl z-30 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
              <input
                type="date"
                value={selectedMeetingDate}
                onChange={(e) => setSelectedMeetingDate(e.target.value)}
                className="bg-[#121214] border border-white/15 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30"
              />
              <button
                type="button"
                onClick={handleInsertSelectedDate}
                className="px-2.5 py-1 rounded-lg bg-white text-neutral-950 font-semibold text-xs hover:bg-zinc-200 cursor-pointer active:scale-95"
              >
                삽입
              </button>
            </div>
          )}
        </div>

        {/* 3. Contact Characteristics Snippet */}
        <button
          type="button"
          onClick={() => insertSnippet('💡 연락처 특징: ')}
          className="h-6.5 px-2 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[10.5px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          title="연락처 특징 템플릿 삽입"
        >
          <Sparkles className="w-3 h-3 stroke-[1.75] text-amber-400" />
          <span>특징·성향</span>
        </button>

        {/* 4. Meeting Place Snippet */}
        <button
          type="button"
          onClick={() => insertSnippet('📍 만난 장소/행사: ')}
          className="h-6.5 px-2 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[10.5px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          title="만난 장소/행사 템플릿 삽입"
        >
          <MapPin className="w-3 h-3 stroke-[1.75] text-zinc-400" />
          <span>만난 장소</span>
        </button>

        {/* 5. Follow-up / Agenda Snippet */}
        <button
          type="button"
          onClick={() => insertSnippet('📌 협의 내용·후속 일정: ')}
          className="h-6.5 px-2 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[10.5px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          title="협의 내용 및 후속 일정 템플릿 삽입"
        >
          <MessageSquare className="w-3 h-3 stroke-[1.75] text-zinc-400" />
          <span>협의 내용</span>
        </button>
      </div>

      {/* Textarea Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={memoText}
          onChange={(e) => {
            setMemoText(e.target.value);
            if (isConfirmingClear) setIsConfirmingClear(false);
          }}
          onBlur={() => {
            if (hasChanges) {
              handleSave(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="이 명함에 대한 연락처 특징, 만난 날짜 및 장소, 주요 관심사, 후속 미팅 계획 등을 자유롭게 기록하세요. (저장된 메모는 보관함 검색 시에도 활용됩니다)"
          rows={3}
          className="w-full min-h-[90px] max-h-[220px] p-3 rounded-xl bg-[#161618] border border-white/10 text-neutral-100 text-xs sm:text-[13px] leading-relaxed placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/25 focus:border-white/25 transition-all resize-y font-sans"
        />
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <p className="text-[10px] text-zinc-500 leading-tight hidden sm:block">
          <span className="font-mono text-zinc-400">Ctrl+Enter</span> 또는 바탕 클릭 시 자동 저장
        </p>

        <div className="flex items-center gap-1.5 ml-auto">
          {memoText && (
            isConfirmingClear ? (
              <div className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/25 rounded-lg px-2 py-1">
                <span className="text-[10.5px] text-rose-300 font-medium mr-0.5">삭제할까요?</span>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="px-1.5 py-0.5 rounded bg-rose-500 hover:bg-rose-400 text-white text-[10.5px] font-semibold cursor-pointer transition-colors"
                >
                  확인
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingClear(false)}
                  className="px-1.5 py-0.5 rounded text-zinc-300 hover:text-white hover:bg-white/10 text-[10.5px] cursor-pointer transition-colors"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingClear(true)}
                className="h-8 px-2.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-medium cursor-pointer transition-colors active:scale-95"
                title="메모 전체 지우기"
              >
                지우기
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={!hasChanges}
            className={`h-8 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              hasChanges
                ? 'bg-white hover:bg-zinc-200 text-neutral-950 shadow-md font-bold'
                : 'bg-white/10 text-zinc-400 hover:text-zinc-300'
            }`}
          >
            {hasChanges ? (
              <Save className="w-3.5 h-3.5 stroke-[2]" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[2.2] text-emerald-400" />
            )}
            <span>{hasChanges ? '메모 저장' : '저장 완료'}</span>
          </button>
        </div>
      </div>

      {/* Informative Privacy & Search Footnote */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1.5 text-[10px] text-zinc-400 leading-tight">
        <Tag className="w-3 h-3 text-zinc-400 shrink-0" />
        <span>
          메모는 기기 내 보안 보관함에 암호화 저장되며, 보관함 상단 검색창에서 검색어로 찾을 수 있습니다.
        </span>
      </div>
    </section>
  );
};
