import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { StatsBar } from "@/components/StatsBar";
import { ItemCard } from "@/components/ItemCard";
import { CollectionFilters } from "@/components/CollectionFilters";
import { getCollectionStats, listItems } from "@/lib/db";
import { isEbayConfigured } from "@/lib/ebay";
import { getSessionRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ format?: string; sort?: string; q?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const format = sp.format ?? "all";
  const sort = (sp.sort as "value" | "title" | "newest") ?? "newest";
  const q = sp.q ?? "";
  const ebayReady = isEbayConfigured();
  const guest = (await getSessionRole()) === "guest";

  let items: Awaited<ReturnType<typeof listItems>> = [];
  let stats: Awaited<ReturnType<typeof getCollectionStats>> | null = null;
  let error: string | null = null;

  try {
    [items, stats] = await Promise.all([
      listItems({ format, sort, q }),
      getCollectionStats(),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Database unavailable";
  }

  return (
    <>
      <Nav active="collection" guest={guest} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4">
        {error ? (
          <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-200">
            <p className="font-medium">Database not configured</p>
            <p className="mt-1 text-amber-200/80">{error}</p>
            <p className="mt-2 text-xs text-amber-200/60">
              Copy <code>.env.example</code> to <code>.env.local</code> and set
              Turso + API keys. See README.
            </p>
          </div>
        ) : (
          <>
            {!ebayReady && !guest ? (
              <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-400">
                eBay keys pending — you can catalog titles now; asking-price
                estimates will fill in after verification.
              </div>
            ) : null}
            {stats ? (
              <div className="mb-4">
                <StatsBar stats={stats} />
              </div>
            ) : null}
            <Suspense fallback={null}>
              <CollectionFilters format={format} sort={sort} q={q} guest={guest} />
            </Suspense>
            {items.length === 0 ? (
              <div className="mt-10 text-center">
                <p className="text-zinc-400">No titles yet.</p>
                {guest ? null : (
                  <a
                    href="/add"
                    className="mt-3 inline-block rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950"
                  >
                    Scan your first tape
                  </a>
                )}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </>
        )}
        <p className="mt-8 text-center text-[11px] text-zinc-600">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </main>
    </>
  );
}
