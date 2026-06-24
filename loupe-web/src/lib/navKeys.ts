/**
 * Nav keys — portable "where was I headed, and what was I doing?" tokens.
 *
 * When a guest hits an authenticated surface (a secured page, or a sign-in-gated
 * action on a public card), we mint a **nav key**: a compact, URL-safe token that
 * captures the destination, the action they intended (the *intent*), the card
 * they were looking at, and — optionally — the user it was minted for. The key
 * rides on the login URL as `?k=…` (and is mirrored to sessionStorage), so the
 * intent survives a full reload and an OAuth round-trip. After sign-in we decode
 * it, send the user exactly where they were headed, and resume what they were
 * about to do.
 *
 * This is a UX convenience, NOT a security boundary — the real gate is
 * `RequireAuth` + the backend's 401s. The checksum here only guards against
 * casual corruption so the dev tool can report a key as "tampered" vs "valid".
 */

const VERSION = 1;
/** Keys older than this are treated as stale and ignored on resolve. */
export const NAV_KEY_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Query-string param the login/signup pages read the key from. */
export const NAV_KEY_PARAM = "k";
/** Search param a destination page reads to auto-resume a gated action. */
export const RESUME_PARAM = "resume";
/** sessionStorage backup, in case the `?k=` param is dropped mid-flow. */
const PENDING_KEY = "loupe.navkey.pending";
/** sessionStorage ring buffer of recently-minted keys (powers the dev tool). */
const LOG_KEY = "loupe.navkey.log";
const LOG_MAX = 25;

/** Known intents — what the user was about to do when we intercepted them. */
export type NavIntent =
  | "page" // just open an authenticated page
  | "collection.add" // open the add-to-collection form on a card
  | "watchlist.add" // pin the card to the watchlist
  | "alert.set"; // open the price-alert sheet on a card

export interface NavCardRef {
  id: string;
  title?: string;
}

/** The decoded, human-friendly shape of a nav key. */
export interface NavKey {
  v: number;
  /** In-app path to land on after auth (e.g. `/cards/abc?resume=watchlist.add`). */
  to: string;
  /** What to resume once we're back. */
  intent: NavIntent;
  /** The card in context, when the key was minted from a card surface. */
  card?: NavCardRef;
  /** User id the key was minted for (informational / analytics / dev testing). */
  uid?: string;
  /** Where the key was minted (route guard, gate button, dev tool…). */
  src?: string;
  /** Minted-at epoch ms. */
  ts: number;
}

/** What a caller supplies to {@link mintNavKey} — `ts` is filled in for them. */
export type NavKeyInput = Omit<NavKey, "v" | "ts"> & { ts?: number };

// ── base64url (utf8-safe, no Buffer) ───────────────────────────────────────

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 === 0 ? "" : "=".repeat(4 - (norm.length % 4));
  const bin = atob(norm + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Tiny FNV-1a → base36. Not crypto — just an integrity check for the token. */
function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// The on-the-wire payload uses short field names to keep URLs tidy.
interface Wire {
  v: number;
  t: string;
  i: NavIntent;
  c?: NavCardRef;
  u?: string;
  s?: string;
  x: number; // ts
}

function toWire(k: NavKey): Wire {
  return { v: k.v, t: k.to, i: k.intent, c: k.card, u: k.uid, s: k.src, x: k.ts };
}

function fromWire(w: Wire): NavKey {
  return { v: w.v, to: w.t, intent: w.i, card: w.c, uid: w.u, src: w.s, ts: w.x };
}

// ── mint / encode / decode ──────────────────────────────────────────────────

/** Stamp an input into a complete {@link NavKey} (fills version + timestamp). */
export function mintNavKey(input: NavKeyInput): NavKey {
  return { v: VERSION, ts: input.ts ?? Date.now(), ...input };
}

/** Serialize a nav key into a compact, URL-safe `payload.checksum` token. */
export function encodeNavKey(key: NavKey): string {
  const payload = b64urlEncode(JSON.stringify(toWire(key)));
  return `${payload}.${checksum(payload)}`;
}

/**
 * Parse a token back into a nav key. Returns `null` when the token is malformed,
 * fails its checksum (corrupt/tampered), is the wrong version, or has expired.
 * Pass `{ ignoreExpiry }` for the dev tool, which wants to inspect stale keys.
 */
export function decodeNavKey(
  token: string | null | undefined,
  opts: { ignoreExpiry?: boolean; now?: number } = {},
): NavKey | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sum = token.slice(dot + 1);
  if (checksum(payload) !== sum) return null; // corrupt or edited
  let wire: Wire;
  try {
    wire = JSON.parse(b64urlDecode(payload)) as Wire;
  } catch {
    return null;
  }
  if (wire?.v !== VERSION || typeof wire.t !== "string") return null;
  // `to` must be an in-app path — never an absolute/protocol-relative URL, so a
  // crafted key can't bounce a user off-site after login (open-redirect guard).
  if (!wire.t.startsWith("/") || wire.t.startsWith("//")) return null;
  const key = fromWire(wire);
  if (!opts.ignoreExpiry) {
    const now = opts.now ?? Date.now();
    if (now - key.ts > NAV_KEY_TTL_MS) return null;
  }
  return key;
}

