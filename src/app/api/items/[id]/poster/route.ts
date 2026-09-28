import { NextRequest, NextResponse } from "next/server";
import {
  clearItemPoster,
  getItem,
  getItemPoster,
  setItemPoster,
} from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

const MAX_BYTES = 450_000;

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const poster = await getItemPoster(Number(id));
    if (!poster) {
      return NextResponse.json({ error: "No custom poster" }, { status: 404 });
    }

    const buffer = Buffer.from(poster.data_b64, "base64");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": poster.mime || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const itemId = Number(id);
    const item = await getItem(itemId);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Must be an image" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image too large (max ~450KB after compression)" },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    const updated = await setItemPoster(itemId, mime, bytes.toString("base64"));
    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const updated = await clearItemPoster(Number(id));
    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
