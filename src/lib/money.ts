export function centsToDollars(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function dollarsToCents(dollars: string | number): number {
  const n = typeof dollars === "number" ? dollars : Number.parseFloat(dollars);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function effectiveValueCents(item: {
  estimated_cents: number | null;
  override_cents: number | null;
}): number | null {
  if (item.override_cents != null) return item.override_cents;
  return item.estimated_cents;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

export function median(values: number[]): number {
  return percentile([...values].sort((a, b) => a - b), 0.5);
}
