import { NextRequest, NextResponse } from "next/server";
import { getCollectionStats, getSettings, updateLotCost } from "@/lib/db";
import { dollarsToCents } from "@/lib/money";

export async function GET() {
  try {
    const [settings, stats] = await Promise.all([
      getSettings(),
      getCollectionStats(),
    ]);
    return NextResponse.json({ settings, stats });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      lot_cost_dollars?: string | number;
      lot_cost_cents?: number;
    };
    let cents = body.lot_cost_cents;
    if (cents == null && body.lot_cost_dollars != null) {
      cents = dollarsToCents(body.lot_cost_dollars);
    }
    if (cents == null) {
      return NextResponse.json({ error: "lot cost required" }, { status: 400 });
    }
    const settings = await updateLotCost(cents);
    const stats = await getCollectionStats();
    return NextResponse.json({ settings, stats });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
