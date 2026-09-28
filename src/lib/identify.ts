import {
  confidentMatch,
  rankMovieTitles,
  type TitleMatch,
} from "./catalog-title";
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
    candidates.push(
      ...(await candidatesFromListing(top.title, format, cleaned, "ebay", null)),
    );
  }

  if (candidates.length > 0) return dedupe(candidates);

  // 2) UPCitemdb free trial fallback (100/day)
  const upcItem = await lookupUpc(cleaned);
  if (upcItem) {
    const format =
      preferredFormat ??
      guessFormat(`${upcItem.title} ${upcItem.description ?? ""}`);
    candidates.push(
      ...(await candidatesFromListing(
        upcItem.title,
        format,
        cleaned,
        "upcitemdb",
        upcItem.images[0] ?? null,
      )),
    );
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

async function candidatesFromListing(
  productTitle: string,
  format: Format,
  upc: string,
  source: "ebay" | "upcitemdb",
  fallbackPoster: string | null,
): Promise<IdentifyCandidate[]> {
  const ranked = await rankMovieTitles(productTitle, format);
  const best = confidentMatch(ranked);
  const viable = ranked.filter((match) => match.score >= 78).slice(0, 3);
  const shown: TitleMatch[] = best
    ? [
        best,
        ...viable.filter((match) => match.tmdb_id !== best.tmdb_id),
      ].slice(0, 3)
    : viable;

  if (shown.length > 0) {
    return shown.map((match) => ({
      title: match.title,
      year: match.year,
      format,
      upc,
      tmdb_id: match.tmdb_id,
      poster_path: match.poster_path,
      source,
      confidence:
        best && match.tmdb_id === best.tmdb_id ? "high" : "medium",
    }));
  }

  return [
    {
      title: cleanProductTitle(productTitle) || productTitle,
      year: null,
      format,
      upc,
      tmdb_id: null,
      poster_path: fallbackPoster,
      source,
      confidence: source === "upcitemdb" ? "low" : "medium",
    },
  ];
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
