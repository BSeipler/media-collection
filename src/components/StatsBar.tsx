import { centsToDollars } from "@/lib/money";
import type { CollectionStats } from "@/lib/types";

export function StatsBar({ stats }: { stats: CollectionStats }) {
  const ratio =
    stats.lot_cost_cents > 0
      ? stats.estimated_total_cents / stats.lot_cost_cents
      : 0;
  const win = stats.estimated_total_cents >= stats.lot_cost_cents;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Titles" value={String(stats.count)} />
      <Stat label="Paid" value={centsToDollars(stats.lot_cost_cents)} />
      <Stat
        label="Estimated"
        value={centsToDollars(stats.estimated_total_cents)}
        hint={stats.unpriced > 0 ? `${stats.unpriced} unpriced` : undefined}
      />
      <Stat
        label="vs paid"
        value={stats.count === 0 ? "—" : `${ratio.toFixed(1)}×`}
        accent={stats.count > 0 ? (win ? "good" : "warn") : undefined}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "good" | "warn";
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div
        className={`text-lg font-semibold tabular-nums ${
          accent === "good"
            ? "text-emerald-400"
            : accent === "warn"
              ? "text-amber-400"
              : "text-zinc-100"
        }`}
      >
        {value}
      </div>
      {hint ? <div className="text-[11px] text-zinc-500">{hint}</div> : null}
    </div>
  );
}
