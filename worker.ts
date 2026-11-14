/**
 * Production Serverless Edge Worker for Korean Center Digital Card Studio
 * Configured as the single authoritative serverless entry point via wrangler.toml (main = "worker.ts").
 * Enforces Zero-Trust parameter binding on Cloudflare D1 with zero string concatenation.
 */

import {
  createApiError,
  isPlatformDomain,
  isValidSyncId,
  normalizeQueryToken,
  type GetCardsResponse,
  type GetSyncWalletResponse,
  type PostSyncWalletResponse,
  type ResolveCardResponse,
  type ResolveMatchType,
  type UpsertCardResponse,
} from './src/types/api';

export interface D1PreparedStatementLike {
  bind: (...values: Array<string | number | null>) => D1PreparedStatementLike;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
  run: () => Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare: (query: string) => D1PreparedStatementLike;
}

export interface D1CardRow {
  id: string;
  slug: string;
  custom_domain?: string | null;
  owner_key?: string | null;
  theme?: string | null;
  data?: unknown;
  updated_at?: string;
}

export interface D1WalletRow {
  cards_json?: string | null;
}

export interface CardUpsertPayload {
  id?: unknown;
  slug?: unknown;
  customDomain?: unknown;
  custom_domain?: unknown;
  owner_key?: unknown;
  theme?: unknown;
  data?: unknown;
  isMyCard?: unknown;
}

export interface SyncWalletPayload {
  syncId?: unknown;
  cards?: unknown;
}

export interface Env {
  DB: D1DatabaseLike;
  R2?: unknown;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  BASE_DOMAIN?: string;
}

// Static Prepared SQL Statements (Strictly Zero String Concatenation)
const SQL_SELECT_CARD_BY_DOMAIN = 'SELECT * FROM cards WHERE custom_domain = ? LIMIT 1';
const SQL_SELECT_CARD_BY_SLUG = 'SELECT * FROM cards WHERE slug = ? LIMIT 1';
const SQL_SELECT_RECENT_CARDS = 'SELECT * FROM cards ORDER BY updated_at DESC LIMIT 50';
const SQL_UPSERT_CARD = `
  INSERT INTO cards (id, slug, custom_domain, owner_key, theme, data, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET
    slug = excluded.slug,
    custom_domain = excluded.custom_domain,
    theme = excluded.theme,
    data = excluded.data,
    updated_at = CURRENT_TIMESTAMP
`;
const SQL_SELECT_WALLET = 'SELECT cards_json FROM wallets WHERE sync_id = ? LIMIT 1';
const SQL_UPSERT_WALLET = `
  INSERT INTO wallets (sync_id, cards_json, updated_at)
  VALUES (?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(sync_id) DO UPDATE SET
    cards_json = excluded.cards_json,
    updated_at = CURRENT_TIMESTAMP
`;

function sanitizeParam(val: unknown, maxLen = 128): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed.length > maxLen) return null;
  return trimmed;
}

function hydrateCardRow(row: D1CardRow): D1CardRow & { customDomain?: string } {
  const hydrated: D1CardRow & { customDomain?: string } = { ...row };
  if (typeof hydrated.data === 'string') {
    try {
      hydrated.data = JSON.parse(hydrated.data);
    } catch {
      // Keep raw string if JSON parsing fails
    }
  }
  if (hydrated.custom_domain) {
    hydrated.customDomain = hydrated.custom_domain;
  }
  return hydrated;
}

