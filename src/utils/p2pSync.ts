import { StoredCard } from '../types/card';
import {
  type GetP2PSignalResponse,
  type P2PIceCandidateSignal,
  type P2PSessionDescriptionSignal,
  type P2PSignalRole,
  type P2PSignalType,
  type PostP2PSignalResponse,
  P2P_ROOM_ID_PATTERN,
  isValidP2PRoomId,
} from '../types/api';
import { type CardThemeMap, loadCardThemeMap } from './cardThemeStorage';
import { loadVaultCategories } from './categories';
import { type VaultBackupPayloadV1, validateBackupPayload } from './vaultBackup';

export const P2P_DATA_CHANNEL_NAME = 'eerum-vault-sync';
export const P2P_CHUNK_SIZE_BYTES = 16 * 1024; // 16KB chunks for DataChannel safety with base64 images
const P2P_MAX_BUFFERED_AMOUNT = 256 * 1024; // 256KB SCTP backpressure threshold
const P2P_POLL_INTERVAL_MS = 800;
const P2P_STUN_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export type P2PConnectionStatus =
  | 'initializing'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'transferring'
  | 'completed'
  | 'expired'
  | 'error';

export interface P2PVaultTransferPayload {
  version: 1;
  exportedAt: string;
  cards: StoredCard[];
  categories: string[];
  cardThemeMap?: CardThemeMap;
  integrityHash: string;
}

interface P2PMetaControlFrame {
  kind: 'eerum-p2p-meta';
  totalBytes: number;
  totalChunks: number;
  integrityHash: string;
  cardCount: number;
  myCardCount: number;
  vaultCardCount: number;
}

interface P2PEofControlFrame {
  kind: 'eerum-p2p-eof';
  totalBytes: number;
  integrityHash: string;
}

interface P2PAckControlFrame {
  kind: 'eerum-p2p-ack';
  verified: boolean;
  error?: string;
}

type P2PControlFrame = P2PMetaControlFrame | P2PEofControlFrame | P2PAckControlFrame;

export interface P2PTransferSession {
  roomId: string;
  pairingUrl: string;
  close: () => void;
}

export interface StartP2PSenderOptions {
  cards: StoredCard[];
  categories?: string[];
  onRoomReady?: (info: { roomId: string; pairingUrl: string; expiresAt: number }) => void;
  onStatusChange?: (status: P2PConnectionStatus) => void;
  onProgress?: (percent: number, transferredBytes: number, totalBytes: number) => void;
  onComplete?: (info: { cardCount: number; totalBytes: number; integrityHash: string }) => void;
  onError?: (message: string) => void;
}

export interface JoinP2PReceiverOptions {
  roomId: string;
  onStatusChange?: (status: P2PConnectionStatus) => void;
  onMeta?: (meta: {
    totalBytes: number;
    cardCount: number;
    myCardCount: number;
    vaultCardCount: number;
  }) => void;
  onProgress?: (percent: number, receivedBytes: number, totalBytes: number) => void;
  onPayloadReceived: (payload: P2PVaultTransferPayload) => void;
  onError?: (message: string) => void;
}

export function isWebRTCP2PSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.RTCPeerConnection === 'function' &&
    typeof crypto !== 'undefined' &&
    Boolean(crypto.subtle)
  );
}

export function generateP2PRoomId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function buildP2PPairingUrl(roomId: string): string {
  if (typeof window === 'undefined') return `/?p2p=${encodeURIComponent(roomId)}`;
  return `${window.location.origin}/?p2p=${encodeURIComponent(roomId)}`;
}

export function extractP2PRoomIdFromInput(rawInput: string): string | null {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return null;
  if (P2P_ROOM_ID_PATTERN.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const param = parsed.searchParams.get('p2p');
    if (param && P2P_ROOM_ID_PATTERN.test(param.trim())) {
      return param.trim();
    }
  } catch {
    const match = trimmed.match(/[?&]p2p=([a-zA-Z0-9_-]{6,32})/);
    if (match?.[1] && P2P_ROOM_ID_PATTERN.test(match[1])) {
      return match[1];
    }
  }
  return null;
}

