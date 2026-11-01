import React, { useState, useMemo } from 'react';
import { CardData } from '../../types/card';
import { sanitizeHtml, detectUnsafeHtmlPatterns } from '../../utils/sanitizeHtml';

interface CustomHtmlEditorProps {
  htmlFront: string;
  htmlBack: string;
  onChangeFront: (val: string) => void;
  onChangeBack: (val: string) => void;
  cardData: CardData;
  onChangeCardData: (field: keyof CardData, val: string) => void;
  activeFace: 'front' | 'back';
  onChangeActiveFace: (face: 'front' | 'back') => void;
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
  onChangeActiveFace
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);

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

  const handleGenerateDirectAi = async () => {
    setIsGeneratingAi(true);
    setAiStatus('코드를 구성하는 중...');
    try {
      const res = await fetch('/api/generate-card-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: CLOUD_AI_QUIET_LUXURY_PROMPT,
          profileData: {
            name: cardData.name || '홍길동',
            company: cardData.organizationKr || cardData.organization || '고구마 스튜디오',
            title: cardData.titleKr || cardData.title || '수석 디자이너',
            phone: cardData.phone || '010-1234-5678',
            email: cardData.email || 'contact@example.com',
            website: cardData.website || 'card.goguma.app'
          }
        })
      });
      const data = await res.json();
      if (data.success && data.html) {
        onChangeFront(sanitizeHtml(data.html));
        setAiStatus('새로운 코드가 적용되었습니다.');
      } else {
        onChangeFront(sanitizeHtml(DEFAULT_LUXURY_HTML_FRONT));
        onChangeBack(sanitizeHtml(DEFAULT_LUXURY_HTML_BACK));
        setAiStatus('기본 템플릿이 적용되었습니다.');
      }
    } catch {
      onChangeFront(sanitizeHtml(DEFAULT_LUXURY_HTML_FRONT));
      setAiStatus('기본 템플릿이 적용되었습니다.');
    } finally {
      setIsGeneratingAi(false);
      setTimeout(() => setAiStatus(null), 2800);
    }
  };

  const currentHtml = activeFace === 'front' ? htmlFront : htmlBack;
  const detectedUnsafe = useMemo(() => detectUnsafeHtmlPatterns(currentHtml), [currentHtml]);

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Code Editor Section */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Pure Typographic Face Switcher */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onChangeActiveFace('front')}
              className={`text-xs tracking-wide cursor-pointer ${
                activeFace === 'front'
                  ? 'text-[#F2F2F5] font-medium'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              앞면 코드
            </button>
            <span className="text-zinc-400 text-xs select-none" aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => onChangeActiveFace('back')}
              className={`text-xs tracking-wide cursor-pointer ${
                activeFace === 'back'
                  ? 'text-[#F2F2F5] font-medium'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              뒷면 코드
            </button>
          </div>

          {/* Quiet Utility Actions */}
          <div className="flex items-center gap-3 text-xs shrink-0">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="text-zinc-400 hover:text-zinc-200 cursor-pointer whitespace-nowrap"
            >
              {copiedPrompt ? '복사됨' : '프롬프트 복사'}
            </button>
            <span className="text-zinc-400 select-none" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleGenerateDirectAi}
              disabled={isGeneratingAi}
              className="text-zinc-400 hover:text-[#F2F2F5] cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {isGeneratingAi ? '적용 중...' : '기본 코드 적용'}
            </button>
          </div>
        </div>

        <textarea
          rows={12}
          value={activeFace === 'front' ? htmlFront : htmlBack}
          onChange={(e) =>
            activeFace === 'front'
              ? onChangeFront(e.target.value)
              : onChangeBack(e.target.value)
          }
          placeholder="<div class=&quot;w-full h-full aspect-[1.586/1] bg-[#121214] text-[#F2F2F5] p-7 ...&quot;>...</div>"
          className="w-full p-4 rounded-xl bg-[#161618] border border-white/[0.06] hover:border-white/[0.12] focus:border-white/25 focus:bg-[#19191C] focus:outline-none text-zinc-200 text-xs font-mono leading-relaxed resize-y selection:bg-white/15 editor-scrollbar"
          spellCheck={false}
        />

        {(aiStatus || detectedUnsafe.length > 0) && (
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
            {detectedUnsafe.length > 0 ? (
              <span>허용되지 않는 스크립트 속성은 자동으로 제외됩니다.</span>
            ) : (
              <span>{aiStatus}</span>
            )}
          </div>
        )}
      </section>

      {/* Essential Contact Metadata */}
      <section className="border-t border-white/[0.06] pt-8 space-y-4">
        <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
          연결 정보
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
      </section>
    </div>
  );
};
