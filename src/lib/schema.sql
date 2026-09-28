CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  lot_cost_cents INTEGER NOT NULL DEFAULT 4100,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  year INTEGER,
  format TEXT NOT NULL CHECK (format IN ('vhs', 'dvd', 'other')),
  upc TEXT,
  condition TEXT DEFAULT 'used',
  tmdb_id INTEGER,
  poster_path TEXT,
  notes TEXT,
  estimated_cents INTEGER,
  estimate_low_cents INTEGER,
  estimate_high_cents INTEGER,
  comp_count INTEGER DEFAULT 0,
  confidence TEXT,
  override_cents INTEGER,
  estimated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  listing_title TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  url TEXT,
  condition TEXT,
  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_upc ON items(upc);
CREATE INDEX IF NOT EXISTS idx_items_format ON items(format);
CREATE INDEX IF NOT EXISTS idx_comps_item_id ON comps(item_id);

CREATE TABLE IF NOT EXISTS item_posters (
  item_id INTEGER PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  mime TEXT NOT NULL DEFAULT 'image/jpeg',
  data_b64 TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- has_custom_poster added via ensureSchema ALTER for existing DBs

