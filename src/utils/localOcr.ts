export interface LocalOcrProgress {
  progress: number; // 0 to 100
  status: string;
}

export type LocalOcrEngine = 'text-detector' | 'tesseract-cdn';

export interface LocalOcrResult {
  text: string;
  confidence: number;
  engine: LocalOcrEngine;
}

interface DetectedTextBlock {
  rawValue?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface NativeTextDetector {
  detect: (source: ImageBitmapSource) => Promise<DetectedTextBlock[]>;
}

interface TesseractWorkerLike {
  recognize: (image: ImageBitmapSource | string) => Promise<{
    data?: {
      text?: string;
      confidence?: number;
    };
  }>;
  terminate: () => Promise<unknown>;
}

interface TesseractGlobal {
  createWorker: (
    langs?: string,
    oem?: number,
    options?: {
      logger?: (message: { status?: string; progress?: number }) => void;
    }
  ) => Promise<TesseractWorkerLike>;
}

const TESSERACT_CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js',
];

let tesseractCdnLoadPromise: Promise<TesseractGlobal> | null = null;

function loadScriptFromUrl(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      if ((window as unknown as { Tesseract?: TesseractGlobal }).Tesseract) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${url}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load ${url}`));
    };
    document.head.appendChild(script);
  });
}

/**
 * Dynamically loads Tesseract via CDN strictly on demand when the native TextDetector API
 * is unavailable or returns no text, keeping the main Vite bundle at zero OCR bloat.
 */
async function loadTesseractFromCdn(): Promise<TesseractGlobal> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Browser environment required for OCR');
  }

  const win = window as unknown as { Tesseract?: TesseractGlobal };
  if (win.Tesseract && typeof win.Tesseract.createWorker === 'function') {
    return win.Tesseract;
  }

  if (!tesseractCdnLoadPromise) {
    tesseractCdnLoadPromise = (async () => {
      let lastError: unknown = null;
      for (const cdnUrl of TESSERACT_CDN_URLS) {
        try {
          await loadScriptFromUrl(cdnUrl);
          if (win.Tesseract && typeof win.Tesseract.createWorker === 'function') {
            return win.Tesseract;
          }
        } catch (err) {
          lastError = err;
        }
      }
      tesseractCdnLoadPromise = null;
      throw lastError || new Error('Unable to load Tesseract OCR engine from CDN');
    })();
  }

  return tesseractCdnLoadPromise;
}

/**
 * Loads an image source into an offscreen HTMLCanvasElement (rasterizing SVG data URLs
 * onto a clean white background so both TextDetector and Tesseract process it reliably).
 */
async function prepareImageCanvas(imageSrc: string): Promise<{
  canvas: HTMLCanvasElement;
  fallbackSrc: string;
}> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('Canvas image preparation requires a browser environment');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!imageSrc.startsWith('data:') && !imageSrc.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const isSvg = imageSrc.startsWith('data:image/svg+xml');
        const width = isSvg
          ? Math.max(img.naturalWidth || 900, 1800)
          : Math.max(img.naturalWidth || img.width || 900, 1);
        const height = isSvg
          ? Math.max(img.naturalHeight || 540, 1080)
          : Math.max(img.naturalHeight || img.height || 540, 1);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not obtain 2D canvas context'));
          return;
        }

        if (isSvg) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        const fallbackSrc = isSvg ? canvas.toDataURL('image/png') : imageSrc;
        resolve({ canvas, fallbackSrc });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
    img.src = imageSrc;
  });
}

/**
 * Groups native TextDetector bounding-box blocks into reading-order text lines.
 */
function formatDetectedBlocksAsLines(blocks: DetectedTextBlock[]): string {
  const valid = blocks
    .map((b) => ({
      text: (b.rawValue || '').trim(),
      x: b.boundingBox?.x ?? 0,
      y: b.boundingBox?.y ?? 0,
      height: Math.max(8, b.boundingBox?.height ?? 16),
    }))
    .filter((b) => b.text.length > 0);

  if (valid.length === 0) return '';

  valid.sort((a, b) => a.y - b.y || a.x - b.x);

  const lines: Array<{ centerY: number; avgHeight: number; items: typeof valid }> = [];

  for (const block of valid) {
    const blockCenterY = block.y + block.height / 2;
    const matchedLine = lines.find((line) => {
      const threshold = Math.max(line.avgHeight, block.height) * 0.55;
      return Math.abs(line.centerY - blockCenterY) <= threshold;
    });

    if (matchedLine) {
      matchedLine.items.push(block);
      const count = matchedLine.items.length;
      matchedLine.centerY = (matchedLine.centerY * (count - 1) + blockCenterY) / count;
      matchedLine.avgHeight = (matchedLine.avgHeight * (count - 1) + block.height) / count;
    } else {
      lines.push({
        centerY: blockCenterY,
        avgHeight: block.height,
        items: [block],
      });
    }
  }

  return lines
    .sort((a, b) => a.centerY - b.centerY)
    .map((line) =>
      line.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(' ')
        .trim()
    )
    .filter(Boolean)
    .join('\n');
}

/**
 * Attempts instant zero-download extraction using the browser-native TextDetector API.
 * Returns null if unsupported or if no text blocks are detected.
 */
async function tryNativeTextDetector(canvas: HTMLCanvasElement): Promise<string | null> {
  if (typeof window === 'undefined' || !('TextDetector' in window)) {
    return null;
  }

  try {
    const TextDetectorCtor = (
      window as unknown as { TextDetector?: new () => NativeTextDetector }
    ).TextDetector;
    if (!TextDetectorCtor) return null;

    const detector = new TextDetectorCtor();
    const detected = await detector.detect(canvas);
    if (!Array.isArray(detected) || detected.length === 0) {
      return null;
    }

    const formatted = formatDetectedBlocksAsLines(detected);
    return formatted.trim() ? formatted.trim() : null;
  } catch {
    return null;
  }
}

function mapWorkerStatusToPercent(status: string, rawProgress: number): number {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(rawProgress) ? rawProgress : 0));
  const lower = (status || '').toLowerCase();

  if (lower.includes('recognizing text')) {
    return Math.round(50 + clamped * 48);
  }
  if (lower.includes('initializing api')) {
    return Math.round(38 + clamped * 12);
  }
  if (lower.includes('loading language traineddata')) {
    return Math.round(20 + clamped * 18);
  }
  if (lower.includes('initializing tesseract')) {
    return Math.round(12 + clamped * 8);
  }
  if (lower.includes('loading tesseract core')) {
    return Math.round(6 + clamped * 6);
  }
  return Math.round(10 + clamped * 35);
}

/**
 * Zero-bloat client-side OCR:
 * 1) Tries the native browser `TextDetector` API first for instant zero-download recognition.
 * 2) Falls back to loading Tesseract via CDN on demand ONLY when invoked and native detection is unavailable.
 */
export async function runLocalCardOcr(
  imageSrc: string,
  onProgress?: (info: LocalOcrProgress) => void
): Promise<LocalOcrResult> {
  if (!imageSrc || !imageSrc.trim()) {
    throw new Error('분석할 명함 이미지가 없습니다.');
  }

  let highestProgress = 1;
  const emitProgress = (percent: number, status: string) => {
    highestProgress = Math.max(highestProgress, Math.min(100, Math.round(percent)));
    onProgress?.({ progress: highestProgress, status });
  };

  emitProgress(4, '명함 이미지 준비 중');
  const { canvas, fallbackSrc } = await prepareImageCanvas(imageSrc);

  // Stage 1: Native Browser TextDetector API
  emitProgress(12, '브라우저 내장 TextDetector 확인 중');
  const nativeText = await tryNativeTextDetector(canvas);
  if (nativeText) {
    emitProgress(100, '브라우저 내장 텍스트 인식 완료');
    return {
      text: nativeText,
      confidence: 95,
      engine: 'text-detector',
    };
  }

  // Stage 2: On-Demand CDN Tesseract Fallback
  emitProgress(15, '온디바이스 OCR 엔진 로드 중');
  const tesseract = await loadTesseractFromCdn();

  let worker: TesseractWorkerLike | null = null;
  try {
    worker = await tesseract.createWorker('kor+eng', 1, {
      logger: (message) => {
        const mapped = mapWorkerStatusToPercent(
          message.status || '',
          typeof message.progress === 'number' ? message.progress : 0
        );
        emitProgress(mapped, message.status || '분석 중');
      },
    });

    emitProgress(50, '명함 텍스트 판독 중');
    const result = await worker.recognize(fallbackSrc);
    emitProgress(100, '완료');

    return {
      text: (result?.data?.text || '').trim(),
      confidence: typeof result?.data?.confidence === 'number' ? result.data.confidence : 0,
      engine: 'tesseract-cdn',
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore worker cleanup errors
      }
    }
  }
}
