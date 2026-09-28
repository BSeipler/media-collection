import { searchByGtin } from "./ebay";
import { searchMovies, yearFromDate } from "./tmdb";
import {
  cleanProductTitle,
  inferFormatFromText,
  lookupUpc,
} from "./upc";
import type { Format, IdentifyCandidate } from "./types";

function guessFormat(text: string, fallback: Format = "dvd"): Format {
  return inferFormatFromText(text) ?? fallback;
}

export async function identifyByUpc(
  upc: string,
  preferredFormat?: Format,
): Promise<IdentifyCandidate[]> {
  const cleaned = upc.replace(/\D/g, "");
  const candidates: IdentifyCandidate[] = [];

  // 1) eBay GTIN first (free, no UPC quota)
  const ebayHits = await searchByGtin(cleaned);
  if (ebayHits.length > 0) {
    const top = ebayHits[0];
    const format = preferredFormat ?? guessFormat(top.title);
    const cleanedTitle = cleanProductTitle(top.title);
    const movies = await searchMovies(cleanedTitle);
    if (movies.length > 0) {
      for (const m of movies.slice(0, 3)) {
        candidates.push({
          title: m.title,
          year: yearFromDate(m.release_date),
          format,
          upc: cleaned,
          tmdb_id: m.id,
          poster_path: m.poster_path,
          source: "ebay",
          confidence: movies.length === 1 ? "high" : "medium",
        });
      }
    } else {
      candidates.push({
        title: cleanedTitle || top.title,
        year: null,
        format,
        upc: cleaned,
        tmdb_id: null,
        poster_path: null,
        source: "ebay",
        confidence: "medium",
      });
    }
  }

  if (candidates.length > 0) return dedupe(candidates);

  // 2) UPCitemdb free trial fallback (100/day)
  const upcItem = await lookupUpc(cleaned);
  if (upcItem) {
    const format =
      preferredFormat ??
      guessFormat(`${upcItem.title} ${upcItem.description ?? ""}`);
    const cleanedTitle = cleanProductTitle(upcItem.title);
    const movies = await searchMovies(cleanedTitle);
    if (movies.length > 0) {
      for (const m of movies.slice(0, 3)) {
        candidates.push({
          title: m.title,
          year: yearFromDate(m.release_date),
          format,
          upc: cleaned,
          tmdb_id: m.id,
          poster_path: m.poster_path,
          source: "upcitemdb",
          confidence: movies.length === 1 ? "high" : "medium",
        });
      }
    } else {
      candidates.push({
        title: cleanedTitle,
        year: null,
        format,
        upc: cleaned,
        tmdb_id: null,
        poster_path: upcItem.images[0] ?? null,
        source: "upcitemdb",
        confidence: "low",
      });
    }
  }

  return dedupe(candidates);
}

export async function identifyByTitle(
  query: string,
  format: Format,
): Promise<IdentifyCandidate[]> {
  const movies = await searchMovies(query);
  return movies.map((m, i) => ({
    title: m.title,
    year: yearFromDate(m.release_date),
    format,
    upc: null,
    tmdb_id: m.id,
    poster_path: m.poster_path,
    source: "tmdb" as const,
    confidence: (i === 0 ? "medium" : "low") as "medium" | "low",
  }));
}

function dedupe(candidates: IdentifyCandidate[]): IdentifyCandidate[] {
  const seen = new Set<string>();
  const out: IdentifyCandidate[] = [];
  for (const c of candidates) {
    const key = `${c.tmdb_id ?? c.title}|${c.format}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}
