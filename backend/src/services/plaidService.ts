/**
 * Plaid integration: linking (banks, cards, Robinhood/brokerages), the
 * /transactions/sync stream, investment holdings, and webhook verification.
 *
 * Access tokens are AES-256-GCM encrypted before they touch the database and
 * decrypted only in-process (utils/crypto.ts). Webhooks are authenticated by
 * verifying Plaid's `plaid-verification` JWT (ES256) against their published
 * key AND checking the body hash — a webhook endpoint that trusts its caller
 * is an unauthenticated write path into the ledger.
 */
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
  type Transaction as PlaidTransaction,
} from 'plaid';
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from 'jose';
import type { AccountType, BankAccount, User } from '@prisma/client';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { decrypt, encrypt, sha256Hex } from '../utils/crypto';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { parseDateLoose } from './emailParser';
import {
  plaidAmountToCents,
  reconcilePlaidTransaction,
  removePlaidTransactions,
  type ReconcileAction,
} from './transactionMatcher';

let cachedClient: PlaidApi | null = null;

function client(): PlaidApi {
  const e = env();
  if (!e.PLAID_CLIENT_ID || !e.PLAID_SECRET) {
    throw new HttpError(503, 'plaid.unconfigured', 'Plaid credentials are not configured');
  }
  if (!cachedClient) {
    cachedClient = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[e.PLAID_ENV],
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': e.PLAID_CLIENT_ID,
            'PLAID-SECRET': e.PLAID_SECRET,
          },
        },
      }),
    );
  }
  return cachedClient;
}

function toAccountType(plaidType: string | null | undefined): AccountType {
  switch (plaidType) {
    case 'depository':
      return 'DEPOSITORY';
    case 'credit':
      return 'CREDIT';
    case 'investment':
    case 'brokerage':
      return 'INVESTMENT';
    case 'loan':
      return 'LOAN';
    default:
      return 'OTHER';
  }
}

/** Dollars-or-null → Decimal-string-or-null. Unknown stays NULL, never 0. */
function toBalance(value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : value.toFixed(2);
}

// ── Linking ──────────────────────────────────────────────────────────────────

export async function createLinkToken(user: User): Promise<{ linkToken: string; expiration: string }> {
  const e = env();
  const response = await client().linkTokenCreate({
    user: { client_user_id: user.id, phone_number: user.phoneNumber },
    client_name: 'trackify',
    language: 'en',
    country_codes: [CountryCode.Us],
    products: [Products.Transactions],
    // Investments covers Robinhood/Fidelity/etc. — optional so a plain
    // checking-account link doesn't fail for lacking the product.
    optional_products: [Products.Investments],
    ...(e.PLAID_WEBHOOK_URL ? { webhook: e.PLAID_WEBHOOK_URL } : {}),
  });
  return { linkToken: response.data.link_token, expiration: response.data.expiration };
}

export async function exchangePublicToken(user: User, publicToken: string): Promise<BankAccount[]> {
  const exchange = await client().itemPublicTokenExchange({ public_token: publicToken });
  const accessToken = exchange.data.access_token;
  const itemId = exchange.data.item_id;

  const accountsResponse = await client().accountsGet({ access_token: accessToken });

  let institutionName = 'Bank';
  const institutionId = accountsResponse.data.item.institution_id;
  if (institutionId) {
    try {
      const inst = await client().institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us],
      });
      institutionName = inst.data.institution.name;
    } catch {
      // Cosmetic only — a lookup hiccup must not fail the whole link.
    }
  }

  const encryptedToken = encrypt(accessToken);
  const saved: BankAccount[] = [];
  for (const account of accountsResponse.data.accounts) {
    const record = await prisma.bankAccount.upsert({
      where: { plaidAccountId: account.account_id },
      create: {
        userId: user.id,
        plaidItemId: itemId,
        plaidAccountId: account.account_id,
        plaidAccessToken: encryptedToken,
        mask: account.mask ?? null,
        institutionName,
        name: account.official_name ?? account.name,
        type: toAccountType(account.type as string),
        subtype: (account.subtype as string | null) ?? null,
        currentBalance: toBalance(account.balances.current),
        availableBalance: toBalance(account.balances.available),
        currencyCode: account.balances.iso_currency_code ?? 'USD',
      },
      update: {
        plaidAccessToken: encryptedToken,
        institutionName,
        currentBalance: toBalance(account.balances.current),
        availableBalance: toBalance(account.balances.available),
      },
    });
    saved.push(record);
  }

  // First sync + holdings in the background — Link's success sheet shouldn't
  // block on a potentially long initial pull.
  void syncItemTransactions(itemId).catch((err) =>
    logger.error({ err, itemId }, 'initial transaction sync failed'),
  );
  void refreshHoldings(itemId).catch((err) =>
    logger.debug({ err: (err as Error).message, itemId }, 'holdings refresh skipped'),
  );

  return saved;
}

