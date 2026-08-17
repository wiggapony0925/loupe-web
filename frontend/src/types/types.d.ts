/**
 * Static types, strictly inferred from the Zod schemas in schemas.ts —
 * there is exactly one source of truth for wire shapes and this file is not it.
 */
import type { z } from 'zod';
import type {
  AccountSchema,
  AccountValuationSchema,
  CircleMemberSchema,
  CircleRoleSchema,
  CircleSchema,
  GoogleSheetExportSchema,
  HoldingSchema,
  InstitutionSchema,
  RecurringItemSchema,
  RecurringSummarySchema,
  LabelSchema,
  LedgerSchema,
  LinkTokenSchema,
  NetWorthHistorySchema,
  NetWorthRangeSchema,
  NetWorthSummarySchema,
  PairBalanceSchema,
  PermissionSchema,
  SettlementRecordSchema,
  SettlementStatusSchema,
  SheetRowSchema,
  SplitTypeSchema,
  StatementRecordSchema,
  TransactionSchema,
  TransactionSourceSchema,
  TransactionStatusSchema,
  UserSchema,
} from './schemas';

export type SplitType = z.infer<typeof SplitTypeSchema>;
export type SettlementStatus = z.infer<typeof SettlementStatusSchema>;
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;
export type TransactionSource = z.infer<typeof TransactionSourceSchema>;
export type CircleRole = z.infer<typeof CircleRoleSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type NetWorthRange = z.infer<typeof NetWorthRangeSchema>;

export type User = z.infer<typeof UserSchema>;
export type Label = z.infer<typeof LabelSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type Holding = z.infer<typeof HoldingSchema>;
export type Account = z.infer<typeof AccountSchema>;
export type CircleMember = z.infer<typeof CircleMemberSchema>;
export type Circle = z.infer<typeof CircleSchema>;
export type PairBalance = z.infer<typeof PairBalanceSchema>;
export type Ledger = z.infer<typeof LedgerSchema>;
export type SettlementRecord = z.infer<typeof SettlementRecordSchema>;
export type AccountValuation = z.infer<typeof AccountValuationSchema>;
export type NetWorthSummary = z.infer<typeof NetWorthSummarySchema>;
export type NetWorthHistory = z.infer<typeof NetWorthHistorySchema>;
export type SheetRow = z.infer<typeof SheetRowSchema>;
export type StatementRecord = z.infer<typeof StatementRecordSchema>;
export type LinkToken = z.infer<typeof LinkTokenSchema>;
export type GoogleSheetExport = z.infer<typeof GoogleSheetExportSchema>;
export type RecurringItem = z.infer<typeof RecurringItemSchema>;
export type RecurringSummary = z.infer<typeof RecurringSummarySchema>;
export type Institution = z.infer<typeof InstitutionSchema>;