export function toBackupPayloadFromP2P(
  p2pPayload: P2PVaultTransferPayload
): VaultBackupPayloadV1 {
  const myCardCount = p2pPayload.cards.filter((c) => Boolean(c.isMyCard)).length;
  return {
    version: 1,
    exportedAt: p2pPayload.exportedAt,
    cards: p2pPayload.cards,
    categories: p2pPayload.categories,
    ...(p2pPayload.cardThemeMap ? { cardThemeMap: p2pPayload.cardThemeMap } : {}),
    integrityHash: p2pPayload.integrityHash,
    metadata: {
      app: 'eerum_card_studio',
      myCardCount,
      vaultCardCount: p2pPayload.cards.length - myCardCount,
      totalCount: p2pPayload.cards.length,
      encryptedWithPin: false,
    },
  };
}

async function computeSha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function postSignal(
  roomId: string,
  role: P2PSignalRole,
  type: P2PSignalType,
  payload: P2PSessionDescriptionSignal | P2PIceCandidateSignal,
  signal?: AbortSignal
): Promise<PostP2PSignalResponse> {
  const res = await fetch('/api/p2p/signal', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ roomId, role, type, payload }),
  });

  const data = (await res.json().catch(() => null)) as PostP2PSignalResponse | null;
  if (!res.ok || !data || !data.success) {
    throw new Error((data && !data.success && data.error) || `Signaling error (${res.status})`);
  }
  return data;
}

async function fetchSignal(
  roomId: string,
  role: P2PSignalRole,
  signal?: AbortSignal
): Promise<{ status: number; data: GetP2PSignalResponse | null }> {
  const res = await fetch(
    `/api/p2p/signal?room=${encodeURIComponent(roomId)}&role=${encodeURIComponent(role)}`,
    {
      method: 'GET',
      signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    }
  );
  const data = (await res.json().catch(() => null)) as GetP2PSignalResponse | null;
  return { status: res.status, data };
}

function iceCandidateKey(candidate: P2PIceCandidateSignal): string {
  return `${candidate.candidate}|${candidate.sdpMid ?? ''}|${candidate.sdpMLineIndex ?? ''}`;
}

async function waitForDataChannelDrain(dc: RTCDataChannel, isAborted: () => boolean): Promise<void> {
  if (dc.bufferedAmount <= P2P_MAX_BUFFERED_AMOUNT) return;
  dc.bufferedAmountLowThreshold = Math.floor(P2P_MAX_BUFFERED_AMOUNT / 2);

  await new Promise<void>((resolve, reject) => {
    const checkTimer = window.setInterval(() => {
      if (isAborted() || dc.readyState !== 'open') {
        cleanup();
        reject(new Error('P2P 연결이 전송 도중 종료되었습니다.'));
      } else if (dc.bufferedAmount <= P2P_MAX_BUFFERED_AMOUNT) {
        cleanup();
        resolve();
      }
    }, 30);

    const onLow = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      reject(new Error('P2P 데이터 채널이 닫혔습니다.'));
    };

    const cleanup = () => {
      window.clearInterval(checkTimer);
      dc.removeEventListener('bufferedamountlow', onLow);
      dc.removeEventListener('close', onClose);
    };

    dc.addEventListener('bufferedamountlow', onLow);
    dc.addEventListener('close', onClose);
  });
}

async function serializeVaultForP2P(
  cards: StoredCard[],
  categories?: string[]
): Promise<{
  bytes: Uint8Array;
  integrityHash: string;
  cardCount: number;
  myCardCount: number;
  vaultCardCount: number;
}> {
  const safeCards = Array.isArray(cards) ? cards : [];
  const resolvedCategories =
    Array.isArray(categories) && categories.length > 0
      ? categories
      : loadVaultCategories(safeCards);
  const cardThemeMap = loadCardThemeMap();
  const baseBody = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    cards: safeCards,
    categories: resolvedCategories,
    ...(Object.keys(cardThemeMap).length > 0 ? { cardThemeMap } : {}),
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(baseBody));
  const integrityHash = await computeSha256Hex(jsonBytes);
  const myCardCount = safeCards.filter((c) => Boolean(c.isMyCard)).length;

  return {
    bytes: jsonBytes,
    integrityHash,
    cardCount: safeCards.length,
    myCardCount,
    vaultCardCount: safeCards.length - myCardCount,
  };
}

