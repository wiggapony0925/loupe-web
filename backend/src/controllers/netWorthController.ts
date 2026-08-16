/**
 * Net worth endpoints. Reading the summary ALSO captures a throttled
 * snapshot (write-on-read) — the chart builds itself from normal usage.
 * The /internal cron route is Cloud Scheduler's daily guarantee.
 */
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/envelope';
import { HttpError } from '../utils/httpError';
import { currentUser } from '../utils/context';
import { safeEqual } from '../utils/crypto';
import {
  computeNetWorth,
  netWorthHistory,
  snapshotAllUsers,
  snapshotIfStale,
} from '../services/netWorthService';

export const netWorthRouter = Router();

netWorthRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const summary = await computeNetWorth(user.id);
    await snapshotIfStale(user.id, summary);
    ok(res, summary);
  }),
);

const historyQuery = z.object({
  range: z.enum(['1W', '1M', '3M', 'YTD', '1Y', 'ALL']).default('3M'),
});

netWorthRouter.get(
  '/history',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { range } = historyQuery.parse(req.query);
    const [points, summary] = await Promise.all([
      netWorthHistory(user.id, range),
      computeNetWorth(user.id),
    ]);
    ok(res, { range, points, current: summary });
  }),
);

// ── Cron (Cloud Scheduler) ───────────────────────────────────────────────────

export const internalRouter = Router();

internalRouter.post(
  '/cron/snapshot',
  asyncHandler(async (req, res) => {
    const key = env().CRON_KEY;
    const provided = req.headers['x-cron-key'];
    if (!key || typeof provided !== 'string' || !safeEqual(provided, key)) {
      throw new HttpError(401, 'cron.invalid_key', 'Bad or missing X-Cron-Key');
    }
    const written = await snapshotAllUsers();
    ok(res, { snapshotsWritten: written });
  }),
);
