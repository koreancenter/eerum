/**
 * Image Processing Utilities for Digital Business Card Studio
 * Handles Base64 conversion, aspect ratio scaling, high-quality canvas cropping,
 * and high-efficiency WebP/JPEG compression completely on the client side.
 */

export interface ImageCompressionResult {
  dataUrl: string;
  originalBytes: number;
  compressedBytes: number;
  ratio: number;
  width: number;
  height: number;
}

export interface ImageCropOptions {
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg';
  fillColor?: string;
}

/**
 * Converts a File or Blob into a raw Data URL string
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        resolve(e.target.result);
      } else {
        reject(new Error('FileReader returned empty or invalid result'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Loads an HTMLImageElement from a URL or Data URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image element'));
    img.src = src;
  });
}

/**
 * Calculates byte size of a Base64 Data URL string
 */
export function getBase64ByteLength(dataUrl: string): number {
  const base64Index = dataUrl.indexOf(',');
  if (base64Index === -1) return 0;
  const base64String = dataUrl.slice(base64Index + 1);
  return Math.round((base64String.length * 3) / 4);
}

/**
 * Formats byte size into human-readable unit
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Crops and compresses an image to standard card aspect ratios (e.g., 900×540 or 1080×600)
 * using HTML5 Canvas with high-quality bicubic smoothing and export to WebP/JPEG.
 */
export async function cropAndCompressCardImage(
  source: File | string,
  options: ImageCropOptions = {}
): Promise<ImageCompressionResult> {
  const {
    targetWidth = 900,
    targetHeight = 540,
    quality = 0.88,
    format = 'image/webp',
    fillColor = '#0B0C10',
  } = options;

  let originalBytes = 0;
  let dataUrlSrc = '';

  if (typeof source === 'string') {
    dataUrlSrc = source;
    originalBytes = getBase64ByteLength(source);
  } else {
    originalBytes = source.size;
    dataUrlSrc = await fileToDataUrl(source);
  }

  const img = await loadImage(dataUrlSrc);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Compute aspect ratio crop bounds without stretching or letterbox artifacts
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;
  const imgAspect = imgWidth / imgHeight;
  const targetAspect = targetWidth / targetHeight;

  let drawWidth = targetWidth;
  let drawHeight = targetHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (imgAspect > targetAspect) {
    drawWidth = targetHeight * imgAspect;
    offsetX = (targetWidth - drawWidth) / 2;
  } else {
    drawHeight = targetWidth / imgAspect;
    offsetY = (targetHeight - drawHeight) / 2;
  }

  // Draw background matte and centered cropped image
  ctx.fillStyle = fillColor;
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  // Attempt WebP export, fallback to JPEG if format not supported
  let compressedUrl = '';
  try {
    compressedUrl = canvas.toDataURL(format, quality);
    if (!compressedUrl.startsWith(`data:${format}`)) {
      compressedUrl = canvas.toDataURL('image/jpeg', quality);
    }
  } catch {
    compressedUrl = canvas.toDataURL('image/jpeg', quality);
  }

  const compressedBytes = getBase64ByteLength(compressedUrl);
  const ratio = originalBytes > 0
    ? Math.max(0, Math.round(((originalBytes - compressedBytes) / originalBytes) * 100))
    : 0;

  return {
    dataUrl: compressedUrl,
    originalBytes,
    compressedBytes,
    ratio,
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * Standard business card ratio (90mm x 50mm, 9:5 or 1.586) quick helper
 */
export async function processPhysicalCardPhoto(
  file: File,
  targetWidth = 1080,
  targetHeight = 600
): Promise<string> {
  const result = await cropAndCompressCardImage(file, {
    targetWidth,
    targetHeight,
    quality: 0.88,
    format: 'image/webp',
    fillColor: '#0B0C10',
  });
  return result.dataUrl;
}