function jsonResponse<T>(body: T, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Standard CORS headers for client-side queries
    const corsHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 0. Search Engine Crawlers & Lighthouse SEO (robots.txt and sitemap.xml)
    if (url.pathname === '/robots.txt' && request.method === 'GET') {
      const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: https://${env.BASE_DOMAIN || 'eerum.goguma.app'}/sitemap.xml\n`;
      return new Response(robotsTxt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    if (url.pathname === '/sitemap.xml' && request.method === 'GET') {
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${env.BASE_DOMAIN || 'eerum.goguma.app'}/</loc>
    <lastmod>2026-11-11</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${env.BASE_DOMAIN || 'eerum.goguma.app'}/card/master</loc>
    <lastmod>2026-11-11</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
      return new Response(sitemapXml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 1. Health check & Architecture Diagnostic
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return jsonResponse(
        {
          status: 'ok',
          service: 'Korean Center Card Studio',
          architecture: 'Zero-AI Local-First & Quiet Luxury Minimalist',
          runtime: 'Cloudflare Edge Worker (Unified Serverless Entry Point)',
          timestamp: new Date().toISOString(),
        },
        corsHeaders
      );
    }

    // 2. Direct Card Resolution: GET /api/resolve?slug=... or ?domain=...
    if (url.pathname === '/api/resolve' && request.method === 'GET') {
      const slug = normalizeQueryToken(url.searchParams.get('slug'), 100);
      const explicitDomain =
        normalizeQueryToken(url.searchParams.get('domain'), 255) ||
        normalizeQueryToken(url.searchParams.get('host'), 255);
      const headerHost = normalizeQueryToken(request.headers.get('host'), 255);
      const baseDomain = (env.BASE_DOMAIN || 'eerum.goguma.app').toLowerCase();

      try {
        let card: D1CardRow | null = null;
        let matchType: ResolveMatchType = 'slug';

        if (slug) {
          card = await env.DB.prepare(SQL_SELECT_CARD_BY_SLUG)
            .bind(slug)
            .first<D1CardRow>();
          matchType = 'slug';
        }

        if (!card) {
          const targetDomain =
            explicitDomain ||
            (headerHost && !isPlatformDomain(headerHost, baseDomain) ? headerHost : null);

          if (targetDomain) {
            card = await env.DB.prepare(SQL_SELECT_CARD_BY_DOMAIN)
              .bind(targetDomain)
              .first<D1CardRow>();
            matchType = 'custom_domain';
          }
        }

        if (!card) {
          return jsonResponse<ResolveCardResponse>(
            createApiError('Card not found', true),
            corsHeaders,
            404
          );
        }

        return jsonResponse<ResolveCardResponse>(
          { success: true, card: hydrateCardRow(card), matchType },
          corsHeaders
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Query failed';
        return jsonResponse<ResolveCardResponse>(
          createApiError(message),
          corsHeaders,
          500
        );
      }
    }

    // 3. Card Query: GET /api/cards?slug=... or GET /api/cards?domain=...
    if (url.pathname === '/api/cards' && request.method === 'GET') {
      const slug = normalizeQueryToken(url.searchParams.get('slug'), 100);
      const domain = normalizeQueryToken(url.searchParams.get('domain'), 255);

      try {
        if (slug) {
          const card = await env.DB.prepare(SQL_SELECT_CARD_BY_SLUG)
            .bind(slug)
            .first<D1CardRow>();
          if (!card) {
            return jsonResponse<GetCardsResponse>(
              createApiError('Card not found for slug', true),
              corsHeaders,
              404
            );
          }
          return jsonResponse<GetCardsResponse>(
            { success: true, card: hydrateCardRow(card) },
            corsHeaders
          );
        }

        if (domain) {
          const card = await env.DB.prepare(SQL_SELECT_CARD_BY_DOMAIN)
            .bind(domain)
            .first<D1CardRow>();
          if (!card) {
            return jsonResponse<GetCardsResponse>(
              createApiError('Card not found for custom domain', true),
              corsHeaders,
              404
            );
          }
          return jsonResponse<GetCardsResponse>(
            { success: true, card: hydrateCardRow(card) },
            corsHeaders
          );
        }

        // Fetch recent cards collection
        const { results = [] } = await env.DB.prepare(SQL_SELECT_RECENT_CARDS).all<D1CardRow>();
        const cards = results.map(hydrateCardRow);

        return jsonResponse<GetCardsResponse>({ success: true, cards }, corsHeaders);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Query failed';
        return jsonResponse<GetCardsResponse>(createApiError(message), corsHeaders, 500);
      }
    }

    // 4. Card Upsert: POST /api/cards
    if (url.pathname === '/api/cards' && request.method === 'POST') {
      try {
        const body = (await request.json()) as CardUpsertPayload | null;
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return jsonResponse<UpsertCardResponse>(
            createApiError('Invalid payload'),
            corsHeaders,
            400
          );
        }

        const validId = sanitizeParam(body.id, 64) || crypto.randomUUID();
        const validSlug = normalizeQueryToken(body.slug, 100);

        if (!validSlug) {
          return jsonResponse<UpsertCardResponse>(
            createApiError('Slug is required'),
            corsHeaders,
            400
          );
        }

        const validDomain = normalizeQueryToken(
          body.customDomain ?? body.custom_domain,
          255
        );
        const validOwnerKey = sanitizeParam(body.owner_key, 128);
        const validTheme = sanitizeParam(body.theme, 32) || 'pure_white';
        const validData =
          typeof body.data === 'string' ? body.data : JSON.stringify(body.data || {});

        await env.DB.prepare(SQL_UPSERT_CARD)
          .bind(validId, validSlug, validDomain, validOwnerKey, validTheme, validData)
          .run();

        return jsonResponse<UpsertCardResponse>(
          { success: true, id: validId, slug: validSlug },
          corsHeaders
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Write failed';
        return jsonResponse<UpsertCardResponse>(
          createApiError(message),
          corsHeaders,
          500
        );
      }
    }

    // 5. Cross-Device Anonymous Sync: GET /api/sync?id=sync_xxxx
    if (url.pathname === '/api/sync' && request.method === 'GET') {
      const rawSyncId = url.searchParams.get('id') || '';
      if (!isValidSyncId(rawSyncId)) {
        return jsonResponse<GetSyncWalletResponse>(
          createApiError('Sync ID invalid or missing'),
          corsHeaders,
          400
        );
      }

      const syncId = rawSyncId.trim();

      try {
        const wallet = await env.DB.prepare(SQL_SELECT_WALLET)
          .bind(syncId)
          .first<D1WalletRow>();

        return jsonResponse<GetSyncWalletResponse>(
          {
            success: true,
            syncId,
            cards: wallet && wallet.cards_json ? JSON.parse(wallet.cards_json) : [],
          },
          corsHeaders
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sync fetch failed';
        return jsonResponse<GetSyncWalletResponse>(
          createApiError(message),
          corsHeaders,
          500
        );
      }
    }

    // 6. Cross-Device Anonymous Sync: POST /api/sync
    if (url.pathname === '/api/sync' && request.method === 'POST') {
      try {
        const body = (await request.json()) as SyncWalletPayload | null;
        const { syncId: rawSyncId, cards } = body || {};

        if (!isValidSyncId(rawSyncId) || !Array.isArray(cards)) {
          return jsonResponse<PostSyncWalletResponse>(
            createApiError('Valid Sync ID and cards array required'),
            corsHeaders,
            400
          );
        }

        const syncId = rawSyncId.trim();
        const cardsJson = JSON.stringify(cards);

        await env.DB.prepare(SQL_UPSERT_WALLET).bind(syncId, cardsJson).run();

        // Mirror server.ts behavior: index personal owned cards (isMyCard === true) for public slug/domain resolution
        for (const item of cards as CardUpsertPayload[]) {
          if (item && typeof item === 'object' && item.isMyCard === true) {
            const cardId = sanitizeParam(item.id, 64);
            const cardSlug = normalizeQueryToken(item.slug, 100);
            if (cardId && cardSlug) {
              const cardDomain = normalizeQueryToken(
                item.customDomain ?? item.custom_domain,
                255
              );
              const ownerKey = sanitizeParam(item.owner_key, 128);
              const theme = sanitizeParam(item.theme, 32) || 'pure_white';
              const dataStr =
                typeof item.data === 'string'
                  ? item.data
                  : JSON.stringify(item.data || {});
              try {
                await env.DB.prepare(SQL_UPSERT_CARD)
                  .bind(cardId, cardSlug, cardDomain, ownerKey, theme, dataStr)
                  .run();
              } catch {
                // Non-fatal if slug belongs to another row; wallet sync still succeeds
              }
            }
          }
        }

        return jsonResponse<PostSyncWalletResponse>(
          { success: true, syncId, count: cards.length },
          corsHeaders
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sync save failed';
        return jsonResponse<PostSyncWalletResponse>(
          createApiError(message),
          corsHeaders,
          500
        );
      }
    }

    // 7. Static Asset Fallback (Vite Single Page App with /card/:slug route support)
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      const assetRes = await env.ASSETS.fetch(request);
      if (
        assetRes.status === 404 &&
        request.method === 'GET' &&
        !url.pathname.startsWith('/api/')
      ) {
        const spaRequest = new Request(new URL('/index.html', request.url), request);
        const spaRes = await env.ASSETS.fetch(spaRequest);
        const headers = new Headers(spaRes.headers);
        headers.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
        headers.set('X-Content-Type-Options', 'nosniff');
        return new Response(spaRes.body, { status: 200, headers });
      }

      if (assetRes.ok) {
        const headers = new Headers(assetRes.headers);
        if (url.pathname.startsWith('/assets/')) {
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (
          url.pathname === '/manifest.webmanifest' ||
          url.pathname.endsWith('.json')
        ) {
          headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');
        } else if (
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.ico')
        ) {
          headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
        } else if (url.pathname === '/' || url.pathname === '/index.html') {
          headers.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
          headers.set('X-Content-Type-Options', 'nosniff');
        }
        return new Response(assetRes.body, { status: assetRes.status, headers });
      }

      return assetRes;
    }

    return new Response('Not Found', { status: 404 });
  },
};