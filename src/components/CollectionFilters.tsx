"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function CollectionFilters({
  format,
  genre,
  genres,
  watch,
  sort,
  q,
  guest = false,
}: {
  format: string;
  genre: string;
  genres: string[];
  watch: string;
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
          value={genre}
          onChange={(e) => update({ genre: e.target.value })}
          aria-label="Genre"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300"
        >
          <option value="all">All genres</option>
          {(genre !== "all" && !genres.includes(genre)
            ? [genre, ...genres]
            : genres
          ).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
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
      <div className="flex flex-wrap gap-2" aria-label="Watch status">
        {(["all", "unwatched", "watched"] as const).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => update({ watch: w })}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
              watch === w
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-zinc-900 text-zinc-500"
            }`}
          >
            {w === "all" ? "All" : w}
          </button>
        ))}
      </div>
    </div>
  );
}
