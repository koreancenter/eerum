import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Pencil,
  GitMerge,
  Trash2,
  Check,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { getDeleteFallbackCategory } from '../utils/categories';

export interface CategoryManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  categoryCounts: Record<string, number>;
  totalCardCount: number;
  focusAddOnOpen?: boolean;
  onAddCategory: (rawName: string) => { ok: boolean; added?: string; error?: string };
  onRenameCategory: (
    oldName: string,
    newName: string
  ) => {
    ok: boolean;
    renamed?: string;
    conflictTarget?: string;
    updatedCount?: number;
    error?: string;
  };
  onMergeCategories: (
    sourceCategory: string,
    targetCategory: string
  ) => { ok: boolean; target?: string; movedCount?: number; error?: string };
  onDeleteCategory: (
    targetCategory: string
  ) => { ok: boolean; fallback?: string; movedCount?: number; error?: string };
  onResetCategories: () => void;
}

export const CategoryManagementPanel: React.FC<CategoryManagementPanelProps> = ({
  isOpen,
  onClose,
  categories,
  categoryCounts,
  totalCardCount,
  focusAddOnOpen = false,
  onAddCategory,
  onRenameCategory,
  onMergeCategories,
  onDeleteCategory,
  onResetCategories,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [renameConflictTarget, setRenameConflictTarget] = useState<string | null>(null);

  const [mergingSource, setMergingSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string>('');

  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'info';
    message: string;
  } | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);

  // Reset transient row states whenever panel opens/closes
  useEffect(() => {
    if (!isOpen) {
      setNewCategoryName('');
      setEditingCategory(null);
      setEditingValue('');
      setRenameConflictTarget(null);
      setMergingSource(null);
      setMergeTarget('');
      setConfirmDeleteCategory(null);
      setFeedback(null);
      return;
    }

    if (focusAddOnOpen) {
      const timer = window.setTimeout(() => {
        addInputRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, focusAddOnOpen]);

  // Close panel on Escape when no inline row action is active
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !editingCategory &&
        !mergingSource &&
        !confirmDeleteCategory
      ) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editingCategory, mergingSource, confirmDeleteCategory, onClose]);

  if (!isOpen) return null;

  const clearRowModes = () => {
    setEditingCategory(null);
    setEditingValue('');
    setRenameConflictTarget(null);
    setMergingSource(null);
    setMergeTarget('');
    setConfirmDeleteCategory(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onAddCategory(newCategoryName);
    if (!res.ok) {
      setFeedback({
        type: 'error',
        message: res.error || '카테고리를 추가할 수 없습니다.',
      });
      return;
    }
    setNewCategoryName('');
    setFeedback({
      type: 'info',
      message: `'${res.added}' 카테고리가 추가되었습니다.`,
    });
  };

  const handleStartRename = (cat: string) => {
    clearRowModes();
    setFeedback(null);
    setEditingCategory(cat);
    setEditingValue(cat);
  };

  const handleSaveRename = (oldName: string) => {
    const trimmed = editingValue.trim();
    if (trimmed === oldName) {
      clearRowModes();
      return;
    }
    const res = onRenameCategory(oldName, trimmed);
    if (!res.ok) {
      setRenameConflictTarget(res.conflictTarget || null);
      setFeedback({
        type: 'error',
        message: res.error || '카테고리 이름을 변경할 수 없습니다.',
      });
      return;
    }
    clearRowModes();
    const count = res.updatedCount ?? 0;
    setFeedback({
      type: 'info',
      message:
        count > 0
          ? `'${oldName}' 카테고리가 '${res.renamed}'(으)로 변경되어 명함 ${count}장에 반영되었습니다.`
          : `'${oldName}' 카테고리가 '${res.renamed}'(으)로 변경되었습니다.`,
    });
  };

  const handleStartMerge = (sourceCat: string) => {
    clearRowModes();
    setFeedback(null);
    const availableTargets = categories.filter((c) => c !== sourceCat);
    if (availableTargets.length === 0) return;
    setMergingSource(sourceCat);
    setMergeTarget(availableTargets[0]);
  };

  const handleExecuteMerge = (sourceCat: string, targetCat: string) => {
    const res = onMergeCategories(sourceCat, targetCat);
    if (!res.ok || !res.target) {
      setFeedback({
        type: 'error',
        message: res.error || '카테고리를 병합할 수 없습니다.',
      });
      return;
    }
    clearRowModes();
    const moved = res.movedCount ?? 0;
    setFeedback({
      type: 'info',
      message:
        moved > 0
          ? `'${sourceCat}'의 명함 ${moved}장이 '${res.target}'(으)로 병합되었습니다.`
          : `'${sourceCat}' 카테고리가 '${res.target}'(으)로 통합되었습니다.`,
    });
  };

  const handleStartDelete = (cat: string) => {
    clearRowModes();
    setFeedback(null);
    setConfirmDeleteCategory(cat);
  };

  const handleExecuteDelete = (cat: string) => {
    const res = onDeleteCategory(cat);
    if (!res.ok) {
      setFeedback({
        type: 'error',
        message: res.error || '카테고리를 삭제할 수 없습니다.',
      });
      return;
    }
    clearRowModes();
    const moved = res.movedCount ?? 0;
    setFeedback({
      type: 'info',
      message:
        moved > 0
          ? `'${cat}' 카테고리가 삭제되었으며, 명함 ${moved}장이 '${res.fallback}'(으)로 이동되었습니다.`
          : `'${cat}' 카테고리가 삭제되었습니다.`,
    });
  };

  const handleReset = () => {
    clearRowModes();
    onResetCategories();
    setFeedback({
      type: 'info',
      message: '기본 카테고리 구성이 복원되었습니다.',
    });
  };

  const canMergeOrDelete = categories.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="카테고리 관리 패널"
        className="relative w-full max-w-md h-full bg-[#111113] border-l border-white/10 text-neutral-100 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.07] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-semibold text-white tracking-tight">
              카테고리 관리
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="tabular-nums">{categories.length}개 분류</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">명함 총 {totalCardCount}장</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] -mr-2 -mt-1 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            aria-label="패널 닫기"
            title="닫기"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Add New Category Bar */}
        <form
          onSubmit={handleAddSubmit}
          className="px-6 py-4 border-b border-white/[0.07] space-y-2.5 shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              ref={addInputRef}
              type="text"
              maxLength={20}
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                if (feedback?.type === 'error') setFeedback(null);
              }}
              placeholder="새 카테고리 추가 (예: 디자인·브랜딩)"
              aria-label="새 카테고리 이름"
              className="flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-white/25 focus:bg-white/[0.05] focus:outline-none text-xs text-white placeholder:text-zinc-500"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="h-10 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-35 disabled:pointer-events-none text-neutral-950 font-semibold text-xs whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" />
              <span>추가</span>
            </button>
          </div>

          {feedback && (
            <p
              role="status"
              className={`text-[11px] leading-relaxed ${
                feedback.type === 'error' ? 'text-amber-300/90' : 'text-zinc-300'
              }`}
            >
              {feedback.message}
            </p>
          )}
        </form>

        {/* Section Guide Line */}
        <div className="px-6 py-2.5 border-b border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
          <span>분류 목록</span>
          <span>이름 변경 및 병합 시 소속 명함에 즉시 반영</span>
        </div>

        {/* Category Hairline List (Zero Nested Card Borders) */}
        <div className="px-6 overflow-y-auto flex-1 divide-y divide-white/[0.06]">
          {categories.map((cat) => {
            const count = categoryCounts[cat] ?? 0;
            const isEditing = editingCategory === cat;
            const isMerging = mergingSource === cat;
            const isConfirmingDelete = confirmDeleteCategory === cat;
            const availableMergeTargets = categories.filter((c) => c !== cat);
            const targetCount = mergeTarget ? categoryCounts[mergeTarget] ?? 0 : 0;
            const deleteFallback = getDeleteFallbackCategory(cat, categories);

            return (
              <div key={cat} className="py-3.5">
                {isEditing ? (
                  /* ================= INLINE RENAME FLOW ================= */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>&lsquo;{cat}&rsquo; 이름 변경</span>
                      <span className="tabular-nums">
                        {count > 0 ? `소속 명함 ${count}장 동시 변경` : '할당된 명함 없음'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={20}
                        autoFocus
                        value={editingValue}
                        onChange={(e) => {
                          setEditingValue(e.target.value);
                          if (renameConflictTarget) setRenameConflictTarget(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveRename(cat);
                          } else if (e.key === 'Escape') {
                            clearRowModes();
                          }
                        }}
                        aria-label={`${cat} 새 이름 입력`}
                        className="flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-white/[0.05] border border-white/20 focus:border-white/35 focus:outline-none text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(cat)}
                        disabled={!editingValue.trim()}
                        className="h-10 px-3.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-35 text-neutral-950 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2]" />
                        <span>저장</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearRowModes}
                        className="h-10 px-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 text-xs cursor-pointer shrink-0"
                      >
                        취소
                      </button>
                    </div>

                    {renameConflictTarget && (
                      <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                        <span className="text-zinc-300">
                          &lsquo;{renameConflictTarget}&rsquo; 카테고리로 바로 통합할까요?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleExecuteMerge(cat, renameConflictTarget)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium cursor-pointer shrink-0 inline-flex items-center gap-1"
                        >
                          <GitMerge className="w-3 h-3 stroke-[1.75]" />
                          <span>병합하기</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : isMerging ? (
                  /* ================= INLINE MERGE FLOW ================= */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-200 font-medium">
                        &lsquo;{cat}&rsquo; ({count}장) 병합 대상 선택
                      </span>
                      <span className="text-zinc-400 tabular-nums inline-flex items-center gap-1">
                        <span>{count}장</span>
                        <ArrowRight className="w-3 h-3 stroke-[1.5]" />
                        <span>총 {count + targetCount}장</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={mergeTarget}
                        onChange={(e) => setMergeTarget(e.target.value)}
                        aria-label={`${cat} 병합 대상 카테고리`}
                        className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-[#161618] border border-white/15 focus:border-white/30 focus:outline-none text-xs text-white cursor-pointer"
                      >
                        {availableMergeTargets.map((target) => (
                          <option
                            key={target}
                            value={target}
                            className="bg-[#161618] text-neutral-100"
                          >
                            {target} ({categoryCounts[target] ?? 0}장)
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleExecuteMerge(cat, mergeTarget)}
                        disabled={!mergeTarget}
                        className="h-10 px-3.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-35 text-neutral-950 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <GitMerge className="w-3.5 h-3.5 stroke-[1.75]" />
                        <span>병합 적용</span>
                      </button>

                      <button
                        type="button"
                        onClick={clearRowModes}
                        className="h-10 px-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 text-xs cursor-pointer shrink-0"
                      >
                        취소
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {count > 0
                        ? `'${cat}' 카테고리는 목록에서 통합 제거되며, 소속된 명함 ${count}장이 모두 '${mergeTarget}' 분류로 이동합니다.`
                        : `'${cat}' 카테고리가 '${mergeTarget}' 분류로 통합 제거됩니다.`}
                    </p>
                  </div>
                ) : isConfirmingDelete ? (
                  /* ================= INLINE DELETE CONFIRMATION ================= */
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-zinc-300 leading-snug">
                      {count > 0
                        ? `삭제 시 명함 ${count}장이 '${deleteFallback}' 분류로 이동합니다.`
                        : `'${cat}' 카테고리를 삭제할까요?`}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExecuteDelete(cat)}
                        className="h-9 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 text-xs font-medium cursor-pointer"
                      >
                        삭제
                      </button>
                      <button
                        type="button"
                        onClick={clearRowModes}
                        className="h-9 px-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 text-xs cursor-pointer"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ================= DEFAULT CATEGORY ROW ================= */
                  <div className="flex items-center justify-between gap-2 min-h-[36px]">
                    <div className="min-w-0 flex items-center gap-2 text-xs">
                      <span className="font-medium text-neutral-100 truncate">{cat}</span>
                      <span className="text-zinc-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono tabular-nums shrink-0">
                        {count}장
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartRename(cat)}
                        className="h-8 px-2.5 rounded-lg text-[11px] text-zinc-300 hover:text-white hover:bg-white/10 inline-flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                        aria-label={`${cat} 이름 변경`}
                        title="이름 변경"
                      >
                        <Pencil className="w-3 h-3 stroke-[1.5]" />
                        <span>이름 변경</span>
                      </button>

                      <button
                        type="button"
                        disabled={!canMergeOrDelete}
                        onClick={() => handleStartMerge(cat)}
                        className="h-8 px-2.5 rounded-lg text-[11px] text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none inline-flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                        aria-label={`${cat} 다른 카테고리로 병합`}
                        title="다른 카테고리로 병합"
                      >
                        <GitMerge className="w-3 h-3 stroke-[1.5]" />
                        <span>병합</span>
                      </button>

                      <button
                        type="button"
                        disabled={!canMergeOrDelete}
                        onClick={() => handleStartDelete(cat)}
                        className="w-8 h-8 rounded-lg text-zinc-500 hover:text-rose-300 hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                        aria-label={`${cat} 삭제`}
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Panel Footer */}
        <div className="px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-white/[0.07] flex items-center justify-between gap-3 shrink-0 bg-[#111113]">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[40px] px-3 py-2 -ml-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>기본값 복원</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-neutral-950 font-semibold text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            완료
          </button>
        </div>
      </aside>
    </div>
  );
};
