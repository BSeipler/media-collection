import Link from "next/link";
import { centsToDollars, effectiveValueCents } from "@/lib/money";
import { itemPosterUrl } from "@/lib/poster";
import type { Item } from "@/lib/types";

export function ItemCard({ item }: { item: Item }) {
  const value = effectiveValueCents(item);
  const poster = itemPosterUrl(item, "w185");

  return (
    <Link
      href={`/items/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-zinc-600"
    >
      <div className="relative aspect-[2/3] bg-zinc-800">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-xs text-zinc-500">
            {item.title}
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-100">
          {item.format}
        </span>
        {item.watch_status === "watched" ? (
          <span className="absolute right-1.5 top-1.5 rounded bg-emerald-900/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-100">
            Watched
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <div className="line-clamp-2 text-xs font-medium leading-snug text-zinc-100 group-hover:text-amber-200">
          {item.title}
        </div>
        <div className="mt-auto flex items-baseline justify-between gap-1">
          <span className="text-[11px] text-zinc-500">
            {item.year ?? "—"}
          </span>
          <span className="text-sm font-semibold tabular-nums text-amber-300">
            {centsToDollars(value)}
          </span>
        </div>
      </div>
    </Link>
  );
}
