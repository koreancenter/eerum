import { StoredCard } from '@/types/card';
import { getCardShareUrl } from './cardSerializer';
import { generateVCard } from './cardExporter';

export type NfcPayloadMode = 'url' | 'vcard' | 'both';

export interface NdefRecordInit {
  recordType: string;
  mediaType?: string;
  id?: string;
  data?: string | BufferSource;
  encoding?: string;
  lang?: string;
}

export interface NdefMessageInit {
  records: NdefRecordInit[];
}

export interface NdefWriteOptions {
  overwrite?: boolean;
  signal?: AbortSignal;
}

export interface NdefReaderInstance {
  write: (
    message: string | NdefMessageInit | BufferSource,
    options?: NdefWriteOptions
  ) => Promise<void>;
}

export interface NfcSupportInfo {
  supported: boolean;
  reason?: 'insecure-context' | 'api-unavailable';
}

export interface NfcWriteErrorResult {
  cancelled: boolean;
  message: string;
}

export function getWebNfcSupport(): NfcSupportInfo {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'api-unavailable' };
  }
  if (!window.isSecureContext) {
    return { supported: false, reason: 'insecure-context' };
  }
  if (!('NDEFReader' in window)) {
    return { supported: false, reason: 'api-unavailable' };
  }
  return { supported: true };
}

export function buildCardNdefRecords(
  card: StoredCard,
  mode: NfcPayloadMode
): NdefRecordInit[] {
  const cardUrl = getCardShareUrl(card);
  const records: NdefRecordInit[] = [];

  if (mode === 'url' || mode === 'both') {
    records.push({
      recordType: 'url',
      data: cardUrl,
    });
  }

  if (mode === 'vcard' || mode === 'both') {
    const vcardString = generateVCard(card.data);
    const vcardBytes = new TextEncoder().encode(vcardString);
    records.push({
      recordType: 'mime',
      mediaType: 'text/vcard',
      data: vcardBytes,
    });
  }

  return records;
}

export function estimateNdefPayloadBytes(records: NdefRecordInit[]): number {
  const encoder = new TextEncoder();
  return records.reduce((total, record) => {
    const headerOverhead = 8 + (record.mediaType ? record.mediaType.length : 0);
    if (typeof record.data === 'string') {
      return total + headerOverhead + encoder.encode(record.data).byteLength;
    }
    if (record.data instanceof ArrayBuffer) {
      return total + headerOverhead + record.data.byteLength;
    }
    if (record.data && ArrayBuffer.isView(record.data)) {
      return total + headerOverhead + record.data.byteLength;
    }
    return total + headerOverhead;
  }, 0);
}

export function parseWebNfcError(err: unknown): NfcWriteErrorResult {
  const name = err instanceof Error ? err.name : '';
  if (name === 'AbortError') {
    return { cancelled: true, message: 'NFC 전송이 취소되었습니다.' };
  }
  if (name === 'NotAllowedError') {
    return {
      cancelled: false,
      message:
        'NFC 접근 권한이 거부되었습니다. 브라우저 주소창 또는 사이트 설정에서 NFC 권한을 허용해 주세요.',
    };
  }
  if (name === 'NotSupportedError') {
    return {
      cancelled: false,
      message:
        '기기에서 NFC가 비활성화되어 있거나 지원되지 않습니다. 기기 설정에서 NFC(기본 모드)를 켜주세요.',
    };
  }
  if (name === 'SecurityError') {
    return {
      cancelled: false,
      message:
        '임베드된 창(iframe)에서는 Web NFC가 제한될 수 있습니다. Chrome 새 탭 또는 설치된 PWA 앱에서 실행해 주세요.',
    };
  }
  if (name === 'NetworkError') {
    return {
      cancelled: false,
      message:
        'NFC 기기/태그와 연결이 끊어졌거나 읽기 전용 태그입니다. 1~2초간 가까이 유지한 뒤 다시 시도해 주세요.',
    };
  }
  if (name === 'NotReadableError') {
    return {
      cancelled: false,
      message:
        'NFC 모듈을 사용할 수 없습니다. 다른 NFC 앱을 종료한 뒤 다시 시도해 주세요.',
    };
  }

  const fallbackMsg = err instanceof Error && err.message ? err.message : '';
  return {
    cancelled: false,
    message: fallbackMsg || 'NFC 전송 중 문제가 발생했습니다. 기기 뒷면을 가까이 대고 다시 시도해 주세요.',
  };
}

export async function beamCardOverNfc(options: {
  card: StoredCard;
  mode: NfcPayloadMode;
  signal?: AbortSignal;
}): Promise<void> {
  const support = getWebNfcSupport();
  if (!support.supported) {
    throw new DOMException(
      support.reason === 'insecure-context'
        ? 'HTTPS secure context required for Web NFC.'
        : 'Web NFC API is not available in this browser.',
      'NotSupportedError'
    );
  }

  const NDEFReaderCtor = (
    window as unknown as { NDEFReader: new () => NdefReaderInstance }
  ).NDEFReader;
  const reader = new NDEFReaderCtor();
  const records = buildCardNdefRecords(options.card, options.mode);

  await reader.write({ records }, { overwrite: true, signal: options.signal });
}
