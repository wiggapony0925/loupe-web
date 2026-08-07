import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useLegalDocument, useLegalIndex, type LegalDocumentRead } from "@loupe/core";
import { Markdown } from "@/components";
import { SitePage } from "../SitePage/SitePage";
import { fallbackDocument, fallbackIndex } from "./legalFallback";
import styles from "./Legal.module.scss";

/** Long-form legal date, e.g. "August 7, 2026". Falls back to the raw string
 *  rather than rendering "Invalid Date" on a hand-edited value. */
function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** The other documents, for the switcher. Uses the live index when it has
 *  arrived and the bundled one before that, so the rail never pops in. */
function useDocumentRail(): { slug: string; title: string }[] {
  const { data } = useLegalIndex();
  return useMemo(
    () => (data?.documents ?? fallbackIndex()).map((d) => ({ slug: d.slug, title: d.title })),
    [data],
  );
}

/** Index of every published document — `/legal`. */
function LegalIndexPage() {
  const { data } = useLegalIndex();
  const documents = data?.documents ?? fallbackIndex();

  return (
    <SitePage
      eyebrow="Legal"
      title="Terms, privacy, and the rest"
      lead="Everything that governs your use of Loupe, written to be read rather than skimmed past."
    >
      <ul className={styles.index}>
        {documents.map((doc) => (
          <li key={doc.slug}>
            <Link to={`/legal/${doc.slug}`} className={styles.index__card}>
              <h2 className={styles.index__title}>{doc.title}</h2>
              <p className={styles.index__lead}>{doc.lead}</p>
              <p className={styles.index__meta}>Last updated {formatDate(doc.updated)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </SitePage>
  );
}

/** One legal document — `/legal/:doc`. */
function LegalDocumentPage({ slug }: { slug: string }) {
  const { data, isLoading } = useLegalDocument(slug);
  const bundled = useMemo(() => fallbackDocument(slug), [slug]);
  const rail = useDocumentRail();

  // Live copy wins; the bundled corpus covers the load and any API outage.
  const doc: LegalDocumentRead | null = data ?? bundled;

  if (!doc) {
    // Nothing bundled under this slug. Wait for the API before deciding —
    // a document added from the portal exists live but not in the bundle.
    if (isLoading) return <SitePage title="Legal" lead="Loading…" />;
    return <Navigate to="/legal" replace />;
  }

  return (
    <SitePage
      eyebrow={`Last updated ${formatDate(doc.updated)}`}
      title={doc.title}
      lead={doc.lead}
    >
      <nav className={styles.rail} aria-label="Legal documents">
        {rail.map((entry) => (
          <Link
            key={entry.slug}
            to={`/legal/${entry.slug}`}
            className={styles.rail__item}
            aria-current={entry.slug === slug ? "page" : undefined}
          >
            {entry.title}
          </Link>
        ))}
      </nav>

      {doc.summary.length > 0 && (
        <aside className={styles.summary} aria-labelledby="legal-summary">
          <h2 id="legal-summary" className={styles.summary__title}>
            In short
          </h2>
          <ul className={styles.summary__list}>
            {doc.summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className={styles.summary__note}>
            This summary is for orientation only. The numbered sections below are the
            agreement.
          </p>
        </aside>
      )}

      <div className={styles.body}>
        {doc.sections.length > 1 && (
          <nav className={styles.toc} aria-label="Contents">
            <p className={styles.toc__title}>Contents</p>
            <ol className={styles.toc__list}>
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.heading}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <article className={styles.doc}>
          {doc.sections.map((section) => (
            <section key={section.id} id={section.id} className={styles.doc__section}>
              <h2 className={styles.doc__heading}>
                <a href={`#${section.id}`} className={styles.doc__anchor}>
                  {section.heading}
                </a>
              </h2>
              <Markdown internalLinks>{section.body}</Markdown>
            </section>
          ))}

          <p className={styles.doc__effective}>
            Effective {formatDate(doc.effective)} · Last updated {formatDate(doc.updated)}
          </p>
        </article>
      </div>
    </SitePage>
  );
}

/** Legal documents — the index at `/legal` and one page per `:doc`. */
export function Legal() {
  const { doc } = useParams<{ doc: string }>();
  return doc ? <LegalDocumentPage key={doc} slug={doc} /> : <LegalIndexPage />;
}
