export type TmdbMovie = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string | null;
};

function tmdbKey(): string | null {
  return process.env.TMDB_API_KEY ?? null;
}

export function isTmdbConfigured(): boolean {
  return Boolean(tmdbKey());
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
    }>;
  };

  return (data.results ?? []).slice(0, 8).map((m) => ({
    id: m.id,
    title: m.title,
    release_date: m.release_date ?? null,
    poster_path: m.poster_path ?? null,
    overview: m.overview ?? null,
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
  };
  return {
    id: m.id,
    title: m.title,
    release_date: m.release_date ?? null,
    poster_path: m.poster_path ?? null,
    overview: m.overview ?? null,
  };
}

export function yearFromDate(date: string | null | undefined): number | null {
  if (!date || date.length < 4) return null;
  const y = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}
