/**
 * Identity → local user row, plus circle-level RBAC guards.
 *
 * requireAuth auto-provisions the users row on first authenticated request —
 * with Firebase SMS OTP there is no separate "sign up" call, so the first
 * verified token IS the registration.
 */
import type { RequestHandler } from 'express';
import type { User } from '@prisma/client';
import { prisma } from '../config/db';
import { HttpError } from '../utils/httpError';
import { asyncHandler } from '../utils/asyncHandler';
import { hasPermission, type Permission } from '../utils/rbac';

/** Default display name for a brand-new user: "•• 4242" from their phone. */
function displayNameFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `Member ${digits.slice(-4)}`;
}

export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const auth = req.auth;
  if (!auth) {
    throw HttpError.unauthorized('verifyFirebaseToken must run before requireAuth', 'auth.missing_token');
  }

  let user = await prisma.user.findUnique({ where: { firebaseUid: auth.uid } });
  if (!user) {
    if (!auth.phoneNumber) {
      // Phone-OTP is the only supported sign-in; a token without a phone
      // number is some other Firebase credential and gets no account.
      throw HttpError.forbidden('Phone-verified account required', 'auth.phone_required');
    }
    user = await provisionUser(auth.uid, auth.phoneNumber);
  }

  req.user = user;
  next();
});

async function provisionUser(firebaseUid: string, phoneNumber: string): Promise<User> {
  try {
    return await prisma.user.create({
      data: {
        firebaseUid,
        phoneNumber,
        displayName: displayNameFromPhone(phoneNumber),
      },
    });
  } catch {
    // Two first-requests raced; the loser reads the winner's row.
    const existing = await prisma.user.findUnique({ where: { firebaseUid } });
    if (existing) return existing;
    throw HttpError.conflict('Could not provision account', 'auth.provisioning_failed');
  }
}

/**
 * Guard factory for routes under /circles/:circleId — verifies the caller is
 * a member holding every listed permission (OWNER/ADMIN short-circuit).
 */
export function requireCirclePermission(...permissions: Permission[]): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();

    const circleId = req.params.circleId;
    if (!circleId) throw HttpError.badRequest('circleId route param missing');

    const membership = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: user.id } },
    });
    // "Not a member" and "no such circle" answer identically — membership in
    // a circle must not be probeable by outsiders.
    if (!membership) throw HttpError.notFound('Circle');

    for (const permission of permissions) {
      if (!hasPermission(membership, permission)) {
        throw HttpError.forbidden(`Missing ${permission} permission`, 'circle.permission_denied');
      }
    }

    req.membership = membership;
    next();
  });
}
