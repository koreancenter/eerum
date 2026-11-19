import type React from 'react';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface CardContrastMetrics {
  isLightCanvas: boolean;
  primaryContrast: number;
  secondaryContrast: number;
  mutedContrast: number;
}

export interface CardThemeHarmony {
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderColor: string;
  hairlineColor: string;
  ringColor: string;
  hoverBg: string;
  cardShadow: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  contrastMetrics: CardContrastMetrics;
  cssVars: React.CSSProperties;
  fallbackCssVars: React.CSSProperties;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function parseHexColor(hex: string | undefined, fallback: RgbColor): RgbColor {
  if (!hex) return fallback;
  const cleaned = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return {
      r: parseInt(cleaned[0] + cleaned[0], 16),
      g: parseInt(cleaned[1] + cleaned[1], 16),
      b: parseInt(cleaned[2] + cleaned[2], 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    };
  }
  return fallback;
}

function toHex(rgb: RgbColor): string {
  const r = clampChannel(rgb.r).toString(16).padStart(2, '0');
  const g = clampChannel(rgb.g).toString(16).padStart(2, '0');
  const b = clampChannel(rgb.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

function toRgba(rgb: RgbColor, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, Number(alpha.toFixed(3))));
  return `rgba(${clampChannel(rgb.r)}, ${clampChannel(rgb.g)}, ${clampChannel(rgb.b)}, ${safeAlpha})`;
}

function mixRgb(from: RgbColor, to: RgbColor, weight: number): RgbColor {
  const t = Math.max(0, Math.min(1, weight));
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  };
}

/**
 * Alpha-composites a foreground color over the card canvas color so effective WCAG contrast
 * accounts for opacity utility modifiers (e.g. opacity-80 / opacity-85) inside card layouts.
 */
function compositeOver(fg: RgbColor, bg: RgbColor, alpha: number): RgbColor {
  const a = Math.max(0, Math.min(1, alpha));
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  };
}

