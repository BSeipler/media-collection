import { NextRequest, NextResponse } from "next/server";
import { deleteItem, getComps, getItem, updateItem } from "@/lib/db";
import { dollarsToCents } from "@/lib/money";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const item = await getItem(Number(id));
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const comps = await getComps(item.id);
    return NextResponse.json({ item, comps });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      notes?: string;
      condition?: string;
      watch_status?: string;
      override_dollars?: string | number | null;
      override_cents?: number | null;
    };

    const patch: Parameters<typeof updateItem>[1] = {};
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.condition !== undefined) patch.condition = body.condition;
    if (body.watch_status !== undefined) {
      if (body.watch_status !== "unwatched" && body.watch_status !== "watched") {
        return NextResponse.json(
          { error: "watch_status must be unwatched or watched" },
          { status: 400 },
        );
      }
      patch.watch_status = body.watch_status;
    }
    if (body.override_cents !== undefined) {
      patch.override_cents = body.override_cents;
    } else if (body.override_dollars !== undefined) {
      if (
        body.override_dollars === null ||
        body.override_dollars === "" ||
        body.override_dollars === undefined
      ) {
        patch.override_cents = null;
      } else {
        patch.override_cents = dollarsToCents(body.override_dollars);
      }
    }

    const item = await updateItem(Number(id), patch);
    return NextResponse.json({ item });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await deleteItem(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