export function startP2PSender(options: StartP2PSenderOptions): P2PTransferSession {
  const roomId = generateP2PRoomId();
  const pairingUrl = buildP2PPairingUrl(roomId);

  if (!isWebRTCP2PSupported()) {
    options.onStatusChange?.('error');
    options.onError?.('이 브라우저는 WebRTC P2P 직접 전송을 지원하지 않습니다.');
    return { roomId, pairingUrl, close: () => {} };
  }

  let closed = false;
  const abortController = new AbortController();
  let pollTimer: number | null = null;
  let ackTimeoutTimer: number | null = null;
  let pc: RTCPeerConnection | null = null;
  let dc: RTCDataChannel | null = null;
  let transferStarted = false;
  let transferCompleted = false;
  let remoteDescSet = false;
  const pendingIceCandidates: P2PIceCandidateSignal[] = [];
  const appliedRemoteIceKeys = new Set<string>();

  const cleanupTimers = () => {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
    if (ackTimeoutTimer !== null) {
      window.clearTimeout(ackTimeoutTimer);
      ackTimeoutTimer = null;
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    cleanupTimers();
    abortController.abort();
    try {
      dc?.close();
    } catch {
      // ignore
    }
    try {
      pc?.close();
    } catch {
      // ignore
    }
    dc = null;
    pc = null;
  };

  const fail = (message: string, status: P2PConnectionStatus = 'error') => {
    if (closed || transferCompleted) return;
    cleanupTimers();
    options.onStatusChange?.(status);
    options.onError?.(message);
  };

  const flushPendingIce = async () => {
    if (!pc || !remoteDescSet) return;
    while (pendingIceCandidates.length > 0) {
      const candidate = pendingIceCandidates.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale ICE candidate errors
      }
    }
  };

  const streamPayloadOverDataChannel = async () => {
    if (!dc || transferStarted || closed) return;
    transferStarted = true;
    options.onStatusChange?.('connected');

    try {
      const serialized = await serializeVaultForP2P(options.cards, options.categories);
      if (closed || dc.readyState !== 'open') return;

      const totalBytes = serialized.bytes.byteLength;
      const totalChunks = Math.max(1, Math.ceil(totalBytes / P2P_CHUNK_SIZE_BYTES));

      const metaFrame: P2PMetaControlFrame = {
        kind: 'eerum-p2p-meta',
        totalBytes,
        totalChunks,
        integrityHash: serialized.integrityHash,
        cardCount: serialized.cardCount,
        myCardCount: serialized.myCardCount,
        vaultCardCount: serialized.vaultCardCount,
      };
      dc.send(JSON.stringify(metaFrame));
      options.onStatusChange?.('transferring');
      options.onProgress?.(0, 0, totalBytes);

      let offset = 0;
      while (offset < totalBytes) {
        if (closed || dc.readyState !== 'open') {
          throw new Error('상대 기기와의 P2P 연결이 중단되었습니다.');
        }
        await waitForDataChannelDrain(dc, () => closed);

        const end = Math.min(offset + P2P_CHUNK_SIZE_BYTES, totalBytes);
        const slice = serialized.bytes.slice(offset, end);
        dc.send(slice.buffer);
        offset = end;

        const pct = totalBytes === 0 ? 100 : Math.min(99, Math.round((offset / totalBytes) * 100));
        options.onProgress?.(pct, offset, totalBytes);
      }

      const eofFrame: P2PEofControlFrame = {
        kind: 'eerum-p2p-eof',
        totalBytes,
        integrityHash: serialized.integrityHash,
      };
      dc.send(JSON.stringify(eofFrame));

      // Fallback completion if ACK packet drops right after EOF
      ackTimeoutTimer = window.setTimeout(() => {
        if (closed || transferCompleted) return;
        transferCompleted = true;
        cleanupTimers();
        options.onProgress?.(100, totalBytes, totalBytes);
        options.onStatusChange?.('completed');
        options.onComplete?.({
          cardCount: serialized.cardCount,
          totalBytes,
          integrityHash: serialized.integrityHash,
        });
      }, 4500);

      dc.onmessage = (event) => {
        if (typeof event.data !== 'string' || closed || transferCompleted) return;
        try {
          const msg = JSON.parse(event.data) as P2PControlFrame;
          if (msg.kind === 'eerum-p2p-ack') {
            if (msg.verified) {
              transferCompleted = true;
              cleanupTimers();
              options.onProgress?.(100, totalBytes, totalBytes);
              options.onStatusChange?.('completed');
              options.onComplete?.({
                cardCount: serialized.cardCount,
                totalBytes,
                integrityHash: serialized.integrityHash,
              });
            } else {
              fail(msg.error || '수신 기기에서 무결성 검증에 실패했습니다.');
            }
          }
        } catch {
          // Ignore malformed control frame
        }
      };
    } catch (err) {
      fail(err instanceof Error ? err.message : 'P2P 데이터 전송 중 오류가 발생했습니다.');
    }
  };

  void (async () => {
    try {
      options.onStatusChange?.('initializing');
      pc = new RTCPeerConnection(P2P_STUN_CONFIG);
      dc = pc.createDataChannel(P2P_DATA_CHANNEL_NAME, { ordered: true });
      dc.binaryType = 'arraybuffer';

      dc.onopen = () => {
        void streamPayloadOverDataChannel();
      };
      dc.onerror = () => {
        if (!transferCompleted) {
          fail('P2P 데이터 채널 연결에 실패했습니다.');
        }
      };
      dc.onclose = () => {
        if (!closed && !transferCompleted && transferStarted) {
          fail('전송 완료 전 P2P 연결이 닫혔습니다.');
        }
      };

      pc.onicecandidate = (event) => {
        if (closed || !event.candidate) return;
        const candJson = event.candidate.toJSON();
        if (!candJson.candidate) return;
        void postSignal(
          roomId,
          'sender',
          'ice',
          {
            candidate: candJson.candidate,
            sdpMid: candJson.sdpMid ?? null,
            sdpMLineIndex: candJson.sdpMLineIndex ?? null,
            usernameFragment: candJson.usernameFragment ?? null,
          },
          abortController.signal
        ).catch(() => {
          // Ignore ICE publish failures after close/expiry
        });
      };

      pc.onconnectionstatechange = () => {
        if (closed || !pc) return;
        if (pc.connectionState === 'failed') {
          fail('방화벽 또는 네트워크 환경으로 P2P 직접 연결에 실패했습니다.');
        }
      };

      const offer = await pc.createOffer();
      if (closed) return;
      await pc.setLocalDescription(offer);
      if (closed || !pc.localDescription?.sdp) return;

      const published = await postSignal(
        roomId,
        'sender',
        'offer',
        {
          type: 'offer',
          sdp: pc.localDescription.sdp,
        },
        abortController.signal
      );

      if (closed || !published.success) return;
      options.onRoomReady?.({
        roomId,
        pairingUrl,
        expiresAt: published.expiresAt,
      });
      options.onStatusChange?.('waiting');

      pollTimer = window.setInterval(() => {
        if (closed || transferCompleted) return;
        void (async () => {
          try {
            const { status, data } = await fetchSignal(roomId, 'sender', abortController.signal);
            if (closed) return;
            if (status === 404 || !data || !data.success) {
              if (!transferStarted) {
                fail(
                  '연결 코드 유효 시간(60초)이 만료되었습니다. 새 코드를 생성해 주세요.',
                  'expired'
                );
              }
              return;
            }

            if (data.answer && !remoteDescSet && pc) {
              options.onStatusChange?.('connecting');
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              remoteDescSet = true;
              await flushPendingIce();
            }

            for (const cand of data.iceCandidates) {
              const key = iceCandidateKey(cand);
              if (appliedRemoteIceKeys.has(key)) continue;
              appliedRemoteIceKeys.add(key);
              if (remoteDescSet && pc) {
                await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
              } else {
                pendingIceCandidates.push(cand);
              }
            }
          } catch {
            // Transient poll error; next tick retries until TTL expiry
          }
        })();
      }, P2P_POLL_INTERVAL_MS);
    } catch (err) {
      if (!closed) {
        fail(err instanceof Error ? err.message : 'P2P 연결을 초기화할 수 없습니다.');
      }
    }
  })();

  return { roomId, pairingUrl, close };
}

