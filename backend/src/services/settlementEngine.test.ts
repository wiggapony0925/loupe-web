import { describe, expect, it } from 'vitest';
import { debtsForTransaction, netPairs, simplifyDebts } from './settlementEngine';

const OWNER = 'a-owner';
const NICOL = 'b-nicol';
const MOM = 'c-mom';
const TWO = [OWNER, NICOL].sort();
const THREE = [OWNER, NICOL, MOM].sort();

describe('debtsForTransaction', () => {
  it('MINE creates no debt', () => {
    expect(
      debtsForTransaction(
        { amountCents: 10_000, payerId: OWNER, taggedOwnerId: OWNER, splitType: 'MINE' },
        TWO,
      ),
    ).toEqual([]);
  });

  it('PARTNER puts the full amount on the tagged member', () => {
    expect(
      debtsForTransaction(
        { amountCents: 10_000, payerId: OWNER, taggedOwnerId: NICOL, splitType: 'PARTNER' },
        TWO,
      ),
    ).toEqual([{ debtorId: NICOL, creditorId: OWNER, cents: 10_000 }]);
  });

  it('SPLIT 50/50: $100 charge → partner owes the cardholder $50 (the spec case)', () => {
    expect(
      debtsForTransaction(
        { amountCents: 10_000, payerId: OWNER, taggedOwnerId: null, splitType: 'SPLIT' },
        TWO,
      ),
    ).toEqual([{ debtorId: NICOL, creditorId: OWNER, cents: 5_000 }]);
  });

  it('SPLIT allocates penny remainders deterministically', () => {
    const debts = debtsForTransaction(
      { amountCents: 1_000, payerId: OWNER, taggedOwnerId: null, splitType: 'SPLIT' },
      THREE, // $10.00 / 3 = 333.33… → 334 + 333 + 333
    );
    const total = debts.reduce((s, d) => s + d.cents, 0);
    // Payer absorbs their own share; the two others owe the rest.
    expect(debts).toHaveLength(2);
    expect(total).toBe(1_000 - shareOf(OWNER, THREE, 1_000));
    // Recomputing yields the identical allocation.
    expect(
      debtsForTransaction(
        { amountCents: 1_000, payerId: OWNER, taggedOwnerId: null, splitType: 'SPLIT' },
        THREE,
      ),
    ).toEqual(debts);
  });

  it('REIMBURSE behaves like a full receivable', () => {
    expect(
      debtsForTransaction(
        { amountCents: 4_200, payerId: OWNER, taggedOwnerId: MOM, splitType: 'REIMBURSE' },
        THREE,
      ),
    ).toEqual([{ debtorId: MOM, creditorId: OWNER, cents: 4_200 }]);
  });

  it('refunds (negative amounts) reverse the debt', () => {
    const debts = debtsForTransaction(
      { amountCents: -10_000, payerId: OWNER, taggedOwnerId: null, splitType: 'SPLIT' },
      TWO,
    );
    expect(debts).toEqual([{ debtorId: NICOL, creditorId: OWNER, cents: -5_000 }]);
  });

  it('ignores a payer who is not a circle member', () => {
    expect(
      debtsForTransaction(
        { amountCents: 10_000, payerId: 'stranger', taggedOwnerId: null, splitType: 'SPLIT' },
        TWO,
      ),
    ).toEqual([]);
  });
});

function shareOf(userId: string, memberIds: string[], amountCents: number): number {
  const base = Math.floor(amountCents / memberIds.length);
  const remainder = amountCents - base * memberIds.length;
  const index = memberIds.indexOf(userId);
  return base + (index < remainder ? 1 : 0);
}

describe('netPairs', () => {
  it('nets opposing debts down to one directed balance', () => {
    const pairs = netPairs([
      { debtorId: NICOL, creditorId: OWNER, cents: 5_000 },
      { debtorId: OWNER, creditorId: NICOL, cents: 2_000 },
    ]);
    expect(pairs).toEqual([{ fromUserId: NICOL, toUserId: OWNER, cents: 3_000 }]);
  });

  it('drops fully-offsetting pairs', () => {
    expect(
      netPairs([
        { debtorId: NICOL, creditorId: OWNER, cents: 5_000 },
        { debtorId: OWNER, creditorId: NICOL, cents: 5_000 },
      ]),
    ).toEqual([]);
  });
});

describe('simplifyDebts', () => {
  it('produces the minimal transfer set', () => {
    const nets = new Map<string, number>([
      [OWNER, 7_000],
      [NICOL, -5_000],
      [MOM, -2_000],
    ]);
    const transfers = simplifyDebts(nets);
    expect(transfers).toEqual([
      { fromUserId: NICOL, toUserId: OWNER, cents: 5_000 },
      { fromUserId: MOM, toUserId: OWNER, cents: 2_000 },
    ]);
    const totalMoved = transfers.reduce((s, t) => s + t.cents, 0);
    expect(totalMoved).toBe(7_000);
  });
});
