import { useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useCreatePost } from "@loupe/core";
import { Button, Panel } from "@/components";
import { SocialAvatar } from "../components/SocialAvatar";
import styles from "./Feed.module.scss";

/** Matches the server's caps (`MAX_POST_BODY`, `MAX_IMAGES_PER_POST`). */
const MAX_BODY = 2200;
const MAX_IMAGES = 4;

/**
 * Write a post, inline at the top of the feed.
 *
 * Inline rather than behind a modal: on a wide screen there is room, and
 * "post something" is the action the page exists to encourage. The caption
 * is the primary field — plenty of good posts on a card app are "does
 * anyone else have this?" with no photo at all.
 */
export function Composer({
  handle,
  avatarUrl,
}: {
  handle: string;
  avatarUrl: string | null;
}) {
  const create = useCreatePost();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  // The #tags the server will index, previewed live as chips — the same
  // rounded look they'll have on the published post.
  const draftTags = useMemo(() => {
    const seen = new Set<string>();
    for (const match of body.matchAll(/#([A-Za-z0-9_]+)/g)) {
      seen.add(match[1]!.toLowerCase());
    }
    return [...seen];
  }, [body]);

  const canPost = (body.trim().length > 0 || images.length > 0) && !create.isPending;

  const publish = () => {
    if (!canPost) return;
    setError(null);
    create.mutate(
      { body: body.trim() || undefined, images },
      {
        onSuccess: () => {
          setBody("");
          setImages([]);
        },
        onError: (err) => setError(err.message || "Couldn't post. Please try again."),
      },
    );
  };

  return (
    <Panel className={styles.composerPanel}>
      <div className={styles.composerHead}>
        <SocialAvatar name={handle} src={avatarUrl} />
        <textarea
          className={styles.composerBody}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
          placeholder="What did you pull? Use #tags and @mentions."
          aria-label="Post caption"
          rows={2}
        />
      </div>

      {draftTags.length > 0 && (
        <div className={styles.draftTags} aria-label="Tags in this post">
          {draftTags.map((tag) => (
            <span key={tag} className={styles.tag}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <ul className={styles.thumbs}>
          {images.map((file, index) => (
            <li key={`${file.name}-${index}`} className={styles.thumb}>
              <img src={URL.createObjectURL(file)} alt="" />
              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() =>
                  setImages((current) => current.filter((_, i) => i !== index))
                }
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className={styles.composerError}>{error}</p>}

      <div className={styles.composerTools}>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            setImages((current) => [...current, ...picked].slice(0, MAX_IMAGES));
            // Reset so re-picking the same file fires onChange again.
            e.target.value = "";
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          disabled={images.length >= MAX_IMAGES}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus size={16} />
          {images.length > 0 ? `${images.length}/${MAX_IMAGES} photos` : "Add photos"}
        </Button>
        <span className={styles.composerSpacer} />
        {/* Only near the limit: a counter always on screen turns writing
            into a budget. */}
        {MAX_BODY - body.length <= 200 && (
          <span className={styles.composerCount}>{MAX_BODY - body.length}</span>
        )}
        <Button size="sm" disabled={!canPost} onClick={publish}>
          {create.isPending ? "Posting…" : "Post"}
        </Button>
      </div>
    </Panel>
  );
}
