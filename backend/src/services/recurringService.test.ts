import { describe, expect, it } from 'vitest';
import { detectRecurring, type RecurringSourceRow } from './recurringService';

function charge(merchant: string, date: string, amountCents: number, account = 'Amex ••1002'): RecurringSourceRow {
  return { merchant, merchantNormalized: merchant, amountCents, date, accountLabel: account };
}

describe('detectRecurring', () => {
  it('finds a monthly subscription and normalizes the monthly cost', () => {
    const items = detectRecurring([
      charge('NETFLIX', '2026-05-14', 2_299),
      charge('NETFLIX', '2026-06-14', 2_299),
      charge('NETFLIX', '2026-07-14', 2_299),
      charge('NETFLIX', '2026-08-14', 2_299),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]!.cadence).toBe('MONTHLY');
    expect(items[0]!.monthlyizedCents).toBe(2_299);
    expect(items[0]!.nextExpectedDate).toBe('2026-09-14');
  });

  it('spots the same subscription across different cards', () => {
    const items = detectRecurring([
      charge('SPOTIFY', '2026-06-01', 1_199, 'Amex ••1002'),
      charge('SPOTIFY', '2026-07-01', 1_199, 'Sapphire ••1234'),
      charge('SPOTIFY', '2026-08-01', 1_199, 'Sapphire ••1234'),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]!.accounts).toEqual(['Amex ••1002', 'Sapphire ••1234']);
  });

  it('normalizes yearly charges to a monthly cost', () => {
    const items = detectRecurring([
      charge('ICLOUD YEARLY', '2024-08-01', 12_000),
      charge('ICLOUD YEARLY', '2025-08-01', 12_000),
      charge('ICLOUD YEARLY', '2026-08-01', 12_000),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]!.cadence).toBe('YEARLY');
    expect(items[0]!.monthlyizedCents).toBe(1_000);
  });

  it('rejects irregular merchants (groceries are not a subscription)', () => {
    const items = detectRecurring([
      charge('WHOLEFDS', '2026-06-02', 8_734),
      charge('WHOLEFDS', '2026-06-09', 4_120),
      charge('WHOLEFDS', '2026-06-11', 15_600),
      charge('WHOLEFDS', '2026-07-29', 2_312),
    ]);
    expect(items).toHaveLength(0);
  });

  it('rejects steady cadence with wildly varying amounts (weekly fuel-ups)', () => {
    const items = detectRecurring([
      charge('SHELL', '2026-07-01', 3_000),
      charge('SHELL', '2026-07-08', 9_500),
      charge('SHELL', '2026-07-15', 1_200),
      charge('SHELL', '2026-07-22', 7_400),
    ]);
    expect(items).toHaveLength(0);
  });

  it('ignores credits and needs at least three occurrences', () => {
    expect(
      detectRecurring([
        charge('REFUNDER', '2026-06-01', -1_000),
        charge('REFUNDER', '2026-07-01', -1_000),
        charge('REFUNDER', '2026-08-01', -1_000),
        charge('NEWTHING', '2026-07-01', 999),
        charge('NEWTHING', '2026-08-01', 999),
      ]),
    ).toHaveLength(0);
  });
});
