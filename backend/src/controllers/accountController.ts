/**
 * Bank accounts: Plaid Link lifecycle, listing with live balances, card
 * mappings (the Amex last-4 / Chase Apple-Pay-device → person table), and
 * on-demand sync.
 */
import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/envelope';
import { HttpError } from '../utils/httpError';
import { currentUser, requiredParam } from '../utils/context';
import { toCents } from '../utils/money';
import {
  createLinkToken,
  exchangePublicToken,
  refreshHoldings,
  syncItemTransactions,
} from '../services/plaidService';

export const accountRouter = Router();

type AccountWithHoldings = Prisma.BankAccountGetPayload<{
  include: { holdings: true; _count: { select: { transactions: true } } };
}>;

function serializeAccount(account: AccountWithHoldings) {
  const knownHoldings = account.holdings.filter((h) => h.institutionValue !== null);
  return {
    id: account.id,
    name: account.name,
    institutionName: account.institutionName,
    mask: account.mask,
    type: account.type,
    subtype: account.subtype,
    // null = unknown. The client renders "—", never $0.00.
    currentBalanceCents: account.currentBalance === null ? null : toCents(account.currentBalance),
    availableBalanceCents:
      account.availableBalance === null ? null : toCents(account.availableBalance),
    currencyCode: account.currencyCode,
    isHidden: account.isHidden,
    plaidLinked: Boolean(account.plaidItemId),
    lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
    transactionCount: account._count.transactions,
    holdings: account.holdings.map((h) => ({
      id: h.id,
      symbol: h.symbol,
      name: h.name,
      quantity: h.quantity.toString(),
      valueCents: h.institutionValue === null ? null : toCents(h.institutionValue),
    })),
    holdingsValueCents:
      knownHoldings.length === 0
        ? null
        : knownHoldings.reduce((sum, h) => sum + toCents(h.institutionValue as Prisma.Decimal), 0),
  };
}

const accountInclude = {
  holdings: true,
  _count: { select: { transactions: true } },
} satisfies Prisma.BankAccountInclude;

// ── Plaid Link ───────────────────────────────────────────────────────────────

accountRouter.post(
  '/link-token',
  asyncHandler(async (req, res) => {
    ok(res, await createLinkToken(currentUser(req)));
  }),
);

const exchangeBody = z.object({ publicToken: z.string().min(1) });

accountRouter.post(
  '/exchange',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { publicToken } = exchangeBody.parse(req.body);
    const accounts = await exchangePublicToken(user, publicToken);
    const withRelations = await prisma.bankAccount.findMany({
      where: { id: { in: accounts.map((a) => a.id) } },
      include: accountInclude,
    });
    ok(res, withRelations.map(serializeAccount), null, 201);
  }),
);

// ── CRUD ─────────────────────────────────────────────────────────────────────

accountRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const accounts = await prisma.bankAccount.findMany({
      where: { userId: user.id },
      include: accountInclude,
      orderBy: { createdAt: 'asc' },
    });
    ok(res, accounts.map(serializeAccount));
  }),
);

const patchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  isHidden: z.boolean().optional(),
});

accountRouter.patch(
  '/:accountId',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = patchBody.parse(req.body);
    const accountId = requiredParam(req, 'accountId');

    const account = await prisma.bankAccount.findFirst({ where: { id: accountId, userId: user.id } });
    if (!account) throw HttpError.notFound('Account');

    const updated = await prisma.bankAccount.update({
      where: { id: accountId },
      data: body,
      include: accountInclude,
    });
    ok(res, serializeAccount(updated));
  }),
);

accountRouter.delete(
  '/:accountId',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const accountId = requiredParam(req, 'accountId');
    const account = await prisma.bankAccount.findFirst({ where: { id: accountId, userId: user.id } });
    if (!account) throw HttpError.notFound('Account');
    await prisma.bankAccount.delete({ where: { id: accountId } });
    ok(res, { deleted: true });
  }),
);

accountRouter.post(
  '/:accountId/sync',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const accountId = requiredParam(req, 'accountId');
    const account = await prisma.bankAccount.findFirst({ where: { id: accountId, userId: user.id } });
    if (!account) throw HttpError.notFound('Account');
    if (!account.plaidItemId) {
      throw HttpError.badRequest('Manual accounts have nothing to sync', 'account.not_linked');
    }

    const counts = await syncItemTransactions(account.plaidItemId);
    if (account.type === 'INVESTMENT') {
      await refreshHoldings(account.plaidItemId).catch(() => undefined);
    }
    ok(res, counts);
  }),
);

// ── Card mappings ────────────────────────────────────────────────────────────

const mappingBody = z
  .object({
    userId: z.string().uuid(),
    last4: z.string().regex(/^\d{4,5}$/).nullable().optional(),
    deviceName: z.string().min(2).max(60).nullable().optional(),
    label: z.string().max(60).nullable().optional(),
  })
  .refine((b) => b.last4 || b.deviceName, {
    message: 'Provide last4 (Amex) or deviceName (Chase Apple Pay)',
  });

accountRouter.get(
  '/:accountId/card-mappings',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const accountId = requiredParam(req, 'accountId');
    const account = await prisma.bankAccount.findFirst({ where: { id: accountId, userId: user.id } });
    if (!account) throw HttpError.notFound('Account');

    const mappings = await prisma.cardMapping.findMany({
      where: { bankAccountId: accountId },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    ok(res, mappings);
  }),
);

accountRouter.post(
  '/:accountId/card-mappings',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = mappingBody.parse(req.body);
    const accountId = requiredParam(req, 'accountId');

    const account = await prisma.bankAccount.findFirst({ where: { id: accountId, userId: user.id } });
    if (!account) throw HttpError.notFound('Account');

    // The mapped person must share at least one circle with the cardholder —
    // mapping a stranger's uuid onto your card is nonsense at best.
    if (body.userId !== user.id) {
      const shared = await prisma.circleMember.findFirst({
        where: {
          userId: body.userId,
          circle: { members: { some: { userId: user.id } } },
        },
      });
      if (!shared) {
        throw HttpError.badRequest('That person is not in any of your circles', 'mapping.not_in_circle');
      }
    }

    const mapping = await prisma.cardMapping.create({
      data: {
        bankAccountId: accountId,
        userId: body.userId,
        last4: body.last4 ?? null,
        deviceName: body.deviceName ?? null,
        label: body.label ?? null,
      },
      include: { user: { select: { id: true, displayName: true } } },
    });
    ok(res, mapping, null, 201);
  }),
);

accountRouter.delete(
  '/:accountId/card-mappings/:mappingId',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const accountId = requiredParam(req, 'accountId');
    const mappingId = requiredParam(req, 'mappingId');

    const mapping = await prisma.cardMapping.findFirst({
      where: { id: mappingId, bankAccountId: accountId, bankAccount: { userId: user.id } },
    });
    if (!mapping) throw HttpError.notFound('Card mapping');

    await prisma.cardMapping.delete({ where: { id: mappingId } });
    ok(res, { deleted: true });
  }),
);
