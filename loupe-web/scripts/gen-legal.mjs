#!/usr/bin/env node
/**
 * Vendor the backend's legal corpus into the web bundle.
 *
 * The published Terms, Privacy Policy, and friends are served live from
 * `/v1/public/legal/*` so counsel can edit them from the portal without a
 * deploy. But a legal page that renders an error when the API is unreachable
 * is a legal page that does not exist — and these URLs are cited in the App
 * Store listing, in transactional email, and in the apps themselves.
 *
 * So we also bundle the checked-in corpus as a fallback. The live copy always
 * wins; this is only what a reader sees while it loads, or if it never
 * arrives.
 *
 * Run `npm run gen:legal` after editing the backend JSON. Like `gen:tokens`,
 * the output is generated and committed — never hand-edited.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(
  here,
  "../../loupe-backend/app/services/legal/legal_documents.json",
);
const OUT = resolve(here, "../src/features/site/Legal/legalCorpus.generated.json");

let raw;
try {
  raw = readFileSync(SOURCE, "utf8");
} catch (err) {
  console.error(`gen:legal — cannot read the backend corpus at:\n  ${SOURCE}\n`);
  console.error(
    "Run this from a checkout that has loupe-backend alongside loupe-web.",
  );
  console.error(String(err.message ?? err));
  process.exit(1);
}

const corpus = JSON.parse(raw);

if (!Array.isArray(corpus.documents) || corpus.documents.length === 0) {
  console.error("gen:legal — corpus has no documents; refusing to write.");
  process.exit(1);
}

// Drop the file-level comment; keep exactly what the client renders.
const payload = {
  version: corpus.version,
  entity: corpus.entity,
  documents: corpus.documents,
};

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

const sections = corpus.documents.reduce((n, d) => n + d.sections.length, 0);
console.log(
  `gen:legal — wrote ${corpus.documents.length} documents (${sections} sections) to`,
);
console.log(`  ${OUT}`);
