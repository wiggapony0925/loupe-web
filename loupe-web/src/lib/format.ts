import type { Money } from "@loupe/core";
import {
  convertUsd,
  getActiveDisplayCurrency,
  type CurrencyMeta,
} from "@/lib/currency";

/** Coerce a `Money` or bare number into a number of major units. */
function toAmount(value: Money | number): number {
  return typeof value === "number" ? value : value.amount;
}

function currencyOf(value: Money | number): string {
  return typeof value === "number" ? "USD" : value.currency;
}

/**
 * Resolve a value into what should actually be rendered. USD is Loupe's
 * canonical unit, so USD values follow the user's chosen display currency
 * (profile `/me/settings.currency`, owned by `DisplayCurrencyProvider`).
 * Money already denominated in another currency (e.g. Cardmarket EUR rows)
 * renders natively — we never double-convert provider-native prices.
 */
function toDisplay(value: Money | number): {
  amount: number;
  code: string;
  meta: CurrencyMeta | null;
} {
  const code = currencyOf(value);
  const amount = toAmount(value);
  if (code !== "USD") return { amount, code, meta: null };
  const display = getActiveDisplayCurrency();
  if (display.code === "USD") return { amount, code, meta: null };
  return { amount: convertUsd(amount, display.code), code: display.code, meta: display };
}

/** Crypto codes aren't valid Intl currency codes — format with the glyph. */
function formatCrypto(amount: number, meta: CurrencyMeta, compact: boolean): string {
  if (compact && Math.abs(amount) >= 1_000) {
    return `${meta.symbol}${new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount)}`;
  }
  return `${meta.symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  })}`;
}

/** `$1,240.50` — fixed 2 decimals, locale grouping (in the display currency). */
export function formatMoney(value: Money | number, opts?: { maximumFractionDigits?: number }): string {
  const { amount, code, meta } = toDisplay(value);
  if (meta?.kind === "crypto") return formatCrypto(amount, meta, false);
  const digits = opts?.maximumFractionDigits ?? meta?.decimals ?? 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/** `$1.2K` / `$3.4M` — compact notation for hero figures (display currency). */
export function formatCompactMoney(value: Money | number): string {
  const { amount, code, meta } = toDisplay(value);
  if (meta?.kind === "crypto") return formatCrypto(amount, meta, true);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
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
