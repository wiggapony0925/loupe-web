/**
 * Zod schemas for every wire shape the backend serves. The API client parses
 * responses through these, so a contract drift fails loudly at the boundary
 * instead of rendering NaN somewhere three screens deep.
 * `types.d.ts` infers the static types from these schemas.
 */
import { z } from 'zod';

export const SplitTypeSchema = z.enum(['MINE', 'PARTNER', 'SPLIT', 'REIMBURSE']);
export const SettlementStatusSchema = z.enum(['NONE', 'UNSETTLED', 'PENDING', 'SETTLED']);
export const TransactionStatusSchema = z.enum(['PENDING', 'REQUIRES_TAGGING', 'POSTED']);
export const TransactionSourceSchema = z.enum(['EMAIL', 'PLAID', 'MERGED', 'MANUAL']);
export const AccountTypeSchema = z.enum(['DEPOSITORY', 'CREDIT', 'INVESTMENT', 'LOAN', 'OTHER']);
export const CircleRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
export const PermissionSchema = z.enum(['VIEW_BALANCES', 'VIEW_TRANSACTIONS', 'EDIT_TAGS', 'ADMIN']);
export const NetWorthRangeSchema = z.enum(['1W', '1M', '3M', 'YTD', '1Y', 'ALL']);

export const UserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  phoneNumber: z.string(),
  email: z.string().nullable(),
  createdAt: z.string(),
});

export const LabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  transactionCount: z.number().optional(),
});

export const TransactionSchema = z.object({
  id: z.string(),
  account: z.object({
    id: z.string(),
    name: z.string(),
    mask: z.string().nullable(),
    institutionName: z.string(),
    userId: z.string(),
  }),
  amountCents: z.number(),
  merchant: z.string(),
  date: z.string(),
  category: z.string().nullable(),
  cardLast4: z.string().nullable(),
  applePayDevice: z.string().nullable(),
  taggedOwner: z.object({ id: z.string(), displayName: z.string() }).nullable(),
  splitType: SplitTypeSchema.nullable(),
  settlementStatus: SettlementStatusSchema,
  status: TransactionStatusSchema,
  source: TransactionSourceSchema,
  circle: z.object({ id: z.string(), name: z.string() }).nullable(),
  labels: z.array(z.object({ id: z.string(), name: z.string() })),
  notes: z.string().nullable(),
  pendingPlaid: z.boolean(),
  createdAt: z.string(),
});

export const HoldingSchema = z.object({
  id: z.string(),
  symbol: z.string().nullable(),
  name: z.string().nullable(),
  quantity: z.string(),
  valueCents: z.number().nullable(),
});

export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  institutionName: z.string(),
  mask: z.string().nullable(),
  type: AccountTypeSchema,
  subtype: z.string().nullable(),
  // null = unknown; the UI renders "—", never $0.00.
  currentBalanceCents: z.number().nullable(),
  availableBalanceCents: z.number().nullable(),
  currencyCode: z.string(),
  isHidden: z.boolean(),
  plaidLinked: z.boolean(),
  lastSyncedAt: z.string().nullable(),
  transactionCount: z.number(),
  holdings: z.array(HoldingSchema),
  holdingsValueCents: z.number().nullable(),
});

export const CircleMemberSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  phoneMask: z.string(),
  role: CircleRoleSchema,
  permissions: z.unknown(),
  joinedAt: z.string(),
});

export const CircleSchema = z.object({
  id: z.string(),
  name: z.string(),
  inviteCode: z.string(),
  createdById: z.string(),
  createdAt: z.string(),
  members: z.array(CircleMemberSchema),
});

export const PairBalanceSchema = z.object({
  fromUserId: z.string(),
  toUserId: z.string(),
  cents: z.number(),
});

export const LedgerSchema = z.object({
  circleId: z.string(),
  computedAt: z.string(),
  members: z.array(z.object({ userId: z.string(), displayName: z.string(), netCents: z.number() })),
  pairs: z.array(PairBalanceSchema),
  suggestions: z.array(PairBalanceSchema),
  unsettledTransactionCount: z.number(),
  pendingSettlements: z.array(
    z.object({
      id: z.string(),
      fromUserId: z.string(),
      toUserId: z.string(),
      amountCents: z.number(),
      createdAt: z.string(),
    }),
  ),
});

export const SettlementRecordSchema = z.object({
  id: z.string(),
  fromUser: z.object({ id: z.string(), displayName: z.string() }),
  toUser: z.object({ id: z.string(), displayName: z.string() }),
  amountCents: z.number(),
  status: z.enum(['PENDING', 'CONFIRMED']),
  note: z.string().nullable(),
  createdAt: z.string(),
  confirmedAt: z.string().nullable(),
});

export const AccountValuationSchema = z.object({
  accountId: z.string(),
  name: z.string(),
  institutionName: z.string(),
  type: AccountTypeSchema,
  mask: z.string().nullable(),
  valueCents: z.number().nullable(),
});

export const NetWorthSummarySchema = z.object({
  netWorthCents: z.number(),
  assetsCents: z.number(),
  liabilitiesCents: z.number(),
  accounts: z.array(AccountValuationSchema),
  unknownAccountIds: z.array(z.string()),
  asOf: z.string(),
});

export const NetWorthHistorySchema = z.object({
  range: NetWorthRangeSchema,
  points: z.array(z.object({ t: z.string(), netWorthCents: z.number() })),
  current: NetWorthSummarySchema,
});

export const SheetRowSchema = z.object({
  id: z.string(),
  date: z.string(),
  merchant: z.string(),
  category: z.string().nullable(),
  account: z.string(),
  institution: z.string(),
  accountOwner: z.string(),
  cardLast4: z.string().nullable(),
  amountCents: z.number(),
  taggedOwner: z.string().nullable(),
  splitType: SplitTypeSchema.nullable(),
  settlementStatus: z.string(),
  status: TransactionStatusSchema,
  source: z.string(),
  circle: z.string().nullable(),
  labels: z.array(z.string()),
  notes: z.string().nullable(),
});

export const StatementRecordSchema = z.object({
  id: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  format: z.enum(['PDF', 'XLSX', 'CSV']),
  archived: z.boolean(),
  createdAt: z.string(),
});

export const RecurringItemSchema = z.object({
  merchant: z.string(),
  merchantNormalized: z.string(),
  cadence: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  averageAmountCents: z.number(),
  monthlyizedCents: z.number(),
  lastDate: z.string(),
  nextExpectedDate: z.string(),
  occurrences: z.number(),
  accounts: z.array(z.string()),
});

export const RecurringSummarySchema = z.object({
  items: z.array(RecurringItemSchema),
  monthlyTotalCents: z.number(),
});

export const InstitutionSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullable(),
  primaryColor: z.string().nullable(),
  url: z.string().nullable(),
});

export const LinkTokenSchema = z.object({ linkToken: z.string(), expiration: z.string() });

export const GoogleSheetExportSchema = z.object({
  spreadsheetId: z.string(),
  url: z.string(),
  sharedWith: z.string().nullable(),
});
