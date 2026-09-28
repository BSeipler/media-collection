export type Format = "vhs" | "dvd" | "other";
export type Confidence = "high" | "medium" | "low" | null;

export type Item = {
  id: number;
  title: string;
  year: number | null;
  format: Format;
  upc: string | null;
  condition: string | null;
  tmdb_id: number | null;
  poster_path: string | null;
  genres: string[];
  has_custom_poster: number;
  notes: string | null;
  estimated_cents: number | null;
  estimate_low_cents: number | null;
  estimate_high_cents: number | null;
  comp_count: number;
  confidence: Confidence;
  override_cents: number | null;
  estimated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Comp = {
  id: number;
  item_id: number;
  listing_title: string | null;
  price_cents: number;
  currency: string;
  url: string | null;
  condition: string | null;
  captured_at: string;
};

export type Settings = {
  id: number;
  lot_cost_cents: number;
  updated_at: string;
};

export type CollectionStats = {
  count: number;
  priced: number;
  unpriced: number;
  lot_cost_cents: number;
  estimated_total_cents: number;
};

export type IdentifyCandidate = {
  title: string;
  year: number | null;
  format: Format;
  upc: string | null;
  tmdb_id: number | null;
  poster_path: string | null;
  genres: string[];
  source: "ebay" | "upcitemdb" | "tmdb" | "manual";
  confidence: "high" | "medium" | "low";
};

export type NewItemInput = {
  title: string;
  year?: number | null;
  format: Format;
  upc?: string | null;
  condition?: string;
  tmdb_id?: number | null;
  poster_path?: string | null;
  genres?: string[] | null;
  notes?: string | null;
};
