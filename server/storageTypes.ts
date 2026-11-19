import type { CardCreationMode, CardData, CardTheme, StoredCard } from '../src/types/card.ts';
import { sanitizeExternalUrl } from '../src/utils/sanitizeUrl.ts';

export interface D1PreparedStatementLike {
  bind: (...values: Array<string | number | null>) => D1PreparedStatementLike;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
  run: () => Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare: (query: string) => D1PreparedStatementLike;
}

export interface CardDbRow {
  id: string;
  slug: string;
  custom_domain?: string | null;
  owner_key?: string | null;
  owner_key_hash?: string | null;
  owner_email?: string | null;
  creation_mode?: string | null;
  theme?: string | null;
  category?: string | null;
  is_my_card?: number | null;
  is_default?: number | null;
  view_count?: number | null;
  notes?: string | null;
  data?: unknown;
  extra_json?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CardAuthRecord {
  id: string;
  slug: string;
  ownerKeyHash: string | null;
}

export interface CardViewMeta {
  referrer?: string | null;
  country?: string | null;
  userAgent?: string | null;
}

export interface UpsertCardRecordInput {
  id: string;
  slug: string;
  customDomain: string | null;
  ownerKeyHash: string;
  ownerEmail: string | null;
  creationMode: 'template' | 'custom_html' | 'photo';
  theme: string;
  category: string;
  isMyCard: boolean;
  isDefault: boolean;
  notes: string | null;
  dataJson: string;
  extraJson: string;
}

export interface CardStorageAdapter {
  readonly kind: 'd1' | 'sqlite';
  init(): Promise<void>;
  getCardBySlug(slug: string): Promise<StoredCard | null>;
  getCardByDomain(domain: string): Promise<StoredCard | null>;
  getCardAuthBySlug(slug: string): Promise<CardAuthRecord | null>;
  getCardAuthById(id: string): Promise<CardAuthRecord | null>;
  listPublicCards(limit?: number): Promise<StoredCard[]>;
  upsertCard(input: UpsertCardRecordInput): Promise<void>;
  recordCardView(cardId: string, meta?: CardViewMeta): Promise<void>;
  getCardViewCount(cardId: string): Promise<number>;
  getWallet(syncId: string): Promise<StoredCard[]>;
  saveWallet(syncId: string, cards: StoredCard[]): Promise<void>;
  close?(): Promise<void> | void;
}

const textEncoder = new TextEncoder();

/**
 * Computes lowercase hex SHA-256 hash using Web Crypto API (Node 22 + Cloudflare Workers compatible).
 */
export async function hashOwnerKeySha256(ownerKey: string): Promise<string> {
  const bytes = textEncoder.encode(ownerKey);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const view = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < view.length; i++) {
    hex += view[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Constant-time string comparison to avoid timing leaks on SHA-256 hex digest verification.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const codeA = i < a.length ? a.charCodeAt(i) : 0;
    const codeB = i < b.length ? b.charCodeAt(i) : 0;
    diff |= codeA ^ codeB;
  }
  return diff === 0;
}

export function normalizeDbCreationMode(mode: unknown): 'template' | 'custom_html' | 'photo' {
  if (mode === 'photo') return 'photo';
  if (mode === 'custom_html' || mode === 'custom') return 'custom_html';
  return 'template';
}

export function sanitizeCardDataForStorage(rawData: unknown): CardData {
  const base =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData)
      ? ({ ...(rawData as Record<string, unknown>) } as Partial<CardData>)
      : {};

  const rawWebsite = typeof base.website === 'string' ? base.website : '';
  const safeWebsite = rawWebsite ? sanitizeExternalUrl(rawWebsite) : '';
  const safeWebsiteDisplay =
    rawWebsite && !safeWebsite
      ? ''
      : typeof base.websiteDisplay === 'string'
        ? base.websiteDisplay
        : '';

  const safeGoogleMapsUrl =
    typeof base.googleMapsUrl === 'string' && base.googleMapsUrl
      ? sanitizeExternalUrl(base.googleMapsUrl)
      : '';
  const safeNaverMapsUrl =
    typeof base.naverMapsUrl === 'string' && base.naverMapsUrl
      ? sanitizeExternalUrl(base.naverMapsUrl)
      : '';

  return {
    organization: typeof base.organization === 'string' ? base.organization : '',
    organizationKr: typeof base.organizationKr === 'string' ? base.organizationKr : '',
    subOrg: typeof base.subOrg === 'string' ? base.subOrg : undefined,
    name: typeof base.name === 'string' ? base.name : '',
    nameEn: typeof base.nameEn === 'string' ? base.nameEn : undefined,
    nameKr: typeof base.nameKr === 'string' ? base.nameKr : '',
    title: typeof base.title === 'string' ? base.title : '',
    titleKr: typeof base.titleKr === 'string' ? base.titleKr : '',
    phone: typeof base.phone === 'string' ? base.phone : '',
    phoneRaw: typeof base.phoneRaw === 'string' ? base.phoneRaw : '',
    whatsappUrl: typeof base.whatsappUrl === 'string' ? base.whatsappUrl : '',
    linkedinUrl: typeof base.linkedinUrl === 'string' ? base.linkedinUrl : undefined,
    email: typeof base.email === 'string' ? base.email : '',
    website: safeWebsite,
    websiteDisplay: safeWebsiteDisplay,
    addressLines: Array.isArray(base.addressLines)
      ? base.addressLines.filter((l): l is string => typeof l === 'string')
      : [],
    addressKr: typeof base.addressKr === 'string' ? base.addressKr : '',
    address_en: typeof base.address_en === 'string' ? base.address_en : undefined,
    addressEn: typeof base.addressEn === 'string' ? base.addressEn : undefined,
    details:
      base.details && typeof base.details === 'object' ? base.details : undefined,
    googleMapsUrl: safeGoogleMapsUrl,
    naverMapsUrl: safeNaverMapsUrl,
    backTitle: typeof base.backTitle === 'string' ? base.backTitle : undefined,
    backSubtitle: typeof base.backSubtitle === 'string' ? base.backSubtitle : undefined,
    backTagline: typeof base.backTagline === 'string' ? base.backTagline : undefined,
    backHqAddress: typeof base.backHqAddress === 'string' ? base.backHqAddress : undefined,
  };
}

