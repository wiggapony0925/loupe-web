/**
 * Recurring-charge detection — the subscription manager's engine.
 *
 * Pure function over the user's transaction history: charges from the same
 * normalized merchant at a steady cadence (weekly / monthly / quarterly /
 * yearly) with consistent amounts are declared recurring, across ALL of the
 * user's cards at once — the whole point is seeing Netflix on the Amex and
 * iCloud on the Sapphire in one list.
 *
 * Detection is deliberately conservative: ≥3 occurrences, gap medians inside
 * a cadence window, and ≥60% of amounts within 25% of the median. A false
 * "subscription" erodes trust faster than a missed one.
 */

export type Cadence = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface RecurringSourceRow {
  merchant: string;
  merchantNormalized: string;
  amountCents: number;
  /** YYYY-MM-DD */
  date: string;
  accountLabel: string;
}

export interface RecurringItem {
  merchant: string;
  merchantNormalized: string;
  cadence: Cadence;
  averageAmountCents: number;
  /** Normalized to a monthly cost for totals (yearly/12, weekly×4.33…). */
  monthlyizedCents: number;
  lastDate: string;
  nextExpectedDate: string;
  occurrences: number;
  accounts: string[];
}

const CADENCE_WINDOWS: Array<{ cadence: Cadence; min: number; max: number; perMonth: number }> = [
  { cadence: 'WEEKLY', min: 5, max: 9, perMonth: 4.33 },
  { cadence: 'MONTHLY', min: 24, max: 37, perMonth: 1 },
  { cadence: 'QUARTERLY', min: 80, max: 100, perMonth: 1 / 3 },
  { cadence: 'YEARLY', min: 340, max: 390, perMonth: 1 / 12 },
];

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function dayGap(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

export function detectRecurring(rows: RecurringSourceRow[]): RecurringItem[] {
  const groups = new Map<string, RecurringSourceRow[]>();
  for (const row of rows) {
    if (row.amountCents <= 0 || !row.merchantNormalized) continue; // credits aren't subscriptions
    const bucket = groups.get(row.merchantNormalized) ?? [];
    bucket.push(row);
    groups.set(row.merchantNormalized, bucket);
  }

  const items: RecurringItem[] = [];
  for (const bucket of groups.values()) {
    if (bucket.length < 3) continue;
    const sorted = [...bucket].sort((a, b) => a.date.localeCompare(b.date));

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = dayGap(sorted[i - 1]!.date, sorted[i]!.date);
      if (gap > 0) gaps.push(gap);
    }
    if (gaps.length < 2) continue;

    const medianGap = median(gaps);
    const window = CADENCE_WINDOWS.find((w) => medianGap >= w.min && medianGap <= w.max);
    if (!window) continue;
    // Most gaps must actually sit in the window — one coincidence isn't a rhythm.
    const inWindow = gaps.filter((g) => g >= window.min && g <= window.max).length;
    if (inWindow / gaps.length < 0.6) continue;

    const amounts = sorted.map((r) => r.amountCents);
    const medianAmount = median(amounts);
    const consistent = amounts.filter((a) => Math.abs(a - medianAmount) <= medianAmount * 0.25);
    if (consistent.length / amounts.length < 0.6) continue;

    const last = sorted[sorted.length - 1]!;
    const recentAmount = median(amounts.slice(-3));
    items.push({
      merchant: last.merchant,
      merchantNormalized: last.merchantNormalized,
      cadence: window.cadence,
      averageAmountCents: recentAmount,
      monthlyizedCents: Math.round(recentAmount * window.perMonth),
      lastDate: last.date,
      nextExpectedDate: addDays(last.date, medianGap),
      occurrences: sorted.length,
      accounts: [...new Set(sorted.map((r) => r.accountLabel))],
    });
  }

  return items.sort((a, b) => b.monthlyizedCents - a.monthlyizedCents);
}
