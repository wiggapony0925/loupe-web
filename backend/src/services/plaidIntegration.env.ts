/**
 * Env bootstrap for the Plaid integration test — imported FIRST so these are
 * set before config/db and config/env evaluate. Activates only when
 * TEST_DATABASE_URL is provided (a scratch Postgres); CI without one skips.
 */
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.ENCRYPTION_KEY = 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY='; // 32 bytes, test-only
  process.env.PLAID_CLIENT_ID = 'test-client';
  process.env.PLAID_SECRET = 'test-secret';
  process.env.PLAID_BASE_URL = 'http://127.0.0.1:46123';
  process.env.FIREBASE_PROJECT_ID = 'trackify-test';
  process.env.NODE_ENV = 'test';
}
export {};
