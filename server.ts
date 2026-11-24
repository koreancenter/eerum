import express, { type NextFunction, type Request, type Response } from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import type { StoredCard } from './src/types/card.ts';
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
  type UpsertCardResponse,
} from './src/types/api.ts';
import { createStorageAdapter } from './server/createStorage.ts';
import {
  buildUpsertInputFromPayload,
  constantTimeEqual,
  hashOwnerKeySha256,
  type CardStorageAdapter,
  type D1DatabaseLike,
} from './server/storageTypes.ts';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const DEFAULT_BODY_LIMIT = '3mb';
const MAX_SYNC_CARDS = 500;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 60;
const MAX_RATE_LIMIT_BUCKETS = 5000;

export interface CreateAppOptions {
  storage?: CardStorageAdapter;
  d1?: D1DatabaseLike | null;
  dbPath?: string;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function createIpRateLimiter(windowMs: number, maxRequests: number) {
  const buckets = new Map<string, RateBucket>();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(ip);
      }
    }
  }, Math.max(10_000, windowMs));
  cleanupTimer.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = extractClientIp(req);

    if (buckets.size >= MAX_RATE_LIMIT_BUCKETS && !buckets.has(ip)) {
      for (const [k, b] of buckets.entries()) {
        if (b.resetAt <= now) buckets.delete(k);
      }
      if (buckets.size >= MAX_RATE_LIMIT_BUCKETS) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) buckets.delete(oldestKey);
      }
    }

    let bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, maxRequests - bucket.count);
    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxRequests) {
      res.setHeader('Retry-After', String(resetSeconds));
      return res
        .status(429)
        .json(createApiError('Too many requests. Please try again later.'));
    }

    return next();
  };
}

function extractIncomingOwnerKey(req: Request, payload: Record<string, unknown>): string | null {
  const headerKey = req.get('x-owner-key');
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim().slice(0, 256);
  }

  const authHeader = req.get('authorization');
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token.slice(0, 256);
  }

  const bodyKey = payload.ownerKey ?? payload.owner_key;
  if (typeof bodyKey === 'string' && bodyKey.trim()) {
    return bodyKey.trim().slice(0, 256);
  }

  return null;
}

function sanitizeCardId(rawId: unknown): string | null {
  if (typeof rawId !== 'string') return null;
  const trimmed = rawId.trim().slice(0, 64);
  if (!trimmed || !/^[a-zA-Z0-9_.:-]+$/.test(trimmed)) return null;
  return trimmed;
}

