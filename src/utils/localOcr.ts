import { createWorker, OEM } from 'tesseract.js';

export interface LocalOcrProgress {
  progress: number; // 0 to 100
  status: string;
}

export interface LocalOcrResult {
  text: string;
  confidence: number;
}

/**
 * Converts an SVG data URL into a high-resolution PNG data URL locally
 * inside an offscreen canvas so Tesseract Web Worker can decode vector cards too.
 */
async function rasterizeSvgIfNeeded(imageSrc: string): Promise<string> {
  if (!imageSrc.startsWith('data:image/svg+xml')) {
    return imageSrc;
  }

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return imageSrc;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const width = Math.max(img.naturalWidth || 900, 1800);
        const height = Math.max(img.naturalHeight || 540, 1080);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * Normalizes multi-phase Tesseract worker status messages into a smooth
 * monotonic 0-100 progress percentage.
 */
function mapWorkerStatusToPercent(status: string, rawProgress: number): number {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(rawProgress) ? rawProgress : 0));
  const lower = (status || '').toLowerCase();

  if (lower.includes('recognizing text')) {
    return Math.round(45 + clamped * 53);
  }
  if (lower.includes('initializing api')) {
    return Math.round(35 + clamped * 10);
  }
  if (lower.includes('loading language traineddata')) {
    return Math.round(15 + clamped * 20);
  }
  if (lower.includes('initializing tesseract')) {
    return Math.round(8 + clamped * 7);
  }
  if (lower.includes('loading tesseract core')) {
    return Math.round(2 + clamped * 6);
  }
  return Math.round(clamped * 40);
}

/**
 * Runs 100% browser-local OCR using Tesseract.js inside a Web Worker.
 * Zero card images or text ever leave the user's device.
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

  emitProgress(2, '로컬 OCR 엔진 준비 중');

  const preparedImage = await rasterizeSvgIfNeeded(imageSrc);

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker('kor+eng', OEM.LSTM_ONLY, {
      logger: (message) => {
        const mapped = mapWorkerStatusToPercent(message.status, message.progress);
        emitProgress(mapped, message.status || '처리 중');
      },
    });

    emitProgress(45, '명함 텍스트 판독 중');
    const result = await worker.recognize(preparedImage);
    emitProgress(100, '완료');

    return {
      text: (result?.data?.text || '').trim(),
      confidence: typeof result?.data?.confidence === 'number' ? result.data.confidence : 0,
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore termination cleanup errors
      }
    }
  }
}
