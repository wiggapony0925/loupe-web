/**
 * Email ↔ Plaid reconciliation.
 *
 * The same swipe reaches us twice: instantly via the alert email, and up to
 * ~24h later via Plaid. When the Plaid copy lands we must find its email twin
 * and MERGE — not insert — or every real-time charge would eventually appear
 * twice and the shared ledger would double-charge someone.
 *
 * Matching is fuzzy on purpose: the email says "SQ *BLUE BOTTLE" while Plaid
 * says "Blue Bottle Coffee", and the email's calendar date can sit a day or
 * two before Plaid's posted date. Amount is the one hard requirement
 * (exact to the cent); date must be within ±3 days; merchant similarity
 * breaks ties.
 */
import { addDays, subDays } from 'date-fns';
import { prisma } from '../config/db';
import { fromCents, toCents } from '../utils/money';
import { normalizeMerchant } from './emailParser';
import { logger } from '../utils/logger';

export interface IncomingPlaidTransaction {
  plaidTransactionId: string;
  amountCents: number;
  /** UTC-noon calendar date. */
  date: Date;
  merchantName: string;
  category: string | null;
  pending: boolean;
}

export type ReconcileAction = 'merged' | 'created' | 'updated';

// ── Merchant similarity ──────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length] ?? Math.max(a.length, b.length);
}

/** 0..1 — normalized-merchant similarity. Exported for tests. */
export function merchantSimilarity(rawA: string, rawB: string): number {
  const a = normalizeMerchant(rawA);
  const b = normalizeMerchant(rawB);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const tokensA = new Set(a.split(' '));
  const tokensB = new Set(b.split(' '));
  const shared = [...tokensA].filter((t) => tokensB.has(t)).length;
  const jaccard = shared / (tokensA.size + tokensB.size - shared);

  const editSimilarity = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return Math.max(jaccard, editSimilarity);
}

// ── Reconciliation ───────────────────────────────────────────────────────────

const DATE_WINDOW_DAYS = 3;
const MIN_MERCHANT_SIMILARITY = 0.35;

/**
 * Finds the best unmerged email-sourced twin for an incoming Plaid
 * transaction on the same account. Amount must match exactly; among exact
 * matches, score = merchant similarity (70%) + date proximity (30%).
 */
export async function findEmailTwin(
  accountId: string,
  incoming: IncomingPlaidTransaction,
): Promise<{ id: string; status: string; splitType: string | null } | null> {
  const candidates = await prisma.transaction.findMany({
    where: {
      accountId,
      plaidTransactionId: null,
      source: 'EMAIL',
      amount: fromCents(incoming.amountCents),
      date: {
        gte: subDays(incoming.date, DATE_WINDOW_DAYS),
        lte: addDays(incoming.date, DATE_WINDOW_DAYS),
      },
    },
    select: { id: true, status: true, splitType: true, merchantNormalized: true, date: true },
  });
  if (candidates.length === 0) return null;

  let best: { id: string; status: string; splitType: string | null } | null = null;
  let bestScore = -1;
  for (const candidate of candidates) {
    const similarity = merchantSimilarity(candidate.merchantNormalized, incoming.merchantName);
    if (similarity < MIN_MERCHANT_SIMILARITY) continue;
    const dayGap =
      Math.abs(candidate.date.getTime() - incoming.date.getTime()) / (24 * 3600 * 1000);
    const proximity = Math.max(0, (DATE_WINDOW_DAYS - dayGap) / DATE_WINDOW_DAYS);
    const score = similarity * 0.7 + proximity * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = { id: candidate.id, status: candidate.status, splitType: candidate.splitType };
    }
  }
  return best;
}

/**
 * Applies one Plaid transaction: update (seen before) → merge (email twin
 * found) → create (genuinely new). Returns what happened for sync logging.
 */
export async function reconcilePlaidTransaction(
  accountId: string,
  incoming: IncomingPlaidTransaction,
): Promise<{ action: ReconcileAction; transactionId: string }> {
  const existing = await prisma.transaction.findUnique({
    where: { plaidTransactionId: incoming.plaidTransactionId },
    select: { id: true },
  });
  if (existing) {
    await prisma.transaction.update({
      where: { id: existing.id },
      data: {
        amount: fromCents(incoming.amountCents),
        category: incoming.category ?? undefined,
        pendingPlaid: incoming.pending,
        date: incoming.date,
        status: 'POSTED',
      },
    });
    return { action: 'updated', transactionId: existing.id };
  }

  const twin = await findEmailTwin(accountId, incoming);
  if (twin) {
    // Plaid is authoritative for date/category once it posts; the email row
    // keeps its identity (and any tag the user already applied — that's the
    // whole point of tagging from the lock screen).
    const untaggedNeedsFlag = twin.splitType === null && twin.status === 'REQUIRES_TAGGING';
    await prisma.transaction.update({
      where: { id: twin.id },
      data: {
        plaidTransactionId: incoming.plaidTransactionId,
        category: incoming.category ?? undefined,
        date: incoming.date,
        pendingPlaid: incoming.pending,
        source: 'MERGED',
        status: untaggedNeedsFlag ? 'REQUIRES_TAGGING' : 'POSTED',
      },
    });
    logger.info(
      { transactionId: twin.id, plaidTransactionId: incoming.plaidTransactionId },
      'merged plaid transaction into email twin',
    );
    return { action: 'merged', transactionId: twin.id };
  }

  const created = await prisma.transaction.create({
    data: {
      accountId,
      plaidTransactionId: incoming.plaidTransactionId,
      amount: fromCents(incoming.amountCents),
      merchantName: incoming.merchantName,
      merchantNormalized: normalizeMerchant(incoming.merchantName),
      date: incoming.date,
      category: incoming.category,
      pendingPlaid: incoming.pending,
      status: 'POSTED',
      source: 'PLAID',
    },
    select: { id: true },
  });
  return { action: 'created', transactionId: created.id };
}

/**
 * Plaid "removed" entries are usually pending rows superseded by posted ones.
 * Untagged rows are safe to delete; tagged rows carry ledger meaning, so we
 * only detach the Plaid id and leave the human's tag intact.
 */
export async function removePlaidTransactions(plaidTransactionIds: string[]): Promise<void> {
  if (plaidTransactionIds.length === 0) return;
  await prisma.transaction.deleteMany({
    where: { plaidTransactionId: { in: plaidTransactionIds }, splitType: null },
  });
  await prisma.transaction.updateMany({
    where: { plaidTransactionId: { in: plaidTransactionIds } },
    data: { plaidTransactionId: null, pendingPlaid: false },
  });
}

/** Dollars (Plaid float) → cents, tolerating the float representation. */
export function plaidAmountToCents(amount: number): number {
  return toCents(amount.toFixed(2));
}
