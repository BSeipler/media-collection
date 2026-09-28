import { searchByKeyword, type EbayListing } from "./ebay";
import { percentile } from "./money";
import type { Confidence, Format, Item } from "./types";
import { replaceComps, updateItem } from "./db";

const LOT_PATTERNS =
  /\b(lot|bundle|set of|x\d+|\d+\s*pack|wholesale|mixed)\b/i;

function wrongFormat(title: string, format: Format): boolean {
  const t = title.toLowerCase();
  if (format === "vhs") {
    return /\bdvd\b|\bblu[\s-]?ray\b|\b4k\b/.test(t) && !/\bvhs\b/.test(t);
  }
  if (format === "dvd") {
    return /\bvhs\b/.test(t) && !/\bdvd\b/.test(t);
  }
  return false;
}

export function filterListings(
  listings: EbayListing[],
  format: Format,
): EbayListing[] {
  return listings.filter((l) => {
    if (!l.title || l.price <= 0) return false;
    if (LOT_PATTERNS.test(l.title)) return false;
    if (wrongFormat(l.title, format)) return false;
    if (l.price > 500) return false;
    return true;
  });
}

export function computeEstimate(prices: number[]): {
  estimated_cents: number;
  estimate_low_cents: number;
  estimate_high_cents: number;
  confidence: Confidence;
  comp_count: number;
} | null {
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const estimated = percentile(sorted, 0.5);
  const low = percentile(sorted, 0.25);
  const high = percentile(sorted, 0.75);
  let confidence: Confidence = "medium";
  if (sorted.length >= 8) confidence = "high";
  if (sorted.length < 3) confidence = "low";

  return {
    estimated_cents: Math.round(estimated * 100),
    estimate_low_cents: Math.round(low * 100),
    estimate_high_cents: Math.round(high * 100),
    confidence,
    comp_count: sorted.length,
  };
}

const STALE_MS = 24 * 60 * 60 * 1000;

export function isEstimateStale(item: Item): boolean {
  if (!item.estimated_at) return true;
  const t = Date.parse(item.estimated_at);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > STALE_MS;
}

export async function valueItem(item: Item): Promise<Item> {
  const listings = await searchByKeyword({
    title: item.title,
    year: item.year,
    format: item.format,
    limit: 50,
  });
  const filtered = filterListings(listings, item.format);
  const estimate = computeEstimate(filtered.map((l) => l.price));

  await replaceComps(
    item.id,
    filtered.slice(0, 20).map((l) => ({
      listing_title: l.title,
      price_cents: Math.round(l.price * 100),
      currency: l.currency,
      url: l.url,
      condition: l.condition,
    })),
  );

  if (!estimate) {
    return updateItem(item.id, {
      estimated_cents: null,
      estimate_low_cents: null,
      estimate_high_cents: null,
      comp_count: 0,
      confidence: "low",
      estimated_at: new Date().toISOString(),
    });
  }

  return updateItem(item.id, {
    ...estimate,
    estimated_at: new Date().toISOString(),
  });
}
