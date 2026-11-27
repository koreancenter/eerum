import React, { useState, useMemo } from 'react';
import { Copy, RotateCcw, Check } from 'lucide-react';
import { CardData } from '../../types/card';
import { sanitizeHtml, detectUnsafeHtmlPatterns } from '../../utils/sanitizeHtml';
import { CategorySelectSection, EDITOR_INPUT_CLASS } from './CategorySelectSection';
import { useLocale } from '../../hooks/useLocale';

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

export const CLOUD_AI_QUIET_LUXURY_PROMPT_EN = `You are a senior UI/UX designer and frontend engineer specializing in Quiet Luxury digital branding.
Write clean HTML code for the front face of a minimalist, high-craft digital business card using the details below.

[Card Details]
- Organization: (e.g. Goguma Studio)
- Name & Title: (e.g. Alex Kim / Principal Designer)
- Contact: (e.g. +1 415-555-0192 / contact@example.com)
- Slogan or Website: (e.g. eerum.goguma.app)

[Strict Technical & Design Constraints]
1. Wrap everything in a single root <div>. Never include <html>, <head>, or <body> tags.
2. Preserve standard landscape business card proportions (1.586:1) using \`w-full h-full aspect-[1.586/1]\`.
3. Use Tailwind CSS utility classes only.
4. Palette:
   - Canvas: Matte Obsidian (bg-[#121214] or bg-[#161618])
   - Primary text: Soft Off-White (text-[#F2F2F5])
   - Muted & hairlines: text-zinc-400 and border-white/10
5. Output ONLY a single \`\`\`html ... \`\`\` code block with no extra commentary.`;

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
    eerum.goguma.app/master
  </span>
