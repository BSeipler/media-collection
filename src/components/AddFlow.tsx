"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import type { Format, IdentifyCandidate, Item } from "@/lib/types";

type Mode = "scan" | "photo" | "search";

const BARCODE_FORMATS = [
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
];

const NATIVE_BARCODE_FORMATS = [
  "upc_a",
  "upc_e",
  "ean_13",
  "ean_8",
  "code_128",
];

type NativeBarcodeDetector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

async function createNativeDetector(): Promise<NativeBarcodeDetector | null> {
  const ctor = (
    window as Window & {
      BarcodeDetector?: {
        getSupportedFormats?: () => Promise<string[]>;
        new (options?: { formats?: string[] }): NativeBarcodeDetector;
      };
    }
  ).BarcodeDetector;
  if (!ctor) return null;

  try {
    if (ctor.getSupportedFormats) {
      const supported = await ctor.getSupportedFormats();
      const formats = NATIVE_BARCODE_FORMATS.filter((format) =>
        supported.includes(format),
      );
      if (!formats.length) return null;
      return new ctor({ formats });
    }
    return new ctor({ formats: NATIVE_BARCODE_FORMATS });
  } catch {
    return null;
  }
}

function drawBarcodeBand(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cropW = Math.round(vw * 0.86);
  const cropH = Math.round(vh * 0.3);
  const sx = Math.round((vw - cropW) / 2);
  const sy = Math.round((vh - cropH) / 2);
  const scale = Math.min(1, 640 / cropW);
  canvas.width = Math.max(1, Math.round(cropW * scale));
  canvas.height = Math.max(1, Math.round(cropH * scale));
  ctx.drawImage(
    video,
    sx,
    sy,
    cropW,
    cropH,
    0,
    0,
    canvas.width,
    canvas.height,
  );
}

function stopStream(video: HTMLVideoElement) {
  const stream = video.srcObject;
  if (stream instanceof MediaStream) {
    for (const track of stream.getTracks()) track.stop();
  }
  video.srcObject = null;
}

