import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Camera, Trash2, Plus } from 'lucide-react';
import { CardData } from '../../types/card';
import { APP_BASE_DOMAIN } from '@/utils/cardSerializer';
import { cropAndCompressCardImage } from '../../utils/imageProcess';
import {
  CATEGORIES_UPDATED_EVENT,
  loadVaultCategories,
  addVaultCategory,
} from '../../utils/categories';

interface PhotoArchivingEditorProps {
  frontImageUrl?: string;
  backImageUrl?: string;
  onChangeFrontImage: (dataUrl: string | undefined) => void;
  onChangeBackImage: (dataUrl: string | undefined) => void;
  cardData: CardData;
  onChangeCardData: (field: keyof CardData, val: string) => void;
  slug: string;
  onChangeSlug: (slug: string) => void;
  notes: string;
  onChangeNotes: (val: string) => void;
  category?: string;
  onChangeCategory?: (cat: string) => void;
  isMyCardMode?: boolean;
}

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 rounded-lg bg-[#161618] border border-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-white/25 focus:bg-[#19191C] text-[#EDEDEF] placeholder:text-zinc-400 text-[13px]';

export const PhotoArchivingEditor: React.FC<PhotoArchivingEditorProps> = ({
  frontImageUrl,
  backImageUrl,
  onChangeFrontImage,
  onChangeBackImage,
  cardData,
  onChangeCardData,
  slug,
  onChangeSlug,
  notes,
  onChangeNotes,
  category,
  onChangeCategory,
  isMyCardMode = false
}) => {
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [storedCategories, setStoredCategories] = useState<string[]>(() => loadVaultCategories());
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
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
    if (!onChangeCategory) return;
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

  const currentImageUrl = activeSide === 'front' ? frontImageUrl : backImageUrl;

  const processFile = async (file: File, side: 'front' | 'back') => {
    if (!file.type.startsWith('image/')) return;
    setIsCompressing(true);
    try {
      const result = await cropAndCompressCardImage(file, {
        targetWidth: 900,
        targetHeight: 540,
        quality: 0.88,
        format: 'image/webp'
      });
      if (side === 'front') {
        onChangeFrontImage(result.dataUrl);
      } else {
        onChangeBackImage(result.dataUrl);
      }
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) processFile(file, side);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file, activeSide);
  };

  const handleLoadSample = () => {
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540"><rect width="900" height="540" fill="#F5F5F3"/><rect x="36" y="36" width="828" height="468" fill="none" stroke="#E4E4E7" stroke-width="1.5"/><text x="72" y="108" font-family="sans-serif" font-size="14" letter-spacing="4" fill="#71717A">GLOBAL HERITAGE FOUNDATION</text><text x="72" y="256" font-family="serif" font-size="40" font-weight="600" fill="#141416">Dr. Michael Harrison</text><text x="72" y="296" font-family="sans-serif" font-size="18" fill="#52525B">Executive Director · Cultural Strategy</text><line x1="72" y1="396" x2="828" y2="396" stroke="#E4E4E7" stroke-width="1"/><text x="72" y="444" font-family="monospace" font-size="16" fill="#27272A">+1 (202) 555-0182 · m.harrison@globalheritage.org</text></svg>`;
    const sampleDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(sampleSvg)}`;
    onChangeFrontImage(sampleDataUrl);
    setActiveSide('front');
    if (!cardData.name || cardData.name === 'PARK, GIHONG') {
      onChangeCardData('name', 'Dr. Michael Harrison');
      onChangeCardData('phone', '+1 (202) 555-0182');
      onChangeCardData('email', 'm.harrison@globalheritage.org');
      if (isMyCardMode) {
        onChangeSlug('harrison');
      } else {
        onChangeCardData('website', 'https://globalheritage.org');
      }
    }
  };

  const triggerCurrentInput = () => {
    if (activeSide === 'front') {
      frontInputRef.current?.click();
    } else {
      backInputRef.current?.click();
    }
  };

  const clearCurrentImage = () => {
    if (activeSide === 'front') {
      onChangeFrontImage(undefined);
    } else {
      onChangeBackImage(undefined);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Photo Upload Zone */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`text-xs tracking-wide cursor-pointer ${
                activeSide === 'front'
                  ? 'text-[#F2F2F5] font-medium'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              앞면 사진
            </button>
            <span className="text-zinc-400 text-xs select-none" aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => setActiveSide('back')}
              className={`text-xs tracking-wide cursor-pointer ${
                activeSide === 'back'
                  ? 'text-[#F2F2F5] font-medium'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              뒷면 사진
            </button>
          </div>

          <button
            type="button"
            onClick={handleLoadSample}
            className="text-xs text-zinc-400 hover:text-zinc-300 cursor-pointer"
          >
            샘플 불러오기
          </button>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !currentImageUrl && triggerCurrentInput()}
          className={`relative w-full aspect-[900/540] rounded-xl border overflow-hidden flex flex-col items-center justify-center ${
            isDragging
              ? 'border-white/30 bg-white/[0.04]'
              : currentImageUrl
                ? 'border-white/[0.08] bg-[#161618]'
                : 'border-dashed border-white/[0.1] hover:border-white/25 bg-[#161618] cursor-pointer'
          }`}
        >
          {currentImageUrl ? (
            <div className="relative w-full h-full group">
              <img
                src={currentImageUrl}
                alt="명함 이미지"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#0D0D0F]/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerCurrentInput();
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#EAEAE6] text-[#121214] hover:bg-[#F4F4F1] font-medium text-xs cursor-pointer"
                >
                  변경
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearCurrentImage();
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[#EDEDEF] cursor-pointer"
                  title="삭제"
                  aria-label="삭제"
                >
                  <Trash2 className="w-4 h-4 stroke-[1.5]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-2.5 pointer-events-none">
              <Camera className="w-5 h-5 text-zinc-400 stroke-[1.5]" />
              <p className="text-xs text-zinc-400">
                {isCompressing ? '이미지를 정리하는 중...' : '사진을 드래그하거나 클릭하여 업로드'}
              </p>
            </div>
          )}

          <input
            type="file"
            ref={frontInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleUpload(e, 'front')}
          />
          <input
            type="file"
            ref={backInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleUpload(e, 'back')}
          />
        </div>
      </section>

      {/* Essential Contact Metadata */}
      <section className="border-t border-white/[0.06] pt-8 space-y-4">
        <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
          기본 정보
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">성명</label>
            <input
              type="text"
              required
              value={cardData.name}
              onChange={(e) => onChangeCardData('name', e.target.value)}
              placeholder="박기홍"
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">연락처</label>
            <input
              type="text"
              required
              value={cardData.phone}
              onChange={(e) => onChangeCardData('phone', e.target.value)}
              placeholder="010-1234-5678"
              className={`${INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">이메일</label>
            <input
              type="email"
              value={cardData.email}
              onChange={(e) => onChangeCardData('email', e.target.value)}
              placeholder="name@domain.com"
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            {isMyCardMode ? (
              <>
                <label className="text-xs text-zinc-400 block">웹 주소</label>
                <div className="flex items-center rounded-lg bg-[#161618] border border-white/[0.06] focus-within:border-white/25 overflow-hidden">
                  <span className="px-3 py-2.5 text-zinc-400 font-mono text-xs shrink-0 border-r border-white/[0.06] select-none">
                    {APP_BASE_DOMAIN}/card/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => onChangeSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="slug"
                    className="w-full px-3 py-2.5 bg-transparent text-[#EDEDEF] placeholder:text-zinc-400 focus:outline-none font-mono text-[13px]"
                  />
                </div>
              </>
            ) : (
              <>
                <label className="text-xs text-zinc-400 block">웹사이트</label>
                <input
                  type="url"
                  value={cardData.website}
                  onChange={(e) => onChangeCardData('website', e.target.value)}
                  placeholder="https://example.com"
                  className={`${INPUT_CLASS} font-mono`}
                />
              </>
            )}
          </div>
        </div>

        <div className={onChangeCategory ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-1.5'}>
          {onChangeCategory && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-400">분류</label>
                {!isAddingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryError(null);
                      setIsAddingCategory(true);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[1.75]" />
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
                          setIsAddingCategory(false);
                          setCategoryError(null);
                        }
                      }}
                      placeholder="새 카테고리 이름"
                      className={INPUT_CLASS}
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-3 py-2.5 rounded-lg bg-[#EAEAE6] text-[#121214] font-medium text-xs shrink-0 disabled:opacity-40 cursor-pointer"
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setCategoryError(null);
                        setNewCategoryName('');
                      }}
                      className="px-2 py-2.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs shrink-0 cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                  {categoryError && (
                    <p className="text-[11px] text-amber-300/90">{categoryError}</p>
                  )}
                </div>
              ) : (
                <select
                  value={category || categories[0] || '기타'}
                  onChange={(e) => onChangeCategory(e.target.value)}
                  className={`${INPUT_CLASS} cursor-pointer`}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#161618] text-[#EDEDEF]">
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">메모</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => onChangeNotes(e.target.value)}
              placeholder="미팅 일시 또는 메모"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
