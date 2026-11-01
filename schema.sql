-- ========================================================
-- Cloudflare D1 Database Schema for card.goguma.app
-- Edge SQLite Database for Multi-User Digital Business Cards
-- ========================================================

-- Cards Table
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    custom_domain TEXT UNIQUE,
    owner_email TEXT,
    theme TEXT NOT NULL DEFAULT 'sand',
    category TEXT DEFAULT '글로벌 네트워크',
    is_default INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    notes TEXT,
    data TEXT NOT NULL, -- JSON string representing CardData
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fast Edge Routing Indexes
CREATE INDEX IF NOT EXISTS idx_cards_slug ON cards(slug);
CREATE INDEX IF NOT EXISTS idx_cards_custom_domain ON cards(custom_domain);
CREATE INDEX IF NOT EXISTS idx_cards_owner_email ON cards(owner_email);

-- Optional Analytics / Card View Logs (in R2 or D1)
CREATE TABLE IF NOT EXISTS card_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT NOT NULL,
    referrer TEXT,
    country TEXT,
    user_agent TEXT,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_card_views_card_id ON card_views(card_id);

-- Wallets Table (Anonymous Cross-Device Sync)
CREATE TABLE IF NOT EXISTS wallets (
    sync_id TEXT PRIMARY KEY,
    cards_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_sync_id ON wallets(sync_id);
