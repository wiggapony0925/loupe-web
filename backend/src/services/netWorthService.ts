/**
 * Net worth — the number on the home screen.
 *
 * ONE canonical valuation function (`accountValueCents`) prices every account;
 * summary, breakdown, snapshots and the chart all route through it so the
 * numbers agree to the cent everywhere they appear.
 *
 * "Unknown" is never coerced to zero: an account whose balance we don't have
 * is EXCLUDED and reported in `unknownAccountIds` — a freshly linked account
 * must not read as a $0 crash in the chart.
 *
 * The time series is captured write-on-read: reading current net worth
 * appends a snapshot (throttled to one per 30 min), so the chart exists
 * without depending on a scheduler; the optional daily cron only guarantees
 * a point on days the app never opened, and compacts intraday rows older
 * than 48h down to one per day.
 */
import type { AccountType, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { toCents, fromCents } from '../utils/money';

const SNAPSHOT_THROTTLE_MS = 30 * 60 * 1000;
const INTRADAY_RETENTION_MS = 48 * 3600 * 1000;
const MAX_RETENTION_DAYS = 400;
const MAX_CHART_POINTS = 240;

export type NetWorthRange = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

export interface AccountValuation {
  accountId: string;
  name: string;
  institutionName: string;
  type: AccountType;
  mask: string | null;
  /** Signed cents (liabilities negative) — null when the balance is unknown. */
  valueCents: number | null;
}

export interface NetWorthSummary {
  netWorthCents: number;
  assetsCents: number;
  liabilitiesCents: number;
  accounts: AccountValuation[];
  unknownAccountIds: string[];
  asOf: string;
}

interface AccountWithHoldings {
  id: string;
  name: string;
  institutionName: string;
  type: AccountType;
  mask: string | null;
  currentBalance: Prisma.Decimal | null;
  holdings: Array<{ institutionValue: Prisma.Decimal | null }>;
}

/** THE valuation basis. Every total in the app runs through this function. */
export function accountValueCents(account: AccountWithHoldings): number | null {
  const balance = account.currentBalance === null ? null : toCents(account.currentBalance);

  switch (account.type) {
    case 'CREDIT':
    case 'LOAN':
      // A credit balance is what's OWED on the card — a liability.
      return balance === null ? null : -Math.abs(balance);
    case 'INVESTMENT': {
      if (balance !== null) return balance;
      const known = account.holdings.filter((h) => h.institutionValue !== null);
      if (known.length === 0) return null;
      return known.reduce((sum, h) => sum + toCents(h.institutionValue as Prisma.Decimal), 0);
    }
    default:
      return balance;
  }
}

export async function computeNetWorth(userId: string): Promise<NetWorthSummary> {
  const accounts = await prisma.bankAccount.findMany({
    where: { userId, isHidden: false },
    select: {
      id: true,
      name: true,
      institutionName: true,
      type: true,
      mask: true,
      currentBalance: true,
      holdings: { select: { institutionValue: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const valuations: AccountValuation[] = accounts.map((account) => ({
    accountId: account.id,
    name: account.name,
    institutionName: account.institutionName,
    type: account.type,
    mask: account.mask,
    valueCents: accountValueCents(account),
  }));

  let assets = 0;
  let liabilities = 0;
  const unknown: string[] = [];
  for (const v of valuations) {
    if (v.valueCents === null) unknown.push(v.accountId);
    else if (v.valueCents >= 0) assets += v.valueCents;
    else liabilities += -v.valueCents;
  }

  return {
    netWorthCents: assets - liabilities,
    assetsCents: assets,
    liabilitiesCents: liabilities,
    accounts: valuations,
    unknownAccountIds: unknown,
    asOf: new Date().toISOString(),
  };
}

/** Write-on-read snapshot; returns whether a row was actually written. */
export async function snapshotIfStale(
  userId: string,
  summary: NetWorthSummary,
  { force = false }: { force?: boolean } = {},
): Promise<boolean> {
  if (!force) {
    const latest = await prisma.netWorthSnapshot.findFirst({
      where: { userId },
      orderBy: { capturedAt: 'desc' },
      select: { capturedAt: true },
    });
    if (latest && Date.now() - latest.capturedAt.getTime() < SNAPSHOT_THROTTLE_MS) return false;
  }

  const breakdown: Record<string, string | null> = {};
  for (const account of summary.accounts) {
    breakdown[account.accountId] = account.valueCents === null ? null : fromCents(account.valueCents);
  }

  await prisma.netWorthSnapshot.create({
    data: {
      userId,
      assets: fromCents(summary.assetsCents),
      liabilities: fromCents(summary.liabilitiesCents),
      netWorth: fromCents(summary.netWorthCents),
      breakdown,
    },
  });
  return true;
}

/** Intraday rows older than 48h collapse to one per day; hard cap 400 days. */
export async function compactSnapshots(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - INTRADAY_RETENTION_MS);
  const old = await prisma.netWorthSnapshot.findMany({
    where: { userId, capturedAt: { lt: cutoff } },
    orderBy: { capturedAt: 'asc' },
    select: { id: true, capturedAt: true },
  });

  const keepPerDay = new Map<string, string>();
  for (const row of old) {
    keepPerDay.set(row.capturedAt.toISOString().slice(0, 10), row.id); // ascending → last wins
  }
  const keep = new Set(keepPerDay.values());
  const toDelete = old.filter((row) => !keep.has(row.id)).map((row) => row.id);

  const horizon = new Date(Date.now() - MAX_RETENTION_DAYS * 24 * 3600 * 1000);
  const { count: expired } = await prisma.netWorthSnapshot.deleteMany({
    where: { userId, capturedAt: { lt: horizon } },
  });
  if (toDelete.length > 0) {
    await prisma.netWorthSnapshot.deleteMany({ where: { id: { in: toDelete } } });
  }
  return toDelete.length + expired;
}

export interface NetWorthHistoryPoint {
  t: string;
  netWorthCents: number;
}

export async function netWorthHistory(
  userId: string,
  range: NetWorthRange,
): Promise<NetWorthHistoryPoint[]> {
  const now = new Date();
  let start: Date | null = null;
  switch (range) {
    case '1W':
      start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      break;
    case '1M':
      start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      break;
    case '3M':
      start = new Date(now.getTime() - 91 * 24 * 3600 * 1000);
      break;
    case 'YTD':
      start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      break;
    case '1Y':
      start = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
      break;
    case 'ALL':
      start = null;
      break;
  }

  const rows = await prisma.netWorthSnapshot.findMany({
    where: { userId, ...(start ? { capturedAt: { gte: start } } : {}) },
    orderBy: { capturedAt: 'asc' },
    select: { capturedAt: true, netWorth: true },
  });

  // Even-stride downsampling, always keeping the first and last points —
  // the chart needs shape, not every 30-minute tick.
  const stride = Math.max(1, Math.ceil(rows.length / MAX_CHART_POINTS));
  const points: NetWorthHistoryPoint[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (i % stride === 0 || i === rows.length - 1) {
      const row = rows[i]!;
      points.push({ t: row.capturedAt.toISOString(), netWorthCents: toCents(row.netWorth) });
    }
  }
  return points;
}

/** Cron entry: guarantee a daily point for every user, then compact. */
export async function snapshotAllUsers(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { bankAccounts: { some: {} } },
    select: { id: true },
  });
  let written = 0;
  for (const user of users) {
    const summary = await computeNetWorth(user.id);
    if (await snapshotIfStale(user.id, summary)) written++;
    await compactSnapshots(user.id);
  }
  return written;
}
