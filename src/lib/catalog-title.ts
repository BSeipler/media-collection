import { searchMovies, yearFromDate } from "./tmdb";
import type { Format } from "./types";

/** Box sets and non-movie lots stay as cataloged. */
const LOT_OR_SET =
  /\b(lot of|boxed set|box set|\d\s*lot|sheet music|folio|serials|volume\s+\d+|collection|national parks)\b/i;

/** Retailer junk that means the stored string is a product listing, not a title. */
const MESSY_LISTING =
  /sealed|watermark|vcr|video tape|buy 2|free shipping|clamshell|igs |previously viewed|factory|brand new|starring|staring|directed by|tape set|pre-?owned|oop\b|watermarks/i;

const DROP = new Set(
  `sealed watermark watermarks vcr video tape tapes movie movies used new factory brand buy get free shipping good rare oop starring staring directed by vintage tested pre owned warner bros paramount pictures lions gate walt disney action thriller horror western drama comedy sci fi martial arts adventure cult rated color colour set lot john wayne clint eastwood sylvester stallone arnold schwarzenegger jackie chan elvis presley harrison ford mel gibson nicolas cage tom berenger chevy chase kevin bacon brad pitt vhs dvd ntsc mint excellent condition previously viewed clamshell igs ready oop bonus footage universal cbs fox home entertainment pictures studio studios tape with stamp wrapper very hosted small classic classics ultimate hits release tested`.split(
    /\s+/,
  ),
);

export type TitleMatch = {
  title: string;
  year: number | null;
  tmdb_id: number;
  poster_path: string | null;
  score: number;
};

export function isLotOrSet(title: string): boolean {
  return LOT_OR_SET.test(title);
}

export function isMessyListingTitle(title: string): boolean {
  return MESSY_LISTING.test(title);
}

/** Resolve when the add is still a product listing, not a chosen TMDB movie. */
export function shouldResolveTitle(input: {
  title: string;
  year: number | null;
  tmdb_id: number | null;
}): boolean {
  if (isLotOrSet(input.title)) return false;
  if (input.tmdb_id != null && !isMessyListingTitle(input.title)) return false;
  if (input.year != null && !isMessyListingTitle(input.title)) return false;
  return true;
}

function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(title: string): string[] {
  return title
    .replace(/[*_!?'.]+/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length > 1 &&
        !DROP.has(word.toLowerCase()) &&
        !/^g\d+$/i.test(word),
    );
}

/** First few title words, with format, condition, and star names removed. */
export function searchableTitle(title: string): string {
  return significantWords(title).slice(0, 3).join(" ");
}

export function scoreListing(listing: string, candidateTitle: string): number {
  const listingN = norm(significantWords(listing).join(" "));
  const titleN = norm(candidateTitle);
  if (!titleN || titleN.length < 3) return 0;
  const tokens = titleN.split(" ").filter((token) => token.length > 1);
  if (!tokens.length) return 0;
  if (listingN === titleN) return 100;
  if (listingN.startsWith(`${titleN} `) || listingN.startsWith(titleN)) return 92;
  const whole = tokens.every((token) =>
    new RegExp(`\\b${token}\\b`).test(listingN),
  );
  if (!whole) return 0;
  if (tokens.length === 1) {
    return new RegExp(`^${tokens[0]}\\b`).test(listingN) ? 84 : 0;
  }
  return 78 + Math.min(tokens.length, 6);
}

export async function rankMovieTitles(
  listing: string,
  format: Format,
): Promise<TitleMatch[]> {
  if (isLotOrSet(listing)) return [];
  const query = searchableTitle(listing);
  if (query.length < 3) return [];

  const movies = await searchMovies(query);
  let matches: Array<TitleMatch & { popularity: number }> = movies.map((movie) => ({
    title: movie.title,
    year: yearFromDate(movie.release_date),
    tmdb_id: movie.id,
    poster_path: movie.poster_path,
    score: scoreListing(listing, movie.title),
    popularity: movie.popularity ?? 0,
  }));

  if (format === "vhs") {
    matches = matches.filter((match) => match.year == null || match.year <= 2007);
  }

  matches.sort(
    (a, b) => b.score - a.score || b.popularity - a.popularity,
  );
  return matches.map((match) => ({
    title: match.title,
    year: match.year,
    tmdb_id: match.tmdb_id,
    poster_path: match.poster_path,
    score: match.score,
  }));
}

/** One clear TMDB hit. Ambiguous or weak matches are left for the user to pick. */
export function confidentMatch(matches: TitleMatch[]): TitleMatch | null {
  const best = matches[0];
  const second = matches[1];
  if (!best || best.score < 78) return null;
  if (
    second &&
    second.score >= best.score - 8 &&
    second.tmdb_id !== best.tmdb_id &&
    second.year !== best.year
  ) {
    return null;
  }
  return best;
}

export async function resolveIncomingTitle(input: {
  title: string;
  year: number | null;
  format: Format;
  tmdb_id: number | null;
  poster_path: string | null;
}): Promise<{
  title: string;
  year: number | null;
  tmdb_id: number | null;
  poster_path: string | null;
}> {
  if (!shouldResolveTitle(input)) return input;

  try {
    const match = confidentMatch(
      await rankMovieTitles(input.title, input.format),
    );
    if (!match) return input;
    return {
      title: match.title,
      year: match.year,
      tmdb_id: input.tmdb_id ?? match.tmdb_id,
      poster_path: input.poster_path ?? match.poster_path,
    };
  } catch (err) {
    console.error("Title resolve failed", err);
    return input;
  }
}
