import type { Item } from "./types";

export function posterUrl(
  path: string | null | undefined,
  size = "w342",
): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/** Prefer custom upload, then TMDB / external URL. */
export function itemPosterUrl(
  item: Pick<Item, "id" | "poster_path" | "has_custom_poster">,
  size = "w342",
): string | null {
  if (Number(item.has_custom_poster) > 0) {
    return `/api/items/${item.id}/poster`;
  }
  return posterUrl(item.poster_path, size);
}
