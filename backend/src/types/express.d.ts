/**
 * Express request augmentation. Populated by:
 *  - `auth`       verifyFirebaseToken (decoded Firebase claims)
 *  - `user`       requireAuth (local user row, auto-provisioned)
 *  - `membership` requireCirclePermission (caller's row in the target circle)
 *  - `rawBody`    server.ts json verify hook (Plaid webhook JWT needs the exact bytes)
 */
import type { CircleMember, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      auth?: { uid: string; phoneNumber: string | null };
      user?: User;
      membership?: CircleMember;
      rawBody?: Buffer;
    }
  }
}

export {};
