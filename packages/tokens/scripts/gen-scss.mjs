#!/usr/bin/env node
// Regenerate loupe-web's tokens.scss from the @loupe/tokens single source.
// Run via `npm run gen:tokens` (root) or `npm run gen:scss` (this package).
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildScss } from "../src/tokens.js";

const here = dirname(fileURLToPath(import.meta.url));
// packages/tokens/scripts → repo root → loupe-web/src/styles/tokens.scss
const out = resolve(here, "../../../loupe-web/src/styles/tokens.scss");

writeFileSync(out, buildScss(), "utf8");
console.log(`✓ wrote ${out}`);
