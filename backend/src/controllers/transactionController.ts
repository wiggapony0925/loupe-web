/**
 * Transactions: the feed, the excel-style sheet rows, tagging (the bottom
 * sheet's backend), labels-on-transactions, and manual entries.
 *
 * Visibility everywhere: your own accounts' rows, plus rows tagged into
 * circles where you hold VIEW_TRANSACTIONS. Tagging additionally requires
 * EDIT_TAGS in the target circle.
 */
import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/envelope';
import { HttpError } from '../utils/httpError';
import { currentUser, requiredParam } from '../utils/context';
import { hasPermission } from '../utils/rbac';
import { fromCents, toCents } from '../utils/money';
import { normalizeMerchant } from '../services/emailParser';
import { buildSheetRows, viewableCircleIds } from '../services/exportService';

export const transactionRouter = Router();

// ── Serialization ────────────────────────────────────────────────────────────

const includeForSerialize = {
  account: { select: { id: true, name: true, mask: true, institutionName: true, userId: true } },
  taggedOwner: { select: { id: true, displayName: true } },
  circle: { select: { id: true, name: true } },
  labels: { include: { label: { select: { id: true, name: true } } } },
} satisfies Prisma.TransactionInclude;

type TransactionWithRelations = Prisma.TransactionGetPayload<{ include: typeof includeForSerialize }>;

export function serializeTransaction(t: TransactionWithRelations) {
  return {
    id: t.id,
    account: t.account,
    amountCents: toCents(t.amount),
    merchant: t.merchantName,
    date: t.date.toISOString().slice(0, 10),
    category: t.category,
    cardLast4: t.cardLast4,
    applePayDevice: t.applePayDevice,
    taggedOwner: t.taggedOwner,
    splitType: t.splitType,
    settlementStatus: t.settlementStatus,
    status: t.status,
    source: t.source,
    circle: t.circle,
    labels: t.labels.map((l) => l.label),
    notes: t.notes,
    pendingPlaid: t.pendingPlaid,
    createdAt: t.createdAt.toISOString(),
  };
}

async function visibilityWhere(userId: string): Promise<Prisma.TransactionWhereInput> {
  const accounts = await prisma.bankAccount.findMany({ where: { userId }, select: { id: true } });
  const circles = await viewableCircleIds(userId);
  return {
    OR: [
      { accountId: { in: accounts.map((a) => a.id) } },
      ...(circles.length > 0 ? [{ circleId: { in: circles } }] : []),
    ],
  };
}

// ── Feed ─────────────────────────────────────────────────────────────────────

const feedQuery = z.object({
  accountIds: z.string().optional(),
  circleId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'REQUIRES_TAGGING', 'POSTED']).optional(),
  needsTagging: z.enum(['true', 'false']).optional(),
  untagged: z.enum(['true', 'false']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().max(80).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

transactionRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const query = feedQuery.parse(req.query);

    const where: Prisma.TransactionWhereInput = {
      AND: [
        await visibilityWhere(user.id),
        ...(query.accountIds ? [{ accountId: { in: query.accountIds.split(',') } }] : []),
        ...(query.circleId ? [{ circleId: query.circleId }] : []),
        ...(query.status ? [{ status: query.status }] : []),
        ...(query.needsTagging === 'true' ? [{ status: 'REQUIRES_TAGGING' as const }] : []),
        ...(query.untagged === 'true' ? [{ splitType: null }] : []),
        ...(query.from ? [{ date: { gte: query.from } }] : []),
        ...(query.to ? [{ date: { lte: query.to } }] : []),
        ...(query.search
          ? [{ merchantName: { contains: query.search, mode: 'insensitive' as const } }]
          : []),
      ],
    };

    const rows = await prisma.transaction.findMany({
      where,
      include: includeForSerialize,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    ok(
      res,
      page.map(serializeTransaction),
      { nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null },
    );
  }),
);

// ── Sheet rows (the excel-style grid) ────────────────────────────────────────

export const sheetQuerySchema = z.object({
  accountIds: z.string().optional(),
  circleIds: z.string().optional(),
  labelIds: z.string().optional(),
  splitTypes: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().max(80).optional(),
});

export function sheetFilterFromQuery(query: z.infer<typeof sheetQuerySchema>) {
  const splitValues = ['MINE', 'PARTNER', 'SPLIT', 'REIMBURSE'] as const;
  return {
    accountIds: query.accountIds?.split(',').filter(Boolean),
    circleIds: query.circleIds?.split(',').filter(Boolean),
    labelIds: query.labelIds?.split(',').filter(Boolean),
    splitTypes: query.splitTypes
      ?.split(',')
      .filter((s): s is (typeof splitValues)[number] => (splitValues as readonly string[]).includes(s)),
    from: query.from,
    to: query.to,
    search: query.search,
  };
}

transactionRouter.get(
  '/sheet',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await buildSheetRows(user, sheetFilterFromQuery(sheetQuerySchema.parse(req.query)));
    ok(res, rows, { count: rows.length });
  }),
);

// ── Manual entry ─────────────────────────────────────────────────────────────

