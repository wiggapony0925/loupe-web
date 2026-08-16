/**
 * Real-time alert-email parser — the Amex/Chase bypass.
 *
 * Plaid posts a transaction up to ~24h after the card sees it; the issuer's
 * alert email arrives in seconds. Users auto-forward those alerts to our
 * ingest address and this module turns the (messy, HTML-ridden) bodies into
 * structured charges.
 *
 * Design rules:
 *  - Pure functions only. No database, no network — everything here is unit
 *    testable with a pasted email body.
 *  - Ordered candidate patterns: labeled fields ("Amount: $12.34") are tried
 *    before sentence forms, loose fallbacks last. Issuers reword templates
 *    without notice; one brittle regex is how ingestion dies silently.
 *  - Parse failures return a reason, never throw — the controller records the
 *    raw body in email_ingest_events so a template change is diagnosable.
 *
 * Formats handled (representative, from real alert templates):
 *  AMEX:
 *   "A charge of $23.45 at STARBUCKS #0921 was approved on your Card ending in 91002."
 *   "Large Purchase Approved: a charge of $1,234.00 at DELTA AIR LINES was just approved…"
 *   "Merchant: UBER EATS\nAmount: $34.20\nDate: Aug 12, 2025\nCard Ending: 91002"
 *   Amex account numbers are 15 digits — authorized-user cards get DISTINCT
 *   endings (4–5 digits captured), which is how we attribute the spender.
 *  CHASE:
 *   "You made a $12.34 transaction with DOORDASH*SUBWAY."
 *   "Your $45.67 card transaction with WHOLEFDS #10203 was approved."
 *   "A $25.00 transaction with LYFT using Apple Pay on Nicol's iPhone was
 *    approved on your card ending in 1234."
 *   Chase authorized users SHARE the card number, so last-4 can't attribute
 *   the spender — the Apple Pay device name (when present) can. Without it
 *   the transaction is flagged REQUIRES_TAGGING downstream.
 */
import { toCents } from '../utils/money';

export type AlertProviderName = 'AMEX' | 'CHASE' | 'UNKNOWN';

export interface AlertEmailInput {
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
  /** When the forwarder received it — the date fallback when the body has none. */
  receivedAt?: Date;
}

export interface ParsedAlert {
  provider: 'AMEX' | 'CHASE';
  merchant: string;
  merchantNormalized: string;
  /** Positive = charge, negative = credit/refund. */
  amountCents: number;
  date: Date;
  cardLast4: string | null;
  /** Chase only: "Nicol's iPhone" parsed from an Apple Pay alert. */
  applePayDevice: string | null;
}

export type ParseResult =
  | { ok: true; alert: ParsedAlert }
  | { ok: false; provider: AlertProviderName; reason: string };

// ── HTML → text ──────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#8217;': '’',
  '&rsquo;': '’',
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
};

