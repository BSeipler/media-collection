export function normalizeGenreNames(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const name = entry.trim();
    if (!name || out.includes(name)) continue;
    out.push(name);
  }
  return out;
}

export function parseGenres(value: unknown): string[] {
  if (Array.isArray(value)) return normalizeGenreNames(value);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    return normalizeGenreNames(JSON.parse(value) as unknown);
  } catch {
    return [];
  }
}

export function serializeGenres(genres: string[] | null | undefined): string | null {
  if (genres == null) return null;
  return JSON.stringify(normalizeGenreNames(genres));
}