export function AddFlow() {
  const [mode, setMode] = useState<Mode>("scan");
  const [format, setFormat] = useState<Format>("dvd");
  const [candidates, setCandidates] = useState<IdentifyCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Item | null>(null);
  const [query, setQuery] = useState("");
  const [upcHint, setUpcHint] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanningRef = useRef(false);
  const modeRef = useRef(mode);
  const candidatesRef = useRef(candidates);
  const recentUpcRef = useRef<{ code: string; at: number } | null>(null);
  const identifyUpcRef = useRef<(upc: string) => void>(() => {});

  modeRef.current = mode;
  candidatesRef.current = candidates;

  const identifyUpc = useCallback(
    async (upc: string) => {
      scanningRef.current = false;
      setLoading(true);
      setError(null);
      setUpcHint(upc);
      try {
        const res = await fetch("/api/identify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upc, format }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Identify failed");
        const next = (data.candidates ?? []) as IdentifyCandidate[];
        candidatesRef.current = next;
        setCandidates(next);
        if (!next.length) {
          setError(`No match for UPC ${upc}. Try search or cover photo.`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Identify failed");
      } finally {
        setLoading(false);
        if (modeRef.current === "scan") scanningRef.current = true;
      }
    },
    [format],
  );

  identifyUpcRef.current = identifyUpc;

  useEffect(() => {
    if (mode !== "scan") return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let timer = 0;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, BARCODE_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const acceptCode = (text: string) => {
      if (!scanningRef.current || candidatesRef.current.length > 0) return;
      const now = Date.now();
      const recent = recentUpcRef.current;
      if (recent && recent.code === text && now - recent.at < 2000) return;
      recentUpcRef.current = { code: text, at: now };
      identifyUpcRef.current(text);
    };

    let detector: NativeBarcodeDetector | null = null;

    const scanFrame = async () => {
      if (cancelled) return;
      const paused =
        document.hidden ||
        !scanningRef.current ||
        candidatesRef.current.length > 0 ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        !video.videoWidth;

      if (paused) {
        schedule(250);
        return;
      }

      try {
        if (detector) {
          const codes = await detector.detect(video);
          if (cancelled) return;
          const text = codes.find((code) => code.rawValue)?.rawValue;
          if (text) acceptCode(text);
        } else if (ctx) {
          drawBarcodeBand(video, canvas, ctx);
          const result = reader.decodeFromCanvas(canvas);
          const text = result.getText();
          if (text) acceptCode(text);
        }
      } catch {
        // No barcode in this frame, or the frame was not ready yet.
      }

      schedule(detector ? 160 : 280);
    };

    const schedule = (ms: number) => {
      if (!cancelled) timer = window.setTimeout(scanFrame, ms);
    };

    video.muted = true;
    video.playsInline = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        // Keep this stream for the whole visit. Stopping it and calling
        // getUserMedia again makes iOS show the camera prompt a second time.
        video.srcObject = stream;
        await video.play();
        if (cancelled) {
          stopStream(video);
          return;
        }
        detector = await createNativeDetector();
        if (cancelled) {
          stopStream(video);
          return;
        }
        if (!detector && !ctx) {
          stopStream(video);
          setError("Could not start the barcode scanner.");
          return;
        }
        scanningRef.current = true;
        schedule(0);
      } catch (err) {
        if (!cancelled) {
          stopStream(video);
          setError(
            err instanceof Error
              ? err.message
              : "Camera unavailable. Use HTTPS (Vercel) and allow camera access.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      scanningRef.current = false;
      window.clearTimeout(timer);
      stopStream(video);
    };
  }, [mode]);

  async function searchTitle(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setCandidates(data.candidates ?? []);
      if (!(data.candidates ?? []).length) setError("No TMDB matches.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function onCoverPhoto(file: File) {
    setLoading(true);
    setError(null);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const {
        data: { text },
      } = await worker.recognize(file);
      await worker.terminate();
      const cleaned = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 2)
        .slice(0, 4)
        .join(" ");
      if (!cleaned) {
        setError("Could not read text from cover. Try typing the title.");
        return;
      }
      setQuery(cleaned);
      setMode("search");
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleaned, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setCandidates(data.candidates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveCandidate(c: IdentifyCandidate, force = false) {
    setLoading(true);
    setError(null);
    scanningRef.current = false;
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: c.title,
          year: c.year,
          format: c.format,
          upc: c.upc ?? upcHint,
          tmdb_id: c.tmdb_id,
          poster_path: c.poster_path,
          genres: c.genres,
          force,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.warning === "similar") {
        const ok = window.confirm(
          `${data.message}\n\nAdd another copy anyway?`,
        );
        if (ok) return saveCandidate(c, true);
        setLoading(false);
        scanningRef.current = true;
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setLastSaved(data.item);
      candidatesRef.current = [];
      setCandidates([]);
      setUpcHint(null);
      setQuery("");
      setTimeout(() => {
        setLastSaved(null);
        scanningRef.current = true;
        setMode("scan");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      scanningRef.current = true;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3 px-3 py-3 pb-24">
      <div className="flex gap-1 rounded-xl bg-zinc-900 p-1">
        {(
          [
            ["scan", "Barcode"],
            ["photo", "Cover"],
            ["search", "Search"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              mode === m
                ? "bg-amber-500 text-zinc-950"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {(["dvd", "vhs", "other"] as Format[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={`flex-1 rounded-lg border py-2 text-xs font-semibold uppercase ${
              format === f
                ? "border-amber-500 bg-amber-500/15 text-amber-300"
                : "border-zinc-800 text-zinc-500"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {mode === "scan" ? (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black">
          <video
            ref={videoRef}
            className="aspect-[3/4] w-full object-cover"
            muted
            playsInline
            autoPlay
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-3/4 rounded-lg border-2 border-amber-400/80" />
          </div>
          <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-zinc-200/90">
            Point at the UPC barcode
          </p>
        </div>
      ) : null}

      {mode === "photo" ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-6 text-center">
          <p className="mb-3 text-sm text-zinc-400">
            Snap the cover when there is no readable barcode (common on worn
            VHS).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onCoverPhoto(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950"
          >
            Take / choose photo
          </button>
        </div>
      ) : null}

      {mode === "search" ? (
        <form onSubmit={searchTitle} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Movie title…"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950"
          >
            Go
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-center text-sm text-zinc-400">Working…</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {lastSaved ? (
        <p className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          Saved {lastSaved.title}
          {lastSaved.estimated_cents != null
            ? ` · ~$${(lastSaved.estimated_cents / 100).toFixed(2)}`
            : ""}
        </p>
      ) : null}

      {upcHint ? (
        <p className="text-center text-xs text-zinc-500">UPC {upcHint}</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {candidates.map((c) => (
          <button
            key={`${c.tmdb_id}-${c.title}-${c.format}`}
            type="button"
            onClick={() => void saveCandidate(c)}
            disabled={loading}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-left hover:border-amber-500/50 disabled:opacity-60"
          >
            <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-zinc-800">
              {c.poster_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    c.poster_path.startsWith("http")
                      ? c.poster_path
                      : `https://image.tmdb.org/t/p/w92${c.poster_path}`
                  }
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-zinc-100">
                {c.title}
              </div>
              <div className="text-xs text-zinc-500">
                {c.year ?? "—"} · {c.format.toUpperCase()} · {c.confidence} ·{" "}
                {c.source}
              </div>
              {c.genres.length > 0 ? (
                <div className="truncate text-xs text-zinc-500">
                  {c.genres.join(" · ")}
                </div>
              ) : null}
            </div>
            <span className="text-xs font-semibold text-amber-400">Add</span>
          </button>
        ))}
      </div>
    </div>
  );
}
