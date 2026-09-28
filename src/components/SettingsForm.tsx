"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { centsToDollars } from "@/lib/money";
import type { CollectionStats, Settings } from "@/lib/types";

export function SettingsForm({
  settings,
  stats,
}: {
  settings: Settings;
  stats: CollectionStats;
}) {
  const router = useRouter();
  const [lot, setLot] = useState((settings.lot_cost_cents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lot_cost_dollars: lot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMsg("Saved");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshStale() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/value/stale", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      setMsg(
        `Refreshed ${data.refreshed} · ${data.remaining} still stale (max 10/run)`,
      );
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-3 py-4">
      <h1 className="text-xl font-semibold text-zinc-50">Settings</h1>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
        Collection: {stats.count} titles · estimated{" "}
        {centsToDollars(stats.estimated_total_cents)} vs paid{" "}
        {centsToDollars(stats.lot_cost_cents)}
      </div>

      <form onSubmit={save} className="flex flex-col gap-3">
        <label className="text-sm text-zinc-400">
          Lot cost ($)
          <input
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-amber-500 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          Save lot cost
        </button>
      </form>

      <button
        type="button"
        disabled={busy}
        onClick={() => void refreshStale()}
        className="rounded-xl border border-zinc-700 py-3 text-sm font-medium text-zinc-200 disabled:opacity-50"
      >
        Refresh stale estimates (up to 10)
      </button>

      {msg ? <p className="text-sm text-zinc-400">{msg}</p> : null}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs leading-relaxed text-zinc-500">
        <p className="font-medium text-zinc-400">Cost notes</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Vercel Hobby + Turso Free = $0</li>
          <li>UPCitemdb free trial only (100/day) — never paid plan</li>
          <li>eBay Browse asking prices, cached ~24h</li>
          <li>Posters from TMDB CDN (not Vercel Image Optimization)</li>
        </ul>
      </div>
    </div>
  );
}