/** Build the login URL that carries a freshly-minted nav key. */
export function navKeyLoginUrl(key: NavKey, path = "/login"): string {
  return `${path}?${NAV_KEY_PARAM}=${encodeURIComponent(encodeNavKey(key))}`;
}

// ── sessionStorage: pending key + mint log ─────────────────────────────────

function safeSession(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Stash the pending key so it survives a dropped `?k=` param (OAuth bounce). */
export function stashPendingKey(token: string): void {
  safeSession()?.setItem(PENDING_KEY, token);
}

/** Read (without clearing) the pending key token, if any. */
export function peekPendingKey(): string | null {
  return safeSession()?.getItem(PENDING_KEY) ?? null;
}

/** Read and clear the pending key — call once it's been consumed on resolve. */
export function takePendingKey(): string | null {
  const s = safeSession();
  if (!s) return null;
  const v = s.getItem(PENDING_KEY);
  if (v) s.removeItem(PENDING_KEY);
  return v;
}

export interface MintLogEntry {
  token: string;
  key: NavKey;
  at: number;
}

/** Record a minted key in the session ring buffer (newest first). */
export function logMintedKey(key: NavKey, token: string): void {
  const s = safeSession();
  if (!s) return;
  try {
    const log = readMintLog();
    log.unshift({ token, key, at: Date.now() });
    s.setItem(LOG_KEY, JSON.stringify(log.slice(0, LOG_MAX)));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

/** Read the session mint log (newest first). Powers the dev tool's history. */
export function readMintLog(): MintLogEntry[] {
  const s = safeSession();
  if (!s) return [];
  try {
    const raw = s.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as MintLogEntry[]) : [];
  } catch {
    return [];
  }
}

/** Clear the session mint log. */
export function clearMintLog(): void {
  safeSession()?.removeItem(LOG_KEY);
}

// ── catalog: every nav key the app can mint ────────────────────────────────

/** A param a {@link NavTarget} needs the dev tool to collect. */
export type NavParam = "card" | "path";

export interface NavTarget {
  /** Stable id, also the intent for action targets. */
  id: string;
  label: string;
  description: string;
  /** Does reaching this destination require the user to be signed in? */
  requiresAuth: boolean;
  /** lucide icon name, resolved to a component by the dev tool. */
  icon: string;
  /** Inputs the dev tool should collect to build this key. */
  params: NavParam[];
  /** Build `{ to, intent }` from collected params. */
  build: (p: { cardId?: string; path?: string }) => { to: string; intent: NavIntent };
}

/**
 * Append `?resume=<intent>` so the destination page can auto-resume the action.
 * Idempotent — a path that already carries the same resume param is unchanged.
 */
export function withResumeParam(path: string, intent: NavIntent): string {
  if (new RegExp(`[?&]${RESUME_PARAM}=${intent}(&|$)`).test(path)) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${RESUME_PARAM}=${intent}`;
}

/**
 * The catalog of nav keys the app knows how to mint. The route guard and the
 * gate buttons reference these by id; the dev tool renders the whole list and
 * lets you build + test any of them.
 */
export const NAV_TARGETS: NavTarget[] = [
  {
    id: "page",
    label: "Open a page",
    description:
      "A guest deep-linked to (or got bounced from) an authenticated page. After sign-in we drop them right back on it.",
    requiresAuth: true,
    icon: "LayoutDashboard",
    params: ["path"],
    build: ({ path }) => ({ to: path || "/app", intent: "page" }),
  },
  {
    id: "collection.add",
    label: "Add to collection",
    description:
      "Guest tapped “Add to collection” on a card. After sign-in we return to the card and open the add form.",
    requiresAuth: true,
    icon: "Plus",
    params: ["card"],
    build: ({ cardId }) => ({
      to: withResumeParam(`/cards/${cardId ?? ":id"}`, "collection.add"),
      intent: "collection.add",
    }),
  },
  {
    id: "watchlist.add",
    label: "Add to watchlist",
    description:
      "Guest tapped “Add to watchlist” on a card. After sign-in we return to the card and pin it.",
    requiresAuth: true,
    icon: "Heart",
    params: ["card"],
    build: ({ cardId }) => ({
      to: withResumeParam(`/cards/${cardId ?? ":id"}`, "watchlist.add"),
      intent: "watchlist.add",
    }),
  },
  {
    id: "alert.set",
    label: "Set price alert",
    description:
      "Guest tapped “Set price alert” on a card. After sign-in we return to the card and open the alert sheet.",
    requiresAuth: true,
    icon: "Bell",
    params: ["card"],
    build: ({ cardId }) => ({
      to: withResumeParam(`/cards/${cardId ?? ":id"}`, "alert.set"),
      intent: "alert.set",
    }),
  },
];

/** Look up a catalog entry by id. */
export function navTargetById(id: string): NavTarget | undefined {
  return NAV_TARGETS.find((t) => t.id === id);
}
