/**
 * END-TO-END test of the third-party bank-data pipeline ("user logs into
 * their bank, we get the data") against a local Plaid API emulator:
 *
 *   link → public-token exchange → accounts stored with AES-encrypted
 *   access token → initial /transactions/sync (first response is
 *   PRODUCT_NOT_READY, proving the retry) → email-alert twin MERGED, not
 *   duplicated → balances + cursor persisted → net worth computed →
 *   TRANSACTIONS webhook delivers an added + a removed row.
 *
 * Runs only when TEST_DATABASE_URL points at a scratch Postgres
 * (`npm run test:integration` locally); CI without a DB skips it.
 */
import './plaidIntegration.env';
import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../config/db';
import { resetEnvCache } from '../config/env';
import { decrypt, resetCryptoKeyCache } from '../utils/crypto';
import { toCents } from '../utils/money';
import {
  exchangePublicToken,
  handlePlaidWebhook,
  resetPlaidClientCache,
} from './plaidService';
import { computeNetWorth } from './netWorthService';

const RUN = Boolean(process.env.TEST_DATABASE_URL);

const day = (offset: number): string =>
  new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

// ── Plaid emulator ───────────────────────────────────────────────────────────
let syncCalls = 0;
let webhookPhase = false;

const ACCOUNTS = [
  {
    account_id: 'acc-checking',
    name: 'Everyday Checking',
    official_name: 'Everyday Checking',
    mask: '4421',
    type: 'depository',
    subtype: 'checking',
    balances: { current: 8234.07, available: 8000.0, iso_currency_code: 'USD' },
  },
  {
    account_id: 'acc-credit',
    name: 'Sapphire Preferred',
    official_name: null,
    mask: '1234',
    type: 'credit',
    subtype: 'credit card',
    balances: { current: 964.1, available: null, iso_currency_code: 'USD' },
  },
];

const plaidTxn = (
  id: string,
  accountId: string,
  amount: number,
  date: string,
  name: string,
  pending = false,
) => ({
  transaction_id: id,
  account_id: accountId,
  amount,
  date,
  name,
  merchant_name: name,
  pending,
  personal_finance_category: { primary: 'FOOD_AND_DRINK' },
  category: ['Food and Drink'],
});

function emulatorResponse(path: string): { status: number; body: unknown } {
  switch (path) {
    case '/item/public_token/exchange':
      return { status: 200, body: { access_token: 'access-test-123', item_id: 'item-1', request_id: 'r' } };
    case '/accounts/get':
    case '/accounts/balance/get':
      return {
        status: 200,
        body: { accounts: ACCOUNTS, item: { institution_id: 'ins_3' }, request_id: 'r' },
      };
    case '/institutions/get_by_id':
      return { status: 200, body: { institution: { institution_id: 'ins_3', name: 'Chase' }, request_id: 'r' } };
    case '/investments/holdings/get':
      return { status: 400, body: { error_code: 'PRODUCTS_NOT_SUPPORTED', error_type: 'ITEM_ERROR' } };
    case '/transactions/sync': {
      syncCalls += 1;
      // The very first pull isn't ready yet — exactly what real Plaid does.
      if (syncCalls === 1) {
        return { status: 400, body: { error_code: 'PRODUCT_NOT_READY', error_type: 'ITEM_ERROR' } };
      }
      if (!webhookPhase) {
        return {
          status: 200,
          body: {
            added: [
              plaidTxn('p1', 'acc-checking', 6.75, day(2), 'Blue Bottle Coffee'),
              plaidTxn('p2', 'acc-credit', 22.99, day(1), 'NETFLIX'),
              plaidTxn('p3', 'acc-checking', 18.2, day(1), 'Uber', true),
            ],
            modified: [],
            removed: [],
            next_cursor: 'cursor-1',
            has_more: false,
            request_id: 'r',
          },
        };
      }
      return {
        status: 200,
        body: {
          added: [plaidTxn('p4', 'acc-credit', 87.34, day(0), 'WHOLEFDS #10203')],
          modified: [],
          removed: [{ transaction_id: 'p3' }],
          next_cursor: 'cursor-2',
          has_more: false,
          request_id: 'r',
        },
      };
    }
    default:
      return { status: 404, body: { error_code: 'UNKNOWN_ENDPOINT' } };
  }
}

let server: Server;

async function waitFor(check: () => Promise<boolean>, timeoutMs = 20_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('waitFor timed out');
}

