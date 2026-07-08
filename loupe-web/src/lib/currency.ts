/**
 * Loupe's display-currency catalog — fiat + crypto. Mirrors the mobile
 * `src/shared/currency.ts` so both clients agree on codes, symbols, and
 * rates (the profile's `/me/settings.currency` is shared).
 *
 * Rates are quoted as "1 USD = X <code>". These app-side conversion constants
 * keep display formatting deterministic; market prices still come from the
 * backend in USD.
 *
 * The ACTIVE display code lives in module scope so the pure formatters in
 * `lib/format.ts` can read it without every caller threading a hook through.
 * `DisplayCurrencyProvider` owns writes and re-keys the app subtree on
 * change, so nothing renders a stale currency.
 */

export type CurrencyKind = "fiat" | "crypto";

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  /** Flag emoji (fiat) or stylized glyph (crypto). */
  flag: string;
  kind: CurrencyKind;
  /** 1 USD → this many units of the currency. */
  ratePerUsd: number;
  /** Decimals to render in compact mode. */
  decimals: number;
}

export const CURRENCIES: CurrencyMeta[] = [
  // ── Major fiat
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", kind: "fiat", ratePerUsd: 1, decimals: 2 },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", kind: "fiat", ratePerUsd: 0.92, decimals: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", kind: "fiat", ratePerUsd: 0.79, decimals: 2 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", kind: "fiat", ratePerUsd: 156.4, decimals: 0 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦", kind: "fiat", ratePerUsd: 1.37, decimals: 2 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", kind: "fiat", ratePerUsd: 1.51, decimals: 2 },
  { code: "CHF", name: "Swiss Franc", symbol: "₣", flag: "🇨🇭", kind: "fiat", ratePerUsd: 0.91, decimals: 2 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳", kind: "fiat", ratePerUsd: 7.24, decimals: 2 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", flag: "🇭🇰", kind: "fiat", ratePerUsd: 7.81, decimals: 2 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", kind: "fiat", ratePerUsd: 1.35, decimals: 2 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", flag: "🇰🇷", kind: "fiat", ratePerUsd: 1378, decimals: 0 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", kind: "fiat", ratePerUsd: 83.4, decimals: 2 },
  { code: "MXN", name: "Mexican Peso", symbol: "$", flag: "🇲🇽", kind: "fiat", ratePerUsd: 17.1, decimals: 2 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷", kind: "fiat", ratePerUsd: 5.12, decimals: 2 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", kind: "fiat", ratePerUsd: 3.67, decimals: 2 },
  // ── Crypto
  { code: "BTC", name: "Bitcoin", symbol: "₿", flag: "₿", kind: "crypto", ratePerUsd: 1 / 67_400, decimals: 6 },
  { code: "ETH", name: "Ethereum", symbol: "Ξ", flag: "Ξ", kind: "crypto", ratePerUsd: 1 / 3_120, decimals: 4 },
  { code: "SOL", name: "Solana", symbol: "◎", flag: "◎", kind: "crypto", ratePerUsd: 1 / 152, decimals: 3 },
  { code: "USDC", name: "USD Coin", symbol: "$", flag: "Ⓤ", kind: "crypto", ratePerUsd: 1, decimals: 2 },
  { code: "USDT", name: "Tether", symbol: "₮", flag: "₮", kind: "crypto", ratePerUsd: 1, decimals: 2 },
  { code: "MATIC", name: "Polygon", symbol: "◆", flag: "◆", kind: "crypto", ratePerUsd: 1 / 0.71, decimals: 2 },
];

const BY_CODE: Record<string, CurrencyMeta> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c]),
);

export function getCurrency(code: string): CurrencyMeta {
  return BY_CODE[code] ?? BY_CODE.USD!;
}

/** True when the catalog can actually format this code. */
export function isSupportedCurrency(code: string): boolean {
  return Boolean(BY_CODE[code]);
}

// ── Active display currency (module state; written by the provider) ──────

const STORAGE_KEY = "loupe.display-currency";

let activeCode = "USD";
if (typeof window !== "undefined") {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && BY_CODE[saved]) activeCode = saved;
}

export function getActiveDisplayCurrency(): CurrencyMeta {
  return getCurrency(activeCode);
}

/** Provider-only: set the module-level display currency (+ persist locally). */
export function setActiveDisplayCurrency(code: string): void {
  activeCode = BY_CODE[code] ? code : "USD";
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, activeCode);
  }
}

// ── Live FX rates (module state; written by the provider) ────────────────
// Backend `GET /v1/market/fx/rates` is the ONE conversion source shared
// with mobile; the static `ratePerUsd` snapshot above is only the
// offline / first-paint fallback.

let liveRates: Record<string, number> | null = null;

/** Provider-only: install the server FX table. */
export function setLiveFxRates(rates: Record<string, number>): void {
  if (rates && typeof rates.USD === "number") liveRates = rates;
}

/** Convert a USD amount → the target currency's native units. */
export function convertUsd(usd: number, code: string): number {
  const live = liveRates?.[code];
  return usd * (live ?? getCurrency(code).ratePerUsd);
}
