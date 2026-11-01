import React from 'react';
import { CardData, CardFeatures } from '../../types/card';
import { APP_BASE_DOMAIN } from '@/utils/cardSerializer';
import { EDITOR_INPUT_CLASS } from './CategorySelectSection';

export interface ProfileFieldsGroupProps {
  formData: CardData;
  onChangeField: (field: keyof CardData, value: string) => void;
  variant?: 'detailed' | 'compact';
  features?: CardFeatures;
  onChangeFeatures?: React.Dispatch<React.SetStateAction<CardFeatures>>;
  isMyCardMode?: boolean;
  slug?: string;
  onChangeSlug?: (slug: string) => void;
}

export const ProfileFieldsGroup: React.FC<ProfileFieldsGroupProps> = ({
  formData,
  onChangeField,
  variant = 'detailed',
  features,
  onChangeFeatures,
  isMyCardMode = false,
  slug = '',
  onChangeSlug,
}) => {
  if (variant === 'compact') {
    return (
      <div className="space-y-4">
        {/* Name & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">성명</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => onChangeField('name', e.target.value)}
              placeholder="박기홍"
              className={EDITOR_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">연락처</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => onChangeField('phone', e.target.value)}
              placeholder="010-1234-5678"
              className={`${EDITOR_INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>
        </div>

        {/* Organization & Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">소속</label>
            <input
              type="text"
              value={formData.organizationKr || formData.organization || ''}
              onChange={(e) => onChangeField('organizationKr', e.target.value)}
              placeholder="고구마 지식 관리실"
              className={EDITOR_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">직함</label>
            <input
              type="text"
              value={formData.titleKr || formData.title || ''}
              onChange={(e) => onChangeField('titleKr', e.target.value)}
              placeholder="대표 마스터"
              className={EDITOR_INPUT_CLASS}
            />
          </div>
        </div>

        {/* Email & Slug / Website */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">이메일</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onChangeField('email', e.target.value)}
              placeholder="name@domain.com"
              className={EDITOR_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            {isMyCardMode && onChangeSlug ? (
              <>
                <label className="text-xs text-zinc-400 block">웹 주소</label>
                <div className="flex items-center rounded-lg bg-[#161618] border border-white/[0.06] focus-within:border-white/25 overflow-hidden">
                  <span className="px-3 py-2.5 text-zinc-400 font-mono text-xs shrink-0 border-r border-white/[0.06] select-none">
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
                  value={formData.website}
                  onChange={(e) => onChangeField('website', e.target.value)}
                  placeholder="https://example.com"
                  className={`${EDITOR_INPUT_CLASS} font-mono`}
                />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Name & Display Toggles */}
      <section className="space-y-4">
        <h4 className="text-xs font-medium text-zinc-400 tracking-wide">성명</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">성명</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onChangeField('name', e.target.value)}
              placeholder="박기홍"
              className={EDITOR_INPUT_CLASS}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">영문 · 보조 성명</label>
            <input
              type="text"
              value={formData.nameEn ?? ''}
              onChange={(e) => onChangeField('nameEn', e.target.value)}
              placeholder="PARK, GIHONG"
              className={EDITOR_INPUT_CLASS}
            />
          </div>
        </div>

        {features && onChangeFeatures && (
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={features.show_en_name !== false}
                onChange={(e) =>
                  onChangeFeatures((prev) => ({
                    ...prev,
                    show_en_name: e.target.checked,
                  }))
                }
                className="w-3.5 h-3.5 rounded accent-zinc-200 cursor-pointer"
              />
              <span className="text-xs text-zinc-400">영문 · 보조 성명 표기</span>
            </label>
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={features.show_sub_org !== false}
                onChange={(e) =>
                  onChangeFeatures((prev) => ({
                    ...prev,
                    show_sub_org: e.target.checked,
                  }))
                }
                className="w-3.5 h-3.5 rounded accent-zinc-200 cursor-pointer"
              />
              <span className="text-xs text-zinc-400">영문 소속 병기</span>
            </label>
          </div>
        )}
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
              onChange={(e) => onChangeField('organizationKr', e.target.value)}
              placeholder="고구마 지식 관리실"
              className={EDITOR_INPUT_CLASS}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">영문 소속</label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => onChangeField('organization', e.target.value)}
              placeholder="GOGUMA KNOWLEDGE OFFICE"
              className={EDITOR_INPUT_CLASS}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">직함</label>
            <input
              type="text"
              value={formData.titleKr}
              onChange={(e) => onChangeField('titleKr', e.target.value)}
              placeholder="대표 마스터"
              className={EDITOR_INPUT_CLASS}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">영문 직함</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => onChangeField('title', e.target.value)}
              placeholder="Principal Master"
              className={EDITOR_INPUT_CLASS}
            />
          </div>
        </div>
      </section>

      {/* Direct Contact & Address */}
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
              onChange={(e) => onChangeField('phone', e.target.value)}
              placeholder="+82 10-1234-5678"
              className={`${EDITOR_INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">이메일</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onChangeField('email', e.target.value)}
              placeholder="name@domain.com"
              className={EDITOR_INPUT_CLASS}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">주소</label>
            <input
              type="text"
              value={formData.addressKr}
              onChange={(e) => onChangeField('addressKr', e.target.value)}
              placeholder="서울특별시 강남구 테헤란로 152"
              className={EDITOR_INPUT_CLASS}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 block">영문 주소</label>
            <input
              type="text"
              value={formData.address_en ?? formData.details?.address_en ?? ''}
              onChange={(e) => onChangeField('address_en', e.target.value)}
              placeholder="152 Teheran-ro, Gangnam-gu, Seoul"
              className={EDITOR_INPUT_CLASS}
            />
          </div>
        </div>
      </section>
    </>
  );
};
