import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { INITIAL_CARDS } from '../src/constants/sampleCards.ts';
import type { StoredCard } from '../src/types/card.ts';
import { normalizeQueryToken } from '../src/types/api.ts';
import {
  buildUpsertInputFromPayload,
  hashOwnerKeySha256,
  rowToPublicStoredCard,
  type CardAuthRecord,
  type CardDbRow,
  type CardStorageAdapter,
  type CardViewMeta,
  type UpsertCardRecordInput,
} from './storageTypes.ts';

interface SqliteStatementLike {
  get(...params: Array<string | number | null>): Record<string, unknown> | undefined;
  all(...params: Array<string | number | null>): Array<Record<string, unknown>>;
  run(...params: Array<string | number | null>): unknown;
}

interface SqliteDatabaseLike {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatementLike;
  close(): void;
}

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    custom_domain TEXT UNIQUE,
    owner_key TEXT,
    owner_key_hash TEXT,
    owner_email TEXT,
    creation_mode TEXT NOT NULL DEFAULT 'template' CHECK (creation_mode IN ('template', 'custom_html', 'photo')),
    theme TEXT NOT NULL DEFAULT 'pure_white',
    category TEXT NOT NULL DEFAULT '글로벌 네트워크',
    is_my_card INTEGER NOT NULL DEFAULT 0 CHECK (is_my_card IN (0, 1)),
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    notes TEXT,
    data TEXT NOT NULL DEFAULT '{}',
    extra_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS card_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT NOT NULL,
    referrer TEXT,
    country TEXT,
    user_agent TEXT,
    viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_card_views_card
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallets (
    sync_id TEXT PRIMARY KEY,
    cards_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

const INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_cards_slug ON cards(slug);
CREATE INDEX IF NOT EXISTS idx_cards_custom_domain ON cards(custom_domain);
CREATE INDEX IF NOT EXISTS idx_cards_owner_key ON cards(owner_key);
CREATE INDEX IF NOT EXISTS idx_cards_owner_key_hash ON cards(owner_key_hash);
CREATE INDEX IF NOT EXISTS idx_cards_owner_email ON cards(owner_email);
CREATE INDEX IF NOT EXISTS idx_cards_updated_at ON cards(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_views_card_id ON card_views(card_id);
CREATE INDEX IF NOT EXISTS idx_wallets_updated_at ON wallets(updated_at DESC);
`;

export class SqliteStorageAdapter implements CardStorageAdapter {
  public readonly kind = 'sqlite' as const;
  private readonly dbPath: string;
  private db: SqliteDatabaseLike | null = null;

  constructor(dbPath?: string) {
    this.dbPath =
      dbPath ||
      process.env.SQLITE_DB_PATH ||
      path.resolve(process.cwd(), 'data', 'eerum.db');
  }

  private getDb(): SqliteDatabaseLike {
    if (!this.db) {
      throw new Error('SqliteStorageAdapter not initialized');
    }
    return this.db;
  }

  async init(): Promise<void> {
    if (this.db) return;

    if (this.dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    }

    const sqliteMod = (await import(/* @vite-ignore */ 'node:sqlite' as string)) as {
      DatabaseSync: new (location: string) => SqliteDatabaseLike;
    };

    const db = new sqliteMod.DatabaseSync(this.dbPath);
    db.exec(SCHEMA_SQL);

    // Safe additive column migrations for pre-existing database files
    const columns = db.prepare('PRAGMA table_info(cards)').all() as Array<{
      name?: string;
    }>;
    const columnNames = new Set(columns.map((col) => col.name));
    if (!columnNames.has('owner_key_hash')) {
      db.exec('ALTER TABLE cards ADD COLUMN owner_key_hash TEXT;');
    }
    if (!columnNames.has('extra_json')) {
      db.exec("ALTER TABLE cards ADD COLUMN extra_json TEXT NOT NULL DEFAULT '{}';");
    }

    db.exec(INDEX_SQL);
    this.db = db;

    await this.seedInitialCards();
  }

  private async seedInitialCards(): Promise<void> {
    const db = this.getDb();
    const insertSeedStmt = db.prepare(`
      INSERT OR IGNORE INTO cards (
        id, slug, custom_domain, owner_key, owner_key_hash, owner_email,
        creation_mode, theme, category, is_my_card, is_default,
        notes, data, extra_json, created_at, updated_at
      )
      VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    for (const card of INITIAL_CARDS) {
      if (!card?.id || !card?.slug) continue;
      const slug = normalizeQueryToken(card.slug, 100);
      if (!slug) continue;
      const customDomain = card.customDomain
        ? normalizeQueryToken(card.customDomain, 255)
        : null;

      // Protect demo/sample cards with an unguessable per-instance SHA-256 hash so public POSTs cannot overwrite them
      const seedSecret =
        process.env.SAMPLE_CARD_OWNER_KEY ||
        `${crypto.randomUUID()}-${card.id}`;
      const ownerKeyHash = await hashOwnerKeySha256(seedSecret);

      const input = buildUpsertInputFromPayload(
        card as unknown as Record<string, unknown>,
        card.id,
        slug,
        customDomain,
        ownerKeyHash
      );

      insertSeedStmt.run(
        input.id,
        input.slug,
        input.customDomain,
        input.ownerKeyHash,
        input.ownerEmail,
        input.creationMode,
        input.theme,
        input.category,
        input.isMyCard ? 1 : 0,
        input.isDefault ? 1 : 0,
        input.notes,
        input.dataJson,
        input.extraJson
      );
    }
  }

  async getCardBySlug(slug: string): Promise<StoredCard | null> {
    const row = this.getDb()
      .prepare('SELECT * FROM cards WHERE slug = ? LIMIT 1')
      .get(slug) as CardDbRow | undefined;
    return row ? rowToPublicStoredCard(row) : null;
  }

  async getCardByDomain(domain: string): Promise<StoredCard | null> {
    const row = this.getDb()
      .prepare('SELECT * FROM cards WHERE custom_domain = ? LIMIT 1')
      .get(domain) as CardDbRow | undefined;
    return row ? rowToPublicStoredCard(row) : null;
  }

  async getCardAuthBySlug(slug: string): Promise<CardAuthRecord | null> {
    const row = this.getDb()
      .prepare('SELECT id, slug, owner_key_hash FROM cards WHERE slug = ? LIMIT 1')
      .get(slug) as { id?: string; slug?: string; owner_key_hash?: string | null } | undefined;
    if (!row?.id || !row.slug) return null;
    return {
      id: row.id,
      slug: row.slug,
      ownerKeyHash: row.owner_key_hash ?? null,
    };
  }

  async getCardAuthById(id: string): Promise<CardAuthRecord | null> {
    const row = this.getDb()
      .prepare('SELECT id, slug, owner_key_hash FROM cards WHERE id = ? LIMIT 1')
      .get(id) as { id?: string; slug?: string; owner_key_hash?: string | null } | undefined;
    if (!row?.id || !row.slug) return null;
    return {
      id: row.id,
      slug: row.slug,
      ownerKeyHash: row.owner_key_hash ?? null,
    };
  }

  async listPublicCards(limit = 50): Promise<StoredCard[]> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    const rows = this.getDb()
      .prepare('SELECT * FROM cards ORDER BY updated_at DESC LIMIT ?')
      .all(safeLimit) as unknown as CardDbRow[];
    return rows.map(rowToPublicStoredCard);
  }

  async upsertCard(input: UpsertCardRecordInput): Promise<void> {
    this.getDb()
      .prepare(`
        INSERT INTO cards (
          id, slug, custom_domain, owner_key, owner_key_hash, owner_email,
          creation_mode, theme, category, is_my_card, is_default,
          notes, data, extra_json, created_at, updated_at
        )
        VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          slug = excluded.slug,
          custom_domain = excluded.custom_domain,
          owner_key = NULL,
          owner_key_hash = COALESCE(cards.owner_key_hash, excluded.owner_key_hash),
          owner_email = excluded.owner_email,
          creation_mode = excluded.creation_mode,
          theme = excluded.theme,
          category = excluded.category,
          is_my_card = excluded.is_my_card,
          is_default = excluded.is_default,
          notes = excluded.notes,
          data = excluded.data,
          extra_json = excluded.extra_json,
          updated_at = CURRENT_TIMESTAMP
      `)
      .run(
        input.id,
        input.slug,
        input.customDomain,
        input.ownerKeyHash,
        input.ownerEmail,
        input.creationMode,
        input.theme,
        input.category,
        input.isMyCard ? 1 : 0,
        input.isDefault ? 1 : 0,
        input.notes,
        input.dataJson,
        input.extraJson
      );
  }

  async recordCardView(cardId: string, meta?: CardViewMeta): Promise<void> {
    try {
      const db = this.getDb();
      db.prepare(`
        INSERT INTO card_views (card_id, referrer, country, user_agent, viewed_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        cardId,
        meta?.referrer ? meta.referrer.slice(0, 512) : null,
        meta?.country ? meta.country.slice(0, 16) : null,
        meta?.userAgent ? meta.userAgent.slice(0, 512) : null
      );
      db.prepare('UPDATE cards SET view_count = view_count + 1 WHERE id = ?').run(cardId);
    } catch {
      // Non-fatal view logging
    }
  }

  async getCardViewCount(cardId: string): Promise<number> {
    const row = this.getDb()
      .prepare('SELECT view_count FROM cards WHERE id = ? LIMIT 1')
      .get(cardId) as { view_count?: number } | undefined;
    return typeof row?.view_count === 'number' ? row.view_count : 0;
  }

  async getWallet(syncId: string): Promise<StoredCard[]> {
    const row = this.getDb()
      .prepare('SELECT cards_json FROM wallets WHERE sync_id = ? LIMIT 1')
      .get(syncId) as { cards_json?: string | null } | undefined;
    if (!row?.cards_json) return [];
    try {
      const parsed = JSON.parse(row.cards_json);
      return Array.isArray(parsed) ? (parsed as StoredCard[]) : [];
    } catch {
      return [];
    }
  }

  async saveWallet(syncId: string, cards: StoredCard[]): Promise<void> {
    this.getDb()
      .prepare(`
        INSERT INTO wallets (sync_id, cards_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(sync_id) DO UPDATE SET
          cards_json = excluded.cards_json,
          updated_at = CURRENT_TIMESTAMP
      `)
      .run(syncId, JSON.stringify(cards));
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