export function joinP2PReceiver(options: JoinP2PReceiverOptions): P2PTransferSession {
  const roomId = options.roomId.trim();
  const pairingUrl = buildP2PPairingUrl(roomId);

  if (!isValidP2PRoomId(roomId)) {
    options.onStatusChange?.('error');
    options.onError?.('올바른 P2P 연결 코드 형식이 아닙니다.');
    return { roomId, pairingUrl, close: () => {} };
  }

  if (!isWebRTCP2PSupported()) {
    options.onStatusChange?.('error');
    options.onError?.('이 브라우저는 WebRTC P2P 직접 수신을 지원하지 않습니다.');
    return { roomId, pairingUrl, close: () => {} };
  }

  let closed = false;
  const abortController = new AbortController();
  let pollTimer: number | null = null;
  let pc: RTCPeerConnection | null = null;
  let activeChannel: RTCDataChannel | null = null;
  let remoteDescSet = false;
  let transferCompleted = false;
  const appliedRemoteIceKeys = new Set<string>();

  const cleanupTimers = () => {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    cleanupTimers();
    abortController.abort();
    try {
      activeChannel?.close();
    } catch {
      // ignore
    }
    try {
      pc?.close();
    } catch {
      // ignore
    }
    activeChannel = null;
    pc = null;
  };

  const fail = (message: string, status: P2PConnectionStatus = 'error') => {
    if (closed || transferCompleted) return;
    cleanupTimers();
    options.onStatusChange?.(status);
    options.onError?.(message);
  };

  const setupReceiverChannel = (dc: RTCDataChannel) => {
    activeChannel = dc;
    dc.binaryType = 'arraybuffer';

    let expectedBytes = 0;
    let expectedHash = '';
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    dc.onopen = () => {
      if (!closed) {
        options.onStatusChange?.('connected');
      }
    };

    dc.onmessage = (event) => {
      if (closed || transferCompleted) return;

      if (typeof event.data === 'string') {
        void (async () => {
          try {
            const frame = JSON.parse(event.data) as P2PControlFrame;
            if (frame.kind === 'eerum-p2p-meta') {
              expectedBytes = frame.totalBytes;
              expectedHash = frame.integrityHash;
              receivedBytes = 0;
              chunks.length = 0;
              options.onStatusChange?.('transferring');
              options.onMeta?.({
                totalBytes: frame.totalBytes,
                cardCount: frame.cardCount,
                myCardCount: frame.myCardCount,
                vaultCardCount: frame.vaultCardCount,
              });
              options.onProgress?.(0, 0, expectedBytes);
            } else if (frame.kind === 'eerum-p2p-eof') {
              const targetHash = frame.integrityHash || expectedHash;
              const merged = new Uint8Array(receivedBytes);
              let pos = 0;
              for (const chunk of chunks) {
                merged.set(chunk, pos);
                pos += chunk.byteLength;
              }

              if (frame.totalBytes !== merged.byteLength) {
                const errMsg = '전송된 바이트 크기가 일치하지 않습니다.';
                try {
                  dc.send(JSON.stringify({ kind: 'eerum-p2p-ack', verified: false, error: errMsg }));
                } catch {
                  // ignore
                }
                fail(errMsg);
                return;
              }

              const actualHash = await computeSha256Hex(merged);
              if (targetHash && actualHash !== targetHash.toLowerCase()) {
                const errMsg = 'SHA-256 무결성 검증에 실패했습니다.';
                try {
                  dc.send(JSON.stringify({ kind: 'eerum-p2p-ack', verified: false, error: errMsg }));
                } catch {
                  // ignore
                }
                fail(errMsg);
                return;
              }

              const decodedText = new TextDecoder().decode(merged);
              const rawObj = JSON.parse(decodedText) as Record<string, unknown>;
              const validated = validateBackupPayload(rawObj);

              const transferPayload: P2PVaultTransferPayload = {
                version: 1,
                exportedAt: validated.exportedAt,
                cards: validated.cards,
                categories: validated.categories,
                ...(validated.cardThemeMap ? { cardThemeMap: validated.cardThemeMap } : {}),
                integrityHash: actualHash,
              };

              transferCompleted = true;
              cleanupTimers();
              try {
                dc.send(JSON.stringify({ kind: 'eerum-p2p-ack', verified: true }));
              } catch {
                // ignore
              }
              options.onProgress?.(100, merged.byteLength, merged.byteLength);
              options.onStatusChange?.('completed');
              options.onPayloadReceived(transferPayload);
            }
          } catch (err) {
            fail(
              err instanceof Error
                ? err.message
                : '수신한 P2P 보관함 데이터를 검증하지 못했습니다.'
            );
          }
        })();
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        const chunk = new Uint8Array(event.data);
        chunks.push(chunk);
        receivedBytes += chunk.byteLength;
        const pct =
          expectedBytes > 0
            ? Math.min(99, Math.round((receivedBytes / expectedBytes) * 100))
            : 0;
        options.onProgress?.(pct, receivedBytes, expectedBytes);
      }
    };

    dc.onerror = () => {
      if (!transferCompleted) {
        fail('P2P 수신 채널 오류가 발생했습니다.');
      }
    };
  };

  void (async () => {
    try {
      options.onStatusChange?.('connecting');
      pc = new RTCPeerConnection(P2P_STUN_CONFIG);

      pc.ondatachannel = (event) => {
        if (event.channel.label === P2P_DATA_CHANNEL_NAME || !activeChannel) {
          setupReceiverChannel(event.channel);
        }
      };

      pc.onicecandidate = (event) => {
        if (closed || !event.candidate) return;
        const candJson = event.candidate.toJSON();
        if (!candJson.candidate) return;
        void postSignal(
          roomId,
          'receiver',
          'ice',
          {
            candidate: candJson.candidate,
            sdpMid: candJson.sdpMid ?? null,
            sdpMLineIndex: candJson.sdpMLineIndex ?? null,
            usernameFragment: candJson.usernameFragment ?? null,
          },
          abortController.signal
        ).catch(() => {});
      };

      pc.onconnectionstatechange = () => {
        if (closed || !pc) return;
        if (pc.connectionState === 'failed') {
          fail('방화벽 또는 네트워크 환경으로 P2P 직접 연결에 실패했습니다.');
        }
      };

      const { status, data } = await fetchSignal(roomId, 'receiver', abortController.signal);
      if (closed) return;

      if (status === 404 || !data || !data.success || !data.offer) {
        fail('P2P 연결 코드가 만료되었거나 송신 기기가 대기 중이 아닙니다.', 'expired');
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      remoteDescSet = true;

      for (const cand of data.iceCandidates) {
        const key = iceCandidateKey(cand);
        if (appliedRemoteIceKeys.has(key)) continue;
        appliedRemoteIceKeys.add(key);
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }

      const answer = await pc.createAnswer();
      if (closed) return;
      await pc.setLocalDescription(answer);
      if (closed || !pc.localDescription?.sdp) return;

      await postSignal(
        roomId,
        'receiver',
        'answer',
        {
          type: 'answer',
          sdp: pc.localDescription.sdp,
        },
        abortController.signal
      );

      pollTimer = window.setInterval(() => {
        if (closed || transferCompleted || activeChannel?.readyState === 'open') return;
        void (async () => {
          try {
            const pollRes = await fetchSignal(roomId, 'receiver', abortController.signal);
            if (closed) return;
            if (pollRes.status === 404 || !pollRes.data || !pollRes.data.success) {
              if (!activeChannel) {
                fail('연결 시간이 만료되었습니다. 송신 기기에서 새 QR 코드를 생성해 주세요.', 'expired');
              }
              return;
            }
            if (remoteDescSet && pc) {
              for (const cand of pollRes.data.iceCandidates) {
                const key = iceCandidateKey(cand);
                if (appliedRemoteIceKeys.has(key)) continue;
                appliedRemoteIceKeys.add(key);
                await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
              }
            }
          } catch {
            // Retry on next poll
          }
        })();
      }, P2P_POLL_INTERVAL_MS);
    } catch (err) {
      if (!closed) {
        fail(err instanceof Error ? err.message : '송신 기기와 P2P 연결을 맺지 못했습니다.');
      }
    }
  })();

  return { roomId, pairingUrl, close };
}
