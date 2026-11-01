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

export function isPlatformDomain(host: string, baseDomain = 'card.goguma.app'): boolean {
  const normalizedBase = baseDomain.toLowerCase().trim();
  const h = host.toLowerCase().trim();
  if (!h) return true;
  return (
    h === normalizedBase ||
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
