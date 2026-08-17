/**
 * Display formatting. Money arrives as integer cents and leaves as strings —
 * no float math ever happens in a component.
 */
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function money(cents: number): string {
  return usd.format(cents / 100);
}

/** Hero numbers drop the cents below $10k so the type stays enormous. */
export function moneyHero(cents: number): string {
  return Math.abs(cents) >= 1_000_000 ? usdWhole.format(Math.round(cents / 100)) : usd.format(cents / 100);
}

/** "unknown ≠ $0" made visible: null renders an em dash, never a zero. */
export function moneyOrDash(cents: number | null): string {
  return cents === null ? '—' : usd.format(cents / 100);
}

export function signedMoney(cents: number): string {
  return `${cents > 0 ? '+' : ''}${usd.format(cents / 100)}`;
}

const dayFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC', // transaction dates are calendar dates pinned to UTC noon
});

export function friendlyDate(isoDate: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (isoDate === today) return 'Today';
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (isoDate === yesterday) return 'Yesterday';
  return dayFormat.format(new Date(`${isoDate}T12:00:00Z`));
}

/** Axis-label money: "$4.7K", "$26.5K", "$1.28M" — compact, never rounded up past the truth. */
export function moneyCompact(cents: number): string {
  const dollars = cents / 100;
  const sign = dollars < 0 ? '-' : '';
  const abs = Math.abs(dollars);
  if (abs >= 1_000_000) return `${sign}$${trimZeros((abs / 1_000_000).toFixed(2))}M`;
  if (abs >= 1_000) return `${sign}$${trimZeros((abs / 1_000).toFixed(1))}K`;
  return `${sign}$${Math.round(abs)}`;
}

function trimZeros(value: string): string {
  return value.replace(/\.0+$|(\.\d*?)0+$/, '$1');
}

const chartDateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

/** Chart axis date: "Jun 1". */
export function chartDate(epochMs: number): string {
  return chartDateFormat.format(epochMs);
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}
