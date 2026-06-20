import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./SitePage.module.scss";

export interface SitePageProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  /** Optional content shown in the hero (e.g. a status pill or CTA). */
  hero?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Shared content-page shell — editorial hero + body. Used by About, Careers,
 *  Press, Help, Contact, Status, Blog, and the legal pages so they're visually
 *  consistent and we never re-implement the same layout. */
export function SitePage({ eyebrow, title, lead, hero, children, className }: SitePageProps) {
  return (
    <article className={cx(styles.page, className)}>
      <header className={styles.page__hero}>
        {eyebrow && <p className={styles.page__eyebrow}>{eyebrow}</p>}
        <h1 className={styles.page__title}>{title}</h1>
        {lead && <p className={styles.page__lead}>{lead}</p>}
        {hero && <div className={styles.page__heroExtra}>{hero}</div>}
      </header>
      {children && <div className={styles.page__body}>{children}</div>}
    </article>
  );
}

/** A titled content section within a SitePage body. */
export function SiteSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      {title && <h2 className={styles.section__title}>{title}</h2>}
      <div className={styles.section__body}>{children}</div>
    </section>
  );
}

/** A long-form prose block (legal copy, articles). */
export function SiteProse({ children }: { children: ReactNode }) {
  return <div className={styles.prose}>{children}</div>;
}
