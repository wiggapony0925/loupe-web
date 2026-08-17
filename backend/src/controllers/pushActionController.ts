/**
 * Lock-screen notification actions — the fastest path in the product:
 * charge buzzes → long-press the push → tap [Mine] / [Partner's] / [50/50],
 * app never opens.
 *
 * Auth is the per-device `actionKey` minted at device registration and
 * carried in the push payload (no Firebase token available in the iOS
 * background handler; ID tokens expire hourly anyway). The key maps to a
 * device → user, and the user still has to pass the same tag-permission
 * rules as the in-app endpoint.
 *
 * Ambiguity is refused, not guessed: PARTNER with 3+ members, or a user in
 * several circles with an untagged transaction, gets a 409 telling them to
 * finish in the app — a lock-screen button must never move money the wrong way.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/envelope';
import { HttpError } from '../utils/httpError';
import { hasPermission } from '../utils/rbac';

export const pushActionRouter = Router();

const tagActionBody = z.object({
  actionKey: z.string().min(8).max(128),
  transactionId: z.string().uuid(),
  action: z.enum(['MINE', 'PARTNER', 'SPLIT']),
});

pushActionRouter.post(
  '/tag',
  asyncHandler(async (req, res) => {
    const body = tagActionBody.parse(req.body);

    const device = await prisma.deviceToken.findUnique({
      where: { actionKey: body.actionKey },
      include: { user: true },
    });
    if (!device) {
      throw new HttpError(401, 'push_action.invalid_key', 'Unknown action key');
    }
    const user = device.user;
    await prisma.deviceToken.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    const transaction = await prisma.transaction.findUnique({
      where: { id: body.transactionId },
      include: { account: { select: { userId: true } } },
    });
    if (!transaction) throw HttpError.notFound('Transaction');

    // Resolve the circle this tag lands in: the row's circle, else the
    // user's ONLY tag-capable circle — anything else is ambiguous.
    const memberships = await prisma.circleMember.findMany({ where: { userId: user.id } });
    const editable = memberships.filter((m) => hasPermission(m, 'EDIT_TAGS'));
    let circleId = transaction.circleId;
    if (!circleId) {
      if (body.action !== 'MINE' && editable.length !== 1) {
        throw new HttpError(
          409,
          'push_action.ambiguous_circle',
          'More than one circle could apply — open trackify to tag this one',
        );
      }
      circleId = editable[0]?.circleId ?? null;
    }

    // Same permission rule as the in-app tag endpoint.
    const isCardholder = transaction.account.userId === user.id;
    if (!isCardholder) {
      const membership = circleId
        ? memberships.find((m) => m.circleId === circleId)
        : undefined;
      if (!membership || !hasPermission(membership, 'EDIT_TAGS')) {
        throw HttpError.forbidden('EDIT_TAGS required', 'circle.permission_denied');
      }
    }

    let splitType: 'MINE' | 'PARTNER' | 'SPLIT' = body.action;
    let taggedOwnerId: string | null = null;

    if (body.action === 'MINE') {
      taggedOwnerId = transaction.account.userId;
      circleId = transaction.circleId; // keep as-is; MINE needs no circle
    } else {
      if (!circleId) {
        throw new HttpError(409, 'push_action.no_circle', 'Create a circle in trackify first');
      }
      if (body.action === 'PARTNER') {
        const members = await prisma.circleMember.findMany({ where: { circleId } });
        const others = members.filter((m) => m.userId !== transaction.account.userId);
        if (others.length !== 1) {
          throw new HttpError(
            409,
            'push_action.ambiguous_partner',
            'Several people could be the partner — open trackify to pick',
          );
        }
        taggedOwnerId = others[0]!.userId;
      }
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        splitType,
        circleId,
        taggedOwnerId,
        settlementStatus: splitType === 'MINE' ? 'NONE' : 'UNSETTLED',
        status:
          transaction.status === 'REQUIRES_TAGGING'
            ? transaction.plaidTransactionId
              ? 'POSTED'
              : 'PENDING'
            : transaction.status,
      },
    });

    ok(res, { tagged: true, splitType });
  }),
);
