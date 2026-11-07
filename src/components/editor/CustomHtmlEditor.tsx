import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Copy, RotateCcw, Check } from 'lucide-react';
import { CardData } from '../../types/card';
import { sanitizeHtml, detectUnsafeHtmlPatterns } from '../../utils/sanitizeHtml';
import {
  CATEGORIES_UPDATED_EVENT,
  loadVaultCategories,
  addVaultCategory,
} from '../../utils/categories';

interface CustomHtmlEditorProps {
  htmlFront: string;
  htmlBack: string;
  onChangeFront: (val: string) => void;
  onChangeBack: (val: string) => void;
  cardData: CardData;
  onChangeCardData: (field: keyof CardData, val: string) => void;
  activeFace: 'front' | 'back';
  onChangeActiveFace: (face: 'front' | 'back') => void;
  category?: string;
  onChangeCategory?: (cat: string) => void;
}

export const CLOUD_AI_QUIET_LUXURY_PROMPT = `너는 최고급 하이엔드 브랜딩 전문 시니어 UI/UX 디자이너이자 프론트엔드 엔지니어입니다.
아래의 명함 정보를 바탕으로, 현대적이고 우아한 'Quiet Luxury' 모노크롬 스타일의 디지털 명함 앞면 HTML 코드를 작성해 주세요.

[명함 정보]
- 회사/조직명: (예: 고구마 스튜디오)
- 이름 및 직함: (예: 홍길동 / 수석 디자이너)
- 연락처: (예: 010-1234-5678 / contact@example.com)
- 슬로건 또는 웹사이트: (예: goguma.app)

[엄격한 기술 및 디자인 제약 사항]
1. 최상위 태그는 단 1개의 <div>로 감싸야 하며, <html>, <head>, <body> 태그는 절대 포함하지 마세요.
2. 카드 규격은 가로형 명함 표준 비율(1.586:1)을 유지할 수 있도록 \`w-full h-full aspect-[1.586/1]\` 클래스를 사용하세요.
3. 스타일링은 오직 Tailwind CSS 유틸리티 클래스만 사용하세요.
4. 테마 및 색상:
   - 배경: 매트 옵시디언(bg-[#121214] 또는 bg-[#161618])
   - 주 텍스트: 소프트 오프화이트(text-[#F2F2F5])
   - 보조 및 보더: 섬세한 헤어라인(text-zinc-400 및 border-white/10)
5. 오직 HTML 코드 블록(\`\`\`html ... \`\`\`)만 출력하고 불필요한 설명은 생략하세요.`;

export const DEFAULT_LUXURY_HTML_FRONT = `<div class="w-full h-full aspect-[1.586/1] bg-[#121214] text-[#F2F2F5] p-7 flex flex-col justify-between border border-white/10 rounded-2xl relative overflow-hidden font-sans select-none">
  <div class="flex justify-between items-start">
    <div>
      <span class="text-[10px] tracking-[0.22em] text-zinc-400 uppercase font-mono block mb-1.5">GOGUMA KNOWLEDGE OFFICE</span>
      <h2 class="text-xl font-semibold tracking-tight text-[#F4F4F6]">PARK, GIHONG</h2>
      <p class="text-xs text-zinc-400 font-normal mt-0.5">박기홍 · Principal Master</p>
    </div>
    <div class="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-[#EAEAE6] font-serif text-xs bg-white/[0.02]">
      PG
    </div>
  </div>
  <div class="space-y-2 border-t border-white/[0.08] pt-4">
    <div class="flex justify-between items-center text-[11px]">
      <span class="text-zinc-400 font-mono">OFFICE</span>
      <span class="text-zinc-300">고구마 지식 관리실</span>
    </div>
    <div class="flex justify-between items-center text-[11px]">
      <span class="text-zinc-400 font-mono">TEL</span>
      <span class="text-[#EDEDEF] font-mono tabular-nums">+82 10-1234-5678</span>
    </div>
    <div class="flex justify-between items-center text-[11px]">
      <span class="text-zinc-400 font-mono">MAIL</span>
      <span class="text-zinc-400 font-mono">master@goguma.app</span>
    </div>
  </div>
</div>`;