// ── Transaction sync ─────────────────────────────────────────────────────────

interface ItemContext {
  accessToken: string;
  accounts: Map<string, string>; // plaidAccountId → bankAccounts.id
  cursor: string | null;
}

async function itemContext(plaidItemId: string): Promise<ItemContext | null> {
  const rows = await prisma.bankAccount.findMany({ where: { plaidItemId } });
  const withToken = rows.find((r) => r.plaidAccessToken);
  if (!withToken?.plaidAccessToken) return null;
  return {
    accessToken: decrypt(withToken.plaidAccessToken),
    accounts: new Map(rows.filter((r) => r.plaidAccountId).map((r) => [r.plaidAccountId as string, r.id])),
    cursor: withToken.plaidSyncCursor,
  };
}

export async function syncItemTransactions(
  plaidItemId: string,
): Promise<Record<ReconcileAction, number>> {
  const ctx = await itemContext(plaidItemId);
  if (!ctx) {
    logger.warn({ plaidItemId }, 'sync requested for unknown item');
    return { merged: 0, created: 0, updated: 0 };
  }

  const counts: Record<ReconcileAction, number> = { merged: 0, created: 0, updated: 0 };
  let cursor = ctx.cursor ?? undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await client().transactionsSync({
      access_token: ctx.accessToken,
      cursor,
      count: 500,
    });
    const { added, modified, removed, next_cursor, has_more } = response.data;

    for (const txn of [...added, ...modified]) {
      const accountId = ctx.accounts.get(txn.account_id);
      if (!accountId) continue; // account the user hid/never stored
      const { action } = await reconcilePlaidTransaction(accountId, mapPlaidTransaction(txn));
      counts[action]++;
    }
    await removePlaidTransactions(removed.map((r) => r.transaction_id ?? '').filter(Boolean));

    cursor = next_cursor;
    hasMore = has_more;
  }

  await prisma.bankAccount.updateMany({
    where: { plaidItemId },
    data: { plaidSyncCursor: cursor ?? null, lastSyncedAt: new Date() },
  });
  await refreshBalances(plaidItemId, ctx.accessToken);

  logger.info({ plaidItemId, ...counts }, 'plaid sync complete');
  return counts;
}

function mapPlaidTransaction(txn: PlaidTransaction) {
  return {
    plaidTransactionId: txn.transaction_id,
    amountCents: plaidAmountToCents(txn.amount),
    date: parseDateLoose(txn.date) ?? new Date(),
    merchantName: txn.merchant_name ?? txn.name,
    category: txn.personal_finance_category?.primary ?? txn.category?.[0] ?? null,
    pending: txn.pending,
  };
}

async function refreshBalances(plaidItemId: string, accessToken: string): Promise<void> {
  try {
    const response = await client().accountsBalanceGet({ access_token: accessToken });
    for (const account of response.data.accounts) {
      await prisma.bankAccount.updateMany({
        where: { plaidAccountId: account.account_id },
        data: {
          currentBalance: toBalance(account.balances.current),
          availableBalance: toBalance(account.balances.available),
        },
      });
    }
  } catch (err) {
    logger.warn({ err, plaidItemId }, 'balance refresh failed');
  }
}

