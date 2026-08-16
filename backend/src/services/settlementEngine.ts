/**
 * Dynamic ledger settlement engine.
 *
 * Turns tagged transactions into "who owes whom" per circle:
 *   MINE       — no debt.
 *   PARTNER    — tagged member owes the cardholder 100%.
 *   REIMBURSE  — same debt as PARTNER; semantically a receivable ("Mom owed"),
 *                excluded from spending analytics but not from the ledger.
 *   SPLIT      — cost divided evenly across circle members; every non-payer
 *                owes their share to the cardholder. ($100 Chase charge tagged
 *                SPLIT in a 2-person circle → partner owes the cardholder $50.)
 *
 * All arithmetic is integer cents. Penny remainders on SPLIT are allocated
 * deterministically (sorted member ids) so recomputing the ledger twice can
 * never disagree with itself by a cent.
 *
 * Settling: recordSettlement snapshots the CURRENT pair balance into a
 * Settlement row (PENDING) and flips the rows it can attribute exactly;
 * confirmSettlement flips them to SETTLED. SPLIT rows in circles of 3+ touch
 * several pairs at once, so a pair settlement can't flip them — their share
 * is carried on the Settlement as `unattributedAmount` and the ledger
 * subtracts it, which is what keeps the math honest without double-counting.
 */
import type { Settlement, SplitType } from '@prisma/client';
import { prisma } from '../config/db';
import { HttpError } from '../utils/httpError';
import { fromCents, toCents } from '../utils/money';

export interface TransactionDebtInput {
  amountCents: number;
  payerId: string;
  taggedOwnerId: string | null;
  splitType: SplitType;
}

export interface Debt {
  debtorId: string;
  creditorId: string;
  cents: number;
}

export interface PairBalance {
  fromUserId: string; // owes
  toUserId: string; // is owed
  cents: number; // always > 0
}

export interface MemberNet {
  userId: string;
  displayName: string;
  /** Positive = this member is owed money on net; negative = they owe. */
  netCents: number;
}

export interface LedgerSummary {
  circleId: string;
  computedAt: string;
  members: MemberNet[];
  pairs: PairBalance[];
  /** Minimal transfer set that zeroes every net balance. */
  suggestions: PairBalance[];
  unsettledTransactionCount: number;
  pendingSettlements: Array<{
    id: string;
    fromUserId: string;
    toUserId: string;
    amountCents: number;
    createdAt: string;
  }>;
}

// ── Pure debt math (unit-tested directly) ────────────────────────────────────

/**
 * Debts created by a single tagged transaction. `memberIds` MUST be sorted —
 * the penny-remainder allocation depends on that order being stable.
 */
export function debtsForTransaction(txn: TransactionDebtInput, memberIds: string[]): Debt[] {
  if (txn.amountCents === 0) return [];

  switch (txn.splitType) {
    case 'MINE':
      return [];

    case 'PARTNER':
    case 'REIMBURSE': {
      const debtor = txn.taggedOwnerId;
      if (!debtor || debtor === txn.payerId) return [];
      return [{ debtorId: debtor, creditorId: txn.payerId, cents: txn.amountCents }];
    }

    case 'SPLIT': {
      const n = memberIds.length;
      // A payer who isn't (or no longer is) a member can't hold a balance in
      // this circle's ledger — the row is ignored rather than half-counted.
      if (n < 2 || !memberIds.includes(txn.payerId)) return [];

      const abs = Math.abs(txn.amountCents);
      const sign = Math.sign(txn.amountCents);
      const base = Math.floor(abs / n);
      const remainder = abs - base * n;

      const debts: Debt[] = [];
      memberIds.forEach((memberId, index) => {
        if (memberId === txn.payerId) return;
        const share = (base + (index < remainder ? 1 : 0)) * sign;
        if (share !== 0) {
          debts.push({ debtorId: memberId, creditorId: txn.payerId, cents: share });
        }
      });
      return debts;
    }
  }
}

