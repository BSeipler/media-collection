export type UpcItem = {
  upc: string;
  title: string;
  brand: string | null;
  description: string | null;
  images: string[];
};

/** Free trial only — 100 requests/day. Never use the paid /v1 endpoint. */
export async function lookupUpc(upc: string): Promise<UpcItem | null> {
  const cleaned = upc.replace(/\D/g, "");
  if (cleaned.length < 8) return null;

  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${cleaned}`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 86400 },
      },
    );

    if (res.status === 429) {
      console.warn("UPCitemdb rate limited (100/day free trial)");
      return null;
    }
    if (!res.ok) {
      console.error("UPCitemdb error", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as {
      items?: Array<{
        upc?: string;
        ean?: string;
        title?: string;
        brand?: string;
        description?: string;
        images?: string[];
      }>;
    };

    const item = data.items?.[0];
    if (!item?.title) return null;

    return {
      upc: item.upc ?? item.ean ?? cleaned,
      title: item.title,
      brand: item.brand ?? null,
      description: item.description ?? null,
      images: item.images ?? [],
    };
  } catch (err) {
    console.error("UPCitemdb fetch failed", err);
    return null;
  }
}

export function inferFormatFromText(
  text: string,
): "vhs" | "dvd" | "other" | null {
  const t = text.toLowerCase();
  if (/\bvhs\b|video\s*cassette|videocassette/.test(t)) return "vhs";
  if (/\bdvd\b|blu[\s-]?ray|bluray|4k\s*uhd/.test(t)) return "dvd";
  return null;
}

export function cleanProductTitle(title: string): string {
  return title
    .replace(/\b(VHS|DVD|Blu[\s-]?ray|BluRay|4K|UHD|Widescreen|Fullscreen|Special Edition|Collector'?s Edition|DVD Video)\b/gi, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, "")
    .trim();
}
