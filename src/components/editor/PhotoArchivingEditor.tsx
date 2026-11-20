import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ScanText,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { CardData } from '../../types/card';
import { cropAndCompressCardImage } from '../../utils/imageProcess';
import { ParsedCardFields, parseBusinessCardText } from '../../utils/parseBusinessCardText';
import { CategorySelectSection, EDITOR_INPUT_CLASS } from './CategorySelectSection';
import { ProfileFieldsGroup } from './ProfileFieldsGroup';

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
  metAt?: string;
  onChangeMetAt?: (val: string) => void;
  metLocation?: string;
  onChangeMetLocation?: (val: string) => void;
  category?: string;
  onChangeCategory?: (cat: string) => void;
  isMyCardMode?: boolean;
}

interface ConflictFieldSummary {
  label: string;
  existingValue: string;
  extractedValue: string;
}

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
  metAt,
  onChangeMetAt,
  metLocation,
  onChangeMetLocation,
  category,
  onChangeCategory,
  isMyCardMode = false,
}) => {
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // Local OCR States
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrMessage, setOcrMessage] = useState<string>('');
  const [ocrError, setOcrError] = useState<string>('');
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [pendingParsed, setPendingParsed] = useState<ParsedCardFields | null>(null);
  const [conflictingFields, setConflictingFields] = useState<ConflictFieldSummary[]>([]);

  const currentImageUrl = activeSide === 'front' ? frontImageUrl : backImageUrl;

  const resetOcrFeedback = () => {
    setOcrProgress(0);
    setOcrMessage('');
    setOcrError('');
    setRawOcrText('');
    setShowRawText(false);
    setPendingParsed(null);
    setConflictingFields([]);
  };

  const processFile = async (file: File, side: 'front' | 'back') => {
    if (!file.type.startsWith('image/')) return;
    setIsCompressing(true);
    try {
      const result = await cropAndCompressCardImage(file, {
        targetWidth: 900,
        targetHeight: 540,
        quality: 0.88,
        format: 'image/webp',
      });
      if (side === 'front') {
        onChangeFrontImage(result.dataUrl);
        resetOcrFeedback();
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
    resetOcrFeedback();
    if (!cardData.name || cardData.name === 'PARK, GIHONG') {
      onChangeCardData('name', 'Dr. Michael Harrison');
      onChangeCardData('organizationKr', 'Global Heritage Foundation');
      onChangeCardData('titleKr', 'Executive Director');
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
      resetOcrFeedback();
    } else {
      onChangeBackImage(undefined);
    }
  };

  const applyParsedFields = (parsed: ParsedCardFields, mode: 'fill_empty' | 'overwrite') => {
    let appliedCount = 0;

    const shouldApply = (existing: string, extracted: string) => {
      if (!extracted.trim()) return false;
      if (mode === 'overwrite') return true;
      return existing.trim().length === 0;
    };

    if (shouldApply(cardData.name || '', parsed.name)) {
      onChangeCardData('name', parsed.name);
      appliedCount += 1;
    }

    if (parsed.nameEn && shouldApply(cardData.nameEn || '', parsed.nameEn)) {
      onChangeCardData('nameEn', parsed.nameEn);
      appliedCount += 1;
    }

    const existingOrg = (cardData.organizationKr || cardData.organization || '').trim();
    if (shouldApply(existingOrg, parsed.company)) {
      onChangeCardData('organizationKr', parsed.company);
      appliedCount += 1;
    }

    const existingTitle = (cardData.titleKr || cardData.title || '').trim();
    if (shouldApply(existingTitle, parsed.title)) {
      onChangeCardData('titleKr', parsed.title);
      appliedCount += 1;
    }

    if (shouldApply(cardData.phone || '', parsed.phone)) {
      onChangeCardData('phone', parsed.phone);
      appliedCount += 1;
    }

    if (shouldApply(cardData.email || '', parsed.email)) {
      onChangeCardData('email', parsed.email);
      appliedCount += 1;
    }

    if (!isMyCardMode && shouldApply(cardData.website || '', parsed.website)) {
      onChangeCardData('website', parsed.website);
      appliedCount += 1;
    }

    if (shouldApply(cardData.addressKr || '', parsed.address)) {
      onChangeCardData('addressKr', parsed.address);
      appliedCount += 1;
    }

    if (parsed.extraNotes.length > 0) {
      const currentNotes = notes.trim();
      const missingNotes = parsed.extraNotes.filter((line) => !currentNotes.includes(line));
      if (missingNotes.length > 0) {
        const mergedNotes = currentNotes
          ? `${currentNotes} / ${missingNotes.join(' / ')}`
          : missingNotes.join(' / ');
        onChangeNotes(mergedNotes);
        appliedCount += 1;
      }
    }

    setPendingParsed(null);
    setConflictingFields([]);
    setOcrMessage(
      appliedCount > 0
        ? `${appliedCount}개 항목이 자동 입력되었습니다. 저장 전 내용을 확인해 주세요.`
        : '새로 채울 항목이 없어 기존 입력값을 유지했습니다.'
    );
  };

  const handleRunLocalOcr = async () => {
    if (!frontImageUrl || isExtracting) return;
    setIsExtracting(true);
    setOcrProgress(2);
    setOcrMessage('');
    setOcrError('');
    setPendingParsed(null);
    setConflictingFields([]);

    try {
      const { runLocalCardOcr } = await import('../../utils/localOcr');
      const { text, engine } = await runLocalCardOcr(frontImageUrl, ({ progress }) => {
        setOcrProgress(progress);
      });

      setRawOcrText(text);
      if (!text.trim()) {
        setOcrError(
          '이미지에서 글자를 인식하지 못했습니다. 밝은 곳에서 글자가 또렷하게 나온 정면 사진으로 다시 시도해 주세요.'
        );
        return;
      }

      const parsed = parseBusinessCardText(text);
      if (engine === 'text-detector') {
        setOcrProgress(100);
      }
      const hasAnyExtractedValue = Boolean(
        parsed.name ||
          parsed.nameEn ||
          parsed.company ||
          parsed.title ||
          parsed.phone ||
          parsed.email ||
          (!isMyCardMode && parsed.website) ||
          parsed.address ||
          parsed.extraNotes.length > 0
      );

      if (!hasAnyExtractedValue) {
        setOcrError(
          '텍스트는 감지되었으나 성명·연락처 등 구조화된 항목을 찾지 못했습니다. 아래 원문 보기를 참고해 직접 입력해 주세요.'
        );
        setShowRawText(true);
        return;
      }

      const conflicts: ConflictFieldSummary[] = [];
      const checkConflict = (label: string, existingVal: string, extractedVal: string) => {
        const existing = existingVal.trim();
        const extracted = extractedVal.trim();
        if (existing && extracted && existing.toLowerCase() !== extracted.toLowerCase()) {
          conflicts.push({ label, existingValue: existing, extractedValue: extracted });
        }
      };

      checkConflict('성명', cardData.name || '', parsed.name);
      checkConflict('연락처', cardData.phone || '', parsed.phone);
      checkConflict(
        '소속',
        cardData.organizationKr || cardData.organization || '',
        parsed.company
      );
      checkConflict('직함', cardData.titleKr || cardData.title || '', parsed.title);
      checkConflict('이메일', cardData.email || '', parsed.email);
      if (!isMyCardMode) {
        checkConflict('웹사이트', cardData.website || '', parsed.website);
      }

      if (conflicts.length > 0) {
        setPendingParsed(parsed);
        setConflictingFields(conflicts);
      } else {
        applyParsedFields(parsed, 'fill_empty');
      }
    } catch (err) {
      console.error('Local OCR error:', err);
      setOcrError(
        '로컬 OCR 분석 중 문제가 발생했습니다. 최초 실행 시 언어 데이터 로드를 위해 인터넷 연결이 필요할 수 있습니다.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-150">
      {/* Photo Upload Zone */}
      <section className="space-y-2.5 sm:space-y-3.5">
        <div className="flex flex-row items-center justify-between gap-2 whitespace-nowrap border-b border-[var(--editor-divider)] pb-0.5">
          {/* Flat Underline Photo Side Switch (Zero Box-in-Box) */}
          <div
            className="inline-flex items-center gap-4 shrink-0"
            role="tablist"
            aria-label="사진 면 선택"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeSide === 'front'}
              onClick={() => setActiveSide('front')}
              className={`relative pb-2 text-xs tracking-wide transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none ${
                activeSide === 'front'
                  ? 'text-[var(--editor-text)] font-semibold'
                  : 'text-[var(--editor-muted)] hover:text-[var(--editor-text)] font-medium'
              }`}
              title="앞면 사진 (Front)"
              aria-label="앞면 사진"
            >
              Front
              {activeSide === 'front' && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--app-accent)]" />
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSide === 'back'}
              onClick={() => setActiveSide('back')}
              className={`relative pb-2 text-xs tracking-wide transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none ${
                activeSide === 'back'
                  ? 'text-[var(--editor-text)] font-semibold'
                  : 'text-[var(--editor-muted)] hover:text-[var(--editor-text)] font-medium'
              }`}
              title="뒷면 사진 (Back)"
              aria-label="뒷면 사진"
            >
              Back
              {activeSide === 'back' && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--app-accent)]" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleLoadSample}
            title="샘플 명함 사진 및 예시 정보 불러오기"
            className="mb-1.5 px-2.5 py-1 rounded-md border border-[var(--editor-control-border)] bg-[var(--editor-control-bg)] hover:border-[var(--editor-input-border-hover)] hover:bg-[var(--app-highlight)] text-xs font-medium text-[var(--editor-label)] hover:text-[var(--editor-text)] cursor-pointer whitespace-nowrap transition-colors"
          >
            샘플 불러오기
          </button>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !currentImageUrl && triggerCurrentInput()}
          className={`relative w-full aspect-[9/5] rounded-xl border overflow-hidden flex flex-col items-center justify-center ${
            isDragging
              ? 'border-[var(--app-accent)] bg-[var(--app-highlight)]/40'
              : currentImageUrl
                ? 'border-[var(--editor-input-border)] bg-[var(--editor-input-bg)]'
                : 'border-dashed border-[var(--editor-input-border)] hover:border-[var(--editor-input-border-hover)] bg-[var(--editor-input-bg)] cursor-pointer transition-colors'
          }`}
        >
          {currentImageUrl ? (
            <div className="relative w-full h-full group">
              <img
                src={currentImageUrl}
                alt="명함 이미지"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerCurrentInput();
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-fg)] hover:opacity-90 font-medium text-xs cursor-pointer"
                >
                  변경
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearCurrentImage();
                  }}
                  className="p-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white cursor-pointer"
                  title="삭제"
                  aria-label="삭제"
                >
                  <Trash2 className="w-4 h-4 stroke-[1.5]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-2 pointer-events-none">
              <Camera className="w-5 h-5 text-[var(--editor-label)] stroke-[1.75]" />
              <p className="text-xs font-medium text-[var(--editor-label)]">
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

        {/* Privacy-First Browser Local OCR Trigger & Feedback */}
        {frontImageUrl && (
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleRunLocalOcr}
              disabled={isExtracting || isCompressing}
              title="브라우저 내장 인식 우선 · 미지원 시 온디바이스 OCR 자동 로드 (외부 서버 전송 없음)"
              aria-label="이미지에서 텍스트 자동 채우기"
              className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--app-accent)]/50 ${
                isExtracting
                  ? 'bg-[var(--editor-control-bg)] border-[var(--editor-control-border)] text-[var(--editor-text)] cursor-wait'
                  : 'bg-[var(--editor-control-bg)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] border-[var(--editor-control-border)] hover:border-[var(--editor-input-border-hover)] text-[var(--editor-text)] cursor-pointer active:scale-[0.99]'
              }`}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--app-accent)] shrink-0" />
                  <span className="tabular-nums">명함 텍스트 로컬 분석 중... {ocrProgress}%</span>
                </>
              ) : (
                <>
                  <ScanText className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                  <span>이미지에서 텍스트 자동 채우기</span>
                </>
              )}
            </button>

            {isExtracting && (
              <div className="space-y-1.5 px-1">
                <div className="h-1 w-full rounded-full bg-[var(--editor-control-bg)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--app-accent)] transition-all duration-200 ease-out"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-[var(--editor-muted)] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--editor-muted)] shrink-0" />
                  <span>이미지는 외부 서버로 전송되지 않고 브라우저 내에서만 분석됩니다.</span>
                </p>
              </div>
            )}

            {/* Conflict Confirmation Prompt (Non-blocking inline card) */}
            {pendingParsed && !isExtracting && (
              <div className="rounded-xl bg-[var(--editor-control-bg)] border border-[var(--editor-control-border)] p-3.5 space-y-3 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[var(--editor-text)]">
                    기존 입력과 겹치는 항목이 있습니다 ({conflictingFields.map((c) => c.label).join(', ')})
                  </p>
                  <p className="text-[11px] text-[var(--editor-muted)] leading-relaxed">
                    추출된 텍스트를 비어 있는 항목에만 채우거나, 기존 입력값을 덮어쓸 수 있습니다.
                  </p>
                </div>

                <div className="rounded-lg bg-[var(--app-surface)] border border-[var(--editor-control-border)] p-2.5 space-y-1 text-[11px]">
                  {pendingParsed.name && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--editor-muted)] shrink-0">성명</span>
                      <span className="text-[var(--editor-text)] truncate">{pendingParsed.name}</span>
                    </div>
                  )}
                  {pendingParsed.company && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--editor-muted)] shrink-0">소속</span>
                      <span className="text-[var(--editor-text)] truncate">{pendingParsed.company}</span>
                    </div>
                  )}
                  {pendingParsed.title && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--editor-muted)] shrink-0">직함</span>
                      <span className="text-[var(--editor-text)] truncate">{pendingParsed.title}</span>
                    </div>
                  )}
                  {pendingParsed.phone && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--editor-muted)] shrink-0">연락처</span>
                      <span className="text-[var(--editor-text)] font-mono truncate">{pendingParsed.phone}</span>
                    </div>
                  )}
                  {pendingParsed.email && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--editor-muted)] shrink-0">이메일</span>
                      <span className="text-[var(--editor-text)] truncate">{pendingParsed.email}</span>
                    </div>
                  )}
                  {!isMyCardMode && pendingParsed.website && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--editor-muted)] shrink-0">웹사이트</span>
                      <span className="text-[var(--editor-text)] font-mono truncate">{pendingParsed.website}</span>
                    </div>
                  )}
                  {pendingParsed.extraNotes.length > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--editor-muted)] shrink-0">보조 메모</span>
                      <span className="text-[var(--editor-text)] truncate">
                        {pendingParsed.extraNotes.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyParsedFields(pendingParsed, 'fill_empty')}
                    className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-fg)] text-xs font-medium whitespace-nowrap cursor-pointer transition-opacity"
                  >
                    비어 있는 항목만 채우기
                  </button>
                  <button
                    type="button"
                    onClick={() => applyParsedFields(pendingParsed, 'overwrite')}
                    className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-highlight)] hover:text-[var(--app-highlight-fg)] border border-[var(--editor-control-border)] text-[var(--editor-text)] text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                  >
                    기존 입력 덮어쓰기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingParsed(null);
                      setConflictingFields([]);
                    }}
                    className="min-h-[36px] px-2.5 py-1.5 rounded-lg border border-[var(--editor-control-border)] bg-[var(--editor-control-bg)] text-[var(--editor-text)] hover:border-[var(--editor-input-border-hover)] text-xs font-medium whitespace-nowrap cursor-pointer"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* Completion Message */}
            {ocrMessage && !isExtracting && (
              <div className="rounded-xl bg-[var(--editor-control-bg)] border border-emerald-500/35 px-3 py-2.5 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{ocrMessage}</span>
                  </p>
                  {rawOcrText && (
                    <button
                      type="button"
                      onClick={() => setShowRawText((prev) => !prev)}
                      className="text-[11px] text-[var(--editor-label)] hover:text-[var(--editor-text)] inline-flex items-center gap-0.5 shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      <span>원문</span>
                      {showRawText ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
                {showRawText && rawOcrText && (
                  <pre className="p-2 rounded-lg bg-[var(--app-surface)] border border-[var(--editor-control-border)] text-[11px] text-[var(--editor-label)] font-mono whitespace-pre-wrap break-words max-h-28 overflow-y-auto editor-scrollbar">
                    {rawOcrText}
                  </pre>
                )}
              </div>
            )}

            {/* Error Feedback */}
            {ocrError && !isExtracting && (
              <div className="rounded-xl bg-[var(--editor-control-bg)] border border-amber-500/35 px-3 py-2.5 space-y-2 animate-in fade-in duration-150">
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">{ocrError}</p>
                {rawOcrText && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRawText((prev) => !prev)}
                      className="text-[11px] text-[var(--editor-label)] hover:text-[var(--editor-text)] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <span>인식된 원문 {showRawText ? '숨기기' : '보기'}</span>
                      {showRawText ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    {showRawText && (
                      <pre className="p-2 rounded-lg bg-[var(--app-surface)] border border-[var(--editor-control-border)] text-[11px] text-[var(--editor-label)] font-mono whitespace-pre-wrap break-words max-h-28 overflow-y-auto editor-scrollbar">
                        {rawOcrText}
                      </pre>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Essential Contact Metadata */}
      <section className="border-t border-[var(--editor-divider)] pt-4 sm:pt-6 lg:pt-8 space-y-3 sm:space-y-4">
        <h4 className="text-xs font-semibold text-[var(--editor-section-title)] tracking-wide">기본 정보</h4>

        <ProfileFieldsGroup
          formData={cardData}
          onChangeField={onChangeCardData}
          variant="compact"
          isMyCardMode={isMyCardMode}
          slug={slug}
          onChangeSlug={onChangeSlug}
        />

        <div
          className={
            onChangeCategory ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4' : 'space-y-1.5'
          }
        >
          {onChangeCategory && (
            <CategorySelectSection
              category={category}
              onChangeCategory={onChangeCategory}
            />
          )}

          {!isMyCardMode && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--editor-label)] block">만난 날짜</label>
                <input
                  type="date"
                  value={metAt || ''}
                  onChange={(e) => onChangeMetAt?.(e.target.value)}
                  className={`${EDITOR_INPUT_CLASS} font-mono`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--editor-label)] block">만난 장소 / 행사</label>
                <input
                  type="text"
                  value={metLocation || ''}
                  onChange={(e) => onChangeMetLocation?.(e.target.value)}
                  placeholder="예: COEX 컨퍼런스"
                  className={EDITOR_INPUT_CLASS}
                />
              </div>
            </>
          )}

          <div className={`space-y-1.5 ${!isMyCardMode && onChangeCategory ? 'sm:col-span-2' : ''}`}>
            <label className="text-xs font-medium text-[var(--editor-label)] block">메모</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => onChangeNotes(e.target.value)}
              placeholder="대화 핵심 내용 또는 후속 메모"
              className={EDITOR_INPUT_CLASS}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