/** Nets raw debts into one balance per unordered pair (direction resolved). */
export function netPairs(debts: Debt[]): PairBalance[] {
  const net = new Map<string, number>();
  for (const debt of debts) {
    if (debt.cents === 0 || debt.debtorId === debt.creditorId) continue;
    const [a, b] =
      debt.debtorId < debt.creditorId ? [debt.debtorId, debt.creditorId] : [debt.creditorId, debt.debtorId];
    const sign = debt.debtorId === a ? 1 : -1;
    const key = `${a}|${b}`;
    net.set(key, (net.get(key) ?? 0) + sign * debt.cents);
  }

  const pairs: PairBalance[] = [];
  for (const [key, cents] of net) {
    if (cents === 0) continue;
    const [a, b] = key.split('|') as [string, string];
    pairs.push(
      cents > 0
        ? { fromUserId: a, toUserId: b, cents }
        : { fromUserId: b, toUserId: a, cents: -cents },
    );
  }
  return pairs.sort((x, y) => (x.fromUserId + x.toUserId).localeCompare(y.fromUserId + y.toUserId));
}

/** Greedy debt simplification: fewest transfers that zero all net balances. */
export function simplifyDebts(nets: Map<string, number>): PairBalance[] {
  const creditors = [...nets.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([userId, cents]) => ({ userId, cents }));
  const debtors = [...nets.entries()]
    .filter(([, v]) => v < 0)
    .sort((a, b) => a[1] - b[1])
    .map(([userId, cents]) => ({ userId, cents: -cents }));

  const transfers: PairBalance[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!;
    const debtor = debtors[di]!;
    const amount = Math.min(creditor.cents, debtor.cents);
    if (amount > 0) {
      transfers.push({ fromUserId: debtor.userId, toUserId: creditor.userId, cents: amount });
    }
    creditor.cents -= amount;
    debtor.cents -= amount;
    if (creditor.cents === 0) ci++;
    if (debtor.cents === 0) di++;
  }
  return transfers;
}

// ── Ledger computation ───────────────────────────────────────────────────────

async function collectCircleDebts(circleId: string): Promise<{
  memberIds: string[];
  members: Array<{ userId: string; displayName: string }>;
  debts: Debt[];
  unsettledCount: number;
}> {
  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    include: { members: { include: { user: { select: { id: true, displayName: true } } } } },
  });
  if (!circle) throw HttpError.notFound('Circle');

  const members = circle.members
    .map((m) => ({ userId: m.userId, displayName: m.user.displayName }))
    .sort((a, b) => a.userId.localeCompare(b.userId));
  const memberIds = members.map((m) => m.userId);

  const transactions = await prisma.transaction.findMany({
    where: { circleId, splitType: { not: null }, settlementStatus: 'UNSETTLED' },
    select: {
      amount: true,
      splitType: true,
      taggedOwnerId: true,
      account: { select: { userId: true } },
    },
  });

  const debts: Debt[] = [];
  for (const txn of transactions) {
    debts.push(
      ...debtsForTransaction(
        {
          amountCents: toCents(txn.amount),
          payerId: txn.account.userId,
          taggedOwnerId: txn.taggedOwnerId,
          splitType: txn.splitType as SplitType,
        },
        memberIds,
      ),
    );
  }

  // Confirmed settlements carry the split-share portion that couldn't be
  // pinned to rows; feed it back in as negative debt so it stops re-appearing.
  const confirmed = await prisma.settlement.findMany({
    where: { circleId, status: 'CONFIRMED', unattributedAmount: { gt: 0 } },
    select: { fromUserId: true, toUserId: true, unattributedAmount: true },
  });
  for (const s of confirmed) {
    debts.push({
      debtorId: s.fromUserId,
      creditorId: s.toUserId,
      cents: -toCents(s.unattributedAmount),
    });
  }

  return { memberIds, members, debts, unsettledCount: transactions.length };
}

