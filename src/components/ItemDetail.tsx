"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { centsToDollars, effectiveValueCents } from "@/lib/money";
import { itemPosterUrl } from "@/lib/poster";
import { compressCoverImage } from "@/lib/image-compress";
import type { Comp, Item } from "@/lib/types";

export function ItemDetail({
  item: initial,
  comps: initialComps,
  soldUrl,
  readOnly = false,
}: {
  item: Item;
  comps: Comp[];
  soldUrl: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [item, setItem] = useState(initial);
  const [comps, setComps] = useState(initialComps);
  const [override, setOverride] = useState(
    item.override_cents != null ? (item.override_cents / 100).toFixed(2) : "",
  );
  const [notes, setNotes] = useState(item.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [posterKey, setPosterKey] = useState(0);

  const poster = itemPosterUrl(item, "w342");
  const value = effectiveValueCents(item);

  async function refreshValue() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/items/${item.id}/value`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      setItem(data.item);
      const detail = await fetch(`/api/items/${item.id}`);
      const d = await detail.json();
      if (d.comps) setComps(d.comps);
      setMsg("Asking-price estimate refreshed");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveOverride() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          override_dollars: override.trim() === "" ? null : override,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setItem(data.item);
      setMsg("Saved");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPosterFile(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const { blob } = await compressCoverImage(file);
      const form = new FormData();
      form.append("file", blob, "cover.jpg");
      const res = await fetch(`/api/items/${item.id}/poster`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setItem(data.item);
      setPosterKey((k) => k + 1);
      setMsg("Cover photo saved");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePoster() {
    if (!window.confirm("Remove custom cover photo?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/items/${item.id}/poster`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setItem(data.item);
      setPosterKey((k) => k + 1);
      setMsg("Custom cover removed");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-3 py-4 pb-24">
      <div className="flex gap-4">
        <div className="flex shrink-0 flex-col gap-2">
          <div className="h-44 w-28 overflow-hidden rounded-xl bg-zinc-800">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={posterKey}
                src={`${poster}${item.has_custom_poster ? `?v=${posterKey}` : ""}`}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-zinc-500">
                No poster
              </div>
            )}
          </div>
          {readOnly ? null : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPosterFile(f);
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="rounded-lg bg-zinc-800 px-2 py-1.5 text-[11px] font-medium text-zinc-100 disabled:opacity-50"
              >
                {item.has_custom_poster || item.poster_path
                  ? "Replace photo"
                  : "Add photo"}
              </button>
              {item.has_custom_poster ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removePoster()}
                  className="text-[11px] text-zinc-500 underline disabled:opacity-50"
                >
                  Remove custom
                </button>
              ) : null}
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-zinc-50">{item.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {item.year ?? "—"} · {item.format.toUpperCase()}
            {item.upc ? ` · UPC ${item.upc}` : ""}
          </p>
          {item.genres.length > 0 ? (
            <p className="mt-1 text-sm text-zinc-500">
              {item.genres.map((name, index) => (
                <span key={name}>
                  {index > 0 ? " · " : null}
                  <a href={`/?genre=${encodeURIComponent(name)}`} className="hover:text-amber-300">
                    {name}
                  </a>
                </span>
              ))}
            </p>
          ) : null}
          <p className="mt-3 text-2xl font-semibold tabular-nums text-amber-300">
            {centsToDollars(value)}
          </p>
          {item.estimated_cents != null ? (
            <p className="text-xs text-zinc-500">
              Asking estimate {centsToDollars(item.estimate_low_cents)}–
              {centsToDollars(item.estimate_high_cents)} · {item.comp_count}{" "}
              listings · {item.confidence ?? "—"} confidence
              {item.override_cents != null ? " · override set" : ""}
            </p>
          ) : (
            <p className="text-xs text-zinc-500">No comps yet</p>
          )}
        </div>
      </div>

      {readOnly ? (
        item.notes ? (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300">
            {item.notes}
          </p>
        ) : null
      ) : (
        <>
          <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
            Estimates use current eBay asking prices (not sold comps). Sold data
            APIs are closed to new apps.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void refreshValue()}
              className="rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100 disabled:opacity-50"
            >
              Refresh estimate
            </button>
            <a
              href={soldUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm font-medium text-amber-300"
            >
              Open eBay sold search
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="rounded-xl px-3 py-2 text-sm text-red-400"
            >
              Delete
            </button>
          </div>

          <label className="block text-sm text-zinc-400">
            Sold / override price ($)
            <input
              value={override}
              onChange={(e) => setOverride(e.target.value)}
              placeholder="Paste confirmed sold price"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500"
            />
          </label>

          <label className="block text-sm text-zinc-400">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500"
            />
          </label>

          <button
            type="button"
            disabled={busy}
            onClick={() => void saveOverride()}
            className="rounded-xl bg-amber-500 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            Save
          </button>
        </>
      )}

      {msg ? <p className="text-sm text-zinc-400">{msg}</p> : null}

      {comps.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-300">
            Cached asking listings
          </h2>
          <ul className="flex flex-col gap-2">
            {comps.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
              >
                <div className="flex justify-between gap-2 text-sm">
                  <span className="line-clamp-2 text-zinc-300">
                    {c.listing_title}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-amber-300">
                    {centsToDollars(c.price_cents)}
                  </span>
                </div>
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-zinc-500 underline"
                  >
                    View
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-center text-[11px] text-zinc-600">
        This product uses the TMDB API but is not endorsed or certified by
        TMDB.
      </p>
    </div>
  );
}
