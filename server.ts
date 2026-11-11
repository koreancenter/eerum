import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { INITIAL_CARDS } from './src/constants/sampleCards.ts';
import type { StoredCard } from './src/types/card.ts';
import {
  createApiError,
  isPlatformDomain,
  isValidSyncId,
  normalizeQueryToken,
  type GetCardsResponse,
  type GetSyncWalletResponse,
  type PostSyncWalletResponse,
  type ResolveCardResponse,
  type UpsertCardResponse,
} from './src/types/api.ts';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const app = express();
const port = 3000;

app.use(express.json({ limit: '25mb' }));

// In-memory sync wallet store for local-first peer synchronization
const syncStore: Record<string, StoredCard[]> = {};
const cardStore: Record<string, StoredCard> = {};

// Pre-seed sample cards into cardStore for instant public URL resolution
INITIAL_CARDS.forEach((card) => {
  if (card?.id) cardStore[card.id] = card;
  if (card?.slug) cardStore[`slug:${card.slug.toLowerCase()}`] = card;
});

function findCardBySlug(slug: string): StoredCard | undefined {
  return (
    cardStore[`slug:${slug}`] ||
    Object.values(cardStore).find(
      (c) => c?.slug?.toLowerCase() === slug || c?.id?.toLowerCase() === slug
    )
  );
}

function findCardByDomain(domain: string): StoredCard | undefined {
  return Object.values(cardStore).find(
    (c) => c?.customDomain && normalizeQueryToken(c.customDomain) === domain
  );
}

// SEO Crawler Endpoints for Lighthouse & Search Engines
app.get('/robots.txt', (req, res) => {
  res.type('text/plain; charset=utf-8');
  res.send(`User-agent: *\nAllow: /\n\nSitemap: https://${process.env.BASE_DOMAIN || 'eerum.goguma.app'}/sitemap.xml\n`);
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
  });
});

// 1. Cross-Device Anonymous Sync Endpoints (/api/sync)
app.get('/api/sync', (req, res) => {
  const rawSyncId = typeof req.query.id === 'string' ? req.query.id : '';
  if (!isValidSyncId(rawSyncId)) {
    const errBody: GetSyncWalletResponse<StoredCard> = createApiError(
      'Sync ID invalid or missing'
    );
    return res.status(400).json(errBody);
  }

  const syncId = rawSyncId.trim();
  const cards = syncStore[syncId] || [];
  const body: GetSyncWalletResponse<StoredCard> = { success: true, syncId, cards };
  return res.json(body);
});

app.post('/api/sync', (req, res) => {
  const { syncId: rawSyncId, cards } = req.body || {};
  if (!isValidSyncId(rawSyncId) || !Array.isArray(cards)) {
    const errBody: PostSyncWalletResponse = createApiError(
      'Valid Sync ID and cards array required'
    );
    return res.status(400).json(errBody);
  }

  const syncId = rawSyncId.trim();
  syncStore[syncId] = cards;
  // Index ONLY personal owned cards into public cardStore so vault copies never overwrite public slugs
  cards.forEach((card: StoredCard) => {
    if (card?.isMyCard) {
      if (card.id) cardStore[card.id] = card;
      if (card.slug) cardStore[`slug:${card.slug.toLowerCase()}`] = card;
    }
  });

  const body: PostSyncWalletResponse = {
    success: true,
    syncId,
    count: cards.length,
  };
  return res.json(body);
});

// 2. Card Resolution & Fetch Endpoints (/api/resolve & /api/cards)
app.get('/api/resolve', (req, res) => {
  const slug = normalizeQueryToken(req.query.slug, 100);
  const explicitDomain =
    normalizeQueryToken(req.query.domain, 255) ||
    normalizeQueryToken(req.query.host, 255);
  const headerHost = normalizeQueryToken(req.headers.host, 255);
  const baseDomain = (process.env.BASE_DOMAIN || 'eerum.goguma.app').toLowerCase();

  if (slug) {
    const card = findCardBySlug(slug);
    if (card) {
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
    const card = findCardByDomain(targetDomain);
    if (card) {
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
});

app.get('/api/cards', (req, res) => {
  const slug = normalizeQueryToken(req.query.slug, 100);
  const domain = normalizeQueryToken(req.query.domain, 255);

  if (slug) {
    const card = findCardBySlug(slug);
    if (card) {
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
    const card = findCardByDomain(domain);
    if (card) {
      const body: GetCardsResponse<StoredCard> = { success: true, card };
      return res.json(body);
    }
    const errBody: GetCardsResponse<StoredCard> = createApiError(
      'Card not found for custom domain',
      true
    );
    return res.status(404).json(errBody);
  }

  const allCards = Object.values(cardStore).filter(
    (v, i, self) => v?.id && self.findIndex((o) => o.id === v.id) === i
  );
  const body: GetCardsResponse<StoredCard> = { success: true, cards: allCards };
  return res.json(body);
});

app.post('/api/cards', (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const errBody: UpsertCardResponse = createApiError('Invalid payload');
    return res.status(400).json(errBody);
  }

  const validId =
    (typeof payload.id === 'string' && payload.id.trim().slice(0, 64)) ||
    crypto.randomUUID();
  const validSlug = normalizeQueryToken(payload.slug, 100);

  if (!validSlug) {
    const errBody: UpsertCardResponse = createApiError('Slug is required');
    return res.status(400).json(errBody);
  }

  const normalizedCustomDomain =
    normalizeQueryToken(payload.customDomain ?? payload.custom_domain, 255) ||
    undefined;

  const storedCard: StoredCard = {
    ...payload,
    id: validId,
    slug: validSlug,
    ...(normalizedCustomDomain ? { customDomain: normalizedCustomDomain } : {}),
  };

  cardStore[validId] = storedCard;
  cardStore[`slug:${validSlug}`] = storedCard;

  const body: UpsertCardResponse = {
    success: true,
    id: validId,
    slug: validSlug,
  };
  return res.json(body);
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
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
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
