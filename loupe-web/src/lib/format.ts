import type { Money } from "@loupe/core";

/** Coerce a `Money` or bare number into a number of major units. */
function toAmount(value: Money | number): number {
  return typeof value === "number" ? value : value.amount;
}

function currencyOf(value: Money | number): string {
  return typeof value === "number" ? "USD" : value.currency;
}

/** `$1,240.50` — fixed 2 decimals, locale grouping. */
export function formatMoney(value: Money | number, opts?: { maximumFractionDigits?: number }): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyOf(value),
    minimumFractionDigits: opts?.maximumFractionDigits ?? 2,
    maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
  }).format(toAmount(value));
}

/** `$1.2K` / `$3.4M` — compact notation for hero figures. */
export function formatCompactMoney(value: Money | number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyOf(value),
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toAmount(value));
}

/** `+$240.50` / `−$12.00` — signed money with a real minus glyph. */
export function formatSignedMoney(value: Money | number): string {
  const amount = toAmount(value);
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}${formatMoney({ amount: Math.abs(amount), currency: currencyOf(value) })}`;
}

/** `+3.42%` / `−1.10%` — signed percentage. Input is already a percent (e.g. 3.42). */
export function formatPercent(pct: number, fractionDigits = 2): string {
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(fractionDigits)}%`;
}

/** Trend direction for a delta value. */
export function trendOf(value: number): "up" | "down" | "flat" {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

/** `2h ago`, `3d ago` — coarse relative time. */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
