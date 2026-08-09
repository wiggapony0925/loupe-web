import { Fragment, useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./Feed.module.scss";

/** Splits on the two token shapes; the capture group keeps the delimiters. */
const TOKEN_RE = /(#[A-Za-z0-9_]+|@[A-Za-z0-9][A-Za-z0-9._]*)/g;

export interface PostCaptionProps {
  body: string;
  /** Lowercase, no '#' — what the server actually indexed. */
  hashtags: string[];
  /** Handles that resolve to real accounts. */
  mentions: string[];
  /** The author's handle, rendered bold before the text. */
  prefix?: string;
}

/**
 * A caption with its #tags and @mentions linked.
 *
 * Only words the SERVER confirmed become links: `hashtags` are what it
 * indexed and `mentions` are the handles that resolved. Linking everything
 * the regex finds produces tag pages with nothing on them, profiles that
 * don't exist, and — worst — turns an email address into a broken mention.
 */
export function PostCaption({ body, hashtags, mentions, prefix }: PostCaptionProps) {
  const tags = useMemo(
    () => new Set(hashtags.map((t) => t.toLowerCase())),
    [hashtags],
  );
  const handles = useMemo(
    () => new Set(mentions.map((m) => m.toLowerCase())),
    [mentions],
  );
  const parts = useMemo(() => body.split(TOKEN_RE), [body]);

  return (
    <p className={styles.caption}>
      {prefix && (
        <Link
          to={`/app/u/${encodeURIComponent(prefix)}`}
          className={styles.captionAuthor}
        >
          {prefix}
        </Link>
      )}{" "}
      {parts.map((part, index) => {
        const key = `${index}-${part}`;
        if (part.startsWith("#")) {
          const tag = part.slice(1).toLowerCase();
          if (!tags.has(tag)) return <Fragment key={key}>{part}</Fragment>;
          return (
            <Link
              key={key}
              to={`/app/community/tag/${encodeURIComponent(tag)}`}
              className={styles.token}
            >
              {part}
            </Link>
          );
        }
        if (part.startsWith("@")) {
          // Trailing punctuation belongs to the sentence, not the handle —
          // the same trimming the server does when it resolves mentions.
          const handle = part.slice(1).toLowerCase().replace(/[._]+$/, "");
          if (!handles.has(handle)) return <Fragment key={key}>{part}</Fragment>;
          return (
            <Link
              key={key}
              to={`/app/u/${encodeURIComponent(handle)}`}
              className={styles.token}
            >
              {part}
            </Link>
          );
        }
        return <Fragment key={key}>{part}</Fragment>;
      })}
    </p>
  );
}
