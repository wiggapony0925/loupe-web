import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { cx } from "@/lib/cx";
import { SITE_ORIGIN } from "@/lib/site";
import styles from "./Markdown.module.scss";

export interface MarkdownProps {
  children: string;
  className?: string;
  /** Route links that point back at our own site through react-router instead
   *  of opening a new tab. Legal copy cross-references sibling documents by
   *  absolute URL, and bouncing a reader out to a new tab mid-contract — or
   *  worse, out of the mobile WebView — is not navigation, it's an exit. */
  internalLinks?: boolean;
}

/** An href that lives on this site, normalised to an app-relative path.
 *  Returns null for anything external, so it keeps its new-tab treatment. */
function toInternalPath(href: string | undefined, enabled: boolean): string | null {
  if (!enabled || !href) return null;
  if (href.startsWith("/")) return href;
  if (href.startsWith(SITE_ORIGIN)) return href.slice(SITE_ORIGIN.length) || "/";
  return null;
}

/** Renders Markdown (GitHub-flavored) as themed prose. External links open
 *  safely in a new tab. Used for blog posts, legal documents, and any
 *  long-form content authored as Markdown. */
export function Markdown({ children, className, internalLinks = false }: MarkdownProps) {
  return (
    <div className={cx(styles.markdown, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, href, children: label, ...props }) => {
            const path = toInternalPath(href, internalLinks);
            if (path) {
              return (
                <Link to={path} {...props}>
                  {label}
                </Link>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
                {label}
              </a>
            );
          },
          // Wide tables (the privacy disclosure matrices) scroll inside their
          // own box rather than forcing the whole page sideways at 375px.
          table: ({ node: _node, ...props }) => (
            <div className={styles.markdown__tableScroll}>
              <table {...props} />
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
