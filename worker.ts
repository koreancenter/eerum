/**
 * Production Serverless Edge Worker for Korean Center Digital Card Studio
 * Configured as the single authoritative serverless entry point via wrangler.toml (main = "worker.ts").
 * Enforces Zero-Trust parameter binding on Cloudflare D1 with zero string concatenation,
 * SHA-256 ownerKey verification on public slug updates, and strict wallet sync isolation.
 */

import { D1StorageAdapter } from './server/d1Storage';
import {
  buildUpsertInputFromPayload,
  constantTimeEqual,
  hashOwnerKeySha256,
  type D1DatabaseLike,
} from './server/storageTypes';
import {
  createApiError,
  isPlatformDomain,
  isValidSyncId,
  normalizeQueryToken,
  P2P_SIGNAL_MAX_BYTES,
  P2P_SIGNAL_TTL_MS,
  isValidP2PRoomId,
  isValidP2PSignalRole,
  isValidP2PSignalType,
  sanitizeP2PSdpPayload,
  sanitizeP2PIcePayload,
  type GetCardsResponse,
  type GetP2PSignalResponse,
  type GetSyncWalletResponse,
  type P2PIceCandidateSignal,
  type P2PSessionDescriptionSignal,
  type PostP2PSignalResponse,
  type PostSyncWalletResponse,
  type ResolveCardResponse,
  type ResolveMatchType,
  type UpsertCardResponse,
} from './src/types/api';

interface KVNamespaceLike {
  get: (key: string, type?: 'text' | 'json') => Promise<unknown>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
}

export interface Env {
  DB: D1DatabaseLike;
  R2?: unknown;
  P2P_SIGNAL_KV?: KVNamespaceLike;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  BASE_DOMAIN?: string;
}

const MAX_BODY_BYTES = 3 * 1024 * 1024; // 3MB
const MAX_SYNC_CARDS = 500;
const MAX_P2P_SIGNAL_ROOMS = 1000;
const MAX_ICE_CANDIDATES_PER_SIDE = 64;

interface EphemeralSignalRoom {
  offer: P2PSessionDescriptionSignal | null;
  answer: P2PSessionDescriptionSignal | null;
  senderIce: P2PIceCandidateSignal[];
  receiverIce: P2PIceCandidateSignal[];
  expiresAt: number;
}

const ephemeralSignalRooms = new Map<string, EphemeralSignalRoom>();

function purgeExpiredEdgeSignalRooms(now = Date.now()) {
  for (const [id, room] of ephemeralSignalRooms.entries()) {
    if (room.expiresAt <= now) {
      ephemeralSignalRooms.delete(id);
    }
  }
}

async function loadEdgeSignalRoom(
  roomId: string,
  env: Env,
  now = Date.now()
): Promise<EphemeralSignalRoom | null> {
  if (env.P2P_SIGNAL_KV) {
    const raw = await env.P2P_SIGNAL_KV.get(`p2p_signal:${roomId}`, 'json');
    const room = raw as EphemeralSignalRoom | null;
    if (!room || typeof room.expiresAt !== 'number' || room.expiresAt <= now) {
      return null;
    }
    return room;
  }

  purgeExpiredEdgeSignalRooms(now);
  const room = ephemeralSignalRooms.get(roomId);
  if (!room || room.expiresAt <= now) {
    ephemeralSignalRooms.delete(roomId);
    return null;
  }
  return room;
}

async function saveEdgeSignalRoom(
  roomId: string,
  room: EphemeralSignalRoom,
  env: Env,
  now = Date.now()
): Promise<void> {
  if (env.P2P_SIGNAL_KV) {
    const remainingSec = Math.max(1, Math.ceil((room.expiresAt - now) / 1000));
    await env.P2P_SIGNAL_KV.put(`p2p_signal:${roomId}`, JSON.stringify(room), {
      expirationTtl: Math.min(60, remainingSec),
    });
    return;
  }

  if (!ephemeralSignalRooms.has(roomId) && ephemeralSignalRooms.size >= MAX_P2P_SIGNAL_ROOMS) {
    const oldestKey = ephemeralSignalRooms.keys().next().value;
    if (oldestKey !== undefined) ephemeralSignalRooms.delete(oldestKey);
  }
  ephemeralSignalRooms.set(roomId, room);
}

function sanitizeIdParam(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim().slice(0, 64);
  if (!trimmed || !/^[a-zA-Z0-9_.:-]+$/.test(trimmed)) return null;
  return trimmed;
}

