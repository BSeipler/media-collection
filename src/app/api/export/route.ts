import { NextRequest, NextResponse } from "next/server";
import { listItems } from "@/lib/db";
import { itemsToCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const items = await listItems({
      format: searchParams.get("format") ?? undefined,
      genre: searchParams.get("genre") ?? undefined,
      watch_status: searchParams.get("watch") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      sort: (searchParams.get("sort") as "value" | "title" | "newest") ?? "title",
    });

    const csv = itemsToCsv(items);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `yard-sale-stack-${date}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 },
    );
  }
}
