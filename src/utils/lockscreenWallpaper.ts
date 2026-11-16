import QRCode from 'qrcode';
import { CardData } from '@/types/card';
import { generateVCard } from './cardExporter';

export type LockscreenWallpaperTheme = 'dark' | 'light';
export type LockscreenQrMode = 'url' | 'vcard';

export interface LockscreenWallpaperOptions {
  data: CardData;
  cardUrl: string;
  theme?: LockscreenWallpaperTheme;
  qrMode?: LockscreenQrMode;
}

const WALLPAPER_WIDTH = 1170;
const WALLPAPER_HEIGHT = 2532;
const FONT_FAMILY_SANS =
  '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
const FONT_FAMILY_MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fitTextWithEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (ctx.measureText(trimmed).width <= maxWidth) return trimmed;

  let truncated = trimmed;
  while (truncated.length > 1 && ctx.measureText(`${truncated}...`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}...`;
}

/**
 * Generates an HTML5 <canvas> mobile lockscreen wallpaper (1170x2532)
 * placing the cardholder's QR code, name, and role inside the lower-middle safe zone
 * (avoiding the top lockscreen clock/widgets and bottom flashlight/camera buttons).
 */
export async function generateLockscreenWallpaperBlob({
  data,
  cardUrl,
  theme = 'dark',
  qrMode = 'url',
}: LockscreenWallpaperOptions): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Canvas generation is only supported in browser environments.');
  }

  if (document.fonts?.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 300)),
      ]);
    } catch {
      // Proceed cleanly with system fallback fonts
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = WALLPAPER_WIDTH;
  canvas.height = WALLPAPER_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context.');
  }

  const isDark = theme === 'dark';
  const palette = isDark
    ? {
        bgTop: '#0A0A0B',
        bgBottom: '#111114',
        glow: 'rgba(255, 255, 255, 0.035)',
        panelBg: '#141418',
        panelBorder: 'rgba(255, 255, 255, 0.12)',
        qrPlateBg: '#FFFFFF',
        qrPlateBorder: 'rgba(255, 255, 255, 0.18)',
        textPrimary: '#FAFAFA',
        textSecondary: '#A1A1AA',
        textMuted: '#71717A',
        divider: 'rgba(255, 255, 255, 0.1)',
      }
    : {
        bgTop: '#F5F2EC',
        bgBottom: '#EDE8DF',
        glow: 'rgba(28, 27, 26, 0.03)',
        panelBg: '#FAF8F4',
        panelBorder: 'rgba(28, 27, 26, 0.1)',
        qrPlateBg: '#FFFFFF',
        qrPlateBorder: 'rgba(28, 27, 26, 0.12)',
        textPrimary: '#141416',
        textSecondary: '#57534E',
        textMuted: '#78716C',
        divider: 'rgba(28, 27, 26, 0.1)',
      };

  // 1. Minimalist Full-Bleed Gradient Background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, WALLPAPER_HEIGHT);
  bgGradient.addColorStop(0, palette.bgTop);
  bgGradient.addColorStop(1, palette.bgBottom);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, WALLPAPER_WIDTH, WALLPAPER_HEIGHT);

  // Subtle architectural radial highlight centered in the lower-middle safe zone
  const safeZoneCenterY = 1520;
  const radialGlow = ctx.createRadialGradient(
    WALLPAPER_WIDTH / 2,
    safeZoneCenterY,
    80,
    WALLPAPER_WIDTH / 2,
    safeZoneCenterY,
    680
  );
  radialGlow.addColorStop(0, palette.glow);
  radialGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, WALLPAPER_WIDTH, WALLPAPER_HEIGHT);

  // 2. Lower-Middle Safe Zone Card Container
  // Top 0..920px reserved for iOS/Android lockscreen clock & widgets.
  // Bottom 2140..2532px reserved for lockscreen flashlight/camera/home bar.
  const cardWidth = 900;
  const cardX = (WALLPAPER_WIDTH - cardWidth) / 2;
  const cardY = 980;
  const cardHeight = 1110;

  drawRoundedRectPath(ctx, cardX, cardY, cardWidth, cardHeight, 48);
  ctx.fillStyle = palette.panelBg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.panelBorder;
  ctx.stroke();

  // Micro architectural header label inside safe-zone card
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.textMuted;
  ctx.font = `600 22px ${FONT_FAMILY_SANS}`;
  const headerText =
    qrMode === 'vcard' ? 'SCAN TO SAVE CONTACT' : 'SCAN TO OPEN DIGITAL CARD';
  ctx.fillText(headerText, WALLPAPER_WIDTH / 2, cardY + 70);

  // 3. High-Contrast Scannable QR Plate
  const qrPayload = qrMode === 'vcard' ? generateVCard(data) : cardUrl;
  const qrCanvas = document.createElement('canvas');
  const qrRenderSize = 512;

  await QRCode.toCanvas(qrCanvas, qrPayload, {
    width: qrRenderSize,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0A0A0B',
      light: '#FFFFFF',
    },
  });

  const plateSize = 568;
  const plateX = (WALLPAPER_WIDTH - plateSize) / 2;
  const plateY = cardY + 122;

  drawRoundedRectPath(ctx, plateX, plateY, plateSize, plateSize, 32);
  ctx.fillStyle = palette.qrPlateBg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.qrPlateBorder;
  ctx.stroke();

  // Draw crisp pixel-aligned QR bitmap inside plate
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const qrOffset = (plateSize - qrRenderSize) / 2;
  ctx.drawImage(qrCanvas, plateX + qrOffset, plateY + qrOffset, qrRenderSize, qrRenderSize);
  ctx.restore();

  // Subtle divider between QR plate and identity block
  const dividerY = plateY + plateSize + 56;
  ctx.beginPath();
  ctx.moveTo(cardX + 96, dividerY);
  ctx.lineTo(cardX + cardWidth - 96, dividerY);
  ctx.strokeStyle = palette.divider;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 4. Cardholder Identity Block (Name, Role & Company, Display URL)
  const textMaxWidth = cardWidth - 120;
  const displayName = (data.name || data.nameKr || 'Digital Card').trim();
  const secondaryName = (data.nameEn || data.details?.en_name || '').trim();
  const titleText = (data.titleKr || data.title || '').trim();
  const orgText = (data.organizationKr || data.organization || '').trim();
  const roleCompany = [titleText, orgText].filter(Boolean).join(' · ');
  const displayHost = (data.websiteDisplay || cardUrl).replace(/^https?:\/\//i, '').trim();

  // Primary Name
  let nameFontSize = 62;
  ctx.font = `700 ${nameFontSize}px ${FONT_FAMILY_SANS}`;
  while (nameFontSize > 42 && ctx.measureText(displayName).width > textMaxWidth) {
    nameFontSize -= 2;
    ctx.font = `700 ${nameFontSize}px ${FONT_FAMILY_SANS}`;
  }
  ctx.fillStyle = palette.textPrimary;
  const fittedName = fitTextWithEllipsis(ctx, displayName, textMaxWidth);
  ctx.fillText(fittedName, WALLPAPER_WIDTH / 2, dividerY + 84);

  // Role & Company (or secondary name if no role/company)
  const roleLine =
    roleCompany ||
    (secondaryName && secondaryName.toLowerCase() !== displayName.toLowerCase()
      ? secondaryName
      : '');
  if (roleLine) {
    ctx.fillStyle = palette.textSecondary;
    ctx.font = `500 32px ${FONT_FAMILY_SANS}`;
    const fittedRole = fitTextWithEllipsis(ctx, roleLine, textMaxWidth);
    ctx.fillText(fittedRole, WALLPAPER_WIDTH / 2, dividerY + 154);
  }

  // Display URL / Phone footer
  const footerLine =
    qrMode === 'vcard'
      ? data.phone || data.email || displayHost
      : displayHost;
  if (footerLine) {
    ctx.fillStyle = palette.textMuted;
    ctx.font = `400 24px ${FONT_FAMILY_MONO}`;
    const fittedFooter = fitTextWithEllipsis(ctx, footerLine, textMaxWidth);
    ctx.fillText(fittedFooter, WALLPAPER_WIDTH / 2, cardY + cardHeight - 72);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode lockscreen wallpaper PNG.'));
        }
      },
      'image/png',
      1.0
    );
  });
}

export async function downloadLockscreenWallpaper(
  options: LockscreenWallpaperOptions
): Promise<string> {
  const blob = await generateLockscreenWallpaperBlob(options);
  const url = URL.createObjectURL(blob);
  const safeName = (options.data.name || options.data.nameKr || 'eerum')
    .trim()
    .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
    .toLowerCase();
  const themeSuffix = options.theme === 'light' ? 'light' : 'dark';
  const filename = `eerum-lockscreen-${safeName || 'card'}-${themeSuffix}.png`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return filename;
}
