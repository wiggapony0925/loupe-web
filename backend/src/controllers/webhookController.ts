/**
 * Webhook ingestion.
 *
 * POST /v1/webhooks/email/inbound — the real-time engine. An email rule (or
 * SendGrid Inbound Parse / Mailgun route) forwards Amex/Chase alert emails
 * here within seconds of a swipe. Auth is a shared-secret `?token=` because
 * mail pipelines can't do OAuth; the token comparison is constant-time.
 * Every payload is recorded in email_ingest_events BEFORE parsing — when an
 * issuer silently rewords a template, the evidence is already in the table.
 *
 * POST /v1/webhooks/plaid — Plaid's server-to-server events (sync updates,
 * holdings changes), authenticated by verifying the `plaid-verification` JWT
 * against Plaid's published key plus a body-hash check.
 *
 * Both endpoints return 200 for non-transient failures (bad parse, unknown
 * card): retrying an email that doesn't parse will never make it parse, and
 * webhook providers hammer non-2xx endpoints with retries.
 */
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/envelope';
import { HttpError } from '../utils/httpError';
import { safeEqual, sha256Hex } from '../utils/crypto';
import { fromCents } from '../utils/money';
import { logger } from '../utils/logger';
import { parseAlertEmail, type ParsedAlert } from '../services/emailParser';
import { handlePlaidWebhook, verifyPlaidWebhookSignature } from '../services/plaidService';
import { notifyTransactionCreated } from '../services/pushService';
import type { AlertProvider, BankAccount } from '@prisma/client';

export const webhookRouter = Router();
const formParser = multer(); // SendGrid Inbound Parse posts multipart/form-data

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

// ── Email ingestion ──────────────────────────────────────────────────────────

