import React, { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { CardData, CardTheme, CardOrientation, CardLayoutType, CardFeatures } from '../types/card';
import { resolveThemeStyles, normalizeHexColor, isVerticalLayout } from '../constants/templates';
import { deriveCardThemeHarmony } from '../utils/cardThemeHarmony';
import { SandboxedCardRenderer } from './SandboxedCardRenderer';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import { sanitizeExternalUrl } from '../utils/sanitizeUrl';
import { useLocale } from '../hooks/useLocale';

interface BusinessCardBackProps {
  data: CardData;
  theme?: CardTheme;
  layout_type?: CardLayoutType;
  card_features?: CardFeatures;
  orientation?: CardOrientation;
  isPrintPreview?: boolean;
  backPhotoUrl?: string;
  hideBorder?: boolean;
  html_back?: string;
}

export const BusinessCardBack: React.FC<BusinessCardBackProps> = ({
  data,
  theme = 'pure_white',
  layout_type = 'editorial_minimal',
  card_features,
  orientation = 'landscape',
  isPrintPreview = false,
  backPhotoUrl,
  hideBorder = false,
  html_back
}) => {
  const { isEn } = useLocale();
  const [qrSvg, setQrSvg] = useState<string>('');
  const sanitizedHtmlBack = useMemo(
    () => (html_back ? sanitizeHtml(html_back) : ''),
    [html_back]
  );

  const customBgHex = normalizeHexColor(card_features?.custom_bg_color) || undefined;
  const customBgImage = (card_features?.custom_bg_image || '').trim();
  const themeStyles = useMemo(
    () => resolveThemeStyles(theme, customBgHex),
    [theme, customBgHex]
  );
  const themeHarmony = useMemo(
    () => deriveCardThemeHarmony(themeStyles.accent, themeStyles.isLight, themeStyles.canvasHex),
    [themeStyles]
  );
  const isLight = themeStyles.isLight;
  const isVerticalCard = isVerticalLayout(layout_type);
  const isPortrait = isVerticalCard || orientation === 'portrait';

  const safeWebsiteUrl = useMemo(() => sanitizeExternalUrl(data.website), [data.website]);

  useEffect(() => {
    const targetUrl = safeWebsiteUrl || 'https://eerum.goguma.app/master';
    QRCode.toString(targetUrl, {
      type: 'svg',
      margin: 0,
      color: {
        dark: '#1C1B1A',
        light: '#00000000'
      },
      errorCorrectionLevel: 'M'
    })
      .then((svgString) => {
        setQrSvg(sanitizeHtml(svgString));
      })
      .catch((err) => {
        console.warn('Notice generating QR', err);
      });
  }, [theme, isLight, safeWebsiteUrl]);

  // Custom HTML / Tailwind Injection Back Face Rendering
  if (sanitizedHtmlBack) {
    return (
      <div
        className={`relative w-full h-full select-none overflow-hidden rounded-2xl ${
          isPrintPreview || hideBorder ? 'border-0' : 'border border-white/10 shadow-2xl'
        } bg-[#121214] transition-colors duration-200`}
        style={{
          ...themeHarmony.fallbackCssVars,
          aspectRatio: isPortrait ? '5 / 8' : '9 / 5',
        }}
      >
        <SandboxedCardRenderer
          html={sanitizedHtmlBack}
          isPortrait={isPortrait}
          isPrintPreview={isPrintPreview}
        />
      </div>
    );
  }

  // Authentic Physical Card Back Photo
  if (backPhotoUrl) {
    return (
      <div
        className={`relative w-full h-full select-none overflow-hidden rounded-2xl ${
          isPrintPreview || hideBorder ? 'border-0' : `border ${themeStyles.border} shadow-2xl`
        } bg-[#121214] transition-colors duration-200`}
        style={{
          ...themeHarmony.fallbackCssVars,
          aspectRatio: isPortrait ? '5 / 8' : '9 / 5',
        }}
      >
        <img
          src={backPhotoUrl}
          alt={isEn ? 'Business card back' : '명함 뒷면'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-2xl"
        />
      </div>
    );
  }

  // Resolve clean Quiet Luxury Main Title & Sub-heading (legacy cleanup runs in normalizeStoredCards)
  const mainTitle =
    (data.backTitle || '').trim() ||
    data.organization ||
    data.organizationKr ||
    'GOGUMA KNOWLEDGE OFFICE';

  const rawBackSubtitle = (data.backSubtitle || '').trim();
  const rawBackTagline = (data.backTagline || '').trim();
  const rawSubHeading =
    rawBackSubtitle && rawBackSubtitle.toLowerCase() !== mainTitle.trim().toLowerCase()
      ? rawBackSubtitle
      : rawBackTagline && rawBackTagline.toLowerCase() !== mainTitle.trim().toLowerCase()
        ? rawBackTagline
        : 'KOREAN CENTER GLOBAL NETWORK';
  const subHeading =
    rawSubHeading.trim().toLowerCase() !== mainTitle.trim().toLowerCase() ? rawSubHeading : '';

  const rawAddressEn = (
    data.address_en ||
    data.details?.address_en ||
    data.addressEn ||
    (data.addressLines && data.addressLines.length > 0 ? data.addressLines.join(', ') : '')
  ).trim();
  const hqAddress =
    rawAddressEn ||
    (data.backHqAddress || '').trim() ||
    data.addressKr ||
    '152 Teheran-ro, Gangnam-gu, Seoul';

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden flex flex-col justify-between ${
        isPortrait
          ? 'p-4 sm:p-6'
          : isPrintPreview
            ? 'p-4'
            : 'p-2.5 sm:p-5 md:p-8'
      } ${themeStyles.cardBg} ${isPrintPreview || hideBorder ? 'border-0' : `border ${themeStyles.border} shadow-2xl`} transition-colors duration-300 font-sans`}
      style={{
        ...themeHarmony.fallbackCssVars,
        backgroundColor: customBgHex,
        aspectRatio: isPortrait ? '5 / 8' : '9 / 5',
      }}
    >
      {customBgImage && (
        <>
          <img
            src={customBgImage}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />
          <div
            aria-hidden="true"
            className={`absolute inset-0 pointer-events-none ${
              themeStyles.isLight ? 'bg-white/45' : 'bg-black/45'
            }`}
          />
        </>
      )}

      {/* Subtle fine art paper grain texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.028] mix-blend-overlay"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '14px 14px'
        }}
      />

      {/* Center Statement: Main Title & Sub-Heading */}
      <div className="relative z-10 my-auto py-1 sm:py-2 text-center flex flex-col items-center justify-center space-y-1 sm:space-y-2 px-2">
        <h2 className={`${isPortrait ? 'text-xs sm:text-sm' : 'text-xs sm:text-base md:text-[17px]'} font-semibold tracking-[0.16em] uppercase leading-snug ${themeStyles.textPrimary} break-keep`}>
          {mainTitle}
        </h2>
        {subHeading && subHeading !== mainTitle && (
          <p className={`text-[8.5px] sm:text-[10px] font-normal uppercase tracking-[0.2em] sm:tracking-[0.24em] leading-relaxed ${themeStyles.textSecondary} break-keep`}>
            {subHeading}
          </p>
        )}
      </div>

      {/* Bottom Bar: QR Code Block cleanly at Bottom-Left, HQ Address at Bottom-Right */}
      <div className={`relative z-10 flex items-end justify-between gap-2 sm:gap-3 w-full pt-2 sm:pt-3.5 border-t ${themeStyles.accentHairline} mt-auto`}>
        {/* Bottom-Left: QR Code Block */}
        {safeWebsiteUrl ? (
          <a
            href={safeWebsiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-end gap-2 sm:gap-2.5 group/qr hover:opacity-85 transition-opacity min-w-0 shrink-0 cursor-pointer"
            title={
              data.websiteDisplay
                ? isEn
                  ? `Visit ${data.websiteDisplay}`
                  : `${data.websiteDisplay} 바로가기`
                : isEn
                  ? 'Open digital business card'
                  : '디지털 명함 바로가기'
            }
            onClick={(e) => e.stopPropagation()}
          >
            {qrSvg && (
              <div
                className="w-8 h-8 sm:w-10 sm:h-10 p-1 sm:p-1.5 rounded-md bg-[#FAF8F4] border border-[var(--card-hairline,var(--card-fallback-hairline))] flex items-center justify-center shrink-0 [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            )}
            {!isPortrait && (
              <div className="text-left leading-tight pb-0.5 min-w-0">
                <p className={`font-mono text-[8.5px] sm:text-[10px] tracking-tight ${themeStyles.textSecondary} group-hover/qr:underline underline-offset-2 truncate max-w-[120px] sm:max-w-[195px]`}>
                  {data.websiteDisplay}
                </p>
              </div>
            )}
          </a>
        ) : (
          <div className="flex items-end gap-2 sm:gap-2.5 min-w-0 shrink-0">
            {qrSvg && (
              <div
                className="w-8 h-8 sm:w-10 sm:h-10 p-1 sm:p-1.5 rounded-md bg-[#FAF8F4] border border-[var(--card-hairline,var(--card-fallback-hairline))] flex items-center justify-center shrink-0 [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            )}
          </div>
        )}

        {/* Bottom-Right: HQ Address */}
        <div className="text-right min-w-0 pb-0.5">
          {isPortrait && data.websiteDisplay && (
            <p className={`font-mono text-[8.5px] tracking-tight ${themeStyles.textMuted} truncate max-w-[175px] mb-0.5`}>
              {data.websiteDisplay}
            </p>
          )}
          <p className={`text-[8px] sm:text-[9.5px] leading-snug ${themeStyles.textSecondary} truncate ${isPortrait ? 'max-w-[175px]' : 'max-w-[165px] sm:max-w-[260px]'}`}>
            <span className={`font-mono text-[7.5px] sm:text-[8px] tracking-[0.16em] uppercase ${themeStyles.textMuted} mr-1.5 sm:mr-2`}>
              HQ
            </span>
            <span>{hqAddress}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
