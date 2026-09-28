import { listItemsMissingGenres, setItemGenres } from "./db";
import { isTmdbConfigured, lookupMovieGenres } from "./tmdb";

export async function syncMissingGenres(): Promise<void> {
  if (!isTmdbConfigured()) return;
  const missing = await listItemsMissingGenres();
  if (missing.length === 0) return;

  let index = 0;
  async function worker() {
    while (index < missing.length) {
      const row = missing[index];
      index += 1;
      if (!row) break;
      try {
        const genres = await lookupMovieGenres(row.tmdb_id);
        if (genres === undefined) continue;
        await setItemGenres(row.id, genres);
      } catch (err) {
        console.error("Genre sync failed", row.id, err);
      }
    }
  }

  const workers = Math.min(6, missing.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
}