function linearizeChannel(channel: number): number {
  const srgb = clampChannel(channel) / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(rgb: RgbColor): number {
  return (
    0.2126 * linearizeChannel(rgb.r) +
    0.7152 * linearizeChannel(rgb.g) +
    0.0722 * linearizeChannel(rgb.b)
  );
}

export function getContrastRatio(a: RgbColor, b: RgbColor): number {
  const lumA = getRelativeLuminance(a);
  const lumB = getRelativeLuminance(b);
  const brighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Blends accent toward high-contrast ink until at least `targetContrast` is met against `canvas`,
 * preserving as much of the theme's accent hue as readability permits.
 */
function resolvePrimaryReadableInk(
  accentRgb: RgbColor,
  bestInk: RgbColor,
  canvasRgb: RgbColor,
  targetContrast = 7.0
): RgbColor {
  if (getContrastRatio(accentRgb, canvasRgb) >= targetContrast) {
    return accentRgb;
  }

  let low = 0;
  let high = 1;
  let resolved = bestInk;

  for (let i = 0; i < 16; i += 1) {
    const mid = (low + high) / 2;
    const candidate = mixRgb(accentRgb, bestInk, mid);
    if (getContrastRatio(candidate, canvasRgb) >= targetContrast) {
      resolved = candidate;
      high = mid;
    } else {
      low = mid;
    }
  }

  return getContrastRatio(resolved, canvasRgb) >= getContrastRatio(bestInk, canvasRgb)
    ? resolved
    : getContrastRatio(resolved, canvasRgb) >= targetContrast
      ? resolved
      : bestInk;
}

/**
 * Finds the softest primary-to-canvas tint up to `desiredWeight` whose composited contrast
 * at `effectiveAlpha` still meets `minEffectiveContrast` against the card background.
 */
function resolveSecondaryReadableInk(
  primaryRgb: RgbColor,
  canvasRgb: RgbColor,
  desiredWeight: number,
  effectiveAlpha: number,
  minEffectiveContrast: number
): RgbColor {
  const desiredCandidate = mixRgb(primaryRgb, canvasRgb, desiredWeight);
  if (getContrastRatio(compositeOver(desiredCandidate, canvasRgb, effectiveAlpha), canvasRgb) >= minEffectiveContrast) {
    return desiredCandidate;
  }

  if (getContrastRatio(compositeOver(primaryRgb, canvasRgb, effectiveAlpha), canvasRgb) < minEffectiveContrast) {
    return primaryRgb;
  }

  let low = 0;
  let high = desiredWeight;
  let best = primaryRgb;

  for (let i = 0; i < 14; i += 1) {
    const mid = (low + high) / 2;
    const candidate = mixRgb(primaryRgb, canvasRgb, mid);
    const effContrast = getContrastRatio(compositeOver(candidate, canvasRgb, effectiveAlpha), canvasRgb);
    if (effContrast >= minEffectiveContrast) {
      best = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }

  return best;
}

/**
 * Derives readability-first, WCAG-calibrated text, border, hairline, ring, and shadow tokens
 * from the card theme's canvas background and primary accent color.
 */
export function deriveCardThemeHarmony(
  accentHex: string | undefined,
  isLight: boolean,
  canvasHex?: string
): CardThemeHarmony {
  const defaultCanvas: RgbColor = isLight ? { r: 245, g: 242, b: 236 } : { r: 10, g: 10, b: 11 };
  const canvasRgb = parseHexColor(canvasHex, defaultCanvas);

  const darkInk: RgbColor = { r: 18, g: 18, b: 17 };
  const lightInk: RgbColor = { r: 250, g: 250, b: 250 };
  const darkContrast = getContrastRatio(darkInk, canvasRgb);
  const lightContrast = getContrastRatio(lightInk, canvasRgb);
  const isLightCanvas = darkContrast >= lightContrast;
  const bestInk = isLightCanvas ? darkInk : lightInk;

  const accentRgb = parseHexColor(accentHex, bestInk);
  const accent = toHex(accentRgb);

  // 1. Primary text (이름, 조직명, 주요 연락처 링크): target WCAG AAA (>= 7.0:1)
  const primaryRgb = resolvePrimaryReadableInk(accentRgb, bestInk, canvasRgb, 7.0);

  // 2. Secondary detail text (직함, 영문명, 웹사이트, 주소): target >= 5.0:1 even at 85% opacity
  const secondaryRgb = resolveSecondaryReadableInk(
    primaryRgb,
    canvasRgb,
    isLightCanvas ? 0.25 : 0.26,
    0.85,
    5.0
  );

  // 3. Muted micro-labels & sub-details (TEL/MAIL/WEB/HQ, 한글 주소, 부직책): target >= 4.5:1 even at 80% opacity
  const mutedRgb = resolveSecondaryReadableInk(
    primaryRgb,
    canvasRgb,
    isLightCanvas ? 0.33 : 0.34,
    0.8,
    4.5
  );

  // 4. Borders, hairlines, and outer rings: anchor to accent when sufficiently distinct (>= 3.0:1),
  //    otherwise fall back to contrast-verified primary ink so borders never disappear on matching canvases.
  const borderInk = getContrastRatio(accentRgb, canvasRgb) >= 3.0 ? accentRgb : primaryRgb;

  const textPrimary = toHex(primaryRgb);
  const textSecondary = toHex(secondaryRgb);
  const textMuted = toHex(mutedRgb);

  const borderColor = toRgba(borderInk, isLightCanvas ? 0.14 : 0.16);
  const hairlineColor = toRgba(borderInk, isLightCanvas ? 0.16 : 0.18);
  const ringColor = toRgba(borderInk, isLightCanvas ? 0.11 : 0.16);
  const hoverBg = toRgba(borderInk, isLightCanvas ? 0.06 : 0.1);

  const cardShadow = isLightCanvas
    ? `0 24px 50px -12px ${toRgba(borderInk, 0.22)}, 0 0 1px 1px ${toRgba(borderInk, 0.08)}`
    : `0 24px 50px -12px rgba(0, 0, 0, 0.78), 0 0 1px 1px ${toRgba(borderInk, 0.14)}`;

  const badgeBg = isLightCanvas ? toRgba(canvasRgb, 0.88) : 'rgba(10, 10, 12, 0.72)';
  const badgeBorder = toRgba(borderInk, isLightCanvas ? 0.18 : 0.22);
  const badgeText = textPrimary;

  const contrastMetrics: CardContrastMetrics = {
    isLightCanvas,
    primaryContrast: Number(getContrastRatio(primaryRgb, canvasRgb).toFixed(2)),
    secondaryContrast: Number(getContrastRatio(secondaryRgb, canvasRgb).toFixed(2)),
    mutedContrast: Number(getContrastRatio(mutedRgb, canvasRgb).toFixed(2)),
  };

  const cssVars = {
    '--card-accent': accent,
    '--card-text-primary': textPrimary,
    '--card-text-secondary': textSecondary,
    '--card-text-muted': textMuted,
    '--card-border': borderColor,
    '--card-hairline': hairlineColor,
    '--card-ring': ringColor,
    '--card-hover-bg': hoverBg,
  } as React.CSSProperties;

  const fallbackCssVars = {
    '--card-fallback-accent': accent,
    '--card-fallback-text-primary': textPrimary,
    '--card-fallback-text-secondary': textSecondary,
    '--card-fallback-text-muted': textMuted,
    '--card-fallback-border': borderColor,
    '--card-fallback-hairline': hairlineColor,
    '--card-fallback-ring': ringColor,
    '--card-fallback-hover-bg': hoverBg,
  } as React.CSSProperties;

  return {
    accent,
    textPrimary,
    textSecondary,
    textMuted,
    borderColor,
    hairlineColor,
    ringColor,
    hoverBg,
    cardShadow,
    badgeBg,
    badgeBorder,
    badgeText,
    contrastMetrics,
    cssVars,
    fallbackCssVars,
  };
}
