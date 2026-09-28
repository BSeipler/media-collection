"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function CollectionFilters({
  format,
  sort,
  q,
  guest = false,
}: {
  format: string;
  sort: string;
  q: string;
  guest?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all" || (k === "sort" && v === "newest")) next.delete(k);
      else next.set(k, v);
    }
    start(() => {
      router.push(`/?${next.toString()}`);
    });
  }

  return (
    <div className={`flex flex-col gap-2 ${pending ? "opacity-70" : ""}`}>
      <input
        defaultValue={q}
        placeholder="Search titles…"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            update({ q: (e.target as HTMLInputElement).value });
          }
        }}
      />
      <div className="flex flex-wrap gap-2">
        {(["all", "dvd", "vhs", "other"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => update({ format: f })}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase ${
              format === f
                ? "bg-amber-500/20 text-amber-300"
                : "bg-zinc-900 text-zinc-500"
            }`}
          >
            {f}
          </button>
        ))}
        <select
          value={sort}
          onChange={(e) => update({ sort: e.target.value })}
          className="ml-auto rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300"
        >
          <option value="newest">Newest</option>
          <option value="value">Value</option>
          <option value="title">Title</option>
        </select>
        {guest ? null : (
          <a
            href={`/api/export?${params.toString()}`}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-amber-500/50 hover:text-amber-300"
            download
          >
            Export CSV
          </a>
        )}
      </div>
    </div>
  );
}
