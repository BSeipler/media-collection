import { NextRequest, NextResponse } from "next/server";
import { identifyByTitle, identifyByUpc } from "@/lib/identify";
import type { Format } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      upc?: string;
      query?: string;
      format?: Format;
    };

    if (body.upc) {
      const candidates = await identifyByUpc(body.upc, body.format);
      return NextResponse.json({ candidates });
    }

    if (body.query) {
      const format = body.format ?? "dvd";
      const candidates = await identifyByTitle(body.query, format);
      return NextResponse.json({ candidates });
    }

    return NextResponse.json(
      { error: "Provide upc or query" },
      { status: 400 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Identify failed" },
      { status: 500 },
    );
  }
}
