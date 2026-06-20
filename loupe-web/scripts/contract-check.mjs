#!/usr/bin/env node
/**
 * API contract check.
 *
 * Verifies the web client's contract with loupe-backend two ways:
 *   1. Every endpoint the web calls (from packages/core endpoints.ts) MUST
 *      exist in the backend's live OpenAPI schema. A mismatch = a broken
 *      call shipped to users → the check fails (exit 1).
 *   2. Reports backend coverage — which backend endpoints the web does and
 *      doesn't consume — so we can see, at a glance, that the web is wired
 *      to the surfaces it should be (and which are mobile-only).
 *
 * Run: `npm run test:contract`   (override target with API_BASE=...)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_BASE = process.env.API_BASE || "https://loupe-api-714615078104.us-central1.run.app";

// Paths the web references that are intentionally not in the OpenAPI schema
// (infra/health endpoints served outside the documented API surface).
const ALLOW_NOT_IN_SCHEMA = new Set(["/health", "/version"]);

/** Collapse path params to `*` and drop any query string, so a web template
 *  (`/v1/cards/*`) and an OpenAPI template (`/v1/cards/{card_id}`) compare equal. */
function normalize(path) {
  return path
    .split("?")[0]
    .split("/")
    .map((seg) => (seg === "*" || /^\{.*\}$/.test(seg) || seg === "_PARAM_" ? "*" : seg))
    .join("/");
}

/** Extract every API path the web client references from endpoints.ts text.
 *
 *  We text-parse (no TS runtime needed): substitute `${V1}` → /v1, then collapse
 *  every remaining `${…}` interpolation — including nested template literals like
 *  prices' `?range=${range}` — to a NUL marker via a fixed-point pass. A NUL that
 *  is a whole path segment is a path param (`→ *`); a NUL glued to a segment is an
 *  optional query suffix (dropped). Finally we pull tokens under the API roots. */
function collectWebPaths() {
  const file = resolve(__dirname, "../../packages/core/src/endpoints.ts");
  let src = readFileSync(file, "utf8");

  src = src.replace(/\$\{\s*V1\s*\}/g, "/v1");
  let prev;
  do {
    prev = src;
    src = src.replace(/\$\{[^${}]*\}/g, "\x00"); // collapse innermost interpolations
  } while (src !== prev);

  const paths = new Set();
  for (const m of src.matchAll(/\/(?:v1|health|version)[A-Za-z0-9_\-/{}.\x00]*/g)) {
    let token = m[0]
      .replace(/([^/])\x00+/g, "$1") // drop query-string interpolations glued to a segment
      .replace(/\x00/g, "*"); // remaining markers are path params
    token = normalize(token);
    if (token !== "/v1") paths.add(token); // ignore the bare V1 constant
  }
  return paths;
}

async function fetchBackendPaths() {
  const res = await fetch(`${API_BASE}/openapi.json`);
  if (!res.ok) throw new Error(`openapi.json → HTTP ${res.status}`);
  const doc = await res.json();
  const set = new Set();
  for (const p of Object.keys(doc.paths || {})) set.add(normalize(p));
  return set;
}

const web = collectWebPaths();
const backend = await fetchBackendPaths();

// (1) Contract: every web path must exist in the backend schema.
const missing = [...web].filter((p) => !backend.has(p) && !ALLOW_NOT_IN_SCHEMA.has(p));

// (2) Coverage: which backend paths the web consumes.
const consumed = [...backend].filter((p) => web.has(p));
const unused = [...backend].filter((p) => !web.has(p)).sort();

console.log(`\nAPI contract check  (backend: ${API_BASE})`);
console.log("─".repeat(60));
console.log(`web endpoints referenced : ${web.size}`);
console.log(`backend endpoints (schema): ${backend.size}`);
console.log(`consumed by web          : ${consumed.length}`);
console.log(`not consumed by web      : ${unused.length}  (mobile-only / server-internal)`);

if (unused.length) {
  console.log("\nBackend endpoints the web does not call:");
  for (const p of unused) console.log(`  · ${p}`);
}

if (missing.length) {
  console.error("\n✗ CONTRACT VIOLATION — web calls endpoints absent from the backend schema:");
  for (const p of missing) console.error(`  ✗ ${p}`);
  console.error("\nFix endpoints.ts (or the backend route) so the contract matches.\n");
  process.exit(1);
}

console.log("\n✓ Every endpoint the web client calls exists in the backend API.\n");
