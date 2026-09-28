import { NextRequest, NextResponse } from "next/server";
import { createItem, findSimilar, listItems } from "@/lib/db";
import { isEbayConfigured } from "@/lib/ebay";
import type { Format, NewItemInput } from "@/lib/types";
import { valueItem } from "@/lib/valuation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const items = await listItems({
      format: searchParams.get("format") ?? undefined,
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
    const similar = await findSimilar(body.title.trim(), format);
    if (similar.length > 0 && !body.force) {
      return NextResponse.json(
        {
          warning: "similar",
          similar,
          message: `You may already have "${body.title}" on ${format.toUpperCase()}.`,
        },
        { status: 409 },
      );
    }

    let item = await createItem({
      title: body.title.trim(),
      year: body.year ?? null,
      format,
      upc: body.upc ?? null,
      condition: body.condition ?? "used",
      tmdb_id: body.tmdb_id ?? null,
      poster_path: body.poster_path ?? null,
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
