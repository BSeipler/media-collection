type EbayTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: EbayTokenCache | null = null;

const DVD_CATEGORY = "617";
const VHS_CATEGORY = "309";

export function categoryForFormat(format: "vhs" | "dvd" | "other"): string {
  if (format === "vhs") return VHS_CATEGORY;
  return DVD_CATEGORY;
}

async function getEbayAccessToken(): Promise<string | null> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });

  if (!res.ok) {
    console.error("eBay token error", await res.text());
    return null;
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.accessToken;
}

export type EbayListing = {
  title: string;
  price: number;
  currency: string;
  url: string;
  condition: string | null;
  gtin?: string | null;
};

type BrowseItem = {
  title?: string;
  condition?: string;
  itemWebUrl?: string;
  price?: { value?: string; currency?: string };
  gtin?: string[];
};

async function browseSearch(params: URLSearchParams): Promise<BrowseItem[]> {
  const token = await getEbayAccessToken();
  if (!token) return [];

  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error("eBay browse error", res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as { itemSummaries?: BrowseItem[] };
  return data.itemSummaries ?? [];
}

function toListing(item: BrowseItem): EbayListing | null {
  const value = Number.parseFloat(item.price?.value ?? "");
  if (!Number.isFinite(value) || value <= 0) return null;
  return {
    title: item.title ?? "",
    price: value,
    currency: item.price?.currency ?? "USD",
    url: item.itemWebUrl ?? "",
    condition: item.condition ?? null,
    gtin: item.gtin?.[0] ?? null,
  };
}

export async function searchByGtin(gtin: string): Promise<EbayListing[]> {
  const cleaned = gtin.replace(/\D/g, "");
  if (cleaned.length < 8) return [];

  const params = new URLSearchParams({
    gtin: cleaned,
    limit: "20",
    filter: "conditions:{USED|NEW}",
  });
  const items = await browseSearch(params);
  return items.map(toListing).filter((x): x is EbayListing => x != null);
}

export async function searchByKeyword(opts: {
  title: string;
  year?: number | null;
  format: "vhs" | "dvd" | "other";
  limit?: number;
}): Promise<EbayListing[]> {
  const formatWord = opts.format === "vhs" ? "VHS" : "DVD";
  const q = [opts.title, opts.year ? String(opts.year) : null, formatWord]
    .filter(Boolean)
    .join(" ");

  const params = new URLSearchParams({
    q,
    category_ids: categoryForFormat(opts.format),
    limit: String(opts.limit ?? 50),
    filter: "conditions:{USED}",
  });

  const items = await browseSearch(params);
  return items.map(toListing).filter((x): x is EbayListing => x != null);
}

export function soldSearchUrl(
  title: string,
  format: "vhs" | "dvd" | "other",
): string {
  const formatWord = format === "vhs" ? "VHS" : "DVD";
  const q = encodeURIComponent(`${title} ${formatWord}`);
  return `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`;
}

export function isEbayConfigured(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}