webhookRouter.post(
  '/email/inbound',
  formParser.none(),
  asyncHandler(async (req, res) => {
    requireEmailToken(String(req.query.token ?? ''));

    const body = req.body as Record<string, unknown>;
    const input = {
      from: str(body.from) ?? str(body.sender),
      subject: str(body.subject),
      text: str(body.text) ?? str(body['body-plain']),
      html: str(body.html) ?? str(body['body-html']),
      receivedAt: new Date(),
    };

    const rawBody = input.text || input.html || '';
    const bodyHash = sha256Hex(`${input.subject ?? ''}|${rawBody}`);

    // Forwarding loops and provider retries send the same bytes twice.
    const recentDuplicate = await prisma.emailIngestEvent.findFirst({
      where: { bodyHash, receivedAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
      select: { id: true },
    });
    if (recentDuplicate) {
      await recordIngest({ input, bodyHash, provider: 'UNKNOWN', status: 'DUPLICATE' });
      ok(res, { status: 'duplicate' });
      return;
    }

    const result = parseAlertEmail(input);
    if (!result.ok) {
      await recordIngest({
        input,
        bodyHash,
        provider: result.provider,
        status: 'FAILED',
        error: result.reason,
      });
      logger.info({ reason: result.reason, provider: result.provider }, 'alert email not ingested');
      ok(res, { status: 'ignored', reason: result.reason });
      return;
    }

    const alert = result.alert;
    const resolved = await resolveAccountAndSpender(alert);
    if (!resolved) {
      await recordIngest({
        input,
        bodyHash,
        provider: alert.provider,
        status: 'UNMATCHED_ACCOUNT',
        parsed: alert,
      });
      ok(res, { status: 'unmatched_account' });
      return;
    }

    // Same charge already ingested (e.g. issuer sent both SMS-gateway and
    // email alerts, or two family members forward the same alert).
    const existing = await prisma.transaction.findFirst({
      where: {
        accountId: resolved.account.id,
        amount: fromCents(alert.amountCents),
        merchantNormalized: alert.merchantNormalized,
        date: alert.date,
        source: { in: ['EMAIL', 'MERGED'] },
      },
      select: { id: true },
    });
    if (existing) {
      await recordIngest({
        input,
        bodyHash,
        provider: alert.provider,
        status: 'DUPLICATE',
        parsed: alert,
        transactionId: existing.id,
      });
      ok(res, { status: 'duplicate', transactionId: existing.id });
      return;
    }

    const requiresTagging = alert.provider === 'CHASE' && resolved.spenderId === null;
    const transaction = await prisma.transaction.create({
      data: {
        accountId: resolved.account.id,
        amount: fromCents(alert.amountCents),
        merchantName: alert.merchant,
        merchantNormalized: alert.merchantNormalized,
        date: alert.date,
        cardLast4: alert.cardLast4,
        applePayDevice: alert.applePayDevice,
        // taggedOwner records WHO SPENT when the card mapping proves it;
        // splitType (how it's shared) stays null until a human tags it.
        taggedOwnerId: resolved.spenderId,
        status: requiresTagging ? 'REQUIRES_TAGGING' : 'PENDING',
        source: 'EMAIL',
      },
    });

    await recordIngest({
      input,
      bodyHash,
      provider: alert.provider,
      status: 'PARSED',
      parsed: alert,
      transactionId: transaction.id,
    });

    await notifyTransactionCreated({
      transactionId: transaction.id,
      merchant: alert.merchant,
      amountCents: alert.amountCents,
      accountOwnerId: resolved.account.userId,
      spenderId: resolved.spenderId,
      requiresTagging,
    });

    ok(res, { status: 'ingested', transactionId: transaction.id, requiresTagging }, null, 201);
  }),
);

function requireEmailToken(provided: string): void {
  const expected = env().EMAIL_WEBHOOK_TOKEN;
  if (!expected) {
    // validateProductionConfig guarantees this only happens in dev.
    if (env().NODE_ENV === 'production') {
      throw new HttpError(500, 'webhook.misconfigured', 'EMAIL_WEBHOOK_TOKEN missing');
    }
    return;
  }
  if (!provided || !safeEqual(provided, expected)) {
    throw new HttpError(401, 'webhook.invalid_token', 'Bad ingest token');
  }
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

interface ResolvedTarget {
  account: BankAccount;
  spenderId: string | null;
}

/**
 * Card → account → (maybe) spender.
 *
 * Amex: authorized users carry DISTINCT last-4/5s → a CardMapping row with a
 * matching last4 pins both the account and the spender. Fallback: the
 * account's own mask.
 * Chase: the family shares one PAN, so last4 only finds the account; the
 * spender comes from matching the Apple Pay device name against CardMapping
 * deviceName rows. No device → spender unknown → REQUIRES_TAGGING.
 */
async function resolveAccountAndSpender(alert: ParsedAlert): Promise<ResolvedTarget | null> {
  const institutionHint = alert.provider === 'AMEX' ? 'american express' : 'chase';

  if (alert.cardLast4) {
    const mappings = await prisma.cardMapping.findMany({
      where: { last4: { not: null } },
      include: { bankAccount: true },
    });
    const byMapping = mappings.find(
      (m) => m.last4 && last4Matches(m.last4, alert.cardLast4 as string),
    );
    if (byMapping) {
      return {
        account: byMapping.bankAccount,
        spenderId: alert.provider === 'AMEX' ? byMapping.userId : await chaseSpender(alert, byMapping.bankAccountId),
      };
    }
  }

  const accounts = await prisma.bankAccount.findMany({
    where: { isHidden: false },
    orderBy: { createdAt: 'asc' },
  });
  const candidates = accounts.filter((account) => {
    const maskHit = alert.cardLast4 && account.mask ? last4Matches(account.mask, alert.cardLast4) : false;
    const institutionHit = account.institutionName.toLowerCase().includes(institutionHint);
    return maskHit || (!alert.cardLast4 && institutionHit);
  });
  // Prefer mask+institution agreement; a last4 collision across issuers is
  // real (1 in 10⁴) and must not book a charge to the wrong bank.
  const best =
    candidates.find((a) => a.institutionName.toLowerCase().includes(institutionHint)) ?? candidates[0];
  if (!best) return null;

  return { account: best, spenderId: await chaseSpender(alert, best.id) };
}

async function chaseSpender(alert: ParsedAlert, bankAccountId: string): Promise<string | null> {
  if (alert.provider !== 'CHASE' || !alert.applePayDevice) return null;
  const device = alert.applePayDevice.toLowerCase();
  const mappings = await prisma.cardMapping.findMany({
    where: { bankAccountId, deviceName: { not: null } },
  });
  const hit = mappings.find((m) => {
    const mapped = (m.deviceName as string).toLowerCase();
    return device.includes(mapped) || mapped.includes(device);
  });
  return hit?.userId ?? null;
}

function last4Matches(a: string, b: string): boolean {
  // Amex alerts may carry 5 digits while the stored mask has 4 (or reverse).
  return a === b || a.endsWith(b) || b.endsWith(a);
}

async function recordIngest(params: {
  input: { from?: string; subject?: string; text?: string; html?: string };
  bodyHash: string;
  provider: AlertProvider | 'UNKNOWN';
  status: 'PARSED' | 'DUPLICATE' | 'UNMATCHED_ACCOUNT' | 'FAILED';
  parsed?: ParsedAlert;
  error?: string;
  transactionId?: string;
}): Promise<void> {
  await prisma.emailIngestEvent.create({
    data: {
      provider: params.provider,
      fromAddress: params.input.from ?? null,
      subject: params.input.subject ?? null,
      rawBody: (params.input.text ?? params.input.html ?? '').slice(0, 100_000),
      bodyHash: params.bodyHash,
      parsed: params.parsed
        ? { ...params.parsed, date: params.parsed.date.toISOString(), amount: fromCents(params.parsed.amountCents) }
        : undefined,
      status: params.status,
      error: params.error ?? null,
      transactionId: params.transactionId ?? null,
    },
  });
}

// ── Plaid webhook ────────────────────────────────────────────────────────────

webhookRouter.post(
  '/plaid',
  asyncHandler(async (req, res) => {
    if (env().PLAID_WEBHOOK_VERIFY) {
      const jwt = req.headers['plaid-verification'];
      if (typeof jwt !== 'string' || !req.rawBody) {
        throw new HttpError(401, 'webhook.invalid_signature', 'Missing plaid-verification header');
      }
      await verifyPlaidWebhookSignature(req.rawBody, jwt);
    }

    // Awaited on purpose: Cloud Run throttles CPU after the response is sent,
    // so "fire and forget" work here would silently freeze mid-sync.
    try {
      await handlePlaidWebhook(req.body ?? {});
    } catch (err) {
      logger.error({ err }, 'plaid webhook handling failed');
    }
    ok(res, { received: true });
  }),
);
