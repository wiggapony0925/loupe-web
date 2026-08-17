# trackify — database operations

The schema itself is documented in [`schema.md`](./schema.md) (generated —
`npm run db:docs`). This file covers the operational rules.

## Design rules (enforced in schema.prisma)

- **UUIDs for every primary key** (`@db.Uuid`) — no guessable sequences, no
  merge conflicts between environments.
- **snake_case at the database, camelCase in code** via `@map`/`@@map` on
  every model — one convention per layer, never mixed.
- **3NF with two deliberate denormalizations**, each annotated in-schema:
  `merchantNormalized` (precomputed for fuzzy matching/recurring detection)
  and `plaidSyncCursor` mirrored per account row of an item.
- **NULL ≠ 0** for money: unknown balances stay NULL and are excluded from
  aggregates.
- Indexes exist only for real query paths (feed, ledger, dedup/recurring,
  ingest audit); nothing speculative — writes stay fast.
- **No triggers or stored procedures** — business logic lives in
  `src/services/`, versioned with the app.

## Migrations

Schema changes ship as committed Prisma migrations (`src/models/migrations/`),
applied by CI via a Cloud Run job **before** the new API deploys:

```bash
npx prisma migrate dev --name <change>   # generate locally against dev DB
npx prisma migrate deploy                # what CI runs against Cloud SQL
```

Never `db push` against production.

## Connection pooling

Cloud Run fans out; Cloud SQL has finite `max_connections`. Every
`DATABASE_URL` must carry an explicit small pool:

```
postgresql://trackify_app:…@localhost/trackify?host=/cloudsql/PROJECT:REGION:trackify-pg&connection_limit=5&pool_timeout=10
```

10 instances × 5 connections = 50 — comfortably inside `db-g1-small`'s
budget. Raise instance count before raising per-instance pool size.

## Least privilege

The API never connects as the `postgres` superuser. One-time setup:

```sql
CREATE ROLE trackify_app LOGIN PASSWORD '…';
GRANT CONNECT ON DATABASE trackify TO trackify_app;
GRANT USAGE ON SCHEMA public TO trackify_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO trackify_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trackify_app;
-- Migrations run as a separate role that MAY alter schema:
CREATE ROLE trackify_migrate LOGIN PASSWORD '…' CREATEROLE;
GRANT ALL ON SCHEMA public TO trackify_migrate;
```

`DATABASE_URL` (API, Secret Manager) uses `trackify_app`; the migrate job's
secret uses `trackify_migrate`. No DDL rights on the serving path.

## Environments

Production, staging, and local are **separate Cloud SQL instances/databases**
with separate secrets — never separate schemas in one instance. Local dev
uses Docker Postgres (README) or the scratch instance the integration tests
use.

## Backups — and proving they restore

Cloud SQL automated backups + PITR:

```bash
gcloud sql instances patch trackify-pg --backup-start-time 09:00 \
  --enable-point-in-time-recovery --retained-backups-count 14
```

A backup that has never been restored is a hope, not a backup. Quarterly
drill:

```bash
gcloud sql backups list --instance trackify-pg
gcloud sql instances clone trackify-pg trackify-restore-drill \
  --point-in-time '2026-08-01T00:00:00Z'
# point a local API at the clone, spot-check balances, then delete the clone
```

## Encryption

TLS on every connection (Cloud SQL connector enforces it), disk encryption
on by default in Cloud SQL, and the one application-layer secret — Plaid
access tokens — is AES-256-GCM encrypted with a Secret Manager key before it
touches a row (`utils/crypto.ts`), so a DB dump alone can't reach a bank.
