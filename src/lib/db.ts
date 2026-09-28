import { connect, type Connection } from "@tursodatabase/serverless";
import type {
  CollectionStats,
  Comp,
  Item,
  NewItemInput,
  Settings,
} from "./types";
import { parseGenres, serializeGenres } from "./genres";
import { effectiveValueCents } from "./money";

let cached: Connection | null = null;
let schemaReady = false;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your keys.`,
    );
  }
  return value;
}

export function getDb(): Connection {
  if (cached) return cached;
  const url = requireEnv("TURSO_DATABASE_URL");
  const authToken = requireEnv("TURSO_AUTH_TOKEN");
  cached = connect({ url, authToken });
  return cached;
}

export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const db = getDb();
  await db.exec(`
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
      genres TEXT,
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
    CREATE TABLE IF NOT EXISTS item_posters (
      item_id INTEGER PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
      mime TEXT NOT NULL DEFAULT 'image/jpeg',
      data_b64 TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_items_upc ON items(upc);
    CREATE INDEX IF NOT EXISTS idx_items_format ON items(format);
    CREATE INDEX IF NOT EXISTS idx_comps_item_id ON comps(item_id);
    INSERT OR IGNORE INTO settings (id, lot_cost_cents) VALUES (1, 4100);
  `);

  const cols = (await db.all("PRAGMA table_info(items)")) as Array<{
    name: string;
  }>;
  if (!cols.some((c) => c.name === "has_custom_poster")) {
    await db.exec(
      "ALTER TABLE items ADD COLUMN has_custom_poster INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!cols.some((c) => c.name === "genres")) {
    await db.exec("ALTER TABLE items ADD COLUMN genres TEXT");
  }

  schemaReady = true;
}

function rowToItem(row: Record<string, unknown> | null | undefined): Item | null {
  if (!row) return null;
  return { ...(row as unknown as Item), genres: parseGenres(row.genres) };
}

export async function getSettings(): Promise<Settings> {
  await ensureSchema();
  const db = getDb();
  const row = await db.get("SELECT * FROM settings WHERE id = 1");
  return row as Settings;
}

export async function updateLotCost(lotCostCents: number): Promise<Settings> {
  await ensureSchema();
  const db = getDb();
  await db.run(
    "UPDATE settings SET lot_cost_cents = ?, updated_at = datetime('now') WHERE id = 1",
    lotCostCents,
  );
  return getSettings();
}

export async function listItems(opts?: {
  format?: string;
  genre?: string;
  q?: string;
  sort?: "value" | "title" | "newest";
}): Promise<Item[]> {
  await ensureSchema();
  const db = getDb();
  const clauses: string[] = [];
  const args: unknown[] = [];

  if (opts?.format && opts.format !== "all") {
    clauses.push("format = ?");
    args.push(opts.format);
  }
  if (opts?.genre && opts.genre !== "all") {
    clauses.push(
      "EXISTS (SELECT 1 FROM json_each(items.genres) AS je WHERE je.value = ?)",
    );
    args.push(opts.genre);
  }
  if (opts?.q?.trim()) {
    clauses.push("(title LIKE ? OR upc LIKE ?)");
    const like = `%${opts.q.trim()}%`;
    args.push(like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  let order = "ORDER BY created_at DESC";
  if (opts?.sort === "title") order = "ORDER BY title COLLATE NOCASE ASC";
  if (opts?.sort === "value") {
    order =
      "ORDER BY COALESCE(override_cents, estimated_cents, -1) DESC, title COLLATE NOCASE ASC";
  }

  const rows = (await db.all(
    `SELECT * FROM items ${where} ${order}`,
    ...args,
  )) as Array<Record<string, unknown>>;
  return rows.map((row) => rowToItem(row)!);
}

export async function listGenreNames(): Promise<string[]> {
  await ensureSchema();
  const db = getDb();
  const rows = (await db.all(
    `SELECT DISTINCT je.value AS genre
     FROM items, json_each(items.genres) AS je
     WHERE typeof(je.value) = 'text' AND je.value != ''
     ORDER BY je.value COLLATE NOCASE`,
  )) as Array<{ genre: string }>;
  return rows.map((row) => row.genre);
}

export async function listItemsMissingGenres(): Promise<
  Array<{ id: number; tmdb_id: number }>
> {
  await ensureSchema();
  const db = getDb();
  const rows = await db.all(
    `SELECT id, tmdb_id FROM items
     WHERE genres IS NULL AND tmdb_id IS NOT NULL`,
  );
  return rows as Array<{ id: number; tmdb_id: number }>;
}

export async function setItemGenres(id: number, genres: string[]): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.run(
    "UPDATE items SET genres = ? WHERE id = ?",
    serializeGenres(genres),
    id,
  );
}

export async function getItem(id: number): Promise<Item | null> {
  await ensureSchema();
  const db = getDb();
  const row = (await db.get("SELECT * FROM items WHERE id = ?", id)) as
    | Record<string, unknown>
    | undefined;
  return rowToItem(row);
}

export async function getComps(itemId: number): Promise<Comp[]> {
  await ensureSchema();
  const db = getDb();
  const rows = await db.all(
    "SELECT * FROM comps WHERE item_id = ? ORDER BY price_cents ASC",
    itemId,
  );
  return rows as Comp[];
}

export async function createItem(input: NewItemInput): Promise<Item> {
  await ensureSchema();
  const db = getDb();
  const result = await db.run(
    `INSERT INTO items (title, year, format, upc, condition, tmdb_id, poster_path, notes, genres)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.title,
    input.year ?? null,
    input.format,
    input.upc ?? null,
    input.condition ?? "used",
    input.tmdb_id ?? null,
    input.poster_path ?? null,
    input.notes ?? null,
    serializeGenres(input.genres),
  );
  const id = Number(result.lastInsertRowid);
  const item = await getItem(id);
  if (!item) throw new Error("Failed to create item");
  return item;
}

