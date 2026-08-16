/**
 * Circles: households/groups sharing a ledger. Creation, invite-code joining,
 * member roles and granular permission grants (VIEW_BALANCES,
 * VIEW_TRANSACTIONS, EDIT_TAGS, ADMIN).
 */
import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/envelope';
import { HttpError } from '../utils/httpError';
import { currentUser, requiredParam } from '../utils/context';
import { requireCirclePermission } from '../middleware/requireAuth';
import {
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_VIEWER_PERMISSIONS,
  PERMISSIONS,
  type Permission,
} from '../utils/rbac';

export const circleRouter = Router();

const circleInclude = {
  members: {
    include: { user: { select: { id: true, displayName: true, phoneNumber: true } } },
    orderBy: { joinedAt: 'asc' },
  },
} satisfies Prisma.CircleInclude;

type CircleWithMembers = Prisma.CircleGetPayload<{ include: typeof circleInclude }>;

function serializeCircle(circle: CircleWithMembers) {
  return {
    id: circle.id,
    name: circle.name,
    inviteCode: circle.inviteCode,
    createdById: circle.createdById,
    createdAt: circle.createdAt.toISOString(),
    members: circle.members.map((m) => ({
      userId: m.userId,
      displayName: m.user.displayName,
      // Phone shown masked — members need to recognize each other, not
      // harvest each other's numbers.
      phoneMask: `•• ${m.user.phoneNumber.slice(-4)}`,
      role: m.role,
      permissions: m.permissions,
      joinedAt: m.joinedAt.toISOString(),
    })),
  };
}

// ── Create / list / join ─────────────────────────────────────────────────────

const createBody = z.object({ name: z.string().min(1).max(60) });

circleRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { name } = createBody.parse(req.body);

    const circle = await prisma.circle.create({
      data: {
        name,
        createdById: user.id,
        members: {
          create: { userId: user.id, role: 'OWNER', permissions: [...PERMISSIONS] },
        },
      },
      include: circleInclude,
    });
    ok(res, serializeCircle(circle), null, 201);
  }),
);

circleRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const circles = await prisma.circle.findMany({
      where: { members: { some: { userId: user.id } } },
      include: circleInclude,
      orderBy: { createdAt: 'asc' },
    });
    ok(res, circles.map(serializeCircle));
  }),
);

const joinBody = z.object({ inviteCode: z.string().min(6).max(64) });

circleRouter.post(
  '/join',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { inviteCode } = joinBody.parse(req.body);

    const circle = await prisma.circle.findUnique({ where: { inviteCode } });
    if (!circle) throw HttpError.notFound('Invite');

    await prisma.circleMember.upsert({
      where: { circleId_userId: { circleId: circle.id, userId: user.id } },
      create: {
        circleId: circle.id,
        userId: user.id,
        role: 'MEMBER',
        permissions: DEFAULT_MEMBER_PERMISSIONS,
      },
      update: {},
    });

    const full = await prisma.circle.findUnique({ where: { id: circle.id }, include: circleInclude });
    ok(res, serializeCircle(full as CircleWithMembers), null, 201);
  }),
);

// ── Detail / manage ──────────────────────────────────────────────────────────

circleRouter.get(
  '/:circleId',
  requireCirclePermission(),
  asyncHandler(async (req, res) => {
    const circle = await prisma.circle.findUnique({
      where: { id: requiredParam(req, 'circleId') },
      include: circleInclude,
    });
    if (!circle) throw HttpError.notFound('Circle');
    ok(res, serializeCircle(circle));
  }),
);

const patchBody = z.object({ name: z.string().min(1).max(60) });

circleRouter.patch(
  '/:circleId',
  requireCirclePermission('ADMIN'),
  asyncHandler(async (req, res) => {
    const { name } = patchBody.parse(req.body);
    const circle = await prisma.circle.update({
      where: { id: requiredParam(req, 'circleId') },
      data: { name },
      include: circleInclude,
    });
    ok(res, serializeCircle(circle));
  }),
);

circleRouter.post(
  '/:circleId/regenerate-invite',
  requireCirclePermission('ADMIN'),
  asyncHandler(async (req, res) => {
    const circle = await prisma.circle.update({
      where: { id: requiredParam(req, 'circleId') },
      data: { inviteCode: randomBytes(12).toString('base64url') },
      include: circleInclude,
    });
    ok(res, serializeCircle(circle));
  }),
);

// ── Members ──────────────────────────────────────────────────────────────────

const addMemberBody = z.object({
  phoneNumber: z.string().min(8).max(20),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

circleRouter.post(
  '/:circleId/members',
  requireCirclePermission('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = addMemberBody.parse(req.body);
    const circleId = requiredParam(req, 'circleId');

    const target = await prisma.user.findUnique({ where: { phoneNumber: body.phoneNumber } });
    if (!target) {
      throw new HttpError(
        404,
        'user.not_found',
        'No trackify account with that phone number — send them the invite code instead',
      );
    }

    await prisma.circleMember.upsert({
      where: { circleId_userId: { circleId, userId: target.id } },
      create: {
        circleId,
        userId: target.id,
        role: body.role,
        permissions: body.role === 'VIEWER' ? DEFAULT_VIEWER_PERMISSIONS : DEFAULT_MEMBER_PERMISSIONS,
      },
      update: { role: body.role },
    });

    const circle = await prisma.circle.findUnique({ where: { id: circleId }, include: circleInclude });
    ok(res, serializeCircle(circle as CircleWithMembers), null, 201);
  }),
);

const patchMemberBody = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
  permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length).optional(),
});

circleRouter.patch(
  '/:circleId/members/:userId',
  requireCirclePermission('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = patchMemberBody.parse(req.body);
    const circleId = requiredParam(req, 'circleId');
    const userId = requiredParam(req, 'userId');

    const member = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw HttpError.notFound('Member');
    if (member.role === 'OWNER') {
      throw HttpError.forbidden('The owner cannot be modified', 'circle.owner_immutable');
    }

    await prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId } },
      data: {
        ...(body.role ? { role: body.role } : {}),
        ...(body.permissions ? { permissions: body.permissions as Permission[] } : {}),
      },
    });

    const circle = await prisma.circle.findUnique({ where: { id: circleId }, include: circleInclude });
    ok(res, serializeCircle(circle as CircleWithMembers));
  }),
);

circleRouter.delete(
  '/:circleId/members/:userId',
  requireCirclePermission(),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const membership = req.membership;
    const circleId = requiredParam(req, 'circleId');
    const targetId = requiredParam(req, 'userId');

    const removingSelf = targetId === user.id;
    const isAdmin = membership && (membership.role === 'OWNER' || membership.role === 'ADMIN');
    if (!removingSelf && !isAdmin) {
      throw HttpError.forbidden('Only admins can remove members', 'circle.permission_denied');
    }

    const target = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: targetId } },
    });
    if (!target) throw HttpError.notFound('Member');
    if (target.role === 'OWNER') {
      throw HttpError.forbidden('The owner cannot leave their own circle', 'circle.owner_immutable');
    }

    await prisma.circleMember.delete({
      where: { circleId_userId: { circleId, userId: targetId } },
    });
    ok(res, { removed: true });
  }),
);
