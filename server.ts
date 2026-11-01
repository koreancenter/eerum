import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { INITIAL_CARDS } from './src/constants/sampleCards.ts';
import type { StoredCard } from './src/types/card.ts';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '25mb' }));

// In-memory sync wallet store for local-first peer synchronization
const syncStore: Record<string, StoredCard[]> = {};
const cardStore: Record<string, StoredCard> = {};

// Pre-seed sample cards into cardStore for instant public URL resolution
INITIAL_CARDS.forEach(card => {
  if (card?.id) cardStore[card.id] = card;
  if (card?.slug) cardStore[`slug:${card.slug}`] = card;
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Korean Center Card Studio',
    architecture: 'Zero-AI Local-First & Quiet Luxury Minimalist'
  });
});

// 1. Cross-Device Anonymous Sync Endpoints (/api/sync)
app.get('/api/sync', (req, res) => {
  const syncId = (req.query.id as string) || '';
  if (!syncId) {
    return res.status(400).json({ error: 'Sync ID is required' });
  }

  const cards = syncStore[syncId] || [];
  return res.json({ success: true, syncId, cards });
});

app.post('/api/sync', (req, res) => {
  const { syncId, cards } = req.body;
  if (!syncId || !Array.isArray(cards)) {
    return res.status(400).json({ error: 'Invalid sync payload' });
  }

  syncStore[syncId] = cards;
  // Index ONLY personal owned cards into public cardStore so vault copies never overwrite public slugs
  cards.forEach(card => {
    if (card?.isMyCard) {
      if (card.id) cardStore[card.id] = card;
      if (card.slug) cardStore[`slug:${card.slug.toLowerCase()}`] = card;
    }
  });

  return res.json({ success: true, syncId, count: cards.length });
});

// 2. Card Resolution & Fetch Endpoints (/api/resolve & /api/cards)
app.get('/api/resolve', (req, res) => {
  const slug = ((req.query.slug as string) || '').toLowerCase();
  const host = ((req.query.host as string) || req.headers.host || '').toLowerCase().replace(/:\d+$/, '');

  if (slug) {
    const card = cardStore[`slug:${slug}`] || Object.values(cardStore).find(c => c?.slug?.toLowerCase() === slug || c?.id?.toLowerCase() === slug);
    if (card) return res.json({ success: true, card, matchType: 'slug' });
  }

  const baseDomain = (process.env.BASE_DOMAIN || 'card.goguma.app').toLowerCase();
  if (
    host &&
    host !== baseDomain &&
    !host.includes('localhost') &&
    !host.includes('127.0.0.1') &&
    !host.includes('.run.app') &&
    !host.includes('.web.app') &&
    !host.includes('.workers.dev') &&
    !host.includes('.pages.dev')
  ) {
    const card = Object.values(cardStore).find(c => c?.customDomain && c.customDomain.toLowerCase() === host);
    if (card) return res.json({ success: true, card, matchType: 'custom_domain' });
  }

  return res.status(404).json({ success: false, notFound: true, message: 'Card not found' });
});

app.get('/api/cards', (req, res) => {
  const slug = ((req.query.slug as string) || '').trim().toLowerCase();
  const domain = ((req.query.domain as string) || '').trim().toLowerCase();

  if (slug) {
    const card =
      cardStore[`slug:${slug}`] ||
      Object.values(cardStore).find(
        c => c?.slug?.toLowerCase() === slug || c?.id?.toLowerCase() === slug
      );
    if (card) return res.json({ card });
    return res.status(404).json({ error: 'Card not found for slug' });
  }

  if (domain) {
    const card = Object.values(cardStore).find(c => c?.customDomain?.toLowerCase() === domain);
    if (card) return res.json({ card });
    return res.status(404).json({ error: 'Card not found for custom domain' });
  }

  // Return all cached cards
  const allCards = Object.values(cardStore).filter((v, i, self) => v?.id && self.findIndex(o => o.id === v.id) === i);
  return res.json({ cards: allCards });
});

app.post('/api/cards', (req, res) => {
  const card = req.body;
  if (!card || !card.id) {
    return res.status(400).json({ error: 'Card data with id is required' });
  }

  cardStore[card.id] = card;
  if (card.slug) cardStore[`slug:${card.slug}`] = card;

  return res.json({ success: true, id: card.id, slug: card.slug });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
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

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
