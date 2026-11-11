import { CardData, CardTheme, StoredCard } from '../types/card';
import { CARD_DATA } from '../constants/sampleCards';

export { CARD_DATA };

export const APP_BASE_DOMAIN = 'eerum.goguma.app';
export const APP_BASE_URL = `https://${APP_BASE_DOMAIN}`;

export interface CardJsonEnvelope {
  schemaVersion: '1.0';
  exportedAt: string;
  card: StoredCard;
}

/**
 * Universal Card Serializer & Formatter
 * Unifies domain resolutions, public slug routing, and local vault normalization.
 * Heavy export routines (vCard, Standalone HTML) are separated in cardExporter.ts for zero-overhead initial load.
 */
export class CardSerializer {
  /**
   * Domain Normalization & Sanitization
   */
  static normalizeDomain(domain: string): string {
    return domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
  }

  /**
   * Checks whether a hostname belongs to the application studio platform (not a custom user domain)
   */
  static isPlatformHost(hostname?: string): boolean {
    if (typeof window === 'undefined' && !hostname) return true;
    const host = (hostname ?? window.location.hostname).toLowerCase();
    return (
      host === APP_BASE_DOMAIN ||
      host === 'card.goguma.app' ||
      host === 'localhost' ||
      host.includes('127.0.0.1') ||
      host.includes('.run.app') ||
      host.includes('.web.app') ||
      host.includes('.firebaseapp.com') ||
      host.includes('.workers.dev') ||
      host.includes('.pages.dev') ||
      host.includes('.vercel.app') ||
      host.includes('.netlify.app')
    );
  }

  /**
   * Generates canonical public URL for sharing
   */
  static getShareUrl(card: StoredCard): string {
    if (!card.isMyCard) {
      const extUrl = (card.data?.website || '').trim();
      if (extUrl) {
        return /^https?:\/\//i.test(extUrl) ? extUrl : `https://${extUrl}`;
      }
    }

    if (card.customDomain && card.customDomain.trim()) {
      const cleanDomain = this.normalizeDomain(card.customDomain);
      return `https://${cleanDomain}`;
    }
    const slug = card.slug || card.id;

    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      if (
        host.includes('.run.app') ||
        host === 'localhost' ||
        host.includes('127.0.0.1') ||
        host.includes('.workers.dev') ||
        host.includes('.pages.dev')
      ) {
        return `${window.location.origin}/card/${slug}`;
      }
    }

