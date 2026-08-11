import { useMemo } from "react";
import styles from "./Feed.module.scss";

/**
 * The #tags in a draft, shown as the same chips they'll wear on the posted
 * caption — so a writer sees a tag "become" a tag the moment they type it,
 * in the composer AND when editing. A plain `<textarea>` can't style its own
 * text, so the chips sit just beneath it.
 *
 * Purely a preview of what was typed: it does not decide what the server
 * will index (that's the backend's hashtag policy). Deduped, order kept.
 */
export function DraftTags({ body }: { body: string }) {
  const tags = useMemo(() => {
    const seen = new Set<string>();
    for (const match of body.matchAll(/#([A-Za-z0-9_]+)/g)) {
      seen.add(match[1]!.toLowerCase());
    }
    return [...seen];
  }, [body]);

  if (tags.length === 0) return null;

  return (
    <div className={styles.draftTags} aria-label="Tags in this post">
      {tags.map((tag) => (
        <span key={tag} className={styles.tag}>
          #{tag}
        </span>
      ))}
    </div>
  );
}