const manualBody = z.object({
  accountId: z.string().uuid(),
  merchant: z.string().min(1).max(120),
  amountCents: z.number().int(),
  date: z.coerce.date(),
  category: z.string().max(60).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

transactionRouter.post(
  '/manual',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = manualBody.parse(req.body);

    const account = await prisma.bankAccount.findFirst({
      where: { id: body.accountId, userId: user.id },
    });
    if (!account) throw HttpError.notFound('Account');

    const created = await prisma.transaction.create({
      data: {
        accountId: account.id,
        amount: fromCents(body.amountCents),
        merchantName: body.merchant,
        merchantNormalized: normalizeMerchant(body.merchant),
        date: body.date,
        category: body.category ?? null,
        notes: body.notes ?? null,
        status: 'POSTED',
        source: 'MANUAL',
      },
      include: includeForSerialize,
    });
    ok(res, serializeTransaction(created), null, 201);
  }),
);

// ── Detail ───────────────────────────────────────────────────────────────────

transactionRouter.get(
  '/:transactionId',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const transaction = await prisma.transaction.findFirst({
      where: { AND: [{ id: requiredParam(req, 'transactionId') }, await visibilityWhere(user.id)] },
      include: includeForSerialize,
    });
    if (!transaction) throw HttpError.notFound('Transaction');
    ok(res, serializeTransaction(transaction));
  }),
);

// ── Tagging (the bottom sheet) ───────────────────────────────────────────────

const tagBody = z.object({
  splitType: z.enum(['MINE', 'PARTNER', 'SPLIT', 'REIMBURSE']).nullable(),
  circleId: z.string().uuid().nullable().optional(),
  taggedOwnerId: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

transactionRouter.patch(
  '/:transactionId/tag',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = tagBody.parse(req.body);
    const transactionId = requiredParam(req, 'transactionId');

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { account: { select: { userId: true } } },
    });
    if (!transaction) throw HttpError.notFound('Transaction');

    // May I touch this row at all?
    const isCardholder = transaction.account.userId === user.id;
    if (!isCardholder) {
      if (!transaction.circleId) throw HttpError.notFound('Transaction');
      const membership = await prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId: transaction.circleId, userId: user.id } },
      });
      if (!membership || !hasPermission(membership, 'EDIT_TAGS')) {
        throw HttpError.forbidden('EDIT_TAGS required', 'circle.permission_denied');
      }
    }

    let circleId = body.circleId === undefined ? transaction.circleId : body.circleId;
    let taggedOwnerId = body.taggedOwnerId === undefined ? transaction.taggedOwnerId : body.taggedOwnerId;

    if (body.splitType === null) {
      circleId = body.circleId === undefined ? null : circleId;
      taggedOwnerId = null;
    } else {
      if (body.splitType !== 'MINE') {
        if (!circleId) {
          throw HttpError.badRequest('circleId is required for shared tags', 'tag.circle_required');
        }
        const membership = await prisma.circleMember.findUnique({
          where: { circleId_userId: { circleId, userId: user.id } },
        });
        if (!membership || !hasPermission(membership, 'EDIT_TAGS')) {
          throw HttpError.forbidden('EDIT_TAGS required in that circle', 'circle.permission_denied');
        }
      }
      if (body.splitType === 'PARTNER' || body.splitType === 'REIMBURSE') {
        if (!taggedOwnerId) {
          throw HttpError.badRequest('taggedOwnerId is required for that tag', 'tag.owner_required');
        }
        const target = await prisma.circleMember.findUnique({
          where: { circleId_userId: { circleId: circleId as string, userId: taggedOwnerId } },
        });
        if (!target) {
          throw HttpError.badRequest('Tagged member is not in that circle', 'tag.owner_not_member');
        }
      }
      if (body.splitType === 'MINE') {
        taggedOwnerId = transaction.account.userId;
      }
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        splitType: body.splitType,
        circleId,
        taggedOwnerId,
        notes: body.notes === undefined ? undefined : body.notes,
        settlementStatus:
          body.splitType === null || body.splitType === 'MINE' ? 'NONE' : 'UNSETTLED',
        // A human answered "whose was this" — the REQUIRES_TAGGING flag is done.
        status:
          transaction.status === 'REQUIRES_TAGGING'
            ? transaction.plaidTransactionId
              ? 'POSTED'
              : 'PENDING'
            : transaction.status,
      },
      include: includeForSerialize,
    });
    ok(res, serializeTransaction(updated));
  }),
);

// ── Labels on a transaction ──────────────────────────────────────────────────

const labelsBody = z.object({ labelIds: z.array(z.string().uuid()).max(20) });

transactionRouter.put(
  '/:transactionId/labels',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = labelsBody.parse(req.body);
    const transactionId = requiredParam(req, 'transactionId');

    const transaction = await prisma.transaction.findFirst({
      where: { AND: [{ id: transactionId }, await visibilityWhere(user.id)] },
      select: { id: true },
    });
    if (!transaction) throw HttpError.notFound('Transaction');

    const owned = await prisma.label.findMany({
      where: { id: { in: body.labelIds }, createdById: user.id },
      select: { id: true },
    });
    if (owned.length !== body.labelIds.length) {
      throw HttpError.badRequest('Unknown label id', 'label.not_found');
    }

    await prisma.$transaction([
      // Replace only THIS user's labels; a partner's labels on the shared row
      // are theirs and survive.
      prisma.transactionLabel.deleteMany({
        where: { transactionId, label: { createdById: user.id } },
      }),
      prisma.transactionLabel.createMany({
        data: body.labelIds.map((labelId) => ({ transactionId, labelId })),
        skipDuplicates: true,
      }),
    ]);

    const updated = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: includeForSerialize,
    });
    ok(res, serializeTransaction(updated as TransactionWithRelations));
  }),
);
