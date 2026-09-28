import type { Item } from "./types";
import { effectiveValueCents } from "./money";

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function centsToNumber(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

const HEADERS = [
  "id",
  "title",
  "year",
  "format",
  "upc",
  "condition",
  "value_usd",
  "estimated_usd",
  "override_usd",
  "estimate_low_usd",
  "estimate_high_usd",
  "comp_count",
  "confidence",
  "tmdb_id",
  "notes",
  "created_at",
  "updated_at",
  "genres",
] as const;

export function itemsToCsv(items: Item[]): string {
  const lines = [HEADERS.join(",")];
  for (const item of items) {
    const value = effectiveValueCents(item);
    lines.push(
      [
        item.id,
        escapeCsv(item.title),
        item.year ?? "",
        item.format,
        escapeCsv(item.upc),
        escapeCsv(item.condition),
        centsToNumber(value),
        centsToNumber(item.estimated_cents),
        centsToNumber(item.override_cents),
        centsToNumber(item.estimate_low_cents),
        centsToNumber(item.estimate_high_cents),
        item.comp_count ?? 0,
        item.confidence ?? "",
        item.tmdb_id ?? "",
        escapeCsv(item.notes),
        item.created_at,
        item.updated_at,
        escapeCsv(item.genres.join("; ")),
      ].join(","),
    );
  }
  // BOM helps Excel open UTF-8 correctly
  return `\uFEFF${lines.join("\n")}\n`;
}
