import type { StoredCard } from '../src/types/card.ts';
import {
  rowToPublicStoredCard,
  type CardAuthRecord,
  type CardDbRow,
  type CardStorageAdapter,
  type CardViewMeta,
  type D1DatabaseLike,
  type UpsertCardRecordInput,
} from './storageTypes.ts';

const SQL_SELECT_CARD_BY_SLUG = 'SELECT * FROM cards WHERE slug = ? LIMIT 1';
const SQL_SELECT_CARD_BY_DOMAIN = 'SELECT * FROM cards WHERE custom_domain = ? LIMIT 1';
const SQL_SELECT_AUTH_BY_SLUG =
  'SELECT id, slug, owner_key_hash FROM cards WHERE slug = ? LIMIT 1';
const SQL_SELECT_AUTH_BY_ID =
  'SELECT id, slug, owner_key_hash FROM cards WHERE id = ? LIMIT 1';
const SQL_SELECT_RECENT_CARDS = 'SELECT * FROM cards ORDER BY updated_at DESC LIMIT ?';

const SQL_UPSERT_CARD = `
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
`;

const SQL_INSERT_CARD_VIEW = `
  INSERT INTO card_views (card_id, referrer, country, user_agent, viewed_at)
  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
`;
const SQL_INCREMENT_VIEW_COUNT =
  'UPDATE cards SET view_count = view_count + 1 WHERE id = ?';
const SQL_SELECT_VIEW_COUNT = 'SELECT view_count FROM cards WHERE id = ? LIMIT 1';

const SQL_SELECT_WALLET = 'SELECT cards_json FROM wallets WHERE sync_id = ? LIMIT 1';
const SQL_UPSERT_WALLET = `
  INSERT INTO wallets (sync_id, cards_json, updated_at)
  VALUES (?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(sync_id) DO UPDATE SET
    cards_json = excluded.cards_json,
    updated_at = CURRENT_TIMESTAMP
`;

export class D1StorageAdapter implements CardStorageAdapter {
  public readonly kind = 'd1' as const;
  private readonly db: D1DatabaseLike;

  constructor(db: D1DatabaseLike) {
    this.db = db;
  }

  async init(): Promise<void> {
    // Cloudflare D1 schema is provisioned via schema.sql migrations.
  }

  async getCardBySlug(slug: string): Promise<StoredCard | null> {
    const row = await this.db
      .prepare(SQL_SELECT_CARD_BY_SLUG)
      .bind(slug)
      .first<CardDbRow>();
    return row ? rowToPublicStoredCard(row) : null;
  }

  async getCardByDomain(domain: string): Promise<StoredCard | null> {
    const row = await this.db
      .prepare(SQL_SELECT_CARD_BY_DOMAIN)
      .bind(domain)
      .first<CardDbRow>();
    return row ? rowToPublicStoredCard(row) : null;
  }

  async getCardAuthBySlug(slug: string): Promise<CardAuthRecord | null> {
    const row = await this.db
      .prepare(SQL_SELECT_AUTH_BY_SLUG)
      .bind(slug)
      .first<{ id: string; slug: string; owner_key_hash?: string | null }>();
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      ownerKeyHash: row.owner_key_hash ?? null,
    };
  }

  async getCardAuthById(id: string): Promise<CardAuthRecord | null> {
    const row = await this.db
      .prepare(SQL_SELECT_AUTH_BY_ID)
      .bind(id)
      .first<{ id: string; slug: string; owner_key_hash?: string | null }>();
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      ownerKeyHash: row.owner_key_hash ?? null,
    };
  }

  async listPublicCards(limit = 50): Promise<StoredCard[]> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    const { results = [] } = await this.db
      .prepare(SQL_SELECT_RECENT_CARDS)
      .bind(safeLimit)
      .all<CardDbRow>();
    return results.map(rowToPublicStoredCard);
  }

  async upsertCard(input: UpsertCardRecordInput): Promise<void> {
    await this.db
      .prepare(SQL_UPSERT_CARD)
      .bind(
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
      )
      .run();
  }

  async recordCardView(cardId: string, meta?: CardViewMeta): Promise<void> {
    try {
      await this.db
        .prepare(SQL_INSERT_CARD_VIEW)
        .bind(
          cardId,
          meta?.referrer ? meta.referrer.slice(0, 512) : null,
          meta?.country ? meta.country.slice(0, 16) : null,
          meta?.userAgent ? meta.userAgent.slice(0, 512) : null
        )
        .run();
      await this.db.prepare(SQL_INCREMENT_VIEW_COUNT).bind(cardId).run();
    } catch {
      // Non-fatal view analytics
    }
  }

  async getCardViewCount(cardId: string): Promise<number> {
    const row = await this.db
      .prepare(SQL_SELECT_VIEW_COUNT)
      .bind(cardId)
      .first<{ view_count?: number }>();
    return typeof row?.view_count === 'number' ? row.view_count : 0;
  }

  async getWallet(syncId: string): Promise<StoredCard[]> {
    const row = await this.db
      .prepare(SQL_SELECT_WALLET)
      .bind(syncId)
      .first<{ cards_json?: string | null }>();
    if (!row?.cards_json) return [];
    try {
      const parsed = JSON.parse(row.cards_json);
      return Array.isArray(parsed) ? (parsed as StoredCard[]) : [];
    } catch {
      return [];
    }
  }

  async saveWallet(syncId: string, cards: StoredCard[]): Promise<void> {
    await this.db
      .prepare(SQL_UPSERT_WALLET)
      .bind(syncId, JSON.stringify(cards))
      .run();
  }
}
