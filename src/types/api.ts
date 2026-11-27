/**
 * Unified API & Edge Worker Contract Types and Helpers
 * Shared across `server.ts` (Express runtime) and `worker.ts` (Cloudflare D1 Worker)
 * to guarantee identical parameter resolution and JSON response shapes.
 */

export type ResolveMatchType = 'slug' | 'custom_domain';

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  notFound?: boolean;
}

export interface ResolveCardSuccessResponse<TCard = unknown> {
  success: true;
  card: TCard;
  matchType: ResolveMatchType;
}

export type ResolveCardResponse<TCard = unknown> =
  | ResolveCardSuccessResponse<TCard>
  | ApiErrorResponse;

export interface GetCardSuccessResponse<TCard = unknown> {
  success: true;
  card: TCard;
}

export interface ListCardsSuccessResponse<TCard = unknown> {
  success: true;
  cards: TCard[];
}

export type GetCardsResponse<TCard = unknown> =
  | GetCardSuccessResponse<TCard>
  | ListCardsSuccessResponse<TCard>
  | ApiErrorResponse;

export interface UpsertCardSuccessResponse {
  success: true;
  id: string;
  slug: string;
  ownerKey?: string;
  created?: boolean;
}

export type UpsertCardResponse = UpsertCardSuccessResponse | ApiErrorResponse;

export interface GetSyncWalletSuccessResponse<TCard = unknown> {
  success: true;
  syncId: string;
  cards: TCard[];
}

export type GetSyncWalletResponse<TCard = unknown> =
  | GetSyncWalletSuccessResponse<TCard>
  | ApiErrorResponse;

export interface PostSyncWalletSuccessResponse {
  success: true;
  syncId: string;
  count: number;
}

export type PostSyncWalletResponse =
  | PostSyncWalletSuccessResponse
  | ApiErrorResponse;

export const SYNC_ID_PATTERN = /^[a-zA-Z0-9_-]{3,64}$/;

export function isValidSyncId(value: unknown): value is string {
  return typeof value === 'string' && SYNC_ID_PATTERN.test(value.trim());
}

export function normalizeQueryToken(value: unknown, maxLen = 255): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
  if (!cleaned || cleaned.length > maxLen) return null;
  return cleaned;
}

export function isPlatformDomain(host: string, baseDomain = 'eerum.goguma.app'): boolean {
  const normalizedBase = baseDomain.toLowerCase().trim();
  const h = host.toLowerCase().trim();
  if (!h) return true;
  return (
    h === normalizedBase ||
    h === 'card.goguma.app' ||
    h.includes('localhost') ||
    h.includes('127.0.0.1') ||
    h.endsWith('.run.app') ||
    h.endsWith('.web.app') ||
    h.endsWith('.workers.dev') ||
    h.endsWith('.pages.dev')
  );
}

export function createApiError(error: string, notFound = false): ApiErrorResponse {
  return notFound
    ? { success: false, notFound: true, error, message: error }
    : { success: false, error, message: error };
}

export const P2P_ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{6,32}$/;
export const P2P_SIGNAL_TTL_MS = 60_000;
export const P2P_SIGNAL_MAX_BYTES = 32 * 1024; // Strict < 32KB limit

export type P2PSignalRole = 'sender' | 'receiver';
export type P2PSignalType = 'offer' | 'answer' | 'ice';

export interface P2PSessionDescriptionSignal {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface P2PIceCandidateSignal {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface PostP2PSignalRequest {
  roomId: string;
  role: P2PSignalRole;
  type: P2PSignalType;
  payload: P2PSessionDescriptionSignal | P2PIceCandidateSignal;
}

export interface PostP2PSignalSuccessResponse {
  success: true;
  roomId: string;
  expiresAt: number;
}

export type PostP2PSignalResponse = PostP2PSignalSuccessResponse | ApiErrorResponse;

export interface GetP2PSignalSuccessResponse {
  success: true;
  roomId: string;
  role: P2PSignalRole;
  expiresAt: number;
  offer: P2PSessionDescriptionSignal | null;
  answer: P2PSessionDescriptionSignal | null;
  iceCandidates: P2PIceCandidateSignal[];
}

export type GetP2PSignalResponse = GetP2PSignalSuccessResponse | ApiErrorResponse;

export function isValidP2PRoomId(value: unknown): value is string {
  return typeof value === 'string' && P2P_ROOM_ID_PATTERN.test(value.trim());
}

export function isValidP2PSignalRole(value: unknown): value is P2PSignalRole {
  return value === 'sender' || value === 'receiver';
}

export function isValidP2PSignalType(value: unknown): value is P2PSignalType {
  return value === 'offer' || value === 'answer' || value === 'ice';
}

const utf8ByteLength = (value: string): number => new TextEncoder().encode(value).byteLength;

export function sanitizeP2PSdpPayload(
  raw: unknown,
  expectedType: 'offer' | 'answer'
): P2PSessionDescriptionSignal | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (obj.type !== expectedType || typeof obj.sdp !== 'string') return null;
  const sdp = obj.sdp;
  if (!sdp.trim() || sdp.includes('\0')) return null;
  if (utf8ByteLength(sdp) > 28 * 1024) return null;
  if (!/^v=\d+/m.test(sdp)) return null;
  return { type: expectedType, sdp };
}

export function sanitizeP2PIcePayload(raw: unknown): P2PIceCandidateSignal | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.candidate !== 'string' || obj.candidate.includes('\0')) return null;
  if (utf8ByteLength(obj.candidate) > 4096) return null;
  if (obj.candidate.length > 0 && !obj.candidate.startsWith('candidate:')) return null;

  const result: P2PIceCandidateSignal = {
    candidate: obj.candidate,
  };

  if (obj.sdpMid !== undefined) {
    if (obj.sdpMid !== null && (typeof obj.sdpMid !== 'string' || obj.sdpMid.length > 128)) {
      return null;
    }
    result.sdpMid = obj.sdpMid;
  }

  if (obj.sdpMLineIndex !== undefined) {
    if (
      obj.sdpMLineIndex !== null &&
      (typeof obj.sdpMLineIndex !== 'number' ||
        !Number.isInteger(obj.sdpMLineIndex) ||
        obj.sdpMLineIndex < 0 ||
        obj.sdpMLineIndex > 65535)
    ) {
      return null;
    }
    result.sdpMLineIndex = obj.sdpMLineIndex;
  }

  if (obj.usernameFragment !== undefined) {
    if (
      obj.usernameFragment !== null &&
      (typeof obj.usernameFragment !== 'string' || obj.usernameFragment.length > 256)
    ) {
      return null;
    }
    result.usernameFragment = obj.usernameFragment;
  }

  return result;
}