// ── Investments (Robinhood et al.) ───────────────────────────────────────────

export async function refreshHoldings(plaidItemId: string): Promise<number> {
  const ctx = await itemContext(plaidItemId);
  if (!ctx) return 0;

  const response = await client().investmentsHoldingsGet({ access_token: ctx.accessToken });
  const securities = new Map(response.data.securities.map((s) => [s.security_id, s]));

  let count = 0;
  for (const holding of response.data.holdings) {
    const accountId = ctx.accounts.get(holding.account_id);
    if (!accountId) continue;
    const security = securities.get(holding.security_id);
    await prisma.holding.upsert({
      where: {
        accountId_securityId: { accountId, securityId: holding.security_id },
      },
      create: {
        accountId,
        securityId: holding.security_id,
        symbol: security?.ticker_symbol ?? null,
        name: security?.name ?? null,
        quantity: holding.quantity.toFixed(6),
        costBasis: toBalance(holding.cost_basis),
        institutionPrice: holding.institution_price?.toFixed(4) ?? null,
        institutionValue: toBalance(holding.institution_value),
        asOf: new Date(),
      },
      update: {
        symbol: security?.ticker_symbol ?? null,
        name: security?.name ?? null,
        quantity: holding.quantity.toFixed(6),
        costBasis: toBalance(holding.cost_basis),
        institutionPrice: holding.institution_price?.toFixed(4) ?? null,
        institutionValue: toBalance(holding.institution_value),
        asOf: new Date(),
      },
    });
    count++;
  }

  for (const account of response.data.accounts) {
    await prisma.bankAccount.updateMany({
      where: { plaidAccountId: account.account_id },
      data: { currentBalance: toBalance(account.balances.current) },
    });
  }
  return count;
}

// ── Webhooks ─────────────────────────────────────────────────────────────────

const webhookKeyCache = new Map<string, JWK>();

/**
 * Verifies Plaid's `plaid-verification` header: an ES256 JWT whose payload
 * carries a SHA-256 of the exact request body. Both the signature and the
 * body hash must hold.
 */
export async function verifyPlaidWebhookSignature(rawBody: Buffer, jwt: string): Promise<void> {
  const invalid = (): HttpError => new HttpError(401, 'webhook.invalid_signature', 'Plaid webhook verification failed');
  let payload: { request_body_sha256?: string };
  try {
    const header = decodeProtectedHeader(jwt);
    if (header.alg !== 'ES256' || typeof header.kid !== 'string') throw new Error('bad header');

    let jwk = webhookKeyCache.get(header.kid);
    if (!jwk) {
      const response = await client().webhookVerificationKeyGet({ key_id: header.kid });
      jwk = response.data.key as unknown as JWK;
      webhookKeyCache.set(header.kid, jwk);
    }

    const key = await importJWK(jwk, 'ES256');
    const verified = await jwtVerify(jwt, key, { maxTokenAge: '5 min' });
    payload = verified.payload as { request_body_sha256?: string };
  } catch {
    throw invalid();
  }
  if (payload.request_body_sha256 !== sha256Hex(rawBody.toString('utf8'))) {
    throw invalid();
  }
}

export interface PlaidWebhookBody {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
}

export async function handlePlaidWebhook(body: PlaidWebhookBody): Promise<void> {
  const itemId = body.item_id;
  if (!itemId) return;

  switch (body.webhook_type) {
    case 'TRANSACTIONS':
      await syncItemTransactions(itemId);
      break;
    case 'HOLDINGS':
    case 'INVESTMENTS_TRANSACTIONS':
      await refreshHoldings(itemId).catch((err) =>
        logger.debug({ err: (err as Error).message, itemId }, 'holdings webhook skipped'),
      );
      break;
    case 'ITEM':
      logger.warn({ itemId, code: body.webhook_code }, 'plaid item webhook (attention may be required)');
      break;
    default:
      logger.debug({ type: body.webhook_type, itemId }, 'unhandled plaid webhook type');
  }
}
