import React, { useRef } from 'react';
import { CardTheme, CardLayoutType, CardFeatures, CardData, CardCategory } from '../../types/card';
import { LAYOUT_PRESETS } from '../../constants/templates';
import { Trash2 } from 'lucide-react';
import { THEME_OPTIONS } from '../CardEditorModal';
import { APP_BASE_DOMAIN } from '../../utils/domain';

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

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 rounded-lg bg-[#161618] border border-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-white/25 focus:bg-[#19191C] text-[#EDEDEF] placeholder:text-zinc-400 text-[13px]';

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
  onChangeSubTab
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onChangeFeatures(prev => ({ ...prev, custom_logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const renderLayoutMiniWireframe = (id: CardLayoutType, isSelected: boolean) => {
    const strokeClass = isSelected ? 'bg-[#E4E4E7]' : 'bg-zinc-600';
    const subClass = isSelected ? 'bg-zinc-500' : 'bg-zinc-700/80';

    if (id === 'editorial_minimal') {
      return (
        <div className="w-full aspect-[9/5] p-2.5 rounded-md bg-[#121214] border border-white/[0.05] flex flex-col justify-between">
          <div className="space-y-1">
            <div className={`w-10 h-[3px] rounded-full ${subClass}`} />
            <div className={`w-16 h-1 rounded-full ${strokeClass}`} />
          </div>
          <div className="space-y-1 my-auto">
            <div className={`w-14 h-1.5 rounded-full ${strokeClass}`} />
            <div className={`w-9 h-[3px] rounded-full ${subClass}`} />
          </div>
          <div className="flex justify-between items-end pt-1.5 border-t border-white/[0.05]">
            <div className={`w-10 h-[3px] rounded-full ${subClass}`} />
            <div className={`w-7 h-[3px] rounded-full ${subClass}`} />
          </div>
        </div>
      );
    }

    if (id === 'monogram_executive') {
      return (
        <div className="w-full aspect-[9/5] p-2.5 rounded-md bg-[#121214] border border-white/[0.05] flex flex-col justify-between items-center text-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-zinc-400' : 'border-zinc-700'}`}>
              <div className={`w-1 h-1 rounded-full ${strokeClass}`} />
            </div>
            <div className={`w-12 h-[3px] rounded-full ${subClass}`} />
          </div>
          <div className="space-y-1 my-auto flex flex-col items-center">
            <div className={`w-14 h-1.5 rounded-full ${strokeClass}`} />
            <div className={`w-10 h-[3px] rounded-full ${subClass}`} />
          </div>
          <div className={`w-20 h-[3px] rounded-full ${subClass}`} />
        </div>
      );
    }

    if (id === 'vertical_atelier') {
      return (
        <div className="w-[68%] mx-auto aspect-[5/8] p-2.5 rounded-md bg-[#121214] border border-white/[0.05] flex flex-col justify-between">
          <div className="space-y-1 pb-1.5 border-b border-white/[0.05]">
            <div className={`w-7 h-[2px] rounded-full ${subClass}`} />
            <div className={`w-11 h-[3px] rounded-full ${strokeClass}`} />
          </div>
          <div className="space-y-1 my-auto">
            <div className={`w-14 h-1.5 rounded-full ${strokeClass}`} />
            <div className={`w-9 h-[3px] rounded-full ${subClass}`} />
          </div>
          <div className="space-y-1 pt-1.5 border-t border-white/[0.05]">
            <div className={`w-12 h-[2px] rounded-full ${subClass}`} />
            <div className={`w-9 h-[2px] rounded-full ${subClass}`} />
          </div>
        </div>
      );
    }

    if (id === 'serenity_vertical') {
      return (
        <div className="w-[68%] mx-auto aspect-[5/8] p-2.5 rounded-md bg-[#121214] border border-white/[0.05] flex flex-col justify-between">
          <div className="space-y-1">
            <div className={`w-13 h-1.5 rounded-full ${strokeClass}`} />
            <div className={`w-8 h-[3px] rounded-full ${subClass}`} />
            <div className={`w-10 h-[2px] rounded-full ${subClass} mt-1`} />
          </div>
          <div className="flex-1" />
          <div className="space-y-1 pt-2 border-t border-white/[0.05]">
            <div className={`w-10 h-[2px] rounded-full ${subClass}`} />
            <div className={`w-13 h-[2px] rounded-full ${subClass}`} />
            <div className={`w-8 h-[2px] rounded-full ${subClass}`} />
          </div>
        </div>
      );
    }

    if (id === 'swiss_typo_bold') {
      return (
        <div className="w-full aspect-[9/5] p-2.5 rounded-md bg-[#121214] border border-white/[0.05] flex flex-col justify-between">
          <div className={`w-20 h-1 rounded-full ${strokeClass}`} />
          <div className="space-y-1 my-auto">
            <div className={`w-16 h-2 rounded-full ${strokeClass}`} />
            <div className={`w-10 h-[3px] rounded-full ${subClass}`} />
          </div>
          <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-white/[0.05]">
            <div className={`w-9 h-[3px] rounded-full ${subClass}`} />
            <div className={`w-7 h-[3px] rounded-full ${subClass}`} />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full aspect-[9/5] p-2.5 rounded-md bg-[#121214] border border-white/[0.05] flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className={`w-12 h-[3px] rounded-full ${subClass}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${strokeClass}`} />
        </div>
        <div className="space-y-1 my-auto">
          <div className={`w-14 h-1 rounded-full ${strokeClass}`} />
          <div className={`w-9 h-[3px] rounded-full ${subClass}`} />
        </div>
        <div className="flex justify-between items-center pt-1.5 border-t border-white/[0.05]">
          <div className={`w-9 h-[3px] rounded-full ${subClass}`} />
          <div className={`w-5 h-[3px] rounded-full ${subClass}`} />
        </div>
      </div>
    );
  };

  const categories: CardCategory[] = [
    'VIP 파트너',
    '글로벌 네트워크',
    '공공·기관',
    '투자·금융',
    'IT·기술',
    '기타'
  ];

  return (
    <div className="space-y-8">
      {/* Understated Typographic Sub-Tab Switcher */}
      <div className="grid grid-cols-2 p-1 rounded-lg bg-[#161618] border border-white/[0.06]">
        <button
          type="button"
          onClick={() => onChangeSubTab('visual_atelier')}
          className={`py-2 rounded-md text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none ${
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
          className={`py-2 rounded-md text-xs tracking-wide cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none ${
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
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Curated Material Presets (4 Quiet Luxury Finishes) */}
          <section className="space-y-3.5">
            <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
              지류 및 마감
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {THEME_OPTIONS.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChangeTheme(t.id)}
                    className={`px-4 py-3.5 rounded-xl border text-left cursor-pointer flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                      isSelected
                        ? 'bg-[#1A1A1E] border-white/25'
                        : 'bg-[#161618] border-white/[0.06] hover:border-white/[0.14]'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-md border border-white/15 shrink-0"
                      style={{ backgroundColor: t.dotColor }}
                    />
                    <span
                      className={`text-[13px] truncate ${
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
          <section className="border-t border-white/[0.06] pt-8 space-y-3.5">
            <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
              레이아웃
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {LAYOUT_PRESETS.map((preset) => {
                const isSelected = layoutType === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChangeLayout(preset.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                      isSelected
                        ? 'bg-[#1A1A1E] border-white/25'
                        : 'bg-[#161618] border-white/[0.06] hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="mb-3 w-full">
                      {renderLayoutMiniWireframe(preset.id, isSelected)}
                    </div>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span
                        className={`text-xs truncate ${
                          isSelected ? 'text-[#F2F2F5] font-medium' : 'text-zinc-400 font-normal'
                        }`}
                      >
                        {preset.name}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums text-zinc-400 shrink-0">
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
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Name & Display Toggles */}
          <section className="space-y-4">
            <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
              성명
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">성명</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => onChangeFormField('name', e.target.value)}
                  placeholder="박기홍"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">영문 · 보조 성명</label>
                <input
                  type="text"
                  value={formData.nameEn ?? ''}
                  onChange={(e) => onChangeFormField('nameEn', e.target.value)}
                  placeholder="PARK, GIHONG"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={features.show_en_name !== false}
                  onChange={(e) => onChangeFeatures(prev => ({ ...prev, show_en_name: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded accent-zinc-200 cursor-pointer"
                />
                <span className="text-xs text-zinc-400">영문 · 보조 성명 표기</span>
              </label>
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={features.show_sub_org !== false}
                  onChange={(e) => onChangeFeatures(prev => ({ ...prev, show_sub_org: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded accent-zinc-200 cursor-pointer"
                />
                <span className="text-xs text-zinc-400">영문 소속 병기</span>
              </label>
            </div>
          </section>

          {/* Affiliation & Title */}
          <section className="border-t border-white/[0.06] pt-8 space-y-4">
            <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
              소속 및 직함
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">소속</label>
                <input
                  type="text"
                  value={formData.organizationKr}
                  onChange={(e) => onChangeFormField('organizationKr', e.target.value)}
                  placeholder="고구마 지식 관리실"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">영문 소속</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => onChangeFormField('organization', e.target.value)}
                  placeholder="GOGUMA KNOWLEDGE OFFICE"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">직함</label>
                <input
                  type="text"
                  value={formData.titleKr}
                  onChange={(e) => onChangeFormField('titleKr', e.target.value)}
                  placeholder="대표 마스터"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">영문 직함</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => onChangeFormField('title', e.target.value)}
                  placeholder="Principal Master"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </section>

          {/* Direct Contact */}
          <section className="border-t border-white/[0.06] pt-8 space-y-4">
            <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
              연락처 및 주소
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">연락처</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => onChangeFormField('phone', e.target.value)}
                  placeholder="+82 10-1234-5678"
                  className={`${INPUT_CLASS} font-mono tabular-nums`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">이메일</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => onChangeFormField('email', e.target.value)}
                  placeholder="name@domain.com"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">주소</label>
                <input
                  type="text"
                  value={formData.addressKr}
                  onChange={(e) => onChangeFormField('addressKr', e.target.value)}
                  placeholder="서울특별시 강남구 테헤란로 152"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">영문 주소</label>
                <input
                  type="text"
                  value={formData.address_en ?? formData.details?.address_en ?? ''}
                  onChange={(e) => onChangeFormField('address_en', e.target.value)}
                  placeholder="152 Teheran-ro, Gangnam-gu, Seoul"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </section>

          {/* Monogram & Mark */}
          <section className="border-t border-white/[0.06] pt-8 space-y-4">
            <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
              모노그램 및 심볼
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">모노그램</label>
                <input
                  type="text"
                  maxLength={4}
                  value={features.monogram_text || ''}
                  onChange={(e) => onChangeFeatures(prev => ({ ...prev, monogram_text: e.target.value.toUpperCase() }))}
                  placeholder="PG"
                  className={`${INPUT_CLASS} font-mono uppercase tracking-widest`}
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
                      onClick={() => onChangeFeatures(prev => ({ ...prev, custom_logo: undefined }))}
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
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#161618] border border-dashed border-white/[0.1] hover:border-white/25 text-zinc-400 hover:text-zinc-200 cursor-pointer text-xs text-center"
                  >
                    이미지 선택
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Address Slug & Classification */}
          <section className="border-t border-white/[0.06] pt-8 space-y-4">
            <h4 className="text-xs font-medium text-zinc-400 tracking-wide">
              고유 주소 및 분류
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 block">웹 주소</label>
              <div className="flex items-center rounded-lg bg-[#161618] border border-white/[0.06] focus-within:border-white/25 overflow-hidden">
                <span className="px-3.5 py-2.5 text-zinc-400 font-mono select-none text-xs shrink-0 border-r border-white/[0.06]">
                  {APP_BASE_DOMAIN}/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => onChangeSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="master"
                  className="w-full px-3.5 py-2.5 bg-transparent text-[#EDEDEF] placeholder:text-zinc-400 focus:outline-none font-mono text-[13px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">커스텀 도메인</label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => onChangeCustomDomain(e.target.value)}
                  placeholder="card.domain.com"
                  className={`${INPUT_CLASS} font-mono`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block">분류</label>
                <select
                  value={category}
                  onChange={(e) => onChangeCategory(e.target.value)}
                  className={`${INPUT_CLASS} cursor-pointer`}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#161618] text-[#EDEDEF]">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isMyCardMode && (
              <div className="pt-1">
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
            )}
          </section>
        </div>
      )}
    </div>
  );
};
