import React, { useEffect, useRef, useState } from 'react';
import { CardTheme, CardLayoutType, CardFeatures, CardData } from '../../types/card';
import {
  LAYOUT_PRESETS,
  isVerticalLayout,
  normalizeHexColor,
  resolveThemeStyles,
} from '../../constants/templates';
import { ImagePlus, Pipette, Trash2 } from 'lucide-react';
import { THEME_OPTIONS } from '../CardEditorModal';
import { APP_BASE_DOMAIN } from '@/utils/cardSerializer';
import { cropAndCompressCardImage } from '../../utils/imageProcess';
import { LayoutMiniWireframe } from './LayoutMiniWireframe';
import { CategorySelectSection, EDITOR_INPUT_CLASS } from './CategorySelectSection';
import { ProfileFieldsGroup } from './ProfileFieldsGroup';

interface TemplateModeEditorProps {
  theme: CardTheme;
  layoutType: CardLayoutType;
  onChangeTheme: (theme: CardTheme) => void;
  onChangeLayout: (layout: CardLayoutType) => void;
  formData: CardData;
  onChangeFormField: (field: keyof CardData, value: string) => void;
  features: CardFeatures;
  onChangeFeatures: React.Dispatch<React.SetStateAction<CardFeatures>>;
  slug: string;
  onChangeSlug: (slug: string) => void;
  customDomain: string;
  onChangeCustomDomain: (dom: string) => void;
  category: string;
  onChangeCategory: (cat: string) => void;
  isDefault: boolean;
  onChangeIsDefault: (isDef: boolean) => void;
  isMyCardMode: boolean;
  subTab: 'visual_atelier' | 'identity_profile';
  onChangeSubTab: (tab: 'visual_atelier' | 'identity_profile') => void;
  notes?: string;
  onChangeNotes?: (notes: string) => void;
  metAt?: string;
  onChangeMetAt?: (metAt: string) => void;
  metLocation?: string;
  onChangeMetLocation?: (metLocation: string) => void;
}

