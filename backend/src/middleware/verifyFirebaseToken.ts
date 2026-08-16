/**
 * Firebase Auth (SMS OTP) token verification.
 *
 * The client signs in with a phone number via Firebase and sends the ID token
 * as `Authorization: Bearer <jwt>`. We verify signature/audience/expiry with
 * firebase-admin (keys fetched+cached from Google) — no session state here.
 * This middleware only proves *who Firebase says this is*; requireAuth maps
 * that identity onto our own users table.
 */
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { asyncHandler } from '../utils/asyncHandler';

export function initFirebase(): void {
  if (getApps().length > 0) return;
  // Application Default Credentials: automatic on Cloud Run; locally via
  // GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account key.
  initializeApp({
    credential: applicationDefault(),
    projectId: env().FIREBASE_PROJECT_ID,
  });
}

export const verifyFirebaseToken: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw HttpError.unauthorized('Missing bearer token', 'auth.missing_token');
  }

  try {
    initFirebase();
    const decoded = await getAuth().verifyIdToken(token);
    req.auth = {
      uid: decoded.uid,
      phoneNumber: decoded.phone_number ?? null,
    };
  } catch {
    // Expired, malformed, wrong project — all the same to the client.
    throw HttpError.unauthorized('Invalid or expired token', 'auth.invalid_token');
  }

  next();
});
