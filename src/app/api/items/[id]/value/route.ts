import { NextRequest, NextResponse } from "next/server";
import { getItem } from "@/lib/db";
import { isEstimateStale, valueItem } from "@/lib/valuation";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const item = await getItem(Number(id));
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      force?: boolean;
    };
    if (!body.force && !isEstimateStale(item) && item.estimated_cents != null) {
      return NextResponse.json({ item, cached: true });
    }

    const valued = await valueItem(item);
    return NextResponse.json({ item: valued, cached: false });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Valuation failed" },
      { status: 500 },
    );
  }
}