export const TemplateModeEditor: React.FC<TemplateModeEditorProps> = ({
  theme,
  layoutType,
  onChangeTheme,
  onChangeLayout,
  formData,
  onChangeFormField,
  features,
  onChangeFeatures,
  slug,
  onChangeSlug,
  customDomain,
  onChangeCustomDomain,
  category,
  onChangeCategory,
  isDefault,
  onChangeIsDefault,
  isMyCardMode,
  subTab,
  onChangeSubTab,
  notes,
  onChangeNotes,
  metAt,
  onChangeMetAt,
  metLocation,
  onChangeMetLocation,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingBgImage, setIsProcessingBgImage] = useState(false);
  const [hoveredLayoutId, setHoveredLayoutId] = useState<CardLayoutType | null>(null);

  const activeLayoutPreset =
    LAYOUT_PRESETS.find((p) => p.id === (hoveredLayoutId || layoutType)) ||
    LAYOUT_PRESETS[0];

  const resolvedCanvasHex = resolveThemeStyles(theme, features.custom_bg_color).canvasHex;
  const activeCustomHex = normalizeHexColor(features.custom_bg_color);
  const [hexInput, setHexInput] = useState<string>(activeCustomHex || resolvedCanvasHex);

  useEffect(() => {
    setHexInput(activeCustomHex || resolvedCanvasHex);
  }, [activeCustomHex, resolvedCanvasHex]);

  const handleSelectPresetTheme = (nextTheme: CardTheme) => {
    onChangeTheme(nextTheme);
    onChangeFeatures((prev) => ({
      ...prev,
      custom_bg_color: '',
    }));
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.value.toUpperCase();
    setHexInput(picked);
    onChangeFeatures((prev) => ({
      ...prev,
      custom_bg_color: picked,
    }));
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^#0-9A-F]/g, '');
    const formatted = raw.startsWith('#') ? raw.slice(0, 7) : `#${raw}`.slice(0, 7);
    setHexInput(formatted);

    const stripped = formatted.replace(/^#/, '');
    if (/^[0-9A-F]{6}$/.test(stripped)) {
      onChangeFeatures((prev) => ({
        ...prev,
        custom_bg_color: `#${stripped}`,
      }));
    }
  };

  const handleHexInputBlur = () => {
    const normalized = normalizeHexColor(hexInput);
    if (normalized) {
      setHexInput(normalized);
      onChangeFeatures((prev) => ({
        ...prev,
        custom_bg_color: normalized,
      }));
    } else {
      setHexInput(activeCustomHex || resolvedCanvasHex);
    }
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setIsProcessingBgImage(true);
    try {
      const vertical = isVerticalLayout(layoutType);
      const result = await cropAndCompressCardImage(file, {
        targetWidth: vertical ? 675 : 1080,
        targetHeight: vertical ? 1080 : 600,
        quality: 0.85,
        format: 'image/webp',
        fillColor: resolvedCanvasHex,
      });
      onChangeFeatures((prev) => ({ ...prev, custom_bg_image: result.dataUrl }));
    } catch (err) {
      console.error('Background image upload error:', err);
    } finally {
      setIsProcessingBgImage(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onChangeFeatures((prev) => ({ ...prev, custom_logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Minimal Border-Bottom Typographic Sub-Tab Switcher (Zero Box-in-Box) */}
      <div
        className="flex items-center gap-5 sm:gap-6 border-b border-[var(--editor-divider)]"
        role="tablist"
        aria-label="템플릿 편집 항목"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'visual_atelier'}
          onClick={() => onChangeSubTab('visual_atelier')}
          title="지류 색상, 배경 이미지 및 명함 레이아웃 구도 선택"
          className={`relative pb-2.5 text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none ${
            subTab === 'visual_atelier'
              ? 'text-[var(--editor-text)] font-semibold'
              : 'text-[var(--editor-muted)] hover:text-[var(--editor-text)] font-medium'
          }`}
        >
          소재 및 구도
          {subTab === 'visual_atelier' && (
            <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--app-accent)]" />
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'identity_profile'}
          onClick={() => onChangeSubTab('identity_profile')}
          title="성명, 소속, 직함, 연락처 및 주소 정보 입력"
          className={`relative pb-2.5 text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none ${
            subTab === 'identity_profile'
              ? 'text-[var(--editor-text)] font-semibold'
              : 'text-[var(--editor-muted)] hover:text-[var(--editor-text)] font-medium'
          }`}
        >
          인적 정보
          {subTab === 'identity_profile' && (
            <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--app-accent)]" />
          )}
        </button>
      </div>

      {/* SUB-TAB 1: Curated Materials & Layout */}
      {subTab === 'visual_atelier' && (
        <div className="space-y-5 sm:space-y-6 lg:space-y-7 animate-in fade-in duration-150">
          {/* Paper & Finish: 5 Swatches + Custom Color Picker/HEX + Background Image Upload */}
          <section className="space-y-3 sm:space-y-3.5">
            <h4
              className="text-xs font-semibold text-[var(--editor-section-title)] tracking-wide inline-block"
              title="5종 기본 테마 색상, 사용자 지정 HEX/팔레트 색상 및 배경 이미지 설정"
            >
              지류 및 마감
            </h4>

            {/* Swatch Buttons Only + Custom Color Palette + HEX Input */}
            <div className="flex flex-wrap items-center gap-2.5">
              {THEME_OPTIONS.map((t) => {
                const isSelected = !activeCustomHex && theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectPresetTheme(t.id)}
                    title={`${t.name} (${t.dotColor})`}
                    aria-label={`${t.name} (${t.dotColor})`}
                    aria-pressed={isSelected}
                    style={{ backgroundColor: t.dotColor }}
                    className={`w-8 h-8 rounded-full border cursor-pointer transition-transform hover:scale-105 focus-visible:outline-none ${
                      isSelected
                        ? 'border-black/25 dark:border-white/25 ring-2 ring-[var(--app-accent)] ring-offset-2 ring-offset-[var(--app-surface)]'
                        : 'border-black/15 dark:border-white/20'
                    }`}
                  />
                );
              })}

              <span className="w-px h-5 bg-[var(--editor-divider)] mx-0.5 shrink-0" aria-hidden="true" />

              {/* Custom Color Palette Picker */}
              <label
                title={
                  activeCustomHex
                    ? `사용자 지정 색상 (${activeCustomHex}) · 클릭하여 변경`
                    : '컬러 팔레트에서 사용자 색상 지정'
                }
                aria-label="컬러 팔레트에서 사용자 색상 지정"
                style={{ backgroundColor: activeCustomHex || resolvedCanvasHex }}
                className={`relative w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shrink-0 ${
                  activeCustomHex
                    ? 'border-black/25 dark:border-white/25 ring-2 ring-[var(--app-accent)] ring-offset-2 ring-offset-[var(--app-surface)]'
                    : 'border-dashed border-[var(--editor-input-border-hover)]'
                }`}
              >
                <Pipette
                  className="w-3.5 h-3.5 pointer-events-none"
                  style={{
                    color: resolveThemeStyles(theme, activeCustomHex || resolvedCanvasHex).isLight
                      ? '#1C1B1A'
                      : '#FAFAFA',
                  }}
                />
                <input
                  type="color"
                  value={activeCustomHex || resolvedCanvasHex}
                  onChange={handleColorPickerChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="컬러 팔레트"
                />
              </label>

              {/* Direct HEX Input */}
              <input
                type="text"
                maxLength={7}
                value={hexInput}
                onChange={handleHexInputChange}
                onBlur={handleHexInputBlur}
                placeholder="#F8F7F4"
                title="HEX 색상 코드 직접 입력 (예: #1A2B3C)"
                aria-label="HEX 색상 코드 입력"
                className="w-[90px] h-8 px-2.5 rounded-lg bg-[var(--editor-input-bg)] border border-[var(--editor-input-border)] hover:border-[var(--editor-input-border-hover)] focus:outline-none focus:border-[var(--app-accent)] focus:bg-[var(--editor-input-bg-focus)] text-[var(--editor-text)] placeholder:text-[var(--editor-placeholder)] font-mono text-xs uppercase tracking-wider transition-colors"
              />
            </div>

            {/* Background Image Upload */}
            <div className="pt-0.5">
              <input
                type="file"
                ref={bgImageInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleBgImageUpload}
              />
              {features.custom_bg_image ? (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => bgImageInputRef.current?.click()}
                    disabled={isProcessingBgImage}
                    title="배경 이미지 변경"
                    aria-label="배경 이미지 변경"
                    className="group relative h-9 aspect-[9/5] rounded-lg overflow-hidden border border-[var(--editor-control-border)] hover:border-[var(--editor-input-border-hover)] cursor-pointer shrink-0 transition-colors"
                  >
                    <img
                      src={features.custom_bg_image}
                      alt="배경 이미지"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => bgImageInputRef.current?.click()}
                    disabled={isProcessingBgImage}
                    title="다른 배경 이미지 선택"
                    className="h-9 px-3 rounded-lg border border-[var(--editor-control-border)] bg-[var(--editor-control-bg)] hover:border-[var(--editor-input-border-hover)] hover:bg-[var(--app-highlight)] text-xs font-medium text-[var(--editor-label)] hover:text-[var(--editor-text)] cursor-pointer transition-colors"
                  >
                    {isProcessingBgImage ? '최적화 중...' : '변경'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeFeatures((prev) => ({ ...prev, custom_bg_image: '' }))
                    }
                    title="배경 이미지 삭제"
                    aria-label="배경 이미지 삭제"
                    className="h-9 w-9 rounded-lg border border-[var(--editor-control-border)] bg-[var(--editor-control-bg)] hover:border-rose-500/40 hover:bg-rose-500/10 text-[var(--editor-label)] hover:text-rose-500 inline-flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => bgImageInputRef.current?.click()}
                  disabled={isProcessingBgImage}
                  title="명함 배경으로 사용할 이미지 업로드"
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-[var(--editor-input-bg)] border border-dashed border-[var(--editor-input-border)] hover:border-[var(--editor-input-border-hover)] hover:bg-[var(--app-highlight)] text-xs font-medium text-[var(--editor-label)] hover:text-[var(--editor-text)] cursor-pointer transition-colors"
                >
                  <ImagePlus className="w-3.5 h-3.5 stroke-[1.75]" />
                  <span>{isProcessingBgImage ? '최적화 중...' : '배경 이미지'}</span>
                </button>
              )}
            </div>
          </section>

          {/* Architectural Layouts (Zero Box-in-Box, Stationary Inline Description Bar) */}
          <section className="border-t border-[var(--editor-divider)] pt-4 sm:pt-6 space-y-3 sm:space-y-3.5">
            <h4 className="text-xs font-semibold text-[var(--editor-section-title)] tracking-wide inline-block">
              레이아웃
            </h4>

            <div
              className="grid grid-cols-2 gap-2.5 sm:gap-3"
              onMouseLeave={() => setHoveredLayoutId(null)}
            >
              {LAYOUT_PRESETS.map((preset) => {
                const isSelected = layoutType === preset.id;
                const vertical = isVerticalLayout(preset.id);
                return (
                  <div key={preset.id} className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => onChangeLayout(preset.id)}
                      onMouseEnter={() => setHoveredLayoutId(preset.id)}
                      onFocus={() => setHoveredLayoutId(preset.id)}
                      onBlur={() =>
                        setHoveredLayoutId((prev) => (prev === preset.id ? null : prev))
                      }
                      aria-label={`${preset.name} (${preset.aspectRatio}) · ${preset.description}`}
                      aria-pressed={isSelected}
                      className={`${
                        vertical ? 'w-[56%] aspect-[5/8]' : 'w-full aspect-[9/5]'
                      } p-2.5 sm:p-3 rounded-lg border text-left cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--app-accent)]/50 transition-colors ${
                        isSelected
                          ? 'bg-[var(--app-highlight)] border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]/35'
                          : 'bg-[var(--editor-control-bg)] border-[var(--editor-control-border)] hover:border-[var(--editor-input-border-hover)]'
                      }`}
                    >
                      <LayoutMiniWireframe layoutId={preset.id} isSelected={isSelected} />
                    </button>
                  </div>
                );
              })}
            </div>

            {activeLayoutPreset && (
              <p
                aria-live="polite"
                className="min-h-[2.25rem] text-xs leading-[1.125rem] text-[var(--app-fg-muted,var(--app-text-muted))] transition-colors"
              >
                <span className="font-medium text-[var(--editor-text)]">
                  {activeLayoutPreset.name}
                </span>
                <span className="mx-1.5 opacity-50" aria-hidden="true">
                  ·
                </span>
                <span>{activeLayoutPreset.description}</span>
              </p>
            )}
          </section>
        </div>
      )}

      {/* SUB-TAB 2: Identity Profile */}
      {subTab === 'identity_profile' && (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-150">
          <ProfileFieldsGroup
            formData={formData}
            onChangeField={onChangeFormField}
            variant="detailed"
            features={features}
            onChangeFeatures={onChangeFeatures}
          />

          {/* Monogram & Mark */}
          <section className="border-t border-[var(--editor-divider)] pt-4 sm:pt-6 lg:pt-8 space-y-3 sm:space-y-4">
            <h4 className="text-xs font-semibold text-[var(--editor-section-title)] tracking-wide">
              모노그램 및 심볼
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--editor-label)] block">모노그램</label>
                <input
                  type="text"
                  maxLength={4}
                  value={features.monogram_text || ''}
                  onChange={(e) =>
                    onChangeFeatures((prev) => ({
                      ...prev,
                      monogram_text: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="PG"
                  className={`${EDITOR_INPUT_CLASS} font-mono uppercase tracking-widest`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--editor-label)] block">로고 이미지</label>
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                {features.custom_logo ? (
                  <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-[var(--editor-input-bg)] border border-[var(--editor-input-border)]">
                    <img
                      src={features.custom_logo}
                      alt="로고"
                      referrerPolicy="no-referrer"
                      className="h-6 w-auto max-w-[80px] object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onChangeFeatures((prev) => ({ ...prev, custom_logo: undefined }))
                      }
                      className="p-1 rounded-md text-[var(--editor-label)] hover:text-[var(--editor-text)] hover:bg-[var(--app-surface)] cursor-pointer"
                      title="삭제"
                      aria-label="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full px-3.5 py-2 sm:py-2.5 rounded-lg bg-[var(--editor-input-bg)] border border-dashed border-[var(--editor-input-border)] hover:border-[var(--editor-input-border-hover)] hover:bg-[var(--app-highlight)] text-[var(--editor-label)] hover:text-[var(--editor-text)] cursor-pointer text-xs sm:text-[13px] font-medium text-center transition-colors"
                  >
                    이미지 선택
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Address Slug & Classification */}
          <section className="border-t border-[var(--editor-divider)] pt-4 sm:pt-6 lg:pt-8 space-y-3 sm:space-y-4">
            <h4 className="text-xs font-semibold text-[var(--editor-section-title)] tracking-wide">
              {isMyCardMode ? '고유 주소 및 분류' : '웹사이트 및 보관함 분류'}
            </h4>

            {isMyCardMode ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--editor-label)] block">웹 주소</label>
                  <div className="flex items-center rounded-lg bg-[var(--editor-input-bg)] border border-[var(--editor-input-border)] hover:border-[var(--editor-input-border-hover)] focus-within:border-[var(--app-accent)] focus-within:bg-[var(--editor-input-bg-focus)] overflow-hidden transition-colors">
                    <span className="px-3 py-2 sm:px-3.5 sm:py-2.5 text-[var(--editor-muted)] font-mono select-none text-xs shrink-0 border-r border-[var(--editor-input-border)]">
                      {APP_BASE_DOMAIN}/card/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) =>
                        onChangeSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        )
                      }
                      placeholder="master"
                      className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 bg-transparent text-[var(--editor-text)] placeholder:text-[var(--editor-placeholder)] focus:outline-none font-mono text-[13px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--editor-label)] block">커스텀 도메인</label>
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => onChangeCustomDomain(e.target.value)}
                      placeholder="card.domain.com"
                      className={`${EDITOR_INPUT_CLASS} font-mono`}
                    />
                  </div>
                  <CategorySelectSection
                    category={category}
                    onChangeCategory={onChangeCategory}
                  />
                </div>

                <div className="pt-0.5 sm:pt-1">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => onChangeIsDefault(e.target.checked)}
                      className="w-4 h-4 rounded-[4px] accent-[var(--app-accent)] ring-1 ring-[var(--editor-checkbox-border)] cursor-pointer"
                    />
                    <span className="text-xs font-medium text-[var(--editor-label)]">대표 명함으로 설정</span>
                  </label>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--editor-label)] block">웹사이트</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => onChangeFormField('website', e.target.value)}
                    placeholder="https://example.com"
                    className={`${EDITOR_INPUT_CLASS} font-mono`}
                  />
                </div>
                <CategorySelectSection
                  category={category}
                  onChangeCategory={onChangeCategory}
                />
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
                    placeholder="예: COEX 컨퍼런스, 삼성역"
                    className={EDITOR_INPUT_CLASS}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[var(--editor-label)] block">개인 메모 (비공개)</label>
                    <span className="text-[10px] text-[var(--editor-muted)] font-mono">
                      {(notes || '').length}자
                    </span>
                  </div>
                  <textarea
                    value={notes || ''}
                    onChange={(e) => onChangeNotes?.(e.target.value)}
                    placeholder="대화 내용, 연락처 특징, 후속 미팅 계획 등을 기록하세요 (보관함 검색 시 활용됨)"
                    rows={2}
                    className={`${EDITOR_INPUT_CLASS} resize-y text-xs`}
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