function extractOwnerKey(request: Request, payload: Record<string, unknown>): string | null {
  const headerKey = request.headers.get('x-owner-key');
  if (headerKey && headerKey.trim()) {
    return headerKey.trim().slice(0, 256);
  }
  const auth = request.headers.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return token.slice(0, 256);
  }
  const bodyKey = payload.ownerKey ?? payload.owner_key;
  if (typeof bodyKey === 'string' && bodyKey.trim()) {
    return bodyKey.trim().slice(0, 256);
  }
  return null;
}

async function readJsonWithLimit(
  request: Request,
  maxBytes = MAX_BODY_BYTES
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; error: string }> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) >= maxBytes && maxBytes === P2P_SIGNAL_MAX_BYTES) {
    return {
      ok: false,
      status: 413,
      error: 'P2P signaling payload must be smaller than 32KB',
    };
  }
  if (contentLength && Number(contentLength) > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: 'Request payload too large (3MB limit exceeded)',
    };
  }

  const rawText = await request.text();
  const byteLen = new TextEncoder().encode(rawText).byteLength;
  if (maxBytes === P2P_SIGNAL_MAX_BYTES && byteLen >= maxBytes) {
    return {
      ok: false,
      status: 413,
      error: 'P2P signaling payload must be smaller than 32KB',
    };
  }
  if (byteLen > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: 'Request payload too large (3MB limit exceeded)',
    };
  }

  try {
    return { ok: true, data: JSON.parse(rawText) };
  } catch {
    return { ok: false, status: 400, error: 'Malformed JSON payload' };
  }
}

