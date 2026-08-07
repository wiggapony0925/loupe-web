/**
 * Bundled legal corpus — the copy a reader sees while the live one loads, or
 * if it never arrives.
 *
 * The published documents are served from `/v1/public/legal/*` so counsel can
 * edit them from the developer portal without a deploy. The live copy always
 * wins. But these URLs are cited in the App Store listing, in transactional
 * email, and inside the apps: **a Terms of Service that renders an error is a
 * Terms of Service that does not exist.** So the checked-in corpus ships in
 * the bundle too, and the page degrades to it instead of to a spinner.
 *
 * `legalCorpus.generated.json` is written by `npm run gen:legal` from the
 * backend's `legal_documents.json`. Never hand-edit it.
 */
import type { LegalDocumentRead, LegalIndexEntry } from "@loupe/core";
import corpus from "./legalCorpus.generated.json";

interface RawSection {
  id: string;
  heading: string;
  body: string;
}
interface RawDocument {
  slug: string;
  title: string;
  lead: string;
  effective: string;
  updated: string;
  summary: string[];
  sections: RawSection[];
}

const ENTITY = corpus.entity as Record<string, string>;
const DOCUMENTS = corpus.documents as RawDocument[];

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

/** Resolve `{{token}}` against the entity block, leaving unknown tokens
 *  visible — a stray `{{typo}}` is a bug report; a silently blank company
 *  name in a contract is a liability. Mirrors the backend's rule exactly. */
function interpolate(text: string): string {
  return text.replace(PLACEHOLDER, (match, key: string) => ENTITY[key] ?? match);
}

/** The whole document as one Markdown string — mirrors the backend's
 *  `_document_markdown`, so the fallback and the live copy render identically. */
function toMarkdown(doc: RawDocument): string {
  const parts = [`# ${doc.title}`];
  if (doc.lead) parts.push(`_${doc.lead}_`);
  parts.push(`**Last updated:** ${doc.updated}  \n**Effective:** ${doc.effective}`);
  if (doc.summary.length) {
    parts.push("## In short");
    parts.push(doc.summary.map((line) => `- ${line}`).join("\n"));
  }
  for (const section of doc.sections) {
    parts.push(`## ${section.heading}`);
    parts.push(section.body);
  }
  return parts.join("\n\n");
}

function render(doc: RawDocument): LegalDocumentRead {
  const resolved: RawDocument = {
    slug: doc.slug,
    title: interpolate(doc.title),
    lead: interpolate(doc.lead),
    effective: doc.effective,
    updated: doc.updated,
    summary: doc.summary.map(interpolate),
    sections: doc.sections.map((s) => ({
      id: s.id,
      heading: interpolate(s.heading),
      body: interpolate(s.body),
    })),
  };
  return { ...resolved, markdown: toMarkdown(resolved) };
}

/** Rendered once, in the order counsel intends them read. */
const RENDERED: LegalDocumentRead[] = DOCUMENTS.map(render);

const BY_SLUG = new Map(RENDERED.map((doc) => [doc.slug, doc]));

/** Every slug in the bundled corpus. */
export const FALLBACK_SLUGS: string[] = RENDERED.map((d) => d.slug);

/** The bundled copy of one document, or null if the slug is unknown. */
export function fallbackDocument(slug: string): LegalDocumentRead | null {
  return BY_SLUG.get(slug) ?? null;
}

/** The bundled index, shaped like the API's. */
export function fallbackIndex(): LegalIndexEntry[] {
  return RENDERED.map(({ slug, title, lead, effective, updated }) => ({
    slug,
    title,
    lead,
    effective,
    updated,
  }));
}
