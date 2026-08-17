/**
 * Route assembly. Three trust zones, wired explicitly:
 *   /v1/webhooks/*  — machine callers with their OWN auth (shared secret /
 *                     Plaid JWT); never behind Firebase.
 *   /v1/internal/*  — Cloud Scheduler, X-Cron-Key guarded.
 *   everything else — Firebase token → local user → rate limit.
 */
import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';
import { requireAuth } from '../middleware/requireAuth';
import { apiLimiter, webhookLimiter } from '../middleware/rateLimit';
import { webhookRouter } from '../controllers/webhookController';
import { pushActionRouter } from '../controllers/pushActionController';
import { transactionRouter } from '../controllers/transactionController';
import { accountRouter } from '../controllers/accountController';
import { circleRouter } from '../controllers/circleController';
import { ledgerRouter } from '../controllers/ledgerController';
import { internalRouter, netWorthRouter } from '../controllers/netWorthController';
import { exportRouter } from '../controllers/exportController';
import { recurringRouter } from '../controllers/recurringController';
import { labelRouter } from '../controllers/labelController';
import { userRouter } from '../controllers/userController';

export const apiRouter = Router();

apiRouter.use('/webhooks', webhookLimiter, webhookRouter);
// Lock-screen notification actions: authenticated by per-device actionKey,
// not Firebase — the iOS background handler has no ID token.
apiRouter.use('/push-actions', webhookLimiter, pushActionRouter);
apiRouter.use('/internal', internalRouter);

const authed = Router();
authed.use(verifyFirebaseToken, requireAuth, apiLimiter);
authed.use('/transactions', transactionRouter);
authed.use('/accounts', accountRouter);
authed.use('/circles', circleRouter);
authed.use('/circles', ledgerRouter); // /circles/:circleId/ledger, /settlements
authed.use('/networth', netWorthRouter);
authed.use('/exports', exportRouter);
authed.use('/recurring', recurringRouter);
authed.use('/labels', labelRouter);
authed.use('/users', userRouter);

apiRouter.use(authed);