export function buildUpsertInputFromPayload(
  payload: Record<string, unknown>,
  validId: string,
  validSlug: string,
  normalizedCustomDomain: string | null,
  ownerKeyHash: string
): UpsertCardRecordInput {
  let parsedDataInput: unknown = payload.data;
  if (typeof parsedDataInput === 'string') {
    try {
      parsedDataInput = JSON.parse(parsedDataInput);
    } catch {
      parsedDataInput = {};
    }
  }

  const sanitizedData = sanitizeCardDataForStorage(parsedDataInput);
  const extraPayload: Record<string, unknown> = {};
  const extraKeys: Array<keyof StoredCard> = [
    'layout_type',
    'card_features',
    'details',
    'template_id',
    'html_front',
    'html_back',
    'front_image_url',
    'back_image_url',
    'photo_url',
    'back_photo_url',
    'scannedImage',
    'scannedImageBack',
    'isPhotoCard',
    'visualMode',
    'createdAt',
    'updatedAt',
    'created_at',
    'updated_at',
  ];

  for (const key of extraKeys) {
    if (payload[key] !== undefined) {
      extraPayload[key] = payload[key];
    }
  }

  const creationMode = normalizeDbCreationMode(payload.creation_mode);
  const theme =
    typeof payload.theme === 'string' && payload.theme.trim()
      ? payload.theme.trim().slice(0, 64)
      : 'pure_white';
  const category =
    typeof payload.category === 'string' && payload.category.trim()
      ? payload.category.trim().slice(0, 64)
      : '글로벌 네트워크';
  const ownerEmail =
    typeof payload.ownerEmail === 'string' && payload.ownerEmail.trim()
      ? payload.ownerEmail.trim().slice(0, 255)
      : typeof payload.owner_email === 'string' && payload.owner_email.trim()
        ? payload.owner_email.trim().slice(0, 255)
        : null;
  const notes =
    typeof payload.notes === 'string' ? payload.notes.slice(0, 4000) : null;

  return {
    id: validId,
    slug: validSlug,
    customDomain: normalizedCustomDomain,
    ownerKeyHash,
    ownerEmail,
    creationMode,
    theme,
    category,
    isMyCard: Boolean(payload.isMyCard ?? payload.is_my_card),
    isDefault: Boolean(payload.isDefault ?? payload.is_default),
    notes,
    dataJson: JSON.stringify(sanitizedData),
    extraJson: JSON.stringify(extraPayload),
  };
}

/**
 * Hydrates a DB row into a public StoredCard.
 * Strictly strips `owner_key` and `owner_key_hash` so secrets/hashes are never exposed publicly.
 */
export function rowToPublicStoredCard(row: CardDbRow): StoredCard {
  let parsedData: unknown = row.data;
  if (typeof parsedData === 'string') {
    try {
      parsedData = JSON.parse(parsedData);
    } catch {
      parsedData = {};
    }
  }

  let parsedExtra: Record<string, unknown> = {};
  if (typeof row.extra_json === 'string' && row.extra_json.trim()) {
    try {
      const candidate = JSON.parse(row.extra_json);
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        parsedExtra = candidate as Record<string, unknown>;
      }
    } catch {
      parsedExtra = {};
    }
  } else if (row.extra_json && typeof row.extra_json === 'object' && !Array.isArray(row.extra_json)) {
    parsedExtra = row.extra_json as Record<string, unknown>;
  }

  const sanitizedData = sanitizeCardDataForStorage(parsedData);
  const createdAtRaw =
    typeof parsedExtra.createdAt === 'string' && parsedExtra.createdAt
      ? parsedExtra.createdAt
      : row.created_at || new Date().toISOString().split('T')[0];

  const card: StoredCard = {
    ...(parsedExtra as Partial<StoredCard>),
    id: row.id,
    slug: row.slug,
    ...(row.custom_domain ? { customDomain: row.custom_domain } : {}),
    ...(row.owner_email ? { ownerEmail: row.owner_email } : {}),
    creation_mode: (row.creation_mode as CardCreationMode) || 'template',
    theme: ((row.theme as CardTheme) || 'pure_white'),
    category: row.category || '글로벌 네트워크',
    isMyCard: Boolean(row.is_my_card),
    isDefault: Boolean(row.is_default),
    ...(row.notes !== undefined && row.notes !== null ? { notes: row.notes } : {}),
    data: sanitizedData,
    createdAt: createdAtRaw,
    created_at:
      (typeof parsedExtra.created_at === 'string' ? parsedExtra.created_at : undefined) ||
      row.created_at ||
      undefined,
    updatedAt:
      (typeof parsedExtra.updatedAt === 'string' ? parsedExtra.updatedAt : undefined) ||
      row.updated_at ||
      undefined,
    updated_at: row.updated_at || undefined,
  };

  // Never expose owner credentials or hashes on public reads
  delete card.owner_key;
  delete card.ownerKey;
  delete (card as unknown as Record<string, unknown>).owner_key_hash;

  return card;
}
