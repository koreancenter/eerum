import React, { useState, useMemo } from 'react';
import { CardData, CardTheme, CardOrientation, CardLayoutType, CardFeatures } from '../types/card';
import { resolveThemeStyles, generateMonogram, isVerticalLayout } from '../constants/templates';
import { Check, Copy } from 'lucide-react';
import { SandboxedCardRenderer } from './SandboxedCardRenderer';
import { sanitizeHtml } from '../utils/sanitizeHtml';

interface BusinessCardFrontProps {
  data: CardData;
  theme?: CardTheme;
  layout_type?: CardLayoutType;
  card_features?: CardFeatures;
  orientation?: CardOrientation;
  isPrintPreview?: boolean;
  isPhotoCard?: boolean;
  photoUrl?: string;
  hideBorder?: boolean;
  html_front?: string;
}

export const BusinessCardFront: React.FC<BusinessCardFrontProps> = ({
  data,
  theme = 'pure_white',
  layout_type = 'editorial_minimal',
  card_features,
  orientation = 'landscape',
  isPrintPreview = false,
  isPhotoCard = false,
  photoUrl,
  hideBorder = false,
  html_front,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const sanitizedHtmlFront = useMemo(
    () => (html_front ? sanitizeHtml(html_front) : ''),
    [html_front]
  );

  const copyToClipboard = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const isVerticalCard = isVerticalLayout(layout_type);
  const isPortrait = isVerticalCard || orientation === 'portrait';
  const themeStyles = resolveThemeStyles(theme);

  // Normalized & deduplicated primary vs. secondary/English labels
  const primaryName = (data.name || data.nameKr || '').trim();
  const subName =
    [data.nameEn, data.details?.en_name, data.name ? data.nameKr : '']
      .map((s) => (s || '').trim())
      .find((s) => s.length > 0 && s.toLowerCase() !== primaryName.toLowerCase()) || '';

  const primaryTitle = (data.title || data.titleKr || '').trim();
  const rawSubTitle = (data.title && data.titleKr ? data.titleKr : '').trim();
  const subTitle =
    rawSubTitle && rawSubTitle.toLowerCase() !== primaryTitle.toLowerCase() ? rawSubTitle : '';

  const primaryOrg = (data.organization || data.organizationKr || '').trim();
  const rawSubOrg = (data.organization && data.organizationKr ? data.organizationKr : '').trim();
  const subOrgLabel =
    rawSubOrg && rawSubOrg.toLowerCase() !== primaryOrg.toLowerCase() ? rawSubOrg : '';

  const rawExtraSubOrg = (data.subOrg || data.details?.sub_org || '').trim();
  const extraSubOrg =
    rawExtraSubOrg &&
    rawExtraSubOrg.toLowerCase() !== primaryOrg.toLowerCase() &&
    rawExtraSubOrg.toLowerCase() !== subOrgLabel.toLowerCase()
      ? rawExtraSubOrg
      : '';

  // Custom HTML / Tailwind Injection Face Rendering with Sandboxed Isolation
  if (sanitizedHtmlFront) {
    return (
      <div
        className={`relative w-full h-full select-none overflow-hidden rounded-2xl ${
          isPrintPreview || hideBorder ? 'border-0' : 'border border-white/10 shadow-2xl'
        } bg-[#121214] transition-all duration-300`}
        style={{ aspectRatio: isPortrait ? '5 / 8' : '9 / 5' }}
      >
        <SandboxedCardRenderer
          html={sanitizedHtmlFront}
          isPortrait={isPortrait}
          isPrintPreview={isPrintPreview}
        />
      </div>
    );
  }

  // Authentic Physical Card Photo Face Rendering
  if (isPhotoCard && photoUrl) {
    return (
      <div
        className={`relative w-full h-full select-none overflow-hidden rounded-2xl ${
          isPrintPreview || hideBorder ? 'border-0' : `border ${themeStyles.border} shadow-2xl`
        } bg-[#121214] transition-all duration-300`}
        style={{ aspectRatio: isPortrait ? '5 / 8' : '9 / 5' }}
      >
        <img
          src={photoUrl}
          alt={primaryName || '명함 사진'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-2xl"
        />

        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '14px 14px',
          }}
        />

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3.5 pt-7 flex items-end justify-between text-[#F4F4F5]">
          <div className="min-w-0 pr-2">
            {primaryName && (
              <h3 className="font-medium text-xs sm:text-sm tracking-tight truncate">
                {primaryName}
              </h3>
            )}
            {primaryOrg && (
              <p className="text-[10px] text-zinc-300 line-clamp-1 mt-0.5">
                {primaryOrg}
              </p>
            )}
          </div>
          {data.phone && (
            <span className="text-[10px] sm:text-[11px] font-mono text-zinc-200 tabular-nums shrink-0">
              {data.phone}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Field toggles with defaults
  const showEnName =
    card_features?.show_en_name !== false && data.details?.show_en_name !== false;
  const showSubOrg = card_features?.show_sub_org !== false;
  const showAddress =
    card_features?.show_address !== false && data.details?.show_address !== false;
  const customLogo = card_features?.custom_logo;
  const monogram = card_features?.monogram_text || generateMonogram(primaryName, subName);

  // English address resolution without legacy Cheongdam placeholder or duplicate Korean address
  const rawAddressEn = (
    data.address_en ||
    data.details?.address_en ||
    data.addressEn ||
    (data.addressLines && data.addressLines.length > 0 ? data.addressLines.join(', ') : '')
  ).trim();

  const isHardcodedPlaceholder =
    rawAddressEn.includes('77 Cheongdam-ro') &&
    (rawAddressEn.includes('06015') || rawAddressEn.includes('Republic of Korea'));
  const primaryAddressKr = (data.addressKr || '').trim();
  const candidateEnAddress = isHardcodedPlaceholder ? '' : rawAddressEn;
  const enAddress =
    candidateEnAddress && candidateEnAddress.toLowerCase() !== primaryAddressKr.toLowerCase()
      ? candidateEnAddress
      : '';

  const textureOverlay = (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.028] mix-blend-overlay"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
        backgroundSize: '14px 14px',
      }}
    />
  );

  const cornerMark =
    customLogo && layout_type !== 'monogram_executive' ? (
      <div className="shrink-0 flex items-center justify-center">
        <img
          src={customLogo}
          alt="Logo"
          referrerPolicy="no-referrer"
          className="h-6 w-auto max-w-[64px] object-contain rounded opacity-90"
        />
      </div>
    ) : null;

  // =========================================================================
  // 1. MONOGRAM EXECUTIVE LAYOUT (9:5)
  // =========================================================================
  if (layout_type === 'monogram_executive') {
    return (
      <div
        className={`relative w-full h-full select-none flex flex-col justify-between ${
          isPortrait ? 'p-5 sm:p-6' : isPrintPreview ? 'p-4' : 'p-5 sm:p-6 md:p-7'
        } ${themeStyles.cardBg} ${
          isPrintPreview || hideBorder ? 'border-0' : `border ${themeStyles.border}`
        } transition-colors duration-300 font-sans`}
        style={{ aspectRatio: isPortrait ? '5 / 8' : '9 / 5' }}
      >
        {textureOverlay}

        {/* Top Centered Monogram Seal & Organization */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-1.5">
          {customLogo ? (
            <img
              src={customLogo}
              alt="Logo"
              referrerPolicy="no-referrer"
              className="h-8 sm:h-9 w-auto max-w-[120px] object-contain mb-0.5 opacity-95"
            />
          ) : (
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border ${themeStyles.accentHairline} flex items-center justify-center`}
            >
              <span
                className={`font-serif text-[11px] sm:text-xs font-medium tracking-[0.18em] ${themeStyles.textPrimary}`}
              >
                {monogram}
              </span>
            </div>
          )}

          {primaryOrg && (
            <div className="space-y-0.5">
              <h2
                className={`text-[10px] sm:text-[11px] font-medium tracking-[0.2em] uppercase leading-tight ${themeStyles.textPrimary}`}
              >
                {primaryOrg}
              </h2>
              {showSubOrg && subOrgLabel && subOrgLabel !== primaryOrg && (
                <p
                  className={`text-[9px] tracking-[0.08em] leading-tight ${themeStyles.textSecondary} opacity-85`}
                >
                  {subOrgLabel}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Center: Clean Vertical Name & Title Hierarchy */}
        <div className="relative z-10 my-auto py-1 text-center space-y-1.5">
          <div className="space-y-0.5">
            {primaryName && (
              <h1
                className={`${
                  isPrintPreview ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl md:text-[25px]'
                } font-serif font-medium tracking-tight leading-tight ${themeStyles.textPrimary}`}
              >
                {primaryName}
              </h1>
            )}
            {showEnName && subName && subName !== primaryName && (
              <p
                className={`text-[11px] sm:text-xs font-normal tracking-[0.14em] leading-tight ${themeStyles.textSecondary}`}
              >
                {subName}
              </p>
            )}
          </div>

          {primaryTitle && (
            <div className="space-y-0.5 pt-0.5">
              <p
                className={`text-[10px] sm:text-[11px] font-medium tracking-[0.16em] uppercase leading-tight ${themeStyles.textPrimary} opacity-85`}
              >
                {primaryTitle}
              </p>
              {subTitle && subTitle !== primaryTitle && (
                <p
                  className={`text-[9.5px] sm:text-[10px] tracking-[0.06em] leading-tight ${themeStyles.textMuted} opacity-80`}
                >
                  {subTitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom: Pure Typographic Contacts & Address */}
        <div
          className={`relative z-10 pt-2 border-t ${themeStyles.accentHairline} text-center space-y-1`}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10px] sm:text-[11px] leading-tight">
            {data.phone && (
              <a
                href={`tel:${data.phoneRaw}`}
                className={`whitespace-nowrap font-mono tabular-nums tracking-tight ${themeStyles.textPrimary} hover:opacity-75`}
              >
                {data.phone}
              </a>
            )}
            {data.email && (
              <>
                {data.phone && (
                  <span className={`${themeStyles.textMuted} opacity-50 select-none`}>·</span>
                )}
                <a
                  href={`mailto:${data.email}`}
                  className={`whitespace-nowrap tracking-tight ${themeStyles.textPrimary} hover:opacity-75 truncate max-w-[180px]`}
                >
                  {data.email}
                </a>
              </>
            )}
            {data.website && (
              <>
                {(data.phone || data.email) && (
                  <span className={`${themeStyles.textMuted} opacity-50 select-none`}>·</span>
                )}
                <a
                  href={data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`whitespace-nowrap font-mono tracking-tight ${themeStyles.textSecondary} hover:opacity-75 truncate max-w-[160px]`}
                >
                  {data.websiteDisplay}
                </a>
              </>
            )}
          </div>

          {showAddress && (enAddress || primaryAddressKr) && (
            <div className="space-y-0.5 px-4 text-center">
              {enAddress && (
                <p
                  className={`text-[8.5px] sm:text-[9px] ${themeStyles.textSecondary} truncate leading-tight`}
                >
                  {enAddress}
                </p>
              )}
              {primaryAddressKr && (
                <p
                  className={`text-[8px] sm:text-[8.5px] ${themeStyles.textMuted} opacity-80 truncate leading-tight`}
                >
                  {primaryAddressKr}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. VERTICAL ATELIER LAYOUT (5:8)
  // =========================================================================
  if (layout_type === 'vertical_atelier') {
    return (
      <div
        className={`relative w-full h-full select-none flex flex-col justify-between p-5 sm:p-7 ${themeStyles.cardBg} ${
          isPrintPreview || hideBorder ? 'border-0' : `border ${themeStyles.border}`
        } transition-colors duration-300 font-sans`}
        style={{ aspectRatio: '5 / 8' }}
      >
        {textureOverlay}

        {/* Header: Architectural Organization */}
        <div
          className={`relative z-10 flex items-start justify-between border-b ${themeStyles.accentHairline} pb-3.5`}
        >
          <div className="space-y-0.5 min-w-0 pr-2">
            {primaryOrg && (
              <h2
                className={`text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] uppercase ${themeStyles.textPrimary} truncate`}
              >
                {primaryOrg}
              </h2>
            )}
            {showSubOrg && subOrgLabel && subOrgLabel !== primaryOrg && (
              <p className={`text-[9.5px] tracking-[0.04em] ${themeStyles.textSecondary} truncate`}>
                {subOrgLabel}
              </p>
            )}
          </div>
          {cornerMark}
        </div>

        {/* Body: Vertical Name & Title Hierarchy */}
        <div className="relative z-10 my-auto py-4 space-y-3.5">
          <div className="space-y-1">
            {primaryName && (
              <h1
                className={`text-2xl sm:text-[26px] font-normal tracking-tight leading-snug ${themeStyles.textPrimary}`}
              >
                {primaryName}
              </h1>
            )}
            {showEnName && subName && subName !== primaryName && (
              <p
                className={`text-xs sm:text-[13px] font-normal tracking-[0.12em] ${themeStyles.textSecondary}`}
              >
                {subName}
              </p>
            )}
          </div>

          {primaryTitle && (
            <div className="space-y-0.5 pt-1">
              <p
                className={`text-[11px] sm:text-xs font-medium tracking-[0.06em] ${themeStyles.textPrimary} opacity-90`}
              >
                {primaryTitle}
              </p>
              {subTitle && subTitle !== primaryTitle && (
                <p className={`text-[10px] tracking-[0.04em] ${themeStyles.textMuted} opacity-85`}>
                  {subTitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer: Micro Metadata Rail */}
        <div
          className={`relative z-10 border-t ${themeStyles.accentHairline} pt-3.5 space-y-2 text-[10px]`}
        >
          <div className="space-y-1 font-mono tabular-nums text-[9.5px] sm:text-[10px]">
            {data.phone && (
              <div className="flex items-center justify-between whitespace-nowrap gap-2">
                <span className={`text-[8px] uppercase tracking-[0.16em] ${themeStyles.textMuted}`}>
                  TEL
                </span>
                <a
                  href={`tel:${data.phoneRaw}`}
                  className={`whitespace-nowrap tracking-tight ${themeStyles.textPrimary} hover:opacity-75`}
                >
                  {data.phone}
                </a>
              </div>
            )}
            {data.email && (
              <div className="flex items-center justify-between whitespace-nowrap gap-2">
                <span className={`text-[8px] uppercase tracking-[0.16em] ${themeStyles.textMuted}`}>
                  MAIL
                </span>
                <a
                  href={`mailto:${data.email}`}
                  className={`${themeStyles.textPrimary} truncate max-w-[175px] hover:opacity-75`}
                >
                  {data.email}
                </a>
              </div>
            )}
            {data.website && (
              <div className="flex items-center justify-between whitespace-nowrap gap-2">
                <span className={`text-[8px] uppercase tracking-[0.16em] ${themeStyles.textMuted}`}>
                  WEB
                </span>
                <a
                  href={data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${themeStyles.textSecondary} truncate max-w-[175px] hover:opacity-75`}
                >
                  {data.websiteDisplay}
                </a>
              </div>
            )}
          </div>

          {showAddress && (enAddress || primaryAddressKr) && (
            <div
              className={`pt-2 border-t ${themeStyles.accentHairline} text-[8.5px] sm:text-[9px] leading-snug space-y-0.5`}
            >
              {enAddress && <p className={`${themeStyles.textSecondary} truncate`}>{enAddress}</p>}
              {primaryAddressKr && (
                <p className={`${themeStyles.textMuted} opacity-80 truncate`}>{primaryAddressKr}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. SERENITY VERTICAL LAYOUT (5:8 Quiet Luxury, vast negative space)
  // =========================================================================
  if (layout_type === 'serenity_vertical') {
    return (
      <div
        className={`relative w-full h-full select-none flex flex-col justify-between p-6 sm:p-8 ${themeStyles.cardBg} ${
          isPrintPreview || hideBorder ? 'border-0' : `border ${themeStyles.border}`
        } transition-colors duration-300 font-sans`}
        style={{ aspectRatio: '5 / 8' }}
      >
        {textureOverlay}

        {/* Top Section (~25%): Primary Name, Sub-Name & Vertical Title Hierarchy */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2.5">
            <div className="space-y-0.5">
              {primaryName && (
                <h1
                  className={`text-xl sm:text-2xl font-medium tracking-tight leading-snug ${themeStyles.textPrimary} truncate`}
                >
                  {primaryName}
                </h1>
              )}
              {showEnName && subName && subName !== primaryName && (
                <p
                  className={`text-xs sm:text-[13px] font-normal tracking-[0.12em] leading-relaxed ${themeStyles.textSecondary} truncate`}
                >
                  {subName}
                </p>
              )}
            </div>

            <div className="space-y-0.5 leading-relaxed">
              {primaryTitle && (
                <p
                  className={`text-[11px] sm:text-xs font-medium tracking-[0.06em] leading-snug ${themeStyles.textPrimary} opacity-90 truncate`}
                >
                  {primaryTitle}
                </p>
              )}
              {subTitle && subTitle !== primaryTitle && (
                <p
                  className={`text-[10px] sm:text-[11px] tracking-[0.04em] leading-snug ${themeStyles.textMuted} opacity-85 truncate`}
                >
                  {subTitle}
                </p>
              )}
              {showSubOrg && primaryOrg && (
                <p
                  className={`pt-0.5 text-[9.5px] sm:text-[10px] tracking-[0.14em] uppercase leading-relaxed ${themeStyles.textMuted} opacity-75 truncate`}
                >
                  {primaryOrg}
                </p>
              )}
            </div>
          </div>
          {cornerMark}
        </div>

        {/* Center Section: Vast, Undisturbed Negative Space */}
        <div className="flex-1 min-h-[36%]" aria-hidden="true" />

        {/* Bottom Section (~25%): Hairline Divider & Compact Tabular Micro-Contacts */}
        <div
          className={`relative z-10 border-t ${themeStyles.accentHairline} pt-3.5 sm:pt-4 space-y-1`}
        >
          <div className="space-y-1 font-mono tabular-nums text-[10px] sm:text-[11px] leading-relaxed">
            {data.phone && (
              <div>
                <a
                  href={`tel:${data.phoneRaw}`}
                  className={`inline-block whitespace-nowrap tracking-tight ${themeStyles.textPrimary} hover:opacity-75 transition-opacity`}
                >
                  {data.phone}
                </a>
              </div>
            )}
            {data.email && (
              <div>
                <a
                  href={`mailto:${data.email}`}
                  className={`inline-block max-w-full truncate tracking-tight ${themeStyles.textSecondary} hover:opacity-75 transition-opacity align-bottom`}
                >
                  {data.email}
                </a>
              </div>
            )}
            {data.website && (
              <div>
                <a
                  href={data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-block max-w-full truncate tracking-tight ${themeStyles.textMuted} hover:opacity-75 transition-opacity align-bottom`}
                >
                  {data.websiteDisplay}
                </a>
              </div>
            )}
          </div>

          {showAddress && (enAddress || primaryAddressKr) && (
            <p
              className={`pt-1 text-[8.5px] sm:text-[9px] font-sans ${themeStyles.textMuted} opacity-80 truncate leading-normal`}
            >
              {enAddress || primaryAddressKr}
            </p>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. SWISS TYPO BOLD LAYOUT (9:5)
  // =========================================================================
  if (layout_type === 'swiss_typo_bold') {
    return (
      <div
        className={`relative w-full h-full select-none flex flex-col justify-between ${
          isPortrait ? 'p-5 sm:p-6' : isPrintPreview ? 'p-4' : 'p-5 sm:p-6 md:p-7'
        } ${themeStyles.cardBg} ${
          isPrintPreview || hideBorder ? 'border-0' : `border ${themeStyles.border}`
        } transition-colors duration-300 font-sans`}
        style={{ aspectRatio: isPortrait ? '5 / 8' : '9 / 5' }}
      >
        {textureOverlay}

        {/* Top: Stark Architectural Organization */}
        <div
          className={`relative z-10 flex items-start justify-between border-b ${themeStyles.accentHairline} pb-2.5`}
        >
          <div className="space-y-0.5 min-w-0 pr-2">
            {primaryOrg && (
              <h2
                className={`text-[11px] sm:text-xs font-bold tracking-[0.14em] uppercase ${themeStyles.textPrimary} truncate`}
              >
                {primaryOrg}
              </h2>
            )}
            {showSubOrg && subOrgLabel && subOrgLabel !== primaryOrg && (
              <p
                className={`text-[9.5px] sm:text-[10px] font-normal tracking-wide ${themeStyles.textSecondary} truncate`}
              >
                {subOrgLabel}
              </p>
            )}
          </div>
          {cornerMark}
        </div>

        {/* Center: Vertical Name & Title Hierarchy */}
        <div className="relative z-10 my-auto py-1.5 space-y-1.5">
          <div className="space-y-0.5">
            {primaryName && (
              <h1
                className={`${
                  isPrintPreview ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl md:text-[26px]'
                } font-bold tracking-tight uppercase leading-tight ${themeStyles.textPrimary} truncate`}
              >
                {primaryName}
              </h1>
            )}
            {showEnName && subName && subName !== primaryName && (
              <p
                className={`text-[11px] sm:text-xs font-medium tracking-[0.1em] ${themeStyles.textSecondary}`}
              >
                {subName}
              </p>
            )}
          </div>

          {primaryTitle && (
            <div className="space-y-0.5 pt-0.5">
              <p
                className={`text-[10.5px] sm:text-xs font-semibold tracking-[0.08em] uppercase ${themeStyles.textPrimary} opacity-90`}
              >
                {primaryTitle}
              </p>
              {subTitle && subTitle !== primaryTitle && (
                <p
                  className={`text-[9.5px] sm:text-[10px] tracking-[0.04em] ${themeStyles.textMuted} opacity-85`}
                >
                  {subTitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom: Precision Micro-Label Grid */}
        <div
          className={`relative z-10 pt-2.5 border-t ${themeStyles.accentHairline} grid ${
            isPortrait ? 'grid-cols-1 gap-2' : 'grid-cols-[auto_1fr] gap-4'
          } text-[9.5px] sm:text-[10px]`}
        >
          <div className="space-y-0.5 font-mono tabular-nums min-w-0 shrink-0">
            {data.phone && (
              <div className="flex items-center gap-2.5 whitespace-nowrap">
                <span
                  className={`text-[8px] w-7 uppercase tracking-[0.14em] ${themeStyles.textMuted}`}
                >
                  TEL
                </span>
                <a
                  href={`tel:${data.phoneRaw}`}
                  className={`whitespace-nowrap tracking-tight font-medium ${themeStyles.textPrimary} hover:opacity-75`}
                >
                  {data.phone}
                </a>
              </div>
            )}
            {data.email && (
              <div className="flex items-center gap-2.5 whitespace-nowrap">
                <span
                  className={`text-[8px] w-7 uppercase tracking-[0.14em] ${themeStyles.textMuted}`}
                >
                  MAIL
                </span>
                <a
                  href={`mailto:${data.email}`}
                  className={`${themeStyles.textPrimary} truncate max-w-[180px] hover:opacity-75`}
                >
                  {data.email}
                </a>
              </div>
            )}
            {data.website && (
              <div className="flex items-center gap-2.5 whitespace-nowrap">
                <span
                  className={`text-[8px] w-7 uppercase tracking-[0.14em] ${themeStyles.textMuted}`}
                >
                  WEB
                </span>
                <a
                  href={data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${themeStyles.textSecondary} truncate max-w-[180px] hover:opacity-75`}
                >
                  {data.websiteDisplay}
                </a>
              </div>
            )}
          </div>

          {showAddress && (enAddress || primaryAddressKr) && (
            <div
              className={`flex flex-col justify-end text-[8.5px] sm:text-[9px] font-sans min-w-0 ${
                isPortrait ? '' : 'text-right'
              }`}
            >
              {enAddress && (
                <p className={`${themeStyles.textPrimary} opacity-85 truncate`}>{enAddress}</p>
              )}
              {primaryAddressKr && (
                <p className={`${themeStyles.textMuted} opacity-80 truncate`}>{primaryAddressKr}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. WARM ORGANIC LAYOUT (9:5)
  // =========================================================================
  if (layout_type === 'warm_organic') {
    return (
      <div
        className={`relative w-full h-full select-none flex flex-col justify-between ${
          isPortrait ? 'p-5 sm:p-6' : isPrintPreview ? 'p-4' : 'p-5 sm:p-6 md:p-8'
        } ${themeStyles.cardBg} ${
          isPrintPreview || hideBorder ? 'border-0' : `border ${themeStyles.border}`
        } transition-colors duration-300 font-sans`}
        style={{ aspectRatio: isPortrait ? '5 / 8' : '9 / 5' }}
      >
        {textureOverlay}

        {/* Top: Delicate Heritage Organization */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-0.5 min-w-0 pr-2">
            {primaryOrg && (
              <h2
                className={`text-[11px] sm:text-xs font-medium tracking-[0.16em] uppercase ${themeStyles.textPrimary} truncate`}
              >
                {primaryOrg}
              </h2>
            )}
            {showSubOrg && subOrgLabel && subOrgLabel !== primaryOrg && (
              <p
                className={`text-[9.5px] sm:text-[10px] tracking-[0.06em] ${themeStyles.textSecondary} truncate`}
              >
                {subOrgLabel}
              </p>
            )}
          </div>
          {cornerMark}
        </div>

        {/* Center: Poetic Vertical Typography */}
        <div className="relative z-10 my-auto py-1.5 space-y-1.5">
          <div className="space-y-0.5">
            {primaryName && (
              <h1
                className={`${
                  isPrintPreview ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl md:text-[26px]'
                } font-serif font-normal tracking-wide leading-tight ${themeStyles.textPrimary}`}
              >
                {primaryName}
              </h1>
            )}
            {showEnName && subName && subName !== primaryName && (
              <p
                className={`text-[11px] sm:text-xs font-normal tracking-[0.12em] ${themeStyles.textSecondary}`}
              >
                {subName}
              </p>
            )}
          </div>

          {primaryTitle && (
            <div className="space-y-0.5 pt-0.5">
              <p
                className={`text-[11px] sm:text-xs tracking-[0.06em] ${themeStyles.textPrimary} opacity-85`}
              >
                {primaryTitle}
              </p>
              {subTitle && subTitle !== primaryTitle && (
                <p
                  className={`text-[9.5px] sm:text-[10px] tracking-[0.04em] ${themeStyles.textMuted} opacity-80`}
                >
                  {subTitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom: Calm Typographic Contact Row */}
        <div
          className={`relative z-10 pt-2.5 border-t ${themeStyles.accentHairline} flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-[9.5px] sm:text-[10px]`}
        >
          <div className="space-y-0.5 min-w-0 font-mono tabular-nums">
            <div className="flex items-center gap-2 whitespace-nowrap">
              {data.phone && (
                <a
                  href={`tel:${data.phoneRaw}`}
                  className={`whitespace-nowrap tracking-tight ${themeStyles.textPrimary} hover:opacity-75`}
                >
                  {data.phone}
                </a>
              )}
              {data.phone && data.email && (
                <span className={`${themeStyles.textMuted} opacity-50 select-none`}>·</span>
              )}
              {data.email && (
                <a
                  href={`mailto:${data.email}`}
                  className={`font-sans ${themeStyles.textPrimary} hover:opacity-75 truncate max-w-[170px]`}
                >
                  {data.email}
                </a>
              )}
            </div>
            {data.website && (
              <a
                href={data.website}
                target="_blank"
                rel="noopener noreferrer"
                className={`block ${themeStyles.textSecondary} hover:opacity-75 truncate max-w-[210px]`}
              >
                {data.websiteDisplay}
              </a>
            )}
          </div>

          {showAddress && (enAddress || primaryAddressKr) && (
            <div className="text-right text-[8.5px] sm:text-[9px] leading-snug space-y-0.5 shrink-0">
              {enAddress && (
                <p className={`${themeStyles.textSecondary} truncate max-w-[210px]`}>{enAddress}</p>
              )}
              {primaryAddressKr && (
                <p className={`${themeStyles.textMuted} opacity-80 truncate max-w-[210px]`}>
                  {primaryAddressKr}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. EDITORIAL MINIMAL (DEFAULT) (Asymmetric 2-column, pure typography)
  // =========================================================================
  return (
    <div
      className={`relative w-full h-full select-none flex flex-col justify-between ${
        isPortrait
          ? 'p-5 sm:p-6'
          : isPrintPreview
            ? 'p-4'
            : 'p-4 sm:p-6 md:p-7'
      } ${themeStyles.cardBg} ${
        isPrintPreview || hideBorder ? 'border-0' : `border ${themeStyles.border} shadow-2xl`
      } transition-colors duration-300 font-sans`}
      style={{
        aspectRatio: isPortrait ? '5 / 8' : '9 / 5',
      }}
    >
      {textureOverlay}

      {/* Top Header: Organization Hierarchy */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-0.5 min-w-0 pr-2">
          {primaryOrg && (
            <h2
              className={`${
                isPortrait
                  ? 'text-[11px] sm:text-xs'
                  : isPrintPreview
                    ? 'text-[10.5px]'
                    : 'text-[10.5px] sm:text-xs'
              } font-semibold tracking-[0.16em] uppercase leading-tight ${themeStyles.textPrimary} truncate`}
            >
              {primaryOrg}
            </h2>
          )}
          {showSubOrg && subOrgLabel && subOrgLabel !== primaryOrg && (
            <p
              className={`text-[9.5px] sm:text-[10px] tracking-[0.04em] font-normal leading-tight ${themeStyles.textSecondary} truncate`}
            >
              {subOrgLabel}
            </p>
          )}
          {showSubOrg && extraSubOrg && extraSubOrg !== primaryOrg && (
            <p
              className={`text-[8.5px] sm:text-[9px] tracking-[0.18em] uppercase leading-tight ${themeStyles.textMuted} opacity-80 truncate`}
            >
              {extraSubOrg}
            </p>
          )}
        </div>
        {cornerMark}
      </div>

      {/* Center Section: Clean Vertical Name & Role Hierarchy */}
      <div className="relative z-10 my-auto py-1 space-y-1.5">
        <div className="space-y-0.5">
          {primaryName && (
            <h1
              className={`${
                isPortrait
                  ? 'text-xl sm:text-2xl'
                  : isPrintPreview
                    ? 'text-base sm:text-lg'
                    : 'text-lg sm:text-xl md:text-[23px]'
              } font-semibold tracking-tight leading-tight ${themeStyles.textPrimary} truncate max-w-full`}
            >
              {primaryName}
            </h1>
          )}
          {showEnName && subName && subName !== primaryName && (
            <p
              className={`text-[11px] sm:text-xs font-normal tracking-[0.12em] leading-tight ${themeStyles.textSecondary} truncate`}
            >
              {subName}
            </p>
          )}
        </div>

        {primaryTitle && (
          <div className="space-y-0.5 pt-0.5">
            <p
              className={`${
                isPrintPreview ? 'text-[10.5px]' : 'text-[11px] sm:text-xs'
              } font-medium tracking-[0.06em] leading-tight ${themeStyles.textPrimary} opacity-90 truncate`}
            >
              {primaryTitle}
            </p>
            {subTitle && subTitle !== primaryTitle && (
              <p
                className={`text-[9.5px] sm:text-[10.5px] tracking-[0.04em] leading-tight ${themeStyles.textMuted} opacity-85 truncate`}
              >
                {subTitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Pure Typographic Micro-Label Contacts & Address (Zero Icons) */}
      <div
        className={`relative z-10 ${
          isPortrait
            ? 'pt-2.5 space-y-2 text-[10px] border-t'
            : isPrintPreview
              ? 'pt-2 gap-3 text-[9.5px] border-t grid grid-cols-[auto_1fr]'
              : 'pt-2.5 gap-4 text-[10px] sm:text-[11px] border-t grid grid-cols-[auto_1fr]'
        } ${themeStyles.accentHairline}`}
      >
        {/* Contact list with subtle micro-labels */}
        <div className="space-y-0.5 min-w-0 shrink-0">
          {data.phone && (
            <div className="flex items-center gap-2.5 group/item whitespace-nowrap">
              <span
                className={`w-7 text-[8px] font-mono tracking-[0.16em] uppercase ${themeStyles.textMuted} opacity-80 select-none shrink-0`}
              >
                TEL
              </span>
              <a
                href={`tel:${data.phoneRaw}`}
                title="전화 걸기"
                className={`whitespace-nowrap font-mono tabular-nums tracking-tight ${themeStyles.textPrimary} hover:opacity-75 transition-opacity`}
              >
                {data.phone}
              </a>
              {!isPrintPreview && (
                <button
                  onClick={(e) => copyToClipboard(e, data.phone, 'phone')}
                  title="복사"
                  className={`p-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-opacity ${themeStyles.textMuted} hover:opacity-80 cursor-pointer shrink-0`}
                >
                  {copiedKey === 'phone' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          )}

          {data.email && (
            <div className="flex items-center gap-2.5 group/item whitespace-nowrap min-w-0">
              <span
                className={`w-7 text-[8px] font-mono tracking-[0.16em] uppercase ${themeStyles.textMuted} opacity-80 select-none shrink-0`}
              >
                MAIL
              </span>
              <a
                href={`mailto:${data.email}`}
                title="이메일 보내기"
                className={`whitespace-nowrap tracking-tight ${themeStyles.textPrimary} hover:opacity-75 transition-opacity truncate max-w-[190px] sm:max-w-[230px]`}
              >
                {data.email}
              </a>
              {!isPrintPreview && (
                <button
                  onClick={(e) => copyToClipboard(e, data.email, 'email')}
                  title="복사"
                  className={`p-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-opacity ${themeStyles.textMuted} hover:opacity-80 cursor-pointer shrink-0`}
                >
                  {copiedKey === 'email' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          )}

          {data.website && (
            <div className="flex items-center gap-2.5 whitespace-nowrap min-w-0">
              <span
                className={`w-7 text-[8px] font-mono tracking-[0.16em] uppercase ${themeStyles.textMuted} opacity-80 select-none shrink-0`}
              >
                WEB
              </span>
              <a
                href={data.website}
                target="_blank"
                rel="noopener noreferrer"
                title="웹사이트 열기"
                className={`whitespace-nowrap font-mono tracking-tight ${themeStyles.textSecondary} hover:opacity-75 transition-opacity truncate max-w-[190px] sm:max-w-[230px]`}
              >
                {data.websiteDisplay}
              </a>
            </div>
          )}
        </div>

        {/* Pure Typographic Address Block */}
        {showAddress && (enAddress || primaryAddressKr) && (
          <div
            className={`flex flex-col justify-end text-[8.5px] sm:text-[9px] leading-snug min-w-0 ${
              isPortrait ? `pt-1.5 border-t ${themeStyles.accentHairline}` : 'text-right pl-2'
            }`}
          >
            {enAddress && (
              <p className={`${themeStyles.textPrimary} opacity-85 line-clamp-1`}>{enAddress}</p>
            )}
            {primaryAddressKr && (
              <p
                className={`${
                  enAddress
                    ? `${themeStyles.textMuted} opacity-80 mt-0.5`
                    : `${themeStyles.textPrimary} opacity-85`
                } line-clamp-1`}
              >
                {primaryAddressKr}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
