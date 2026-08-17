# trackify — database schema

> Generated from `src/models/schema.prisma` by `scripts/schema-docs.mjs`.
> Do not edit by hand — `npm run db:docs` regenerates it.

Money convention: amounts are `Decimal` at rest, integer cents in code, and
**NULL means unknown, never zero**.

## Identity & Circles

```mermaid
erDiagram
  USERS {
    String id
    String firebaseUid
    String phoneNumber
    String displayName
    String email "nullable"
    DateTime createdAt
    DateTime updatedAt
  }
  CIRCLES {
    String id
    String name
    String inviteCode
    String createdById
    DateTime createdAt
  }
  CIRCLE_MEMBERS {
    String circleId
    String userId
    CircleRole role
    Json permissions
    DateTime joinedAt
  }
  USERS ||--o{ CIRCLES : "circlesCreated"
  USERS ||--o{ CIRCLE_MEMBERS : "memberships"
  USERS ||--o{ BANK_ACCOUNTS : "bankAccounts"
  USERS ||--o{ TRANSACTIONS : "taggedTransactions"
  USERS ||--o{ LABELS : "labels"
  USERS ||--o{ CARD_MAPPINGS : "cardMappings"
  USERS ||--o{ DEVICE_TOKENS : "deviceTokens"
  USERS ||--o{ NET_WORTH_SNAPSHOTS : "netWorthSnapshots"
  USERS ||--o{ SETTLEMENTS : "settlementsFrom"
  USERS ||--o{ SETTLEMENTS : "settlementsTo"
  USERS ||--o{ STATEMENTS : "statements"
  CIRCLES ||--o{ CIRCLE_MEMBERS : "members"
  CIRCLES ||--o{ TRANSACTIONS : "transactions"
  CIRCLES ||--o{ SETTLEMENTS : "settlements"
  CIRCLES ||--o{ STATEMENTS : "statements"
```

## Banking & Positions

```mermaid
erDiagram
  BANK_ACCOUNTS {
    String id
    String userId
    String plaidItemId "nullable"
    String plaidAccountId "nullable"
    String plaidAccessToken "nullable"
    String plaidSyncCursor "nullable"
    String mask "nullable"
    String institutionName
    String name
    AccountType type
    String subtype "nullable"
    Decimal currentBalance "nullable"
  }
  CARD_MAPPINGS {
    String id
    String bankAccountId
    String userId
    String last4 "nullable"
    String deviceName "nullable"
    String label "nullable"
    DateTime createdAt
  }
  HOLDINGS {
    String id
    String accountId
    String securityId "nullable"
    String symbol "nullable"
    String name "nullable"
    Decimal quantity
    Decimal costBasis "nullable"
    Decimal institutionPrice "nullable"
    Decimal institutionValue "nullable"
    DateTime asOf
  }
  BANK_ACCOUNTS ||--o{ TRANSACTIONS : "transactions"
  BANK_ACCOUNTS ||--o{ HOLDINGS : "holdings"
  BANK_ACCOUNTS ||--o{ CARD_MAPPINGS : "cardMappings"
```

## Ledger

```mermaid
erDiagram
  TRANSACTIONS {
    String id
    String accountId
    String plaidTransactionId "nullable"
    Decimal amount
    String merchantName
    String merchantNormalized
    DateTime date
    String category "nullable"
    String cardLast4 "nullable"
    String applePayDevice "nullable"
    String taggedOwnerId "nullable"
    SplitType splitType "nullable"
  }
  LABELS {
    String id
    String createdById
    String name
    DateTime createdAt
  }
  TRANSACTION_LABELS {
    String transactionId
    String labelId
  }
  SETTLEMENTS {
    String id
    String circleId
    String fromUserId
    String toUserId
    Decimal amount
    Decimal unattributedAmount
    TransferStatus status
    String note "nullable"
    DateTime createdAt
    DateTime confirmedAt "nullable"
  }
  TRANSACTIONS ||--o{ TRANSACTION_LABELS : "labels"
  TRANSACTIONS ||--o{ EMAIL_INGEST_EVENTS : "ingestEvents"
  LABELS ||--o{ TRANSACTION_LABELS : "transactions"
  SETTLEMENTS ||--o{ TRANSACTIONS : "transactions"
```

## Ingestion & Devices

```mermaid
erDiagram
  EMAIL_INGEST_EVENTS {
    String id
    AlertProvider provider
    String fromAddress "nullable"
    String subject "nullable"
    String rawBody
    String bodyHash
    Json parsed "nullable"
    IngestStatus status
    String error "nullable"
    String transactionId "nullable"
    DateTime receivedAt
  }
  DEVICE_TOKENS {
    String id
    String userId
    String token
    DevicePlatform platform
    String actionKey "nullable"
    DateTime createdAt
    DateTime lastSeenAt
  }
```

## Reporting

```mermaid
erDiagram
  NET_WORTH_SNAPSHOTS {
    String id
    String userId
    DateTime capturedAt
    Decimal assets
    Decimal liabilities
    Decimal netWorth
    Json breakdown
  }
  STATEMENTS {
    String id
    String userId
    String circleId "nullable"
    DateTime periodStart
    DateTime periodEnd
    StatementFormat format
    String storagePath "nullable"
    DateTime createdAt
  }
```

## All tables

| Model | Table | Columns | Relations out |
|---|---|---|---|
| User | `users` | 7 | Circle, CircleMember, BankAccount, Transaction, Label, CardMapping, DeviceToken, NetWorthSnapshot, Settlement, Settlement, Statement |
| Circle | `circles` | 5 | CircleMember, Transaction, Settlement, Statement |
| CircleMember | `circle_members` | 5 | — |
| BankAccount | `bank_accounts` | 18 | Transaction, Holding, CardMapping |
| CardMapping | `card_mappings` | 7 | — |
| Transaction | `transactions` | 21 | TransactionLabel, EmailIngestEvent |
| Label | `labels` | 4 | TransactionLabel |
| TransactionLabel | `transaction_labels` | 2 | — |
| Holding | `holdings` | 10 | — |
| NetWorthSnapshot | `net_worth_snapshots` | 7 | — |
| Settlement | `settlements` | 10 | Transaction |
| Statement | `statements` | 8 | — |
| DeviceToken | `device_tokens` | 7 | — |
| EmailIngestEvent | `email_ingest_events` | 11 | — |