    return `${APP_BASE_URL}/card/${slug}`;
  }

  /**
   * Clean display-friendly domain URL
   */
  static getDisplayUrl(card: StoredCard): string {
    if (!card.isMyCard) {
      const ext = (card.data?.websiteDisplay || card.data?.website || '').trim();
      return ext.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
    if (card.customDomain && card.customDomain.trim()) {
      return this.normalizeDomain(card.customDomain);
    }
    const slug = card.slug || card.id;
    return `${APP_BASE_DOMAIN}/card/${slug}`;
  }

  /**
   * Extracts clean card slug from URL or input string
   */
  static parseSlugFromInput(rawInput: string): string | null {
    if (!rawInput || typeof rawInput !== 'string') return null;
    const trimmed = rawInput.trim();

    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const parsed = new URL(trimmed);
        const cardMatch = parsed.pathname.match(/^\/card\/([a-zA-Z0-9_-]+)/i);
        if (cardMatch && cardMatch[1]) return cardMatch[1].toLowerCase();
        const pathSegments = parsed.pathname.split('/').filter(Boolean);
        if (pathSegments.length === 1) return pathSegments[0].toLowerCase();
      }
    } catch {
      // Fallback to regex parsing
    }

    const cardRouteMatch = trimmed.match(/(?:^|\/)card\/([a-zA-Z0-9_-]+)(?:\/|\?|#|$)/i);
    if (cardRouteMatch && cardRouteMatch[1]) return cardRouteMatch[1].toLowerCase();

    const cleanSegment = trimmed
      .replace(/^https?:\/\//i, '')
      .replace(/^[a-zA-Z0-9.-]+\//i, '')
      .replace(/[/?#].*$/, '')
      .trim();

    if (/^[a-zA-Z0-9_-]+$/.test(cleanSegment)) {
      return cleanSegment.toLowerCase();
    }

    return null;
  }

  /**
   * Extracts slug from current browser location
   */
  static getRouteSlug(): string | null {
    if (typeof window === 'undefined') return null;

    const pathname = window.location.pathname;
    const cardMatch = pathname.match(/^\/card\/([a-zA-Z0-9_-]+)/i);
    if (cardMatch && cardMatch[1]) {
      return cardMatch[1].toLowerCase();
    }

    const searchParams = new URLSearchParams(window.location.search);
    const cardParam = searchParams.get('card') || searchParams.get('slug');
    if (cardParam && /^[a-zA-Z0-9_-]+$/.test(cardParam.trim())) {
      return cardParam.trim().toLowerCase();
    }

    const normalizedPath = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    const reservedRoutes = new Set([
      '',
      'api',
      'card',
      'vault',
      'scan',
      'my-card',
      'settings',
      'index.html',
    ]);

    if (
      normalizedPath &&
      !reservedRoutes.has(normalizedPath) &&
      !normalizedPath.includes('/') &&
      !normalizedPath.includes('.')
    ) {
      return normalizedPath;
    }
    return null;
  }

  /**
   * Checks whether the current path is a public view slug or custom domain
   */
  static isPublicSlugRoute(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.getRouteSlug()) return true;
    return !this.isPlatformHost();
  }

  /**
   * Strictly resolves a card ONLY when the current URL explicitly targets a public slug or custom domain.
   * Returns null on internal studio/vault root routes (`/`).
   */
  static resolvePublicRouteCard(cards: StoredCard[], fallbackCards: StoredCard[] = []): StoredCard | null {
    if (typeof window === 'undefined') return null;
    const pool = [...cards, ...fallbackCards];
    if (pool.length === 0) return null;

    const hostname = window.location.hostname.toLowerCase();
    if (!this.isPlatformHost(hostname)) {
      const matchedCustom = pool.find((c) => {
        if (!c.customDomain) return false;
        return this.normalizeDomain(c.customDomain) === hostname;
      });
      if (matchedCustom) return matchedCustom;
    }

    const routeSlug = this.getRouteSlug();
    if (routeSlug) {
      const matchedBySlug = pool.find(
        (c) => c.slug && c.slug.toLowerCase() === routeSlug
      );
      if (matchedBySlug) return matchedBySlug;

      const matchedById = pool.find(
        (c) => c.id.toLowerCase() === routeSlug
      );
      if (matchedById) return matchedById;
    }

    return null;
  }

  /**
   * Resolves card by inspecting custom domain, URL query parameters, and pathname,
   * falling back to the user's default personal card.
   */
  static resolveFromLocation(cards: StoredCard[], fallbackCards: StoredCard[] = []): StoredCard | null {
    const routeMatched = this.resolvePublicRouteCard(cards, fallbackCards);
    if (routeMatched) return routeMatched;

    const defaultCard =
      cards.find((c) => c.isMyCard && c.isDefault) ||
      cards.find((c) => c.isMyCard) ||
      cards[0] ||
      fallbackCards[0];
    return defaultCard || null;
  }

  /**
   * Sanitizes and clones an external/shared or scanned StoredCard for safe storage in the user's Vault.
   * Strips ownership flags (`isMyCard`, `isDefault`, `owner_key`, `slug`, `customDomain`) so it can never
   * overwrite the user's own personal cards or hijack public slug routing.
   */
  static sanitizeCardForVault(
    sourceCard: StoredCard,
    overrides?: Partial<StoredCard>
  ): StoredCard {
    const nowDate = new Date().toISOString().split('T')[0];
    const sourceShareUrl =
      sourceCard.data?.website ||
      (sourceCard.slug ? `${APP_BASE_URL}/card/${sourceCard.slug}` : '');
    const sourceDisplayUrl =
      sourceCard.data?.websiteDisplay ||
      (sourceShareUrl ? sourceShareUrl.replace(/^https?:\/\//, '') : '');

    const vaultId =
      overrides?.id ||
      (sourceCard.id.startsWith('photo-card-') || sourceCard.id.startsWith('vault-card-')
        ? sourceCard.id
        : `vault-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

    return {
      ...sourceCard,
      ...overrides,
      id: vaultId,
      isMyCard: false,
      isDefault: false,
      owner_key: undefined,
      slug: undefined,
      customDomain: undefined,
      category: overrides?.category || sourceCard.category || 'VIP 파트너',
      createdAt: overrides?.createdAt || sourceCard.createdAt || nowDate,
      created_at: sourceCard.created_at || new Date().toISOString(),
      data: {
        ...sourceCard.data,
        ...(overrides?.data || {}),
        website: overrides?.data?.website ?? sourceShareUrl,
        websiteDisplay: overrides?.data?.websiteDisplay ?? sourceDisplayUrl,
      },
      html_front: sourceCard.html_front,
      html_back: sourceCard.html_back,
    };
  }

  /**
   * Safely parses JSON envelope export format into StoredCard
   */
  static fromJsonEnvelope(rawJson: string): StoredCard | null {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed === 'object') {
        if (parsed.card && typeof parsed.card === 'object') {
          return parsed.card as StoredCard;
        }
        if (parsed.id && parsed.data) {
          return parsed as StoredCard;
        }
      }
    } catch {
      // Ignore invalid JSON
    }
    return null;
  }

  /**
   * Serializes StoredCard to portable JSON envelope
   */
  static toJsonEnvelope(card: StoredCard): string {
    const envelope: CardJsonEnvelope = {
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      card,
    };
    return JSON.stringify(envelope, null, 2);
  }
}

// Ergonomic functional exports
export const normalizeDomain = (domain: string): string => CardSerializer.normalizeDomain(domain);
export const isPlatformHost = (hostname?: string): boolean => CardSerializer.isPlatformHost(hostname);
export const parseSlugFromInput = (rawInput: string): string | null => CardSerializer.parseSlugFromInput(rawInput);
export const getRouteSlug = (): string | null => CardSerializer.getRouteSlug();
export const isPublicSlugRoute = (): boolean => CardSerializer.isPublicSlugRoute();
export const getCardShareUrl = (card: StoredCard): string => CardSerializer.getShareUrl(card);
export const getCardDisplayUrl = (card: StoredCard): string => CardSerializer.getDisplayUrl(card);
export const resolvePublicRouteCard = (cards: StoredCard[], fallbackCards: StoredCard[] = []): StoredCard | null =>
  CardSerializer.resolvePublicRouteCard(cards, fallbackCards);
export const resolveCardFromLocation = (cards: StoredCard[], fallbackCards: StoredCard[] = []): StoredCard | null =>
  CardSerializer.resolveFromLocation(cards, fallbackCards);
export const sanitizeCardForVault = (sourceCard: StoredCard, overrides?: Partial<StoredCard>): StoredCard =>
  CardSerializer.sanitizeCardForVault(sourceCard, overrides);
