import React from 'react';
import { CardTheme } from '../types/card';

export interface KoreanCenterLogoProps {
  size?: number | string;
  className?: string;
  color?: string;
  theme?: CardTheme;
  showText?: boolean;
}

/**
 * KoreanCenterLogo
 * Consolidated, zero-dependency pure vector SVG brand mark for Korean Center.
 * Replaces heavy 870KB raster binaries with high-precision vector mathematics.
 */
export const KoreanCenterLogo: React.FC<KoreanCenterLogoProps> = ({
  size = 48,
  className = '',
  color,
  theme = 'pure_white',
  showText = false,
}) => {
  const pixelSize = typeof size === 'number' ? size : parseInt(size.toString(), 10) || 48;

  // Resolve luxury monochrome stroke color based on theme
  const isLight =
    theme === 'cotton' ||
    theme === 'sand' ||
    theme === 'warm_paper' ||
    theme === 'pure_white';

  const defaultStroke = isLight ? '#0A0A0B' : '#FAFAFA';
  const cardinalAccent = isLight ? '#52525B' : '#A1A1AA';
  const activeStroke = color || defaultStroke;

  return (
    <div
      className={`inline-flex items-center gap-2 select-none shrink-0 ${className}`}
      style={{
        width: showText ? 'auto' : size,
        height: size,
      }}
    >
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm transition-colors duration-200"
        aria-label="Korean Center Official Vector Logo"
      >
        {/* Outer Architectural Precision Ring */}
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke={activeStroke}
          strokeWidth="1.2"
          strokeOpacity="0.9"
        />

        {/* Global Meridian Curves (Symbolizing International Diplomatic Network) */}
        <ellipse
          cx="50"
          cy="50"
          rx="26"
          ry="46"
          stroke={activeStroke}
          strokeWidth="0.8"
          strokeOpacity="0.45"
        />
        <line
          x1="4"
          y1="50"
          x2="96"
          y2="50"
          stroke={activeStroke}
          strokeWidth="0.8"
          strokeOpacity="0.45"
        />
        <line
          x1="50"
          y1="4"
          x2="50"
          y2="96"
          stroke={activeStroke}
          strokeWidth="0.8"
          strokeOpacity="0.45"
        />

        {/* Stylized Minimalist Korean Center 'K' Monogram */}
        <path
          d="M38 30 V70 M38 50 L62 30 M46 43 L62 70"
          stroke={activeStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="miter"
        />

        {/* Cardinal Accent Points in Precision Monochrome */}
        <circle cx="50" cy="8" r="1.6" fill={cardinalAccent} />
        <circle cx="92" cy="50" r="1.6" fill={cardinalAccent} />
        <circle cx="50" cy="92" r="1.6" fill={cardinalAccent} />
        <circle cx="8" cy="50" r="1.6" fill={cardinalAccent} />
      </svg>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span
            className="text-xs font-bold tracking-widest uppercase font-sans"
            style={{ color: activeStroke }}
          >
            KOREAN CENTER
          </span>
          <span className="text-[9px] text-neutral-400 tracking-wider">
            GLOBAL NETWORK
          </span>
        </div>
      )}
    </div>
  );
};
