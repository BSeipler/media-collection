import { NextRequest, NextResponse } from "next/server";
import { resolveIncomingTitle } from "@/lib/catalog-title";
import { createItem, findSimilar, listItems } from "@/lib/db";
import { isEbayConfigured } from "@/lib/ebay";
import { normalizeGenreNames } from "@/lib/genres";
import { lookupMovieGenres } from "@/lib/tmdb";
import type { Format, NewItemInput } from "@/lib/types";
import { valueItem } from "@/lib/valuation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const items = await listItems({
      format: searchParams.get("format") ?? undefined,
      genre: searchParams.get("genre") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      sort: (searchParams.get("sort") as "value" | "title" | "newest") ?? "newest",
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list items" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NewItemInput & {
      skipValue?: boolean;
      force?: boolean;
    };

    if (!body.title?.trim() || !body.format) {
      return NextResponse.json(
        { error: "title and format required" },
        { status: 400 },
      );
    }

    const format = body.format as Format;
    const resolved = await resolveIncomingTitle({
      title: body.title.trim(),
      year: body.year ?? null,
      format,
      tmdb_id: body.tmdb_id ?? null,
      poster_path: body.poster_path ?? null,
      genres: normalizeGenreNames(body.genres),
    });
    const genres = await genresForItem(resolved.tmdb_id, resolved.genres);
    const similar = await findSimilar(resolved.title, format);
    if (similar.length > 0 && !body.force) {
      return NextResponse.json(
        {
          warning: "similar",
          similar,
          message: `You may already have "${resolved.title}" on ${format.toUpperCase()}.`,
        },
        { status: 409 },
      );
    }

    let item = await createItem({
      title: resolved.title,
      year: resolved.year,
      format,
      upc: body.upc ?? null,
      condition: body.condition ?? "used",
      tmdb_id: resolved.tmdb_id,
      poster_path: resolved.poster_path,
      genres,
      notes: body.notes ?? null,
    });

    // Skip eBay valuation until keys are configured (account verification pending)
    if (!body.skipValue && isEbayConfigured()) {
      try {
        item = await valueItem(item);
      } catch (err) {
        console.error("Valuation failed", err);
      }
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create item" },
      { status: 500 },
    );
  }
}

async function genresForItem(
  tmdbId: number | null,
  provided: string[],
): Promise<string[] | null> {
  if (provided.length > 0) return provided;
  if (tmdbId == null) return [];
  const lookedUp = await lookupMovieGenres(tmdbId);
  return lookedUp === undefined ? null : lookedUp;
}
