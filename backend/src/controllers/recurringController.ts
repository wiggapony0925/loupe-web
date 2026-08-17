/**
 * Recurring charges across ALL of the user's cards — GET /v1/recurring.
 * History window: 13 months, so annual subscriptions have two data points.
 */
import { Router } from 'express';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/envelope';
import { currentUser } from '../utils/context';
import { toCents } from '../utils/money';
import { detectRecurring } from '../services/recurringService';

export const recurringRouter = Router();

recurringRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const since = new Date(Date.now() - 396 * 86_400_000);

    const rows = await prisma.transaction.findMany({
      where: { account: { userId: user.id }, date: { gte: since } },
      select: {
        merchantName: true,
        merchantNormalized: true,
        amount: true,
        date: true,
        account: { select: { name: true, mask: true } },
      },
      orderBy: { date: 'asc' },
      take: 5000,
    });

    const items = detectRecurring(
      rows.map((row) => ({
        merchant: row.merchantName,
        merchantNormalized: row.merchantNormalized,
        amountCents: toCents(row.amount),
        date: row.date.toISOString().slice(0, 10),
        accountLabel: `${row.account.name}${row.account.mask ? ` ••${row.account.mask}` : ''}`,
      })),
    );

    ok(res, {
      items,
      monthlyTotalCents: items.reduce((sum, item) => sum + item.monthlyizedCents, 0),
    });
  }),
);
