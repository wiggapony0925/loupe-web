/**
 * The current user: profile, and device-token registration for push.
 */
import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/envelope';
import { currentUser } from '../utils/context';

export const userRouter = Router();

function serializeUser(user: { id: string; displayName: string; phoneNumber: string; email: string | null; createdAt: Date }) {
  return {
    id: user.id,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

userRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    ok(res, serializeUser(currentUser(req)));
  }),
);

const patchMeBody = z.object({
  displayName: z.string().min(1).max(40).optional(),
  email: z.string().email().nullable().optional(),
});

userRouter.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = patchMeBody.parse(req.body);
    const updated = await prisma.user.update({ where: { id: user.id }, data: body });
    ok(res, serializeUser(updated));
  }),
);

const deviceTokenBody = z.object({
  token: z.string().min(10).max(4096),
  platform: z.enum(['IOS', 'ANDROID', 'WEB']),
});

userRouter.post(
  '/me/device-tokens',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = deviceTokenBody.parse(req.body);
    // Token may migrate between accounts on a shared device — last sign-in wins.
    const device = await prisma.deviceToken.upsert({
      where: { token: body.token },
      create: {
        userId: user.id,
        token: body.token,
        platform: body.platform,
        actionKey: randomBytes(24).toString('base64url'),
      },
      update: { userId: user.id, platform: body.platform, lastSeenAt: new Date() },
    });
    // Devices registered before actionKey existed get one on next check-in.
    if (!device.actionKey) {
      await prisma.deviceToken.update({
        where: { id: device.id },
        data: { actionKey: randomBytes(24).toString('base64url') },
      });
    }
    ok(res, { registered: true }, null, 201);
  }),
);

userRouter.delete(
  '/me/device-tokens',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = z.object({ token: z.string().min(10) }).parse(req.body);
    await prisma.deviceToken.deleteMany({ where: { userId: user.id, token: body.token } });
    ok(res, { removed: true });
  }),
);
