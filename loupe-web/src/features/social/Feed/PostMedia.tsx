import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PostMedia as PostMediaModel } from "@loupe/core";
import { cx } from "@/lib/cx";
import styles from "./Feed.module.scss";

/** Instagram's crop bounds: tallest 4:5, widest 1.91:1. */
const MIN_RATIO = 4 / 5;
const MAX_RATIO = 1.91;

function aspectRatio(media: PostMediaModel[]): number {
  const first = media[0];
  if (!first?.width || !first?.height) return 1;
  const ratio = first.width / first.height;
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}

/**
 * A post's photos.
 *
 * The frame's aspect ratio comes from the server's intrinsic dimensions, so
 * the box is the right size before the bytes arrive — otherwise every image
 * in a scrolling feed resizes its own row as it decodes and shoves the
 * content below it down.
 */
export function PostMedia({
  media,
  onOpen,
}: {
  media: PostMediaModel[];
  onOpen?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const current = media[Math.min(index, media.length - 1)];
  if (!current) return null;

  return (
    <div
      className={styles.media}
      style={{ aspectRatio: String(aspectRatio(media)) }}
    >
      <img
        src={current.url}
        alt=""
        className={styles.mediaImage}
        loading="lazy"
        onClick={onOpen}
      />
      {media.length > 1 && (
        <>
          <button
            type="button"
            className={cx(styles.mediaNav, styles.mediaPrev)}
            aria-label="Previous photo"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className={cx(styles.mediaNav, styles.mediaNext)}
            aria-label="Next photo"
            disabled={index === media.length - 1}
            onClick={() => setIndex((i) => Math.min(media.length - 1, i + 1))}
          >
            <ChevronRight size={18} />
          </button>
          <span className={styles.mediaDots} aria-hidden>
            {media.map((item, i) => (
              <span
                key={item.id}
                className={cx(styles.mediaDot, i === index && styles.mediaDotOn)}
              />
            ))}
          </span>
        </>
      )}
    </div>
  );
}