export async function createServerApp(options: CreateAppOptions = {}) {
  const storage =
    options.storage ||
    (await createStorageAdapter({ d1: options.d1, dbPath: options.dbPath }));

  const app = express();
  app.use(express.json({ limit: DEFAULT_BODY_LIMIT }));

  // Clean JSON error handling for oversized payloads (>3MB) and malformed JSON
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    const errObj = err as { type?: string; status?: number; statusCode?: number };
    if (errObj?.type === 'entity.too.large' || errObj?.status === 413 || errObj?.statusCode === 413) {
      return res
        .status(413)
        .json(createApiError('Request payload too large (3MB limit exceeded)'));
    }
    if (err instanceof SyntaxError && 'body' in (err as object)) {
      return res.status(400).json(createApiError('Malformed JSON payload'));
    }
    return next(err);
  });

  const windowMs =
    options.rateLimitWindowMs ??
    (Number(process.env.API_RATE_LIMIT_WINDOW_MS) || DEFAULT_RATE_LIMIT_WINDOW_MS);
  const maxRequests =
    options.rateLimitMax ??
    (Number(process.env.API_RATE_LIMIT_MAX) || DEFAULT_RATE_LIMIT_MAX);

  const apiRateLimiter = createIpRateLimiter(windowMs, maxRequests);
  app.use(['/api/cards', '/api/sync'], apiRateLimiter);

  const p2pSignalRateLimiter = createIpRateLimiter(windowMs, Math.max(240, maxRequests * 4));
  app.use('/api/p2p/signal', p2pSignalRateLimiter);

  interface EphemeralSignalRoom {
    offer: P2PSessionDescriptionSignal | null;
    answer: P2PSessionDescriptionSignal | null;
    senderIce: P2PIceCandidateSignal[];
    receiverIce: P2PIceCandidateSignal[];
    expiresAt: number;
  }

  const MAX_P2P_SIGNAL_ROOMS = 1000;
  const MAX_ICE_CANDIDATES_PER_SIDE = 64;
  const p2pSignalRooms = new Map<string, EphemeralSignalRoom>();

  const purgeExpiredSignalRooms = (now = Date.now()) => {
    for (const [id, room] of p2pSignalRooms.entries()) {
      if (room.expiresAt <= now) {
        p2pSignalRooms.delete(id);
      }
    }
  };

  const p2pCleanupTimer = setInterval(() => purgeExpiredSignalRooms(), 15_000);
  p2pCleanupTimer.unref();

  // SEO Crawler Endpoints for Lighthouse & Search Engines
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain; charset=utf-8');
    res.send(
      `User-agent: *\nAllow: /\n\nSitemap: https://${process.env.BASE_DOMAIN || 'eerum.goguma.app'}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${process.env.BASE_DOMAIN || 'eerum.goguma.app'}/</loc>
    <lastmod>2026-11-11</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${process.env.BASE_DOMAIN || 'eerum.goguma.app'}/card/master</loc>
    <lastmod>2026-11-11</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Korean Center Card Studio',
      architecture: 'Zero-AI Local-First & Quiet Luxury Minimalist',
      storage: storage.kind,
    });
  });

  // 1. Cross-Device Anonymous Sync Endpoints (/api/sync) - Strictly isolated in `wallets`
  app.get('/api/sync', async (req, res) => {
    const rawSyncId = typeof req.query.id === 'string' ? req.query.id : '';
    if (!isValidSyncId(rawSyncId)) {
      const errBody: GetSyncWalletResponse<StoredCard> = createApiError(
        'Sync ID invalid or missing'
      );
      return res.status(400).json(errBody);
    }

    try {
      const syncId = rawSyncId.trim();
      const cards = await storage.getWallet(syncId);
      const body: GetSyncWalletResponse<StoredCard> = { success: true, syncId, cards };
      return res.json(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync read failed';
      return res.status(500).json(createApiError(msg));
    }
  });

  app.post('/api/sync', async (req, res) => {
    const { syncId: rawSyncId, cards } = req.body || {};
    if (!isValidSyncId(rawSyncId) || !Array.isArray(cards)) {
      const errBody: PostSyncWalletResponse = createApiError(
        'Valid Sync ID and cards array required'
      );
      return res.status(400).json(errBody);
    }

    if (cards.length > MAX_SYNC_CARDS) {
      return res
        .status(400)
        .json(createApiError(`Sync payload exceeds maximum of ${MAX_SYNC_CARDS} cards`));
    }

    try {
      const syncId = rawSyncId.trim();
      await storage.saveWallet(syncId, cards as StoredCard[]);

      const body: PostSyncWalletResponse = {
        success: true,
        syncId,
        count: cards.length,
      };
      return res.json(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync write failed';
      return res.status(500).json(createApiError(msg));
    }
  });

  // 1b. Ephemeral WebRTC Signaling Endpoint (/api/p2p/signal) — 60s TTL, <32KB, never persists cards
  app.get('/api/p2p/signal', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const rawRoom = typeof req.query.room === 'string' ? req.query.room.trim() : '';
    const rawRole = typeof req.query.role === 'string' ? req.query.role.trim() : '';

    if (!isValidP2PRoomId(rawRoom) || !isValidP2PSignalRole(rawRole)) {
      return res
        .status(400)
        .json(createApiError('Valid P2P room and role (sender|receiver) are required'));
    }

    const now = Date.now();
    purgeExpiredSignalRooms(now);

    const room = p2pSignalRooms.get(rawRoom);
    if (!room || room.expiresAt <= now) {
      p2pSignalRooms.delete(rawRoom);
      return res
        .status(404)
        .json(createApiError('P2P signaling room not found or expired', true));
    }

    const body: GetP2PSignalResponse = {
      success: true,
      roomId: rawRoom,
      role: rawRole,
      expiresAt: room.expiresAt,
      offer: rawRole === 'receiver' ? room.offer : null,
      answer: rawRole === 'sender' ? room.answer : null,
      iceCandidates: rawRole === 'sender' ? room.receiverIce : room.senderIce,
    };
    return res.json(body);
  });

  app.post('/api/p2p/signal', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const contentLength = Number(req.headers['content-length'] || 0);
    if (Number.isFinite(contentLength) && contentLength >= P2P_SIGNAL_MAX_BYTES) {
      return res
        .status(413)
        .json(createApiError('P2P signaling payload must be smaller than 32KB'));
    }

    const rawBody = req.body as Record<string, unknown> | null;
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return res.status(400).json(createApiError('Invalid P2P signaling payload'));
    }

    const serializedBytes = Buffer.byteLength(JSON.stringify(rawBody), 'utf8');
    if (serializedBytes >= P2P_SIGNAL_MAX_BYTES) {
      return res
        .status(413)
        .json(createApiError('P2P signaling payload must be smaller than 32KB'));
    }

    const rawRoom = typeof rawBody.roomId === 'string' ? rawBody.roomId.trim() : '';
    const rawRole = rawBody.role;
    const rawType = rawBody.type;

    if (
      !isValidP2PRoomId(rawRoom) ||
      !isValidP2PSignalRole(rawRole) ||
      !isValidP2PSignalType(rawType)
    ) {
      return res.status(400).json(createApiError('Invalid P2P signaling parameters'));
    }

    const now = Date.now();
    purgeExpiredSignalRooms(now);

    let room = p2pSignalRooms.get(rawRoom);
    if (room && room.expiresAt <= now) {
      p2pSignalRooms.delete(rawRoom);
      room = undefined;
    }

    if (rawType === 'offer') {
      if (rawRole !== 'sender') {
        return res.status(400).json(createApiError('Only sender can publish an offer'));
      }
      const offer = sanitizeP2PSdpPayload(rawBody.payload, 'offer');
      if (!offer) {
        return res.status(400).json(createApiError('Malformed SDP offer payload'));
      }
      if (!room && p2pSignalRooms.size >= MAX_P2P_SIGNAL_ROOMS) {
        const oldestKey = p2pSignalRooms.keys().next().value;
        if (oldestKey !== undefined) p2pSignalRooms.delete(oldestKey);
      }
      room = {
        offer,
        answer: null,
        senderIce: [],
        receiverIce: [],
        expiresAt: now + P2P_SIGNAL_TTL_MS,
      };
      p2pSignalRooms.set(rawRoom, room);
    } else if (rawType === 'answer') {
      if (rawRole !== 'receiver') {
        return res.status(400).json(createApiError('Only receiver can publish an answer'));
      }
      if (!room) {
        return res
          .status(404)
          .json(createApiError('P2P signaling room not found or expired', true));
      }
      const answer = sanitizeP2PSdpPayload(rawBody.payload, 'answer');
      if (!answer) {
        return res.status(400).json(createApiError('Malformed SDP answer payload'));
      }
      room.answer = answer;
    } else {
      if (!room) {
        return res
          .status(404)
          .json(createApiError('P2P signaling room not found or expired', true));
      }
      const ice = sanitizeP2PIcePayload(rawBody.payload);
      if (!ice) {
        return res.status(400).json(createApiError('Malformed ICE candidate payload'));
      }
      const targetList = rawRole === 'sender' ? room.senderIce : room.receiverIce;
      if (targetList.length < MAX_ICE_CANDIDATES_PER_SIDE) {
        targetList.push(ice);
      }
    }

    const okBody: PostP2PSignalResponse = {
      success: true,
      roomId: rawRoom,
      expiresAt: room.expiresAt,
    };
    return res.json(okBody);
  });

  // 2. Card Resolution & Fetch Endpoints (/api/resolve & /api/cards)
  app.get('/api/resolve', async (req, res) => {
    const slug = normalizeQueryToken(req.query.slug, 100);
    const explicitDomain =
      normalizeQueryToken(req.query.domain, 255) ||
      normalizeQueryToken(req.query.host, 255);
    const headerHost = normalizeQueryToken(req.headers.host, 255);
    const baseDomain = (process.env.BASE_DOMAIN || 'eerum.goguma.app').toLowerCase();

    try {
      if (slug) {
        const card = await storage.getCardBySlug(slug);
        if (card) {
          await storage.recordCardView(card.id, {
            referrer: req.get('referer') || null,
            country: req.get('cf-ipcountry') || null,
            userAgent: req.get('user-agent') || null,
          });
          const body: ResolveCardResponse<StoredCard> = {
            success: true,
            card,
            matchType: 'slug',
          };
          return res.json(body);
        }
      }

      const targetDomain =
        explicitDomain ||
        (headerHost && !isPlatformDomain(headerHost, baseDomain) ? headerHost : null);

      if (targetDomain) {
        const card = await storage.getCardByDomain(targetDomain);
        if (card) {
          await storage.recordCardView(card.id, {
            referrer: req.get('referer') || null,
            country: req.get('cf-ipcountry') || null,
            userAgent: req.get('user-agent') || null,
          });
          const body: ResolveCardResponse<StoredCard> = {
            success: true,
            card,
            matchType: 'custom_domain',
          };
          return res.json(body);
        }
      }

      const notFoundBody: ResolveCardResponse<StoredCard> = createApiError(
        'Card not found',
        true
      );
      return res.status(404).json(notFoundBody);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Resolve failed';
      return res.status(500).json(createApiError(msg));
    }
  });

  app.get('/api/cards', async (req, res) => {
    const slug = normalizeQueryToken(req.query.slug, 100);
    const domain = normalizeQueryToken(req.query.domain, 255);

    try {
      if (slug) {
        const card = await storage.getCardBySlug(slug);
        if (card) {
          await storage.recordCardView(card.id, {
            referrer: req.get('referer') || null,
            country: req.get('cf-ipcountry') || null,
            userAgent: req.get('user-agent') || null,
          });
          const body: GetCardsResponse<StoredCard> = { success: true, card };
          return res.json(body);
        }
        const errBody: GetCardsResponse<StoredCard> = createApiError(
          'Card not found for slug',
          true
        );
        return res.status(404).json(errBody);
      }

      if (domain) {
        const card = await storage.getCardByDomain(domain);
        if (card) {
          await storage.recordCardView(card.id, {
            referrer: req.get('referer') || null,
            country: req.get('cf-ipcountry') || null,
            userAgent: req.get('user-agent') || null,
          });
          const body: GetCardsResponse<StoredCard> = { success: true, card };
          return res.json(body);
        }
        const errBody: GetCardsResponse<StoredCard> = createApiError(
          'Card not found for custom domain',
          true
        );
        return res.status(404).json(errBody);
      }

      const allCards = await storage.listPublicCards(50);
      const body: GetCardsResponse<StoredCard> = { success: true, cards: allCards };
      return res.json(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Query failed';
      return res.status(500).json(createApiError(msg));
    }
  });

  app.post('/api/cards', async (req, res) => {
    const payload = req.body as Record<string, unknown> | null;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      const errBody: UpsertCardResponse = createApiError('Invalid payload');
      return res.status(400).json(errBody);
    }

    const validSlug = normalizeQueryToken(payload.slug, 100);
    if (!validSlug || !/^[a-z0-9_-]{1,100}$/.test(validSlug)) {
      const errBody: UpsertCardResponse = createApiError('Valid slug is required');
      return res.status(400).json(errBody);
    }

    const requestedId = sanitizeCardId(payload.id) || crypto.randomUUID();
    const normalizedCustomDomain =
      normalizeQueryToken(payload.customDomain ?? payload.custom_domain, 255) || null;
    const incomingOwnerKey = extractIncomingOwnerKey(req, payload);

    try {
      const existingBySlug = await storage.getCardAuthBySlug(validSlug);
      const existingById = await storage.getCardAuthById(requestedId);

      let targetId = requestedId;
      let ownerKeyHash: string;
      let issuedOwnerKey: string | undefined;
      let isNewClaim = false;

      if (existingBySlug) {
        if (!existingBySlug.ownerKeyHash || !incomingOwnerKey) {
          return res
            .status(403)
            .json(createApiError('Forbidden: valid ownerKey is required to update this slug'));
        }

        const incomingHash = await hashOwnerKeySha256(incomingOwnerKey);
        if (!constantTimeEqual(incomingHash, existingBySlug.ownerKeyHash)) {
          return res
            .status(403)
            .json(createApiError('Forbidden: ownerKey mismatch for this slug'));
        }

        if (existingById && existingById.id !== existingBySlug.id) {
          return res
            .status(403)
            .json(createApiError('Forbidden: slug belongs to another card record'));
        }

        targetId = existingBySlug.id;
        ownerKeyHash = existingBySlug.ownerKeyHash;
      } else if (existingById) {
        // Existing card updating its slug to an unclaimed slug: verify ownership of the card ID
        if (!existingById.ownerKeyHash || !incomingOwnerKey) {
          return res
            .status(403)
            .json(createApiError('Forbidden: valid ownerKey is required to update this card'));
        }

        const incomingHash = await hashOwnerKeySha256(incomingOwnerKey);
        if (!constantTimeEqual(incomingHash, existingById.ownerKeyHash)) {
          return res
            .status(403)
            .json(createApiError('Forbidden: ownerKey mismatch for this card'));
        }

        targetId = existingById.id;
        ownerKeyHash = existingById.ownerKeyHash;
      } else {
        // First time claiming this slug: accept strong client token (>= 8 chars) or issue a fresh UUID
        if (incomingOwnerKey && incomingOwnerKey.length < 8) {
          return res
            .status(400)
            .json(createApiError('ownerKey must be at least 8 characters'));
        }

        issuedOwnerKey = incomingOwnerKey || crypto.randomUUID();
        ownerKeyHash = await hashOwnerKeySha256(issuedOwnerKey);
        isNewClaim = true;
      }

      const upsertInput = buildUpsertInputFromPayload(
        payload,
        targetId,
        validSlug,
        normalizedCustomDomain,
        ownerKeyHash
      );

      await storage.upsertCard(upsertInput);

      const body: UpsertCardResponse = {
        success: true,
        id: targetId,
        slug: validSlug,
        created: isNewClaim,
        ...(isNewClaim && issuedOwnerKey ? { ownerKey: issuedOwnerKey } : {}),
      };
      return res.json(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Write failed';
      if (msg.includes('UNIQUE constraint failed')) {
        return res
          .status(409)
          .json(createApiError('Slug or custom domain is already in use'));
      }
      return res.status(500).json(createApiError(msg));
    }
  });

  return { app, storage };
}

export async function startServer() {
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';
  const { app } = await createServerApp();
  const httpServer = http.createServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    httpServer.on('upgrade', (req, socket) => {
      socket.destroy();
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(
      express.static(distPath, {
        maxAge: '1y',
        immutable: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
          } else if (
            filePath.endsWith('.json') ||
            filePath.endsWith('.webmanifest') ||
            filePath.endsWith('robots.txt') ||
            filePath.endsWith('sitemap.xml')
          ) {
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');
          } else if (
            !filePath.includes(`${path.sep}assets${path.sep}`) &&
            (filePath.endsWith('.png') || filePath.endsWith('.svg') || filePath.endsWith('.ico'))
          ) {
            res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
          }
        },
      })
    );
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });

  return httpServer;
}

const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  startServer();
}
