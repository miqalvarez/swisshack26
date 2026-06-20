// SQLite DDL mirroring the UML class diagram (with a few pragmatic columns for
// the demo, flagged in comments). Kept as one string so db.ts can exec it.

export const SCHEMA = /* sql */ `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS wm (
  id          TEXT PRIMARY KEY,
  full_name   TEXT NOT NULL,
  photo_url   TEXT,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cio_mandate (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL CHECK (name IN ('defensive','balanced','growth')),
  description         TEXT,
  investment_universe TEXT,
  rebalancing_policy  TEXT,
  risk_limits         TEXT,
  is_active           INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer (
  id              TEXT PRIMARY KEY,
  wm_id           TEXT NOT NULL REFERENCES wm(id),
  cio_mandate_id  TEXT NOT NULL REFERENCES cio_mandate(id),
  full_name       TEXT NOT NULL,
  photo_url       TEXT,
  email           TEXT,
  risk_profile    TEXT NOT NULL CHECK (risk_profile IN ('conservative','balanced','aggressive')),
  base_currency   TEXT NOT NULL DEFAULT 'CHF',
  status          TEXT NOT NULL CHECK (status IN ('active','inactive','archived')),
  persona         TEXT,
  primary_contact TEXT,
  accent_color    TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comment (
  id            TEXT PRIMARY KEY,
  customer_id   TEXT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  author_wm_id  TEXT REFERENCES wm(id),
  comment_date  TEXT NOT NULL,
  channel       TEXT NOT NULL CHECK (channel IN ('call','email','meeting','whatsapp','other')),
  content       TEXT NOT NULL,
  is_private    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS holding (
  id               TEXT PRIMARY KEY,
  customer_id      TEXT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  amount           REAL NOT NULL,
  asset_type       TEXT NOT NULL CHECK (asset_type IN ('property','cash','stock','crypto','bond','fund','other')),
  currency         TEXT NOT NULL DEFAULT 'CHF',
  is_active        INTEGER NOT NULL DEFAULT 1,
  isin             TEXT,
  sector           TEXT,
  sub_asset_class  TEXT,
  region           TEXT,
  target_amount    REAL,
  valor            TEXT,
  mic              TEXT,
  ticker           TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "transaction" (
  id                 TEXT PRIMARY KEY,
  customer_id        TEXT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  source_holding_id  TEXT REFERENCES holding(id),
  target_holding_id  TEXT REFERENCES holding(id),
  transaction_type   TEXT NOT NULL CHECK (transaction_type IN ('deposit','withdrawal','buy','sell','rebalance','transfer','suggestion_execution')),
  gross_amount       REAL NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'CHF',
  executed_at        TEXT NOT NULL,
  notes              TEXT,
  created_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS news (
  id                   TEXT PRIMARY KEY,
  customer_id          TEXT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL,
  source_url           TEXT NOT NULL,
  published_at         TEXT NOT NULL,
  sentiment_score      REAL,
  relevance_score      REAL,
  related_holding_name TEXT,
  created_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suggestion (
  id                           TEXT PRIMARY KEY,
  customer_id                  TEXT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  transaction_id               TEXT REFERENCES "transaction"(id),
  old_holding_id               TEXT REFERENCES holding(id),
  news_id                      TEXT REFERENCES news(id),
  news_title                   TEXT NOT NULL,
  news_description             TEXT NOT NULL,
  news_link                    TEXT NOT NULL,
  news_date                    TEXT NOT NULL,
  potential_impact_description TEXT NOT NULL,
  exposure                     REAL NOT NULL,
  recommendation_action        TEXT NOT NULL,
  recommendation_description   TEXT NOT NULL,
  why_title                    TEXT,
  why_description              TEXT,
  new_holding_name             TEXT NOT NULL,
  new_holding_description      TEXT,
  new_holding_amount           REAL NOT NULL,
  new_holding_type             TEXT NOT NULL CHECK (new_holding_type IN ('property','cash','stock','crypto','bond','fund','other')),
  status                       TEXT NOT NULL CHECK (status IN ('draft','pending','accepted','rejected','executed','expired')),
  created_at                   TEXT NOT NULL,
  expires_at                   TEXT
);

CREATE INDEX IF NOT EXISTS idx_customer_wm        ON customer(wm_id);
CREATE INDEX IF NOT EXISTS idx_holding_customer   ON holding(customer_id);
CREATE INDEX IF NOT EXISTS idx_comment_customer   ON comment(customer_id);
CREATE INDEX IF NOT EXISTS idx_tx_customer        ON "transaction"(customer_id);
CREATE INDEX IF NOT EXISTS idx_news_customer      ON news(customer_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_customer ON suggestion(customer_id);
`
