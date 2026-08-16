/**
 * Application-layer encryption for secrets at rest (Plaid access tokens).
 *
 * AES-256-GCM with a random 96-bit IV per message. The key lives in GCP
 * Secret Manager (`ENCRYPTION_KEY`, 32 bytes base64) — never in the database,
 * so a DB dump alone cannot produce a usable Plaid token.
 *
 * Ciphertext format: `v1:<iv>:<authTag>:<ciphertext>` (base64url segments).
 * The version prefix exists so a future key/algorithm rotation can decrypt
 * old rows instead of orphaning them.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const VERSION = 'v1';
let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not set — generate one with `openssl rand -base64 32`');
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes, got ${buf.length}`);
  }
  cachedKey = buf;
  return buf;
}

/** Test hook: clears the cached key after process.env changes. */
export function resetCryptoKeyCache(): void {
  cachedKey = null;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

export function decrypt(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(':');
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Unrecognized ciphertext format');
  }
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]).toString('utf8');
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Constant-time string comparison for webhook shared secrets. `===` leaks the
 * mismatch position through timing; this doesn't.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