export const DEFAULT_LUXURY_HTML_BACK = `<div class="w-full h-full aspect-[1.586/1] bg-[#121214] text-[#F2F2F5] p-8 flex flex-col items-center justify-center border border-white/10 rounded-2xl text-center relative overflow-hidden select-none">
  <div class="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-[#EAEAE6] font-serif text-base mb-3.5 bg-white/[0.02]">
    PG
  </div>
  <h3 class="text-xs font-medium tracking-[0.2em] text-[#F2F2F5] uppercase font-sans">GOGUMA KNOWLEDGE OFFICE</h3>
  <p class="text-[10px] tracking-[0.22em] uppercase text-zinc-400 mt-1.5 max-w-[260px] leading-relaxed">KOREAN CENTER GLOBAL NETWORK</p>
  <span class="mt-4 text-[10px] font-mono text-zinc-400 tracking-wider">
    card.goguma.app/master
  </span>
</div>`;

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 rounded-lg bg-[#161618] border border-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-white/25 focus:bg-[#19191C] text-[#EDEDEF] placeholder:text-zinc-400 text-[13px]';

export const CustomHtmlEditor: React.FC<CustomHtmlEditorProps> = ({
  htmlFront,
  htmlBack,
  onChangeFront,
  onChangeBack,
  cardData,
  onChangeCardData,
  activeFace,
  onChangeActiveFace,
  category,
  onChangeCategory
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);
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

  const handleCopyPrompt = () => {
    let promptText = CLOUD_AI_QUIET_LUXURY_PROMPT;
    if (cardData.name || cardData.organizationKr) {
      promptText = promptText.replace(
        '[명함 정보]\n- 회사/조직명: (예: 고구마 스튜디오)\n- 이름 및 직함: (예: 홍길동 / 수석 디자이너)\n- 연락처: (예: 010-1234-5678 / contact@example.com)\n- 슬로건 또는 웹사이트: (예: goguma.app)',
        `[명함 정보]\n- 회사/조직명: ${cardData.organizationKr || cardData.organization || '고구마 스튜디오'}\n- 이름 및 직함: ${cardData.name || '홍길동'} / ${cardData.titleKr || cardData.title || '수석 디자이너'}\n- 연락처: ${cardData.phone || '010-1234-5678'} / ${cardData.email || 'contact@goguma.app'}\n- 슬로건 또는 웹사이트: ${cardData.website || 'card.goguma.app'}`
      );
    }

    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleApplyDefaultTemplate = () => {
    onChangeFront(sanitizeHtml(DEFAULT_LUXURY_HTML_FRONT));
    onChangeBack(sanitizeHtml(DEFAULT_LUXURY_HTML_BACK));
    setTemplateStatus('기본 템플릿 코드가 적용되었습니다.');
    setTimeout(() => setTemplateStatus(null), 2400);
  };

  const currentHtml = activeFace === 'front' ? htmlFront : htmlBack;
  const detectedUnsafe = useMemo(() => detectUnsafeHtmlPatterns(currentHtml), [currentHtml]);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-150">
      {/* Code Editor Section */}
      <section className="space-y-2.5 sm:space-y-3.5">
        <div className="flex flex-row items-center justify-between gap-2 whitespace-nowrap">
          {/* 2-Segment Face Toggle Switch */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg bg-[#161618] border border-white/[0.08] shrink-0"
            role="group"
            aria-label="명함 면 선택"
          >
            <button
              type="button"
              onClick={() => onChangeActiveFace('front')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                activeFace === 'front'
                  ? 'bg-[#27272A] text-[#F2F2F5] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
              title="앞면 코드 편집 (Front)"
              aria-label="앞면 코드 편집"
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => onChangeActiveFace('back')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                activeFace === 'back'
                  ? 'bg-[#27272A] text-[#F2F2F5] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
              title="뒷면 코드 편집 (Back)"
              aria-label="뒷면 코드 편집"
            >
              Back
            </button>
          </div>

          {/* Compact Icon Actions */}
          <div className="flex flex-row items-center gap-1.5 shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/15 transition-all cursor-pointer relative"
              title={copiedPrompt ? 'AI 프롬프트 복사됨' : 'AI 프롬프트 복사'}
              aria-label={copiedPrompt ? 'AI 프롬프트 복사됨' : 'AI 프롬프트 복사'}
            >
              {copiedPrompt ? (
                <Check className="w-4 h-4 text-emerald-400 stroke-[2]" />
              ) : (
                <Copy className="w-4 h-4 stroke-[1.75]" />
              )}
            </button>
            <button
              type="button"
              onClick={handleApplyDefaultTemplate}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/15 transition-all cursor-pointer"
              title="기본 프리셋 코드 적용"
              aria-label="기본 프리셋 코드 적용"
            >
              <RotateCcw className="w-4 h-4 stroke-[1.75]" />
            </button>
          </div>
        </div>

        <textarea
          rows={7}
          value={activeFace === 'front' ? htmlFront : htmlBack}
          onChange={(e) =>
            activeFace === 'front'
              ? onChangeFront(e.target.value)
              : onChangeBack(e.target.value)
          }
          placeholder="<div class=&quot;w-full h-full aspect-[9/5] bg-[#121214] text-[#F2F2F5] p-7 ...&quot;>...</div>"
          className="w-full p-3 sm:p-4 rounded-xl bg-[#161618] border border-white/[0.06] hover:border-white/[0.12] focus:border-white/25 focus:bg-[#19191C] focus:outline-none text-zinc-200 text-xs font-mono leading-relaxed resize-y selection:bg-white/15 editor-scrollbar min-h-[140px] sm:min-h-[220px]"
          spellCheck={false}
        />

        {(templateStatus || detectedUnsafe.length > 0) && (
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
            {detectedUnsafe.length > 0 ? (
              <span>허용되지 않는 스크립트 속성은 자동으로 제외됩니다.</span>
            ) : (
              <span>{templateStatus}</span>
            )}
          </div>
        )}
      </section>

      {/* Essential Contact Metadata */}
      <section className="border-t border-white/[0.06] pt-4 sm:pt-6 lg:pt-8 space-y-3 sm:space-y-4">
        <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
          연결 정보
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
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
                value={category || categories[0] || 'VIP 파트너'}
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
      </section>
    </div>
  );
};
