/**
 * Money moves through this codebase as integer CENTS.
 *
 * Prisma returns Decimal, Plaid returns floats, and the settlement engine
 * does arithmetic — floats would drift a shared ledger by pennies, which is
 * exactly the kind of pennies people argue about. Convert once at the edge
 * with these helpers; never do `+` on dollar floats.
 */

/** Anything Prisma.Decimal-ish, a number, or a "1,234.56" string → cents. */
export function toCents(value: number | string | { toString(): string }): number {
  const s = String(value).trim();
  const match = /^(-?)\$?\s*([\d,]*)(?:\.(\d+))?$/.exec(s);
  if (!match || (match[2] === '' && match[3] === undefined)) {
    throw new Error(`Not a monetary amount: "${s}"`);
  }
  const sign = match[1] === '-' ? -1 : 1;
  const whole = (match[2] ?? '').replace(/,/g, '') || '0';
  const frac = `${match[3] ?? ''}00`.slice(0, 2);
  return sign * (Number.parseInt(whole, 10) * 100 + Number.parseInt(frac, 10));
}

/** Cents → canonical decimal string ("-123.45") for Prisma Decimal columns. */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, '0');
  return `${sign}${dollars}.${remainder}`;
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/** Cents → "$1,234.56" / "-$12.00" for statements and notifications. */
export function formatUsd(cents: number): string {
  return usd.format(cents / 100);
}
