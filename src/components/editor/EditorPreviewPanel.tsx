import React, { useMemo } from 'react';
import { CardCreationMode, CardLayoutType, CardTheme, CardFeatures, CardData } from '../../types/card';
import { isVerticalLayout } from '../../constants/templates';
import { BusinessCardFront } from '../BusinessCardFront';
import { BusinessCardBack } from '../BusinessCardBack';
import { SandboxedCardRenderer } from '../SandboxedCardRenderer';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

interface EditorPreviewPanelProps {
  creationMode: CardCreationMode;
  layoutType: CardLayoutType;
  theme: CardTheme;
  features: CardFeatures;
  formData: CardData;
  effectiveUrl: string;
  effectiveDisplayUrl: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  htmlFront: string;
  htmlBack: string;
  previewFace: 'front' | 'back';
  onFlipPreviewFace: () => void;
}

export const EditorPreviewPanel: React.FC<EditorPreviewPanelProps> = ({
  creationMode,
  layoutType,
  theme,
  features,
  formData,
  effectiveUrl,
  effectiveDisplayUrl,
  frontImageUrl,
  backImageUrl,
  htmlFront,
  htmlBack,
  previewFace,
  onFlipPreviewFace,
}) => {
  const isCompletelyEmpty =
    !formData.name.trim() &&
    !(formData.nameEn || '').trim() &&
    !formData.nameKr.trim() &&
    !formData.organization.trim() &&
    !formData.organizationKr.trim() &&
    !formData.title.trim() &&
    !formData.titleKr.trim() &&
    !formData.phone.trim() &&
    !formData.email.trim();

  const cardDataForPreview: CardData = isCompletelyEmpty
    ? {
        ...formData,
        name: '박기홍',
        nameEn: '',
        nameKr: '',
        organization: '',
        organizationKr: '고구마 지식 관리실',
        subOrg: '',
        title: '',
        titleKr: '대표 마스터',
        phone: '+82 10-1234-5678',
        phoneRaw: '+821012345678',
        email: 'master@goguma.app',
        addressKr: '서울특별시 강남구 테헤란로 152',
        address_en: '',
        addressLines: [],
        website: effectiveUrl,
        websiteDisplay: effectiveDisplayUrl,
      }
    : {
        ...formData,
        address_en: formData.address_en ?? formData.details?.address_en,
        website: effectiveUrl,
        websiteDisplay: effectiveDisplayUrl,
      };

  const isVerticalCard = isVerticalLayout(layoutType) && creationMode === 'template';
  const sanitizedFront = useMemo(() => sanitizeHtml(htmlFront), [htmlFront]);
  const sanitizedBack = useMemo(() => sanitizeHtml(htmlBack), [htmlBack]);

  return (
    <div className="order-1 lg:order-2 col-span-12 lg:col-span-7 h-auto lg:h-full flex flex-col items-center justify-center bg-[#161618] border-b lg:border-b-0 lg:border-l border-white/[0.06] px-6 py-10 sm:p-12 lg:p-14 relative overflow-hidden select-none">
      {/* Subtle Ambient Gallery Illumination */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/[0.025] via-transparent to-transparent" />

      {/* Centered Card Stage */}
      <div
        className={`${
          isVerticalCard
            ? 'w-full max-w-[270px] sm:max-w-[300px] aspect-[5/8]'
            : 'w-full max-w-[480px] aspect-[1.586/1]'
        } transition-transform duration-300 relative [perspective:1200px] cursor-pointer group`}
        onClick={onFlipPreviewFace}
        title="클릭하여 면 전환"
      >
        <div
          className={`w-full h-full relative rounded-2xl transition-transform duration-500 ease-out [transform-style:preserve-3d] group-hover:scale-[1.01] shadow-[0_28px_65px_-16px_rgba(0,0,0,0.65)] ${
            previewFace === 'back' ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'
          }`}
        >
          {/* Front Face */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-2xl overflow-hidden bg-[#121214]">
            {creationMode === 'template' && (
              <BusinessCardFront
                data={cardDataForPreview}
                theme={theme}
                layout_type={layoutType}
                card_features={features}
                isPrintPreview={false}
                hideBorder={true}
              />
            )}

            {creationMode === 'photo' && (
              frontImageUrl ? (
                <img
                  src={frontImageUrl}
                  alt={formData.name || '명함 앞면'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#121214] border border-white/[0.06] rounded-2xl">
                  <p className="text-xs text-zinc-400">등록된 사진이 없습니다</p>
                </div>
              )
            )}

            {creationMode === 'custom_html' && (
              sanitizedFront ? (
                <div className="w-full h-full overflow-hidden rounded-2xl">
                  <SandboxedCardRenderer
                    html={sanitizedFront}
                    isPortrait={isVerticalCard}
                    isPrintPreview={false}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#121214] border border-white/[0.06] rounded-2xl">
                  <p className="text-xs text-zinc-400">코드를 입력해 주세요</p>
                </div>
              )
            )}
          </div>

          {/* Back Face */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl overflow-hidden bg-[#121214]">
            {creationMode === 'template' && (
              <BusinessCardBack
                data={cardDataForPreview}
                theme={theme}
                layout_type={layoutType}
                isPrintPreview={false}
                hideBorder={true}
              />
            )}

            {creationMode === 'photo' && (
              backImageUrl ? (
                <img
                  src={backImageUrl}
                  alt="명함 뒷면"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <BusinessCardBack
                  data={cardDataForPreview}
                  theme={theme}
                  layout_type={layoutType}
                  isPrintPreview={false}
                  hideBorder={true}
                />
              )
            )}

            {creationMode === 'custom_html' && (
              sanitizedBack ? (
                <div className="w-full h-full overflow-hidden rounded-2xl">
                  <SandboxedCardRenderer
                    html={sanitizedBack}
                    isPortrait={isVerticalCard}
                    isPrintPreview={false}
                  />
                </div>
              ) : (
                <BusinessCardBack
                  data={cardDataForPreview}
                  theme={theme}
                  layout_type={layoutType}
                  isPrintPreview={false}
                  hideBorder={true}
                />
              )
            )}
          </div>
        </div>
      </div>

      {/* Quiet Typographic Face Switcher */}
      <div className="mt-7 flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => previewFace !== 'front' && onFlipPreviewFace()}
          className={`cursor-pointer tracking-wide ${
            previewFace === 'front' ? 'text-[#EDEDEF] font-medium' : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          앞면
        </button>
        <span className="text-zinc-400 select-none" aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() => previewFace !== 'back' && onFlipPreviewFace()}
          className={`cursor-pointer tracking-wide ${
            previewFace === 'back' ? 'text-[#EDEDEF] font-medium' : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          뒷면
        </button>
      </div>
    </div>
  );
};