</div>`;

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
  const { isEn } = useLocale();
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);

  const handleCopyPrompt = () => {
    let promptText = isEn ? CLOUD_AI_QUIET_LUXURY_PROMPT_EN : CLOUD_AI_QUIET_LUXURY_PROMPT;
    if (cardData.name || cardData.organizationKr || cardData.organization) {
      if (isEn) {
        promptText = promptText.replace(
          '[Card Details]\n- Organization: (e.g. Goguma Studio)\n- Name & Title: (e.g. Alex Kim / Principal Designer)\n- Contact: (e.g. +1 415-555-0192 / contact@example.com)\n- Slogan or Website: (e.g. eerum.goguma.app)',
          `[Card Details]\n- Organization: ${cardData.organization || cardData.organizationKr || 'Goguma Studio'}\n- Name & Title: ${cardData.name || 'Alex Kim'} / ${cardData.title || cardData.titleKr || 'Principal Designer'}\n- Contact: ${cardData.phone || '+1 415-555-0192'} / ${cardData.email || 'contact@goguma.app'}\n- Slogan or Website: ${cardData.website || 'eerum.goguma.app'}`
        );
      } else {
        promptText = promptText.replace(
          '[명함 정보]\n- 회사/조직명: (예: 고구마 스튜디오)\n- 이름 및 직함: (예: 홍길동 / 수석 디자이너)\n- 연락처: (예: 010-1234-5678 / contact@example.com)\n- 슬로건 또는 웹사이트: (예: goguma.app)',
          `[명함 정보]\n- 회사/조직명: ${cardData.organizationKr || cardData.organization || '고구마 스튜디오'}\n- 이름 및 직함: ${cardData.name || '홍길동'} / ${cardData.titleKr || cardData.title || '수석 디자이너'}\n- 연락처: ${cardData.phone || '010-1234-5678'} / ${cardData.email || 'contact@goguma.app'}\n- 슬로건 또는 웹사이트: ${cardData.website || 'eerum.goguma.app'}`
        );
      }
    }

    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleApplyDefaultTemplate = () => {
    onChangeFront(sanitizeHtml(DEFAULT_LUXURY_HTML_FRONT));
    onChangeBack(sanitizeHtml(DEFAULT_LUXURY_HTML_BACK));
    setTemplateStatus(isEn ? 'Default template code applied.' : '기본 템플릿 코드가 적용되었습니다.');
    setTimeout(() => setTemplateStatus(null), 2400);
  };

  const currentHtml = activeFace === 'front' ? htmlFront : htmlBack;
  const detectedUnsafe = useMemo(() => detectUnsafeHtmlPatterns(currentHtml), [currentHtml]);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-150">
      {/* Code Editor Section */}
      <section className="space-y-2.5 sm:space-y-3.5">
        <div className="flex flex-row items-center justify-between gap-2 whitespace-nowrap border-b border-[var(--editor-divider)] pb-0.5">
          {/* Flat Underline Face Toggle Switch (Zero Box-in-Box) */}
          <div
            className="inline-flex items-center gap-4 shrink-0"
            role="tablist"
            aria-label={isEn ? 'Select card face' : '명함 면 선택'}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeFace === 'front'}
              onClick={() => onChangeActiveFace('front')}
              className={`relative pb-2 text-xs tracking-wide transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none ${
                activeFace === 'front'
                  ? 'text-[var(--editor-text)] font-semibold'
                  : 'text-[var(--editor-muted)] hover:text-[var(--editor-text)] font-medium'
              }`}
              title={isEn ? 'Edit front HTML' : '앞면 코드 편집 (Front)'}
              aria-label={isEn ? 'Edit front HTML' : '앞면 코드 편집'}
            >
              Front
              {activeFace === 'front' && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--app-accent)]" />
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFace === 'back'}
              onClick={() => onChangeActiveFace('back')}
              className={`relative pb-2 text-xs tracking-wide transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none ${
                activeFace === 'back'
                  ? 'text-[var(--editor-text)] font-semibold'
                  : 'text-[var(--editor-muted)] hover:text-[var(--editor-text)] font-medium'
              }`}
              title={isEn ? 'Edit back HTML' : '뒷면 코드 편집 (Back)'}
              aria-label={isEn ? 'Edit back HTML' : '뒷면 코드 편집'}
            >
              Back
              {activeFace === 'back' && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--app-accent)]" />
              )}
            </button>
          </div>

          {/* Compact Icon Actions */}
          <div className="mb-1 flex flex-row items-center gap-1.5 shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="p-1.5 rounded-lg text-[var(--editor-label)] hover:text-[var(--editor-text)] bg-[var(--editor-control-bg)] hover:bg-[var(--app-highlight)] border border-[var(--editor-control-border)] hover:border-[var(--editor-input-border-hover)] transition-all cursor-pointer relative"
              title={
                copiedPrompt
                  ? isEn ? 'AI Prompt Copied' : 'AI 프롬프트 복사됨'
                  : isEn ? 'Copy AI Prompt' : 'AI 프롬프트 복사'
              }
              aria-label={
                copiedPrompt
                  ? isEn ? 'AI Prompt Copied' : 'AI 프롬프트 복사됨'
                  : isEn ? 'Copy AI Prompt' : 'AI 프롬프트 복사'
              }
            >
              {copiedPrompt ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2]" />
              ) : (
                <Copy className="w-4 h-4 stroke-[1.75]" />
              )}
            </button>
            <button
              type="button"
              onClick={handleApplyDefaultTemplate}
              className="p-1.5 rounded-lg text-[var(--editor-label)] hover:text-[var(--editor-text)] bg-[var(--editor-control-bg)] hover:bg-[var(--app-highlight)] border border-[var(--editor-control-border)] hover:border-[var(--editor-input-border-hover)] transition-all cursor-pointer"
              title={isEn ? 'Apply default preset code' : '기본 프리셋 코드 적용'}
              aria-label={isEn ? 'Apply default preset code' : '기본 프리셋 코드 적용'}
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
          className="w-full p-3 sm:p-4 rounded-xl bg-[var(--editor-input-bg)] border border-[var(--editor-input-border)] hover:border-[var(--editor-input-border-hover)] focus:border-[var(--app-accent)] focus:bg-[var(--editor-input-bg-focus)] focus:outline-none text-[var(--editor-text)] placeholder:text-[var(--editor-placeholder)] text-xs font-mono leading-relaxed resize-y selection:bg-[var(--app-highlight)] selection:text-[var(--app-highlight-fg)] editor-scrollbar min-h-[140px] sm:min-h-[220px] transition-colors"
          spellCheck={false}
        />

        {(templateStatus || detectedUnsafe.length > 0) && (
          <div className="flex items-center justify-between text-[11px] text-[var(--editor-muted)] pt-0.5">
            {detectedUnsafe.length > 0 ? (
              <span>
                {isEn
                  ? 'Disallowed script attributes are automatically stripped.'
                  : '허용되지 않는 스크립트 속성은 자동으로 제외됩니다.'}
              </span>
            ) : (
              <span>{templateStatus}</span>
            )}
          </div>
        )}
      </section>

      {/* Essential Contact Metadata */}
      <section className="border-t border-[var(--editor-divider)] pt-4 sm:pt-6 lg:pt-8 space-y-3 sm:space-y-4">
        <h4 className="text-xs font-semibold text-[var(--editor-section-title)] tracking-wide">
          {isEn ? 'Contact Reference' : '연결 정보'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--editor-label)] block">
              {isEn ? 'Full Name' : '성명'}
            </label>
            <input
              type="text"
              required
              value={cardData.name}
              onChange={(e) => onChangeCardData('name', e.target.value)}
              placeholder={isEn ? 'Park, Gihong' : '박기홍'}
              className={EDITOR_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--editor-label)] block">
              {isEn ? 'Phone' : '연락처'}
            </label>
            <input
              type="text"
              required
              value={cardData.phone}
              onChange={(e) => onChangeCardData('phone', e.target.value)}
              placeholder="010-1234-5678"
              className={`${EDITOR_INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>
        </div>

        {onChangeCategory && (
          <CategorySelectSection
            category={category}
            onChangeCategory={onChangeCategory}
          />
        )}
      </section>
    </div>
  );
};
