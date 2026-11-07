import React, { useRef } from 'react';
import { CardTheme, CardLayoutType, CardFeatures, CardData } from '../../types/card';
import { LAYOUT_PRESETS } from '../../constants/templates';
import { Trash2 } from 'lucide-react';
import { THEME_OPTIONS } from '../CardEditorModal';
import { APP_BASE_DOMAIN } from '@/utils/cardSerializer';
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
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);

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
      {/* Understated Typographic Sub-Tab Switcher */}
      <div className="grid grid-cols-2 p-0.5 sm:p-1 rounded-lg bg-[#161618] border border-white/[0.06]">
        <button
          type="button"
          onClick={() => onChangeSubTab('visual_atelier')}
          className={`py-1.5 sm:py-2 rounded-md text-[11px] sm:text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none ${
            subTab === 'visual_atelier'
              ? 'bg-[#222226] text-[#F2F2F5] font-medium'
              : 'text-zinc-400 hover:text-zinc-300 font-normal'
          }`}
        >
          소재 및 구도
        </button>
        <button
          type="button"
          onClick={() => onChangeSubTab('identity_profile')}
          className={`py-1.5 sm:py-2 rounded-md text-[11px] sm:text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none ${
            subTab === 'identity_profile'
              ? 'bg-[#222226] text-[#F2F2F5] font-medium'
              : 'text-zinc-400 hover:text-zinc-300 font-normal'
          }`}
        >
          인적 정보
        </button>
      </div>

      {/* SUB-TAB 1: Curated Materials & Layout */}
      {subTab === 'visual_atelier' && (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-150">
          {/* Curated Material Presets (4 Quiet Luxury Finishes) */}
          <section className="space-y-2.5 sm:space-y-3.5">
            <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
              지류 및 마감
            </h4>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {THEME_OPTIONS.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChangeTheme(t.id)}
                    className={`px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl border text-left cursor-pointer flex items-center gap-2.5 sm:gap-3.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                      isSelected
                        ? 'bg-[#1A1A1E] border-white/25'
                        : 'bg-[#161618] border-white/[0.06] hover:border-white/[0.14]'
                    }`}
                  >
                    <span
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border border-white/15 shrink-0"
                      style={{ backgroundColor: t.dotColor }}
                    />
                    <span
                      className={`text-xs sm:text-[13px] truncate ${
                        isSelected ? 'text-[#F2F2F5] font-medium' : 'text-zinc-400 font-normal'
                      }`}
                    >
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Architectural Layouts */}
          <section className="border-t border-white/[0.06] pt-4 sm:pt-6 lg:pt-8 space-y-2.5 sm:space-y-3.5">
            <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
              레이아웃
            </h4>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {LAYOUT_PRESETS.map((preset) => {
                const isSelected = layoutType === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChangeLayout(preset.id)}
                    className={`p-2.5 sm:p-3.5 rounded-xl border text-left cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                      isSelected
                        ? 'bg-[#1A1A1E] border-white/25'
                        : 'bg-[#161618] border-white/[0.06] hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="mb-2 sm:mb-3 w-full">
                      <LayoutMiniWireframe layoutId={preset.id} isSelected={isSelected} />
                    </div>
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
                      <span
                        className={`text-[11px] sm:text-xs truncate ${
                          isSelected ? 'text-[#F2F2F5] font-medium' : 'text-zinc-400 font-normal'
                        }`}
                      >
                        {preset.name}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-mono tabular-nums text-zinc-400 shrink-0">
                        {preset.aspectRatio}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
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
          <section className="border-t border-white/[0.06] pt-4 sm:pt-6 lg:pt-8 space-y-3 sm:space-y-4">
            <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
              모노그램 및 심볼
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">모노그램</label>
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
                <label className="text-xs text-zinc-400 block">로고 이미지</label>
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                {features.custom_logo ? (
                  <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-[#161618] border border-white/[0.06]">
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
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] cursor-pointer"
                      title="삭제"
                      aria-label="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#161618] border border-dashed border-white/[0.1] hover:border-white/25 text-zinc-400 hover:text-zinc-200 cursor-pointer text-xs text-center"
                  >
                    이미지 선택
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Address Slug & Classification */}
          <section className="border-t border-white/[0.06] pt-4 sm:pt-6 lg:pt-8 space-y-3 sm:space-y-4">
            <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
              {isMyCardMode ? '고유 주소 및 분류' : '웹사이트 및 보관함 분류'}
            </h4>

            {isMyCardMode ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 block">웹 주소</label>
                  <div className="flex items-center rounded-lg bg-[#161618] border border-white/[0.06] focus-within:border-white/25 overflow-hidden">
                    <span className="px-3 py-2 sm:px-3.5 sm:py-2.5 text-zinc-400 font-mono select-none text-xs shrink-0 border-r border-white/[0.06]">
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
                      className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 bg-transparent text-[#EDEDEF] placeholder:text-zinc-400 focus:outline-none font-mono text-[13px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 block">커스텀 도메인</label>
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
                      className="w-3.5 h-3.5 rounded accent-zinc-200 cursor-pointer"
                    />
                    <span className="text-xs text-zinc-400">대표 명함으로 설정</span>
                  </label>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 block">웹사이트</label>
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
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