describe.runIf(RUN)('Plaid pipeline (end-to-end against emulator)', () => {
  let userId: string;

  beforeAll(async () => {
    resetEnvCache();
    resetCryptoKeyCache();
    resetPlaidClientCache();

    server = createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk: Buffer) => (raw += chunk.toString()));
      req.on('end', () => {
        const { status, body } = emulatorResponse(req.url ?? '');
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      });
    });
    await new Promise<void>((resolve) => server.listen(46123, '127.0.0.1', resolve));

    // Clean slate in FK-safe order.
    await prisma.transaction.deleteMany();
    await prisma.emailIngestEvent.deleteMany();
    await prisma.holding.deleteMany();
    await prisma.cardMapping.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.netWorthSnapshot.deleteMany();
    await prisma.settlement.deleteMany();
    await prisma.circleMember.deleteMany();
    await prisma.circle.deleteMany();
    await prisma.deviceToken.deleteMany();
    await prisma.label.deleteMany();
    await prisma.statement.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { firebaseUid: 'test-uid', phoneNumber: '+15550001111', displayName: 'Jeffrey' },
    });
    userId = user.id;
  }, 30_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  it('links, encrypts the token, syncs, merges the email twin, and computes net worth', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const accounts = await exchangePublicToken(user, 'public-test-token');

    // Two accounts stored, token encrypted at rest but recoverable in-process.
    expect(accounts).toHaveLength(2);
    const checking = accounts.find((a) => a.mask === '4421')!;
    expect(checking.institutionName).toBe('Chase');
    expect(checking.plaidAccessToken).not.toContain('access-test-123');
    expect(decrypt(checking.plaidAccessToken as string)).toBe('access-test-123');

    // Real-time email alert arrived BEFORE Plaid posts (the trackify flow):
    // same charge, messier merchant string, same calendar date.
    await prisma.transaction.create({
      data: {
        accountId: checking.id,
        amount: '6.75',
        merchantName: 'SQ *BLUE BOTTLE',
        merchantNormalized: 'BLUE BOTTLE',
        date: new Date(`${day(2)}T12:00:00Z`),
        status: 'PENDING',
        source: 'EMAIL',
      },
    });

    // The background initial sync (kicked by exchange) first hits
    // PRODUCT_NOT_READY, retries, then lands 3 transactions.
    await waitFor(async () => (await prisma.transaction.count({ where: { plaidTransactionId: { not: null } } })) === 3);

    // Merge, not duplicate: 3 rows total, and the email row became the
    // Plaid row (same identity, source MERGED, posted).
    expect(await prisma.transaction.count()).toBe(3);
    const merged = await prisma.transaction.findUniqueOrThrow({ where: { plaidTransactionId: 'p1' } });
    expect(merged.source).toBe('MERGED');
    expect(merged.status).toBe('POSTED');
    expect(merged.merchantName).toBe('SQ *BLUE BOTTLE'); // email identity kept

    // Balances, cursor, and sync stamp persisted.
    const refreshed = await prisma.bankAccount.findUniqueOrThrow({ where: { id: checking.id } });
    expect(toCents(refreshed.currentBalance!)).toBe(823_407);
    expect(refreshed.plaidSyncCursor).toBe('cursor-1');
    expect(refreshed.lastSyncedAt).not.toBeNull();

    // Net worth: checking asset minus credit-card liability.
    const summary = await computeNetWorth(userId);
    expect(summary.assetsCents).toBe(823_407);
    expect(summary.liabilitiesCents).toBe(96_410);
    expect(summary.netWorthCents).toBe(823_407 - 96_410);
    expect(summary.unknownAccountIds).toHaveLength(0);
  }, 30_000);

  it('applies webhook deltas: new charge added, superseded pending removed', async () => {
    webhookPhase = true;
    await handlePlaidWebhook({ webhook_type: 'TRANSACTIONS', webhook_code: 'SYNC_UPDATES_AVAILABLE', item_id: 'item-1' });

    const ids = (
      await prisma.transaction.findMany({
        where: { plaidTransactionId: { not: null } },
        select: { plaidTransactionId: true },
      })
    )
      .map((t) => t.plaidTransactionId)
      .sort();
    expect(ids).toEqual(['p1', 'p2', 'p4']); // p3 (pending, untagged) removed

    const account = await prisma.bankAccount.findFirstOrThrow({ where: { mask: '4421' } });
    expect(account.plaidSyncCursor).toBe('cursor-2');
  }, 20_000);
});
