# trackify

**Real-time shared financial tracker** · JFM Capital Group LLC

Charges appear in the feed **seconds after the card is swiped** (forwarded
Amex/Chase alert emails, not Plaid's 24-hour lag), get tagged from the lock
screen — `[Mine]` `[Nicol's]` `[Shared 50/50]` `[Owed]` — and roll up into a
live who-owes-whom ledger, a net-worth chart, an excel-style combined sheet,
and exportable statements.

Monochrome Square-style UI. One web codebase, bundled into iOS/Android with
Capacitor (the Chase-app model). Node/Express + Prisma + Cloud SQL on Cloud
Run, Firebase SMS OTP auth, GCP Secret Manager.

```
┌─ alert email (Amex/Chase) ──► /v1/webhooks/email/inbound ─┐   push ► 📱 tag it
│                                regex parse → card match → ├──► transactions
└─ Plaid webhook (≤24h later) ► /v1/webhooks/plaid ─────────┘        │
                                 fuzzy merge (amount+date+merchant)  ▼
   Robinhood / banks / cards ──► Plaid Link ──► balances+holdings ► net worth
                                                          tagged ► settlement engine
                                                                 ► ledger / exports
```

## Repo layout

```
trackify/
├── .github/workflows/google-cloud-run-deploy.yml   # test → build → migrate → deploy → smoke
├── backend/                    # Node 22 + Express + Prisma (PostgreSQL)
│   └── src/
│       ├── config/             # env.ts (refuse-to-boot validation), secretManager.ts, db.ts
│       ├── controllers/        # webhook, transaction, account, circle, ledger, networth, export…
│       ├── middleware/         # verifyFirebaseToken, requireAuth (+circle RBAC), errors, rate limits
│       ├── models/schema.prisma
│       ├── services/           # emailParser, transactionMatcher, settlementEngine, plaid,
│       │                       # netWorth, push, export (xlsx/csv), statement (pdf), googleSheets
│       └── utils/              # money (integer cents), crypto (AES-256-GCM), rbac, envelope, logger
└── frontend/                   # React + Vite + strict BEM SCSS + Zustand + Capacitor
    └── src/
        ├── components/         # BottomSheet, TransactionRow, TagSheet, NetWorthChart, SheetGrid…
        ├── pages/              # Home, Feed, Sheet, Ledger, Circles, Auth
        ├── store/useLedgerStore.ts
        ├── hooks/              # useHaptics, usePushNotifications
        ├── styles/             # main.scss + Square tokens (BEM partials co-located w/ components)
        └── types/              # schemas.ts (zod) + types.d.ts (strict inference)
```

House rules (inherited from the loupe services):

- **Response envelope** everywhere: `{ data, meta, error }`, dot-namespaced
  error codes (`auth.invalid_token`, `settlement.nothing_owed`) — clients
  branch on `code`, never message text.
- **Integer cents** for all money math; Prisma `Decimal` at rest; floats only
  at the JSON boundary.
- **Unknown ≠ 0**: a missing balance is `NULL`/`null`/`—`, never `$0.00`.
- Routers are transport; `services/` own the logic; comments explain the
  failure they prevent.

## Feature map

| Feature | Where |
|---|---|
| Real-time email ingestion (Amex last-4 → person; Chase Apple-Pay device → person; else `REQUIRES_TAGGING`) | `backend/src/services/emailParser.ts`, `controllers/webhookController.ts` |
| Plaid ↔ email fuzzy merge (exact amount, ±3 days, merchant similarity) | `backend/src/services/transactionMatcher.ts` |
| Circles + granular RBAC (`VIEW_BALANCES`, `VIEW_TRANSACTIONS`, `EDIT_TAGS`, `ADMIN`) | `circleController.ts`, `utils/rbac.ts` |
| Settlement engine (50/50 splits, penny-exact, minimal-transfer suggestions, settle→confirm) | `services/settlementEngine.ts` |
| Net worth + history chart (write-on-read snapshots, Robinhood-style scrubber) | `services/netWorthService.ts`, `frontend/.../NetWorthChart` |
| Account linking incl. Robinhood/brokerages (Plaid Investments) | `services/plaidService.ts` |
| Excel-style combined sheet (my business + personal + Nicol's shared, labels, sort, totals) | `frontend/src/pages/Sheet.tsx`, `SheetGrid` |
| Exports: `.xlsx`, CSV, PDF statement, real Google Sheet | `services/exportService.ts`, `statementService.ts`, `googleSheetsService.ts` |
| Labels | `labelController.ts` |
| Push → tag from lock screen | `services/pushService.ts`, `frontend/src/hooks/usePushNotifications.ts` |

## Local development

```bash
# 1. Postgres
docker run -d --name trackify-pg -p 5432:5432 \
  -e POSTGRES_USER=trackify -e POSTGRES_PASSWORD=trackify -e POSTGRES_DB=trackify \
  postgres:16

# 2. Backend
cd backend
cp .env.example .env            # fill ENCRYPTION_KEY (openssl rand -base64 32), Firebase, Plaid sandbox
npm install
npx prisma migrate dev          # creates the schema
npm run dev                     # :8080

# 3. Frontend
cd ../frontend
cp .env.example .env.local      # Firebase web config
npm install
npm run dev                     # :5173, /v1 proxied to :8080
```

Test an ingestion locally (no email pipeline needed):

```bash
curl -s "http://localhost:8080/v1/webhooks/email/inbound?token=$EMAIL_WEBHOOK_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"from":"no.reply.alerts@chase.com","subject":"Transaction alert",
       "text":"A $25.00 transaction with LYFT using Apple Pay on Nicol'\''s iPhone was approved on your card ending in 1234."}'
```

`npm test` in `backend/` runs the parser/settlement/matcher unit suites.

## Mobile (Capacitor)

```bash
cd frontend
npm run build
npx cap add ios && npx cap add android   # first time only
npx cap sync
npx cap open ios                         # Xcode → run
```

- Push: add the iOS app in Firebase (bundle id `com.jfmcapital.trackify`),
  upload the APNs key, drop `GoogleService-Info.plist` into the iOS project.
  Android: `google-services.json`.
- Firebase phone auth inside the webview uses invisible reCAPTCHA; add your
  domains (incl. `localhost`) to Firebase Auth → Authorized domains.

## Deploy (GCP, one-time bootstrap via gcloud CLI)

```bash
PROJECT=trackify-jfm REGION=us-central1
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  secretmanager.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com cloudscheduler.googleapis.com sheets.googleapis.com \
  drive.googleapis.com --project $PROJECT

# Cloud SQL (PostgreSQL 16)
gcloud sql instances create trackify-pg --project $PROJECT --region $REGION \
  --database-version POSTGRES_16 --tier db-g1-small
gcloud sql databases create trackify --instance trackify-pg --project $PROJECT
gcloud sql users create trackify --instance trackify-pg --password "$(openssl rand -hex 16)" --project $PROJECT

# Secrets (repeat for each)
printf '%s' "postgresql://trackify:PASS@localhost/trackify?host=/cloudsql/$PROJECT:$REGION:trackify-pg&connection_limit=5" \
  | gcloud secrets create DATABASE_URL --data-file=- --project $PROJECT
openssl rand -base64 32 | tr -d '\n' | gcloud secrets create ENCRYPTION_KEY --data-file=- --project $PROJECT
openssl rand -hex 24   | tr -d '\n' | gcloud secrets create EMAIL_WEBHOOK_TOKEN --data-file=- --project $PROJECT
openssl rand -hex 24   | tr -d '\n' | gcloud secrets create CRON_KEY --data-file=- --project $PROJECT
# + PLAID_CLIENT_ID, PLAID_SECRET

gcloud artifacts repositories create trackify --repository-format docker \
  --location $REGION --project $PROJECT
```

Then set the GitHub Actions variables listed at the top of
`.github/workflows/google-cloud-run-deploy.yml` (Workload Identity Federation
setup: `gcloud iam workload-identity-pools create github …`) and push to
`main` — the workflow tests, builds, **migrates**, deploys, and smoke-tests
`/healthz` in that order.

Daily net-worth snapshot (belt-and-suspenders next to write-on-read):

```bash
gcloud scheduler jobs create http trackify-snapshot --project $PROJECT --location $REGION \
  --schedule "0 13 * * *" --uri "https://<cloud-run-url>/v1/internal/cron/snapshot" \
  --http-method POST --headers "X-Cron-Key=<CRON_KEY value>"
```

### Email forwarding (the real-time engine)

1. Point an inbound-parse host (SendGrid Inbound Parse or a Mailgun route) at
   `https://<api>/v1/webhooks/email/inbound?token=<EMAIL_WEBHOOK_TOKEN>`.
2. In Amex: enable purchase alerts for **every authorized user card**. In
   Chase: enable transaction alerts. Auto-forward those alert emails (Gmail
   filter → forward) to the inbound-parse address.
3. In trackify → account → **card mappings**: map Amex last-4s to people, and
   Chase Apple Pay device names ("Nicol's iPhone") to people. Unmappable
   Chase charges arrive flagged **NEEDS TAG** — one tap fixes them.

Every inbound email is archived in `email_ingest_events` with its parse
result, so a template change by an issuer is diagnosable after the fact.

## Docs

- `docs/adr/0001-node-over-spring-boot.md` — why the backend is Node/Express
  rather than Spring Boot.
