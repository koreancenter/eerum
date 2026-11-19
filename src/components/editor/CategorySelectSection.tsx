import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import {
  CATEGORIES_UPDATED_EVENT,
  loadVaultCategories,
  addVaultCategory,
} from '../../utils/categories';

export const EDITOR_INPUT_CLASS =
  'w-full px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-lg bg-[var(--editor-input-bg)] border border-[var(--editor-input-border)] hover:border-[var(--editor-input-border-hover)] focus:outline-none focus:border-[var(--app-accent)] focus:bg-[var(--editor-input-bg-focus)] text-[var(--editor-text)] placeholder:text-[var(--editor-placeholder)] text-xs sm:text-[13px] transition-colors';

export interface CategorySelectSectionProps {
  category?: string;
  onChangeCategory: (category: string) => void;
  label?: string;
}

export const CategorySelectSection: React.FC<CategorySelectSectionProps> = ({
  category,
  onChangeCategory,
  label = '분류',
}) => {
  const [storedCategories, setStoredCategories] = useState<string[]>(() =>
    loadVaultCategories()
  );
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setStoredCategories(loadVaultCategories());
    window.addEventListener(CATEGORIES_UPDATED_EVENT, sync);
    return () => window.removeEventListener(CATEGORIES_UPDATED_EVENT, sync);
  }, []);

  const categories = useMemo(() => {
    if (category && !storedCategories.includes(category)) {
      return [...storedCategories, category];
    }
    return storedCategories;
  }, [storedCategories, category]);

  const handleQuickAddCategory = () => {
    const res = addVaultCategory(newCategoryName);
    if (!res.ok || !res.added) {
      setCategoryError(res.error || '카테고리를 추가할 수 없습니다.');
      return;
    }
    setStoredCategories(res.categories);
    onChangeCategory(res.added);
    setNewCategoryName('');
    setCategoryError(null);
    setIsAddingCategory(false);
  };

  const handleCancelQuickAdd = () => {
    setIsAddingCategory(false);
    setCategoryError(null);
    setNewCategoryName('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[var(--editor-label)]">{label}</label>
        {!isAddingCategory && (
          <button
            type="button"
            onClick={() => {
              setCategoryError(null);
              setIsAddingCategory(true);
            }}
            className="px-2 py-0.5 rounded-md border border-[var(--editor-control-border)] bg-[var(--editor-control-bg)] hover:border-[var(--editor-input-border-hover)] hover:bg-[var(--app-highlight)] text-[11px] font-medium text-[var(--editor-label)] hover:text-[var(--editor-text)] inline-flex items-center gap-0.5 cursor-pointer"
          >
            <Plus className="w-3 h-3 stroke-[2]" />
            <span>새 분류</span>
          </button>
        )}
      </div>

      {isAddingCategory ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              maxLength={20}
              autoFocus
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                if (categoryError) setCategoryError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickAddCategory();
                } else if (e.key === 'Escape') {
                  handleCancelQuickAdd();
                }
              }}
              placeholder="새 카테고리 이름"
              className={EDITOR_INPUT_CLASS}
            />
            <button
              type="button"
              onClick={handleQuickAddCategory}
              disabled={!newCategoryName.trim()}
              className="px-3 py-2.5 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-fg)] font-semibold text-xs shrink-0 disabled:opacity-40 cursor-pointer"
            >
              추가
            </button>
            <button
              type="button"
              onClick={handleCancelQuickAdd}
              className="px-2.5 py-2.5 rounded-lg border border-[var(--editor-control-border)] bg-[var(--editor-control-bg)] text-[var(--editor-text)] hover:border-[var(--editor-input-border-hover)] text-xs font-medium shrink-0 cursor-pointer"
            >
              취소
            </button>
          </div>
          {categoryError && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300/90">{categoryError}</p>
          )}
        </div>
      ) : (
        <select
          value={category || categories[0] || '기타'}
          onChange={(e) => onChangeCategory(e.target.value)}
          className={`${EDITOR_INPUT_CLASS} cursor-pointer`}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat} className="bg-[var(--app-surface)] text-[var(--app-text)]">
              {cat}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
