/**
 * Production Serverless Edge Worker for Korean Center Digital Card Studio
 * Configured as the single authoritative serverless entry point via wrangler.toml (main = "worker.ts").
 * Enforces Zero-Trust parameter binding on Cloudflare D1 with zero string concatenation.
 */

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
  custom_domain?: unknown;
  owner_key?: unknown;
  theme?: unknown;
  data?: unknown;
}

export interface SyncWalletPayload {
  syncId?: unknown;
  cards?: unknown;
}

export interface Env {
  DB: D1DatabaseLike;
  R2?: unknown;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  GEMINI_API_KEY?: string;
  BASE_DOMAIN?: string;
}

// Static Prepared SQL Statements (Strictly Zero String Concatenation)
const SQL_SELECT_CARD_BY_DOMAIN = "SELECT * FROM cards WHERE custom_domain = ? LIMIT 1";
const SQL_SELECT_CARD_BY_SLUG = "SELECT * FROM cards WHERE slug = ? LIMIT 1";
const SQL_SELECT_RECENT_CARDS = "SELECT * FROM cards ORDER BY updated_at DESC LIMIT 50";
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
const SQL_SELECT_WALLET = "SELECT cards_json FROM wallets WHERE sync_id = ? LIMIT 1";
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Standard CORS headers for client-side queries
    const corsHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Health check & Architecture Diagnostic
    if (url.pathname === "/api/health" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "Korean Center Card Studio",
          runtime: "Cloudflare Edge Worker (Unified Serverless Entry Point)",
          timestamp: new Date().toISOString(),
        }),
        { headers: corsHeaders }
      );
    }

    // 2. Direct Card Resolution: GET /api/resolve?slug=...
    if (url.pathname === "/api/resolve" && request.method === "GET") {
      const rawSlug = url.searchParams.get("slug") || "";
      const rawHost = request.headers.get("host") || "";
      const slug = sanitizeParam(rawSlug, 100);
      const host = sanitizeParam(rawHost.toLowerCase().replace(/:\d+$/, ""), 255);

      try {
        let card: D1CardRow | null = null;

        // Custom domain routing (host match) via bound prepared query
        const baseDomain = env.BASE_DOMAIN || "card.goguma.app";
        if (host && !host.includes(baseDomain) && !host.includes("localhost") && !host.includes("127.0.0.1")) {
          card = await env.DB.prepare(SQL_SELECT_CARD_BY_DOMAIN).bind(host).first<D1CardRow>();
        } 
        // Standard slug lookup via bound prepared query
        else if (slug) {
          card = await env.DB.prepare(SQL_SELECT_CARD_BY_SLUG).bind(slug).first<D1CardRow>();
        }

        if (!card) {
          return new Response(
            JSON.stringify({ success: false, notFound: true, message: "Card not found" }),
            { status: 404, headers: corsHeaders }
          );
        }

        // Parse JSON data if stored as string in D1
        if (typeof card.data === 'string') {
          try {
            card.data = JSON.parse(card.data);
          } catch {
            // Keep as string if parsing fails
          }
        }

        return new Response(
          JSON.stringify({ success: true, card }),
          { headers: corsHeaders }
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Query failed";
        return new Response(
          JSON.stringify({ success: false, error: message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 3. Card Query: GET /api/cards?slug=... or GET /api/cards?domain=...
    if (url.pathname === "/api/cards" && request.method === "GET") {
      const slug = sanitizeParam(url.searchParams.get("slug"), 100);
      const domain = sanitizeParam(url.searchParams.get("domain"), 255);

      try {
        if (slug) {
          const card = await env.DB.prepare(SQL_SELECT_CARD_BY_SLUG).bind(slug).first<D1CardRow>();
          if (!card) {
            return new Response(
              JSON.stringify({ error: "Card not found for slug" }),
              { status: 404, headers: corsHeaders }
            );
          }
          if (typeof card.data === 'string') {
            try { card.data = JSON.parse(card.data); } catch {}
          }
          return new Response(JSON.stringify({ card }), { headers: corsHeaders });
        }

        if (domain) {
          const card = await env.DB.prepare(SQL_SELECT_CARD_BY_DOMAIN).bind(domain).first<D1CardRow>();
          if (!card) {
            return new Response(
              JSON.stringify({ error: "Card not found for custom domain" }),
              { status: 404, headers: corsHeaders }
            );
          }
          if (typeof card.data === 'string') {
            try { card.data = JSON.parse(card.data); } catch {}
          }
          return new Response(JSON.stringify({ card }), { headers: corsHeaders });
        }

        // Fetch recent cards collection
        const { results = [] } = await env.DB.prepare(SQL_SELECT_RECENT_CARDS).all<D1CardRow>();
        const cards = results.map((c: D1CardRow) => {
          if (typeof c.data === 'string') {
            try { c.data = JSON.parse(c.data); } catch {}
          }
          return c;
        });

        return new Response(JSON.stringify({ cards }), { headers: corsHeaders });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Query failed";
        return new Response(
          JSON.stringify({ error: message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 4. Card Upsert: POST /api/cards
    if (url.pathname === "/api/cards" && request.method === "POST") {
      try {
        const body = (await request.json()) as CardUpsertPayload | null;
        if (!body || typeof body !== 'object') {
          return new Response(
            JSON.stringify({ success: false, error: "Invalid payload" }),
            { status: 400, headers: corsHeaders }
          );
        }

        const { id, slug, custom_domain, owner_key, theme, data } = body;
        const validId = sanitizeParam(id, 64) || crypto.randomUUID();
        const validSlug = sanitizeParam(slug, 100);

        if (!validSlug) {
          return new Response(
            JSON.stringify({ success: false, error: "Slug is required" }),
            { status: 400, headers: corsHeaders }
          );
        }

        const validDomain = sanitizeParam(custom_domain, 255);
        const validOwnerKey = sanitizeParam(owner_key, 128);
        const validTheme = sanitizeParam(theme, 32) || "pure_white";
        const validData = typeof data === "string" ? data : JSON.stringify(data || {});

        await env.DB.prepare(SQL_UPSERT_CARD).bind(
          validId,
          validSlug,
          validDomain,
          validOwnerKey,
          validTheme,
          validData
        ).run();

        return new Response(
          JSON.stringify({ success: true, id: validId, slug: validSlug }),
          { headers: corsHeaders }
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Write failed";
        return new Response(
          JSON.stringify({ success: false, error: message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 5. Cross-Device Anonymous Sync: GET /api/sync?id=sync_xxxx
    if (url.pathname === "/api/sync" && request.method === "GET") {
      const rawSyncId = url.searchParams.get("id") || "";
      if (!rawSyncId || !/^[a-zA-Z0-9_\-]{3,64}$/.test(rawSyncId)) {
        return new Response(
          JSON.stringify({ success: false, message: "Sync ID invalid or missing" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const syncId = rawSyncId.trim();

      try {
        const wallet = await env.DB.prepare(SQL_SELECT_WALLET).bind(syncId).first<D1WalletRow>();

        return new Response(
          JSON.stringify({
            success: true,
            syncId,
            cards: wallet && wallet.cards_json ? JSON.parse(wallet.cards_json) : []
          }),
          { headers: corsHeaders }
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Sync fetch failed";
        return new Response(
          JSON.stringify({ success: false, error: message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 6. Cross-Device Anonymous Sync: POST /api/sync
    if (url.pathname === "/api/sync" && request.method === "POST") {
      try {
        const body = (await request.json()) as SyncWalletPayload | null;
        const { syncId, cards } = body || {};

        if (!syncId || typeof syncId !== 'string' || !/^[a-zA-Z0-9_\-]{3,64}$/.test(syncId) || !Array.isArray(cards)) {
          return new Response(
            JSON.stringify({ success: false, message: "Valid Sync ID and cards array required" }),
            { status: 400, headers: corsHeaders }
          );
        }

        const cardsJson = JSON.stringify(cards);

        await env.DB.prepare(SQL_UPSERT_WALLET).bind(syncId.trim(), cardsJson).run();

        return new Response(
          JSON.stringify({ success: true, syncId, count: cards.length }),
          { headers: corsHeaders }
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Sync save failed";
        return new Response(
          JSON.stringify({ success: false, error: message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 7. Local Photo Scan Confirmation Endpoint: POST /api/scan-card
    if (url.pathname === "/api/scan-card" && request.method === "POST") {
      return new Response(
        JSON.stringify({
          success: true,
          localOnly: true,
          message: "Zero-AI Local Photo Archiving Active: 카드 사진이 브라우저 로컬 저장소에 안전하게 보관되었습니다."
        }),
        { headers: corsHeaders }
      );
    }

    // 8. Custom HTML / Tailwind Generator Fallback: POST /api/generate-card-html
    if (url.pathname === "/api/generate-card-html" && request.method === "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          fallback: true,
          message: "Custom HTML template presets are served client-side."
        }),
        { headers: corsHeaders }
      );
    }

    // 9. Static Asset Fallback (Vite Single Page App)
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};