function jsonResponse<T>(body: T, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const storage = new D1StorageAdapter(env.DB);

    const corsHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Owner-Key',
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
          storage: storage.kind,
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
        let card = slug ? await storage.getCardBySlug(slug) : null;
        let matchType: ResolveMatchType = 'slug';

        if (!card) {
          const targetDomain =
            explicitDomain ||
            (headerHost && !isPlatformDomain(headerHost, baseDomain) ? headerHost : null);

          if (targetDomain) {
            card = await storage.getCardByDomain(targetDomain);
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

        await storage.recordCardView(card.id, {
          referrer: request.headers.get('referer'),
          country: request.headers.get('cf-ipcountry'),
          userAgent: request.headers.get('user-agent'),
        });

        return jsonResponse<ResolveCardResponse>(
          { success: true, card, matchType },
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
          const card = await storage.getCardBySlug(slug);
          if (!card) {
            return jsonResponse<GetCardsResponse>(
              createApiError('Card not found for slug', true),
              corsHeaders,
              404
            );
          }
          await storage.recordCardView(card.id, {
            referrer: request.headers.get('referer'),
            country: request.headers.get('cf-ipcountry'),
            userAgent: request.headers.get('user-agent'),
          });
          return jsonResponse<GetCardsResponse>({ success: true, card }, corsHeaders);
        }

        if (domain) {
          const card = await storage.getCardByDomain(domain);
          if (!card) {
            return jsonResponse<GetCardsResponse>(
              createApiError('Card not found for custom domain', true),
              corsHeaders,
              404
            );
          }
          await storage.recordCardView(card.id, {
            referrer: request.headers.get('referer'),
            country: request.headers.get('cf-ipcountry'),
            userAgent: request.headers.get('user-agent'),
          });
          return jsonResponse<GetCardsResponse>({ success: true, card }, corsHeaders);
        }

        const cards = await storage.listPublicCards(50);
        return jsonResponse<GetCardsResponse>({ success: true, cards }, corsHeaders);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Query failed';
        return jsonResponse<GetCardsResponse>(createApiError(message), corsHeaders, 500);
      }
    }

    // 4. Card Upsert with Owner-Key SHA-256 Verification: POST /api/cards
    if (url.pathname === '/api/cards' && request.method === 'POST') {
      try {
        const parsed = await readJsonWithLimit(request);
        if (!parsed.ok) {
          return jsonResponse<UpsertCardResponse>(
            createApiError(parsed.error),
            corsHeaders,
            parsed.status
          );
        }

        const payload = parsed.data as Record<string, unknown> | null;
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          return jsonResponse<UpsertCardResponse>(
            createApiError('Invalid payload'),
            corsHeaders,
            400
          );
        }

        const validSlug = normalizeQueryToken(payload.slug, 100);
        if (!validSlug || !/^[a-z0-9_-]{1,100}$/.test(validSlug)) {
          return jsonResponse<UpsertCardResponse>(
            createApiError('Valid slug is required'),
            corsHeaders,
            400
          );
        }

        const requestedId = sanitizeIdParam(payload.id) || crypto.randomUUID();
        const validDomain =
          normalizeQueryToken(payload.customDomain ?? payload.custom_domain, 255) || null;
        const incomingOwnerKey = extractOwnerKey(request, payload);

        const existingBySlug = await storage.getCardAuthBySlug(validSlug);
        const existingById = await storage.getCardAuthById(requestedId);

        let targetId = requestedId;
        let ownerKeyHash: string;
        let issuedOwnerKey: string | undefined;
        let isNewClaim = false;

        if (existingBySlug) {
          if (!existingBySlug.ownerKeyHash || !incomingOwnerKey) {
            return jsonResponse<UpsertCardResponse>(
              createApiError('Forbidden: valid ownerKey is required to update this slug'),
              corsHeaders,
              403
            );
          }

          const incomingHash = await hashOwnerKeySha256(incomingOwnerKey);
          if (!constantTimeEqual(incomingHash, existingBySlug.ownerKeyHash)) {
            return jsonResponse<UpsertCardResponse>(
              createApiError('Forbidden: ownerKey mismatch for this slug'),
              corsHeaders,
              403
            );
          }

          if (existingById && existingById.id !== existingBySlug.id) {
            return jsonResponse<UpsertCardResponse>(
              createApiError('Forbidden: slug belongs to another card record'),
              corsHeaders,
              403
            );
          }

          targetId = existingBySlug.id;
          ownerKeyHash = existingBySlug.ownerKeyHash;
        } else if (existingById) {
          if (!existingById.ownerKeyHash || !incomingOwnerKey) {
            return jsonResponse<UpsertCardResponse>(
              createApiError('Forbidden: valid ownerKey is required to update this card'),
              corsHeaders,
              403
            );
          }

          const incomingHash = await hashOwnerKeySha256(incomingOwnerKey);
          if (!constantTimeEqual(incomingHash, existingById.ownerKeyHash)) {
            return jsonResponse<UpsertCardResponse>(
              createApiError('Forbidden: ownerKey mismatch for this card'),
              corsHeaders,
              403
            );
          }

          targetId = existingById.id;
          ownerKeyHash = existingById.ownerKeyHash;
        } else {
          if (incomingOwnerKey && incomingOwnerKey.length < 8) {
            return jsonResponse<UpsertCardResponse>(
              createApiError('ownerKey must be at least 8 characters'),
              corsHeaders,
              400
            );
          }

          issuedOwnerKey = incomingOwnerKey || crypto.randomUUID();
          ownerKeyHash = await hashOwnerKeySha256(issuedOwnerKey);
          isNewClaim = true;
        }

        const upsertInput = buildUpsertInputFromPayload(
          payload,
          targetId,
          validSlug,
          validDomain,
          ownerKeyHash
        );
        await storage.upsertCard(upsertInput);

        return jsonResponse<UpsertCardResponse>(
          {
            success: true,
            id: targetId,
            slug: validSlug,
            created: isNewClaim,
            ...(isNewClaim && issuedOwnerKey ? { ownerKey: issuedOwnerKey } : {}),
          },
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
        const cards = await storage.getWallet(syncId);
        return jsonResponse<GetSyncWalletResponse>(
          { success: true, syncId, cards },
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

    // 6. Cross-Device Anonymous Sync: POST /api/sync (Strictly isolated to wallets table)
    if (url.pathname === '/api/sync' && request.method === 'POST') {
      try {
        const parsed = await readJsonWithLimit(request);
        if (!parsed.ok) {
          return jsonResponse<PostSyncWalletResponse>(
            createApiError(parsed.error),
            corsHeaders,
            parsed.status
          );
        }

        const body = parsed.data as { syncId?: unknown; cards?: unknown } | null;
        const { syncId: rawSyncId, cards } = body || {};

        if (!isValidSyncId(rawSyncId) || !Array.isArray(cards)) {
          return jsonResponse<PostSyncWalletResponse>(
            createApiError('Valid Sync ID and cards array required'),
            corsHeaders,
            400
          );
        }

        if (cards.length > MAX_SYNC_CARDS) {
          return jsonResponse<PostSyncWalletResponse>(
            createApiError(`Sync payload exceeds maximum of ${MAX_SYNC_CARDS} cards`),
            corsHeaders,
            400
          );
        }

        const syncId = rawSyncId.trim();
        await storage.saveWallet(syncId, cards as never[]);

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

    // 6b. Ephemeral WebRTC Signaling Endpoint (/api/p2p/signal) — 60s TTL, <32KB, never persists cards
    if (url.pathname === '/api/p2p/signal' && request.method === 'GET') {
      const noStoreHeaders = { ...corsHeaders, 'Cache-Control': 'no-store' };
      const rawRoom = (url.searchParams.get('room') || '').trim();
      const rawRole = (url.searchParams.get('role') || '').trim();

      if (!isValidP2PRoomId(rawRoom) || !isValidP2PSignalRole(rawRole)) {
        return jsonResponse<GetP2PSignalResponse>(
          createApiError('Valid P2P room and role (sender|receiver) are required'),
          noStoreHeaders,
          400
        );
      }

      const now = Date.now();
      const room = await loadEdgeSignalRoom(rawRoom, env, now);
      if (!room) {
        return jsonResponse<GetP2PSignalResponse>(
          createApiError('P2P signaling room not found or expired', true),
          noStoreHeaders,
          404
        );
      }

      return jsonResponse<GetP2PSignalResponse>(
        {
          success: true,
          roomId: rawRoom,
          role: rawRole,
          expiresAt: room.expiresAt,
          offer: rawRole === 'receiver' ? room.offer : null,
          answer: rawRole === 'sender' ? room.answer : null,
          iceCandidates: rawRole === 'sender' ? room.receiverIce : room.senderIce,
        },
        noStoreHeaders
      );
    }

    if (url.pathname === '/api/p2p/signal' && request.method === 'POST') {
      const noStoreHeaders = { ...corsHeaders, 'Cache-Control': 'no-store' };
      const parsed = await readJsonWithLimit(request, P2P_SIGNAL_MAX_BYTES);
      if (!parsed.ok) {
        return jsonResponse<PostP2PSignalResponse>(
          createApiError(parsed.error),
          noStoreHeaders,
          parsed.status
        );
      }

      const rawBody = parsed.data as Record<string, unknown> | null;
      if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
        return jsonResponse<PostP2PSignalResponse>(
          createApiError('Invalid P2P signaling payload'),
          noStoreHeaders,
          400
        );
      }

      const rawRoom = typeof rawBody.roomId === 'string' ? rawBody.roomId.trim() : '';
      const rawRole = rawBody.role;
      const rawType = rawBody.type;

      if (
        !isValidP2PRoomId(rawRoom) ||
        !isValidP2PSignalRole(rawRole) ||
        !isValidP2PSignalType(rawType)
      ) {
        return jsonResponse<PostP2PSignalResponse>(
          createApiError('Invalid P2P signaling parameters'),
          noStoreHeaders,
          400
        );
      }

      const now = Date.now();
      let room = await loadEdgeSignalRoom(rawRoom, env, now);

      if (rawType === 'offer') {
        if (rawRole !== 'sender') {
          return jsonResponse<PostP2PSignalResponse>(
            createApiError('Only sender can publish an offer'),
            noStoreHeaders,
            400
          );
        }
        const offer = sanitizeP2PSdpPayload(rawBody.payload, 'offer');
        if (!offer) {
          return jsonResponse<PostP2PSignalResponse>(
            createApiError('Malformed SDP offer payload'),
            noStoreHeaders,
            400
          );
        }
        room = {
          offer,
          answer: null,
          senderIce: [],
          receiverIce: [],
          expiresAt: now + P2P_SIGNAL_TTL_MS,
        };
      } else if (rawType === 'answer') {
        if (rawRole !== 'receiver') {
          return jsonResponse<PostP2PSignalResponse>(
            createApiError('Only receiver can publish an answer'),
            noStoreHeaders,
            400
          );
        }
        if (!room) {
          return jsonResponse<PostP2PSignalResponse>(
            createApiError('P2P signaling room not found or expired', true),
            noStoreHeaders,
            404
          );
        }
        const answer = sanitizeP2PSdpPayload(rawBody.payload, 'answer');
        if (!answer) {
          return jsonResponse<PostP2PSignalResponse>(
            createApiError('Malformed SDP answer payload'),
            noStoreHeaders,
            400
          );
        }
        room.answer = answer;
      } else {
        if (!room) {
          return jsonResponse<PostP2PSignalResponse>(
            createApiError('P2P signaling room not found or expired', true),
            noStoreHeaders,
            404
          );
        }
        const ice = sanitizeP2PIcePayload(rawBody.payload);
        if (!ice) {
          return jsonResponse<PostP2PSignalResponse>(
            createApiError('Malformed ICE candidate payload'),
            noStoreHeaders,
            400
          );
        }
        const targetList = rawRole === 'sender' ? room.senderIce : room.receiverIce;
        if (targetList.length < MAX_ICE_CANDIDATES_PER_SIDE) {
          targetList.push(ice);
        }
      }

      await saveEdgeSignalRoom(rawRoom, room, env, now);

      return jsonResponse<PostP2PSignalResponse>(
        {
          success: true,
          roomId: rawRoom,
          expiresAt: room.expiresAt,
        },
        noStoreHeaders
      );
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
        headers.set(
          'Cache-Control',
          'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
        );
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
          headers.set(
            'Cache-Control',
            'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
          );
          headers.set('X-Content-Type-Options', 'nosniff');
        }
        return new Response(assetRes.body, { status: assetRes.status, headers });
      }

      return assetRes;
    }

    return new Response('Not Found', { status: 404 });
  },
};