export async function updateItem(
  id: number,
  patch: Partial<
    Pick<
      Item,
      | "title"
      | "year"
      | "format"
      | "upc"
      | "condition"
      | "tmdb_id"
      | "poster_path"
      | "notes"
      | "override_cents"
      | "estimated_cents"
      | "estimate_low_cents"
      | "estimate_high_cents"
      | "comp_count"
      | "confidence"
      | "estimated_at"
    >
  >,
): Promise<Item> {
  await ensureSchema();
  const db = getDb();
  const fields: string[] = [];
  const args: unknown[] = [];
  for (const [key, value] of Object.entries(patch)) {
    fields.push(`${key} = ?`);
    args.push(value);
  }
  fields.push("updated_at = datetime('now')");
  args.push(id);
  await db.run(
    `UPDATE items SET ${fields.join(", ")} WHERE id = ?`,
    ...args,
  );
  const item = await getItem(id);
  if (!item) throw new Error("Item not found");
  return item;
}

export async function deleteItem(id: number): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.run("DELETE FROM item_posters WHERE item_id = ?", id);
  await db.run("DELETE FROM comps WHERE item_id = ?", id);
  await db.run("DELETE FROM items WHERE id = ?", id);
}

export async function getItemPoster(
  itemId: number,
): Promise<{ mime: string; data_b64: string } | null> {
  await ensureSchema();
  const db = getDb();
  const row = await db.get(
    "SELECT mime, data_b64 FROM item_posters WHERE item_id = ?",
    itemId,
  );
  return (row as { mime: string; data_b64: string } | undefined) ?? null;
}

export async function setItemPoster(
  itemId: number,
  mime: string,
  dataB64: string,
): Promise<Item> {
  await ensureSchema();
  const db = getDb();
  const item = await getItem(itemId);
  if (!item) throw new Error("Item not found");

  await db.run(
    `INSERT INTO item_posters (item_id, mime, data_b64, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(item_id) DO UPDATE SET
       mime = excluded.mime,
       data_b64 = excluded.data_b64,
       updated_at = datetime('now')`,
    itemId,
    mime,
    dataB64,
  );
  await db.run(
    `UPDATE items SET has_custom_poster = 1, updated_at = datetime('now') WHERE id = ?`,
    itemId,
  );
  const updated = await getItem(itemId);
  if (!updated) throw new Error("Item not found");
  return updated;
}

export async function clearItemPoster(itemId: number): Promise<Item> {
  await ensureSchema();
  const db = getDb();
  await db.run("DELETE FROM item_posters WHERE item_id = ?", itemId);
  await db.run(
    `UPDATE items SET has_custom_poster = 0, updated_at = datetime('now') WHERE id = ?`,
    itemId,
  );
  const updated = await getItem(itemId);
  if (!updated) throw new Error("Item not found");
  return updated;
}

export async function replaceComps(
  itemId: number,
  comps: Array<{
    listing_title: string;
    price_cents: number;
    currency?: string;
    url?: string | null;
    condition?: string | null;
  }>,
): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.run("DELETE FROM comps WHERE item_id = ?", itemId);
  for (const c of comps) {
    await db.run(
      `INSERT INTO comps (item_id, listing_title, price_cents, currency, url, condition)
       VALUES (?, ?, ?, ?, ?, ?)`,
      itemId,
      c.listing_title,
      c.price_cents,
      c.currency ?? "USD",
      c.url ?? null,
      c.condition ?? null,
    );
  }
}

export async function findSimilar(
  title: string,
  format: string,
): Promise<Item[]> {
  await ensureSchema();
  const db = getDb();
  const rows = (await db.all(
    `SELECT * FROM items WHERE format = ? AND lower(title) = lower(?) LIMIT 5`,
    format,
    title,
  )) as Array<Record<string, unknown>>;
  return rows.map((row) => rowToItem(row)!);
}

export async function getCollectionStats(): Promise<CollectionStats> {
  const items = await listItems();
  const settings = await getSettings();
  let priced = 0;
  let estimated_total_cents = 0;
  for (const item of items) {
    const v = effectiveValueCents(item);
    if (v != null) {
      priced += 1;
      estimated_total_cents += v;
    }
  }
  return {
    count: items.length,
    priced,
    unpriced: items.length - priced,
    lot_cost_cents: settings.lot_cost_cents,
    estimated_total_cents,
  };
}

export { posterUrl } from "./poster";