/** Good-enough HTML stripper for alert emails; not a general-purpose parser. */
export function htmlToText(html: string): string {
  let out = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
    .replace(/<td[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  for (const [entity, char] of Object.entries(ENTITIES)) {
    out = out.split(entity).join(char);
  }
  out = out.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
  return out
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
    .join('\n')
    .trim();
}

// ── Provider detection ───────────────────────────────────────────────────────

export function detectProvider(input: AlertEmailInput, bodyText: string): AlertProviderName {
  const from = (input.from ?? '').toLowerCase();
  const haystack = `${input.subject ?? ''}\n${bodyText}`.toLowerCase();

  if (from.includes('americanexpress.com') || from.includes('aexp.com')) return 'AMEX';
  if (from.includes('chase.com') || from.includes('jpmchase')) return 'CHASE';
  if (haystack.includes('american express') || /\bamex\b/.test(haystack)) return 'AMEX';
  if (haystack.includes('chase')) return 'CHASE';
  return 'UNKNOWN';
}

// ── Field extraction primitives ──────────────────────────────────────────────

function firstCapture(patterns: RegExp[], text: string): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const captured = match?.[1];
    if (captured !== undefined) {
      const trimmed = captured.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

/** Payment-processor prefixes that hide the real merchant ("SQ *COFFEE CO"). */
const PROCESSOR_PREFIX = /^(?:SQ|TST|PY|PP|PAYPAL|SP|IN|GOOGLE|APL|CKO|ZIP)\s*\*\s*/i;

export function normalizeMerchant(raw: string): string {
  return raw
    .replace(PROCESSOR_PREFIX, '')
    .toUpperCase()
    .replace(/[*_]+/g, ' ')
    .replace(/#\s*\d+/g, ' ') // store numbers: "STARBUCKS #0921"
    .replace(/\.(COM|NET|ORG)\b/g, '')
    .replace(/[^A-Z0-9&' .-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 48)
    .trim();
}

const MONTHS =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

const DATE_PATTERNS: RegExp[] = [
  new RegExp(`(?:^|\\n)\\s*Date:?\\s*(${MONTHS}[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4})`, 'i'),
  /(?:^|\n)\s*Date:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  new RegExp(`\\bon\\s+(${MONTHS}[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4})`, 'i'),
  new RegExp(`(${MONTHS}[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4})`, 'i'),
  /\b(\d{4}-\d{2}-\d{2})\b/,
  /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
];

/**
 * Parses to UTC NOON deliberately: charges carry a calendar date, and noon
 * keeps that date stable across every timezone the server or user is in.
 */
export function parseDateLoose(value: string): Date | null {
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(value.trim());
  if (mdy) {
    const [, m, d, yRaw] = mdy;
    const year = Number(yRaw) < 100 ? 2000 + Number(yRaw) : Number(yRaw);
    const date = new Date(Date.UTC(year, Number(m) - 1, Number(d), 12));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12));
}

function extractDate(text: string, fallback: Date): Date {
  const raw = firstCapture(DATE_PATTERNS, text);
  if (raw) {
    const parsed = parseDateLoose(raw);
    // Alert templates sometimes surface unrelated dates (statement periods,
    // year in a footer). Anything more than 400 days from "now" is noise.
    if (parsed && Math.abs(parsed.getTime() - fallback.getTime()) < 400 * 24 * 3600 * 1000) {
      return parsed;
    }
  }
  return new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate(), 12));
}

// ── Non-charge guards ────────────────────────────────────────────────────────

const NON_CHARGE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /payment\s+(?:received|posted|scheduled|due|thank)/i, reason: 'payment_notification' },
  { pattern: /statement\s+is\s+(?:ready|available)/i, reason: 'statement_notification' },
  { pattern: /(?:security|verification|one[- ]?time)\s+code/i, reason: 'security_code' },
  { pattern: /available\s+credit|balance\s+alert|minimum\s+payment/i, reason: 'balance_notification' },
  { pattern: /was\s+declined|declined\s+(?:transaction|charge)/i, reason: 'declined' },
];

// ── Provider extractors ──────────────────────────────────────────────────────

const AMEX_MERCHANT: RegExp[] = [
  /(?:^|\n)\s*Merchant:?\s*(.{2,80}?)\s*(?:\n|$)/i,
  /(?:charge|purchase|credit|transaction)\s+of\s+\$[\d,]+\.\d{2}\s+(?:at|from)\s+(.{2,60}?)\s+(?:was|has|is|on\s+your)/i,
  /\bat\s+([A-Z0-9][A-Z0-9 .,'&*#/-]{1,60}?)\s+(?:was|has|on)\b/,
];

const AMEX_AMOUNT: RegExp[] = [
  /(?:^|\n)\s*Amount:?\s*\$?\s*(-?[\d,]+\.\d{2})/i,
  /(?:charge|purchase|transaction|credit)\s+of\s+\$\s*([\d,]+\.\d{2})/i,
  /\$\s*([\d,]+\.\d{2})/,
];

const AMEX_CARD: RegExp[] = [
  /(?:^|\n)\s*Card\s*(?:Ending|Number)?:?\s*(?:in\s*)?[*xX•.\- ]*(\d{4,5})\b/i,
  /(?:card|account)\s+ending\s+(?:in\s+)?[*xX•.\- ]*(\d{4,5})\b/i,
];

const CHASE_MERCHANT: RegExp[] = [
  /(?:^|\n)\s*Merchant:?\s*(.{2,80}?)\s*(?:\n|$)/i,
  /(?:transaction|purchase|charge)\s+(?:with|at|to)\s+(.{2,60}?)(?:\s+using|\s+was|\s+on\s|[.,\n]|$)/i,
  /\bwith\s+([A-Z0-9][A-Z0-9 .,'&*#/-]{1,60}?)(?:\s+using|\s+was|\s+on\s|[.,\n]|$)/,
];

const CHASE_AMOUNT: RegExp[] = [
  /(?:^|\n)\s*Amount:?\s*\$?\s*(-?[\d,]+\.\d{2})/i,
  /(?:made\s+a|a|your)\s+\$\s*([\d,]+\.\d{2})\s+(?:transaction|purchase|charge|credit)/i,
  /\$\s*([\d,]+\.\d{2})/,
];

const CHASE_CARD: RegExp[] = [
  /(?:card|account)(?:\s+ending)?(?:\s+in)?\s*\(?\s*(?:\.{2,3}|…|[*xX•]+)?\s*(\d{4})\s*\)?/i,
];

// Optional device-model tail ("iPhone 15 Pro Max") — restricted to real model
// tokens so the capture can't wander into the rest of the sentence.
const DEVICE_MODEL_TAIL = String.raw`(?:\s(?:\d{1,2}|Pro|Max|Plus|Mini|Air|Ultra|SE)){0,3}`;

const CHASE_APPLE_PAY_DEVICE: RegExp[] = [
  // "…using Apple Pay on Nicol's iPhone" / "Apple Pay - Jeff's Apple Watch"
  new RegExp(
    String.raw`Apple\s?Pay[^\n.]{0,40}?(?:\bon\b|[-–—:])\s*["']?([A-Za-z0-9'’ .-]{1,40}?(?:iPhone|iPad|Apple\s?Watch|Mac)${DEVICE_MODEL_TAIL})`,
    'i',
  ),
  new RegExp(
    String.raw`(?:digital\s+wallet|wallet)[^\n.]{0,30}?\bon\s+([^\n.,)]{2,40}?(?:iPhone|iPad|Apple\s?Watch|Mac)${DEVICE_MODEL_TAIL})`,
    'i',
  ),
];

// ── Entry point ──────────────────────────────────────────────────────────────

export function parseAlertEmail(input: AlertEmailInput): ParseResult {
  const bodySource = input.text?.trim() ? input.text : htmlToText(input.html ?? '');
  const text = `${input.subject ?? ''}\n${bodySource}`.trim();
  const provider = detectProvider(input, text);

  if (!text) return { ok: false, provider, reason: 'empty_body' };
  if (provider === 'UNKNOWN') return { ok: false, provider, reason: 'unknown_provider' };

  for (const { pattern, reason } of NON_CHARGE_PATTERNS) {
    if (pattern.test(text)) return { ok: false, provider, reason };
  }

  const merchantRaw = firstCapture(provider === 'AMEX' ? AMEX_MERCHANT : CHASE_MERCHANT, text);
  const amountRaw = firstCapture(provider === 'AMEX' ? AMEX_AMOUNT : CHASE_AMOUNT, text);
  if (!amountRaw) return { ok: false, provider, reason: 'no_amount' };
  if (!merchantRaw) return { ok: false, provider, reason: 'no_merchant' };

  let amountCents: number;
  try {
    amountCents = toCents(amountRaw);
  } catch {
    return { ok: false, provider, reason: 'bad_amount' };
  }
  // "A credit of $12.34" — refunds flow through as negative amounts.
  if (/\bcredit\s+of\b|\brefund\b/i.test(text) && amountCents > 0) {
    amountCents = -amountCents;
  }

  const merchant = merchantRaw.replace(/\s{2,}/g, ' ').trim();
  const merchantNormalized = normalizeMerchant(merchant);
  if (!merchantNormalized) return { ok: false, provider, reason: 'no_merchant' };

  const cardLast4 = firstCapture(provider === 'AMEX' ? AMEX_CARD : CHASE_CARD, text);
  const applePayDevice =
    provider === 'CHASE' ? firstCapture(CHASE_APPLE_PAY_DEVICE, text)?.trim() ?? null : null;

  return {
    ok: true,
    alert: {
      provider,
      merchant,
      merchantNormalized,
      amountCents,
      date: extractDate(text, input.receivedAt ?? new Date()),
      cardLast4,
      applePayDevice,
    },
  };
}
