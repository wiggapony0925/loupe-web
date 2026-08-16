/**
 * The ledger: who owes whom in a circle, and the settle-up flow
 * (record → confirm / cancel).
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/envelope';
import { HttpError } from '../utils/httpError';
import { currentUser, requiredParam } from '../utils/context';
import { requireCirclePermission } from '../middleware/requireAuth';
import { toCents } from '../utils/money';
import {
  cancelSettlement,
  computeCircleLedger,
  confirmSettlement,
  recordSettlement,
} from '../services/settlementEngine';

export const ledgerRouter = Router();

ledgerRouter.get(
  '/:circleId/ledger',
  requireCirclePermission('VIEW_BALANCES'),
  asyncHandler(async (req, res) => {
    ok(res, await computeCircleLedger(requiredParam(req, 'circleId')));
  }),
);

ledgerRouter.get(
  '/:circleId/settlements',
  requireCirclePermission('VIEW_BALANCES'),
  asyncHandler(async (req, res) => {
    const settlements = await prisma.settlement.findMany({
      where: { circleId: requiredParam(req, 'circleId') },
      include: {
        fromUser: { select: { id: true, displayName: true } },
        toUser: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    ok(
      res,
      settlements.map((s) => ({
        id: s.id,
        fromUser: s.fromUser,
        toUser: s.toUser,
        amountCents: toCents(s.amount),
        status: s.status,
        note: s.note,
        createdAt: s.createdAt.toISOString(),
        confirmedAt: s.confirmedAt?.toISOString() ?? null,
      })),
    );
  }),
);

const recordBody = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  note: z.string().max(200).optional(),
});

ledgerRouter.post(
  '/:circleId/settlements',
  requireCirclePermission('VIEW_BALANCES'),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = recordBody.parse(req.body);
    const membership = req.membership;

    // Money moves between two people; a third member can't declare it moved
    // unless they run the circle.
    const isParty = user.id === body.fromUserId || user.id === body.toUserId;
    const isAdmin = membership && (membership.role === 'OWNER' || membership.role === 'ADMIN');
    if (!isParty && !isAdmin) {
      throw HttpError.forbidden('Only the parties (or an admin) can record a settlement', 'settlement.not_a_party');
    }

    const settlement = await recordSettlement(
      requiredParam(req, 'circleId'),
      body.fromUserId,
      body.toUserId,
      body.note,
    );
    ok(
      res,
      {
        id: settlement.id,
        amountCents: toCents(settlement.amount),
        status: settlement.status,
      },
      null,
      201,
    );
  }),
);

ledgerRouter.post(
  '/:circleId/settlements/:settlementId/confirm',
  requireCirclePermission('VIEW_BALANCES'),
  asyncHandler(async (req, res) => {
    const settlement = await confirmSettlement(requiredParam(req, 'settlementId'), currentUser(req).id);
    ok(res, { id: settlement.id, status: settlement.status });
  }),
);

ledgerRouter.delete(
  '/:circleId/settlements/:settlementId',
  requireCirclePermission('VIEW_BALANCES'),
  asyncHandler(async (req, res) => {
    await cancelSettlement(requiredParam(req, 'settlementId'), currentUser(req).id);
    ok(res, { canceled: true });
  }),
);
