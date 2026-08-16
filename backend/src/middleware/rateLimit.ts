/**
 * Rate limiting. Keyed by authenticated uid when present so one household on
 * shared CGNAT isn't punished collectively; falls back to IP pre-auth.
 * In-memory per instance — good enough for Cloud Run's per-instance
 * concurrency; swap the store for Memorystore if limits must be global.
 */
import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { fail } from '../utils/envelope';

function keyByUser(req: Request): string {
  return req.auth?.uid ?? req.ip ?? 'unknown';
}

function limitHandler(_req: Request, res: Response): void {
  fail(res, 429, 'rate_limit.exceeded', 'Too many requests — slow down');
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  keyGenerator: keyByUser,
  handler: limitHandler,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Webhooks burst legitimately (Plaid batch syncs, email storms after an
// outage) — higher ceiling, but still a ceiling.
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
  handler: limitHandler,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