export async function computeCircleLedger(circleId: string): Promise<LedgerSummary> {
  const { members, debts, unsettledCount } = await collectCircleDebts(circleId);
  const pairs = netPairs(debts);

  const nets = new Map<string, number>(members.map((m) => [m.userId, 0]));
  for (const pair of pairs) {
    nets.set(pair.toUserId, (nets.get(pair.toUserId) ?? 0) + pair.cents);
    nets.set(pair.fromUserId, (nets.get(pair.fromUserId) ?? 0) - pair.cents);
  }

  const pending = await prisma.settlement.findMany({
    where: { circleId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  return {
    circleId,
    computedAt: new Date().toISOString(),
    members: members.map((m) => ({ ...m, netCents: nets.get(m.userId) ?? 0 })),
    pairs,
    suggestions: simplifyDebts(nets),
    unsettledTransactionCount: unsettledCount,
    pendingSettlements: pending.map((s) => ({
      id: s.id,
      fromUserId: s.fromUserId,
      toUserId: s.toUserId,
      amountCents: toCents(s.amount),
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

// ── Settling ─────────────────────────────────────────────────────────────────

export async function recordSettlement(
  circleId: string,
  fromUserId: string,
  toUserId: string,
  note?: string,
): Promise<Settlement> {
  if (fromUserId === toUserId) {
    throw HttpError.badRequest('Cannot settle with yourself', 'settlement.same_user');
  }

  const ledger = await computeCircleLedger(circleId);
  const pair = ledger.pairs.find((p) => p.fromUserId === fromUserId && p.toUserId === toUserId);
  if (!pair || pair.cents <= 0) {
    throw HttpError.badRequest('Nothing owed in that direction', 'settlement.nothing_owed');
  }

  const { memberIds } = await collectCircleDebts(circleId);
  const twoPerson = memberIds.length === 2;

  // Rows this pair settlement can flip exactly: full-amount tags between the
  // two, plus SPLIT rows when the circle has exactly two members.
  const attributable = await prisma.transaction.findMany({
    where: {
      circleId,
      settlementStatus: 'UNSETTLED',
      OR: [
        {
          splitType: { in: ['PARTNER', 'REIMBURSE'] },
          taggedOwnerId: fromUserId,
          account: { userId: toUserId },
        },
        {
          splitType: { in: ['PARTNER', 'REIMBURSE'] },
          taggedOwnerId: toUserId,
          account: { userId: fromUserId },
        },
        ...(twoPerson
          ? [
              {
                splitType: 'SPLIT' as const,
                account: { userId: { in: [fromUserId, toUserId] } },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      amount: true,
      splitType: true,
      taggedOwnerId: true,
      account: { select: { userId: true } },
    },
  });

  // Net from→to value of the flipped rows, so the remainder can be carried
  // on the settlement instead of double-counted by the next ledger read.
  let flippedNetCents = 0;
  for (const txn of attributable) {
    const rowDebts = debtsForTransaction(
      {
        amountCents: toCents(txn.amount),
        payerId: txn.account.userId,
        taggedOwnerId: txn.taggedOwnerId,
        splitType: txn.splitType as SplitType,
      },
      memberIds,
    );
    for (const debt of rowDebts) {
      if (debt.debtorId === fromUserId && debt.creditorId === toUserId) flippedNetCents += debt.cents;
      if (debt.debtorId === toUserId && debt.creditorId === fromUserId) flippedNetCents -= debt.cents;
    }
  }

  const unattributedCents = Math.max(0, pair.cents - flippedNetCents);

  return prisma.$transaction(async (tx) => {
    const settlement = await tx.settlement.create({
      data: {
        circleId,
        fromUserId,
        toUserId,
        amount: fromCents(pair.cents),
        unattributedAmount: fromCents(unattributedCents),
        note: note ?? null,
      },
    });
    await tx.transaction.updateMany({
      where: { id: { in: attributable.map((t) => t.id) } },
      data: { settlementStatus: 'PENDING', settlementId: settlement.id },
    });
    return settlement;
  });
}

export async function confirmSettlement(settlementId: string, byUserId: string): Promise<Settlement> {
  const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
  if (!settlement) throw HttpError.notFound('Settlement');
  if (settlement.status !== 'PENDING') {
    throw HttpError.conflict('Settlement already confirmed', 'settlement.already_confirmed');
  }
  if (byUserId !== settlement.fromUserId && byUserId !== settlement.toUserId) {
    throw HttpError.forbidden('Only the two parties can confirm', 'settlement.not_a_party');
  }

  const [updated] = await prisma.$transaction([
    prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    }),
    prisma.transaction.updateMany({
      where: { settlementId },
      data: { settlementStatus: 'SETTLED' },
    }),
  ]);
  return updated;
}

export async function cancelSettlement(settlementId: string, byUserId: string): Promise<void> {
  const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
  if (!settlement) throw HttpError.notFound('Settlement');
  if (settlement.status !== 'PENDING') {
    throw HttpError.conflict('Only pending settlements can be canceled', 'settlement.not_pending');
  }
  if (byUserId !== settlement.fromUserId && byUserId !== settlement.toUserId) {
    throw HttpError.forbidden('Only the two parties can cancel', 'settlement.not_a_party');
  }

  await prisma.$transaction([
    prisma.transaction.updateMany({
      where: { settlementId },
      data: { settlementStatus: 'UNSETTLED', settlementId: null },
    }),
    prisma.settlement.delete({ where: { id: settlementId } }),
  ]);
}
