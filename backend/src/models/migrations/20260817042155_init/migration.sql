-- CreateEnum
CREATE TYPE "CircleRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('MINE', 'PARTNER', 'SPLIT', 'REIMBURSE');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('NONE', 'UNSETTLED', 'PENDING', 'SETTLED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'REQUIRES_TAGGING', 'POSTED');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('EMAIL', 'PLAID', 'MERGED', 'MANUAL');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('DEPOSITORY', 'CREDIT', 'INVESTMENT', 'LOAN', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertProvider" AS ENUM ('AMEX', 'CHASE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "IngestStatus" AS ENUM ('PARSED', 'DUPLICATE', 'UNMATCHED_ACCOUNT', 'FAILED');

-- CreateEnum
CREATE TYPE "StatementFormat" AS ENUM ('PDF', 'XLSX', 'CSV');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_members" (
    "circle_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "CircleRole" NOT NULL DEFAULT 'MEMBER',
    "permissions" JSONB NOT NULL DEFAULT '["VIEW_BALANCES", "VIEW_TRANSACTIONS", "EDIT_TAGS"]',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_members_pkey" PRIMARY KEY ("circle_id","user_id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plaid_item_id" TEXT,
    "plaid_account_id" TEXT,
    "plaid_access_token" TEXT,
    "plaid_sync_cursor" TEXT,
    "mask" TEXT,
    "institution_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'OTHER',
    "subtype" TEXT,
    "current_balance" DECIMAL(14,2),
    "available_balance" DECIMAL(14,2),
    "currency_code" TEXT NOT NULL DEFAULT 'USD',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_mappings" (
    "id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last4" TEXT,
    "device_name" TEXT,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "plaid_transaction_id" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "merchant_normalized" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "category" TEXT,
    "card_last4" TEXT,
    "apple_pay_device" TEXT,
    "tagged_owner_id" UUID,
    "split_type" "SplitType",
    "settlement_status" "SettlementStatus" NOT NULL DEFAULT 'NONE',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "circle_id" UUID,
    "settlement_id" UUID,
    "notes" TEXT,
    "pending_plaid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labels" (
    "id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_labels" (
    "transaction_id" UUID NOT NULL,
    "label_id" UUID NOT NULL,

    CONSTRAINT "transaction_labels_pkey" PRIMARY KEY ("transaction_id","label_id")
);

-- CreateTable
CREATE TABLE "holdings" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "security_id" TEXT,
    "symbol" TEXT,
    "name" TEXT,
    "quantity" DECIMAL(18,6) NOT NULL,
    "cost_basis" DECIMAL(14,2),
    "institution_price" DECIMAL(14,4),
    "institution_value" DECIMAL(14,2),
    "as_of" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "net_worth_snapshots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assets" DECIMAL(14,2) NOT NULL,
    "liabilities" DECIMAL(14,2) NOT NULL,
    "net_worth" DECIMAL(14,2) NOT NULL,
    "breakdown" JSONB NOT NULL,

    CONSTRAINT "net_worth_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL,
    "circle_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "unattributed_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "circle_id" UUID,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "format" "StatementFormat" NOT NULL,
    "storage_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "action_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_ingest_events" (
    "id" UUID NOT NULL,
    "provider" "AlertProvider" NOT NULL DEFAULT 'UNKNOWN',
    "from_address" TEXT,
    "subject" TEXT,
    "raw_body" TEXT NOT NULL,
    "body_hash" TEXT NOT NULL,
    "parsed" JSONB,
    "status" "IngestStatus" NOT NULL,
    "error" TEXT,
    "transaction_id" UUID,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_ingest_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "circles_invite_code_key" ON "circles"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_plaid_account_id_key" ON "bank_accounts"("plaid_account_id");

-- CreateIndex
CREATE INDEX "bank_accounts_user_id_idx" ON "bank_accounts"("user_id");

-- CreateIndex
CREATE INDEX "bank_accounts_plaid_item_id_idx" ON "bank_accounts"("plaid_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_mappings_bank_account_id_last4_key" ON "card_mappings"("bank_account_id", "last4");

-- CreateIndex
CREATE UNIQUE INDEX "card_mappings_bank_account_id_device_name_key" ON "card_mappings"("bank_account_id", "device_name");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_plaid_transaction_id_key" ON "transactions"("plaid_transaction_id");

-- CreateIndex
CREATE INDEX "transactions_account_id_date_idx" ON "transactions"("account_id", "date" DESC);

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_circle_id_settlement_status_idx" ON "transactions"("circle_id", "settlement_status");

-- CreateIndex
CREATE INDEX "transactions_merchant_normalized_idx" ON "transactions"("merchant_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "labels_created_by_name_key" ON "labels"("created_by", "name");

-- CreateIndex
CREATE UNIQUE INDEX "holdings_account_id_security_id_key" ON "holdings"("account_id", "security_id");

-- CreateIndex
CREATE INDEX "net_worth_snapshots_user_id_captured_at_idx" ON "net_worth_snapshots"("user_id", "captured_at");

-- CreateIndex
CREATE INDEX "settlements_circle_id_idx" ON "settlements"("circle_id");

-- CreateIndex
CREATE INDEX "statements_user_id_created_at_idx" ON "statements"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_action_key_key" ON "device_tokens"("action_key");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "email_ingest_events_body_hash_idx" ON "email_ingest_events"("body_hash");

-- CreateIndex
CREATE INDEX "email_ingest_events_received_at_idx" ON "email_ingest_events"("received_at");

-- AddForeignKey
ALTER TABLE "circles" ADD CONSTRAINT "circles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_mappings" ADD CONSTRAINT "card_mappings_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_mappings" ADD CONSTRAINT "card_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tagged_owner_id_fkey" FOREIGN KEY ("tagged_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_labels" ADD CONSTRAINT "transaction_labels_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_labels" ADD CONSTRAINT "transaction_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_ingest_events" ADD CONSTRAINT "email_ingest_events_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
