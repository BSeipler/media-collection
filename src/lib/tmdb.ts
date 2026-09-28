export type TmdbMovie = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
  genres: string[];
  popularity?: number;
};

function tmdbKey(): string | null {
  return process.env.TMDB_API_KEY ?? null;
}

export function isTmdbConfigured(): boolean {
  return Boolean(tmdbKey());
}

let genreNames: Map<number, string> | null = null;

export async function movieGenreNames(): Promise<Map<number, string>> {
  if (genreNames) return genreNames;
  const key = tmdbKey();
  if (!key) return new Map();

  const url = new URL("https://api.themoviedb.org/3/genre/movie/list");
  url.searchParams.set("api_key", key);
  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) {
    console.error("TMDB genre list error", await res.text());
    return new Map();
  }

  const data = (await res.json()) as {
    genres?: Array<{ id?: number; name?: string }>;
  };
  const map = new Map<number, string>();
  for (const genre of data.genres ?? []) {
    if (genre.id != null && genre.name?.trim()) map.set(genre.id, genre.name.trim());
  }
  if (map.size > 0) genreNames = map;
  return map;
}

function namesForGenreIds(
  ids: number[] | undefined,
  names: Map<number, string>,
): string[] {
  const out: string[] = [];
  for (const id of ids ?? []) {
    const name = names.get(id);
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

export async function searchMovies(query: string): Promise<TmdbMovie[]> {
  const key = tmdbKey();
  if (!key || !query.trim()) return [];

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", query.trim());
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    console.error("TMDB search error", await res.text());
    return [];
  }

  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      title: string;
      release_date?: string;
      poster_path?: string | null;
      overview?: string;
      popularity?: number;
      genre_ids?: number[];
    }>;
  };

  const names = await movieGenreNames();
  return (data.results ?? []).slice(0, 8).map((m) => ({
    id: m.id,
    title: m.title,
    release_date: m.release_date ?? null,
    poster_path: m.poster_path ?? null,
    overview: m.overview ?? null,
    genres: namesForGenreIds(m.genre_ids, names),
    popularity: m.popularity ?? 0,
  }));
}

export async function getMovie(id: number): Promise<TmdbMovie | null> {
  const key = tmdbKey();
  if (!key) return null;

  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${key}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const m = (await res.json()) as {
    id: number;
    title: string;
    release_date?: string;
    poster_path?: string | null;
    overview?: string;
    genres?: Array<{ name?: string }>;
  };
  return {
    id: m.id,
    title: m.title,
    release_date: m.release_date ?? null,
    poster_path: m.poster_path ?? null,
    overview: m.overview ?? null,
    genres: genreNamesFromDetails(m.genres),
  };
}

/** `undefined` means the lookup failed and should be retried. */
export async function lookupMovieGenres(
  tmdbId: number,
): Promise<string[] | undefined> {
  const key = tmdbKey();
  if (!key) return undefined;

  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${key}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (res.status === 404) return [];
  if (!res.ok) return undefined;

  const m = (await res.json()) as { genres?: Array<{ name?: string }> };
  return genreNamesFromDetails(m.genres);
}

function genreNamesFromDetails(genres: Array<{ name?: string }> | undefined): string[] {
  const out: string[] = [];
  for (const genre of genres ?? []) {
    const name = genre.name?.trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

export function yearFromDate(date: string | null | undefined): number | null {
  if (!date || date.length < 4) return null;
  const y = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}
