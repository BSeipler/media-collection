import { NextResponse } from "next/server";
import { listItems } from "@/lib/db";
import { isEstimateStale, valueItem } from "@/lib/valuation";

/** Refresh up to 10 stale estimates (rate-limited for free-tier eBay). */
export async function POST() {
  try {
    const items = await listItems({ sort: "newest" });
    const stale = items.filter(isEstimateStale).slice(0, 10);
    const results = [];
    for (const item of stale) {
      try {
        results.push(await valueItem(item));
      } catch (err) {
        console.error("stale value failed", item.id, err);
      }
    }
    return NextResponse.json({
      refreshed: results.length,
      remaining: Math.max(
        0,
        items.filter(isEstimateStale).length - results.length,
      ),
      items: results,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 },
    );
  }
}
