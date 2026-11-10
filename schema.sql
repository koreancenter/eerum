-- ========================================================
-- Cloudflare D1 Database Schema for eerum.goguma.app
-- Edge SQLite Database for Multi-User Digital Business Cards
-- ========================================================

PRAGMA foreign_keys = ON;

-- 1. Cards Table (Aligned with worker.ts prepared statements & StoredCard model)
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    custom_domain TEXT UNIQUE,
    owner_key TEXT,
    owner_email TEXT,
    creation_mode TEXT NOT NULL DEFAULT 'template' CHECK (creation_mode IN ('template', 'custom_html', 'photo')),
    theme TEXT NOT NULL DEFAULT 'pure_white',
    category TEXT NOT NULL DEFAULT '글로벌 네트워크',
    is_my_card INTEGER NOT NULL DEFAULT 0 CHECK (is_my_card IN (0, 1)),
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    notes TEXT,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fast Edge Routing & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_cards_slug ON cards(slug);
CREATE INDEX IF NOT EXISTS idx_cards_custom_domain ON cards(custom_domain);
CREATE INDEX IF NOT EXISTS idx_cards_owner_key ON cards(owner_key);
CREATE INDEX IF NOT EXISTS idx_cards_owner_email ON cards(owner_email);
CREATE INDEX IF NOT EXISTS idx_cards_updated_at ON cards(updated_at DESC);

-- 2. Card View Logs Table
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

CREATE INDEX IF NOT EXISTS idx_card_views_card_id ON card_views(card_id);

-- 3. Wallets Table (Anonymous Cross-Device Sync)
CREATE TABLE IF NOT EXISTS wallets (
    sync_id TEXT PRIMARY KEY,
    cards_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_updated_at ON wallets(updated_at DESC);
