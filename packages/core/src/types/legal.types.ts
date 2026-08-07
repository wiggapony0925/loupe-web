/**
 * Legal document types — the public `/legal/*` pages and the `/admin/legal`
 * ("Law") control surface.
 *
 * Mirrors the backend `app/schemas/legal.py`: a checked-in JSON corpus
 * (`legal_documents.json`) merged with the operator's live kv_cache overrides.
 * Section bodies are GitHub-flavoured Markdown. On the public read models every
 * `{{placeholder}}` has already been resolved server-side against the shared
 * entity block, so a client only has to render.
 */

/** One numbered clause. `body` is Markdown. */
export interface LegalSection {
  id: string;
  heading: string;
  body: string;
}

/** A whole document — the unit an operator edits and a reader reads. */
export interface LegalDocument {
  slug: string;
  title: string;
  lead: string;
  /** ISO date the document takes effect. */
  effective: string;
  /** ISO date it was last revised. */
  updated: string;
  /** Plain-English "what this means" bullets shown above the legal text. */
  summary: string[];
  sections: LegalSection[];
}

/** A published document, placeholders resolved. */
export interface LegalDocumentRead extends LegalDocument {
  /** The whole document as one Markdown string, for blob renderers. */
  markdown: string;
}

export interface LegalIndexEntry {
  slug: string;
  title: string;
  lead: string;
  effective: string;
  updated: string;
}

export interface LegalIndex {
  documents: LegalIndexEntry[];
  /** The most recent `updated` date across the corpus. */
  updated: string;
}

/** A merged document annotated for the portal. Bodies are RAW (not
 *  interpolated) so the editor round-trips `{{placeholders}}` intact. */
export interface AdminLegalDocument extends LegalDocument {
  /** "file" = checked-in corpus entry; "custom" = operator-authored. */
  origin: "file" | "custom";
  /** A file document with a live operator override on it. */
  edited: boolean;
  /** A retired file document — listed (restorable) but never served. */
  removed: boolean;
}

/** Everything the /admin/legal page renders in one call. */
export interface AdminLegalView {
  /** Effective entity (file + overrides) — what placeholders resolve against. */
  entity: Record<string, string>;
  /** The checked-in entity, so the portal can show and restore defaults. */
  fileEntity: Record<string, string>;
  documents: AdminLegalDocument[];
  /** True when any override is live (entity patch, edit, or tombstone). */
  dirty: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}
