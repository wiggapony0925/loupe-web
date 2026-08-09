import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
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

/** Longer than a browser's dblclick window would be, because people are
 *  slower with a trackpad than the 300ms convention assumes. */
const DOUBLE_CLICK_MS = 320;

/**
 * A post's photos.
 *
 * The frame's aspect ratio comes from the server's intrinsic dimensions, so
 * the box is the right size before the bytes arrive — otherwise every image
 * in a scrolling feed resizes its own row as it decodes and shoves the
 * content below it down.
 *
 * **Two gestures, one target.** A double click likes the post; a single
 * click opens the viewer. The single click waits out `DOUBLE_CLICK_MS`
 * before committing — the alternative fires the viewer on the first half of
 * every double click, so liking a photo also throws you into full screen.
 *
 * Double click only ever LIKES. Making it a toggle means an accidental
 * repeat silently un-likes something, and the burst animation gives no clue
 * which way it went. An already-liked photo just re-plays the heart.
 */
export function PostMedia({
  media,
  onOpen,
  onLike,
  liked = false,
}: {
  media: PostMediaModel[];
  /** Single click — the full-screen viewer. */
  onOpen?: (index: number) => void;
  /** Double click. Called only when the post is not already liked. */
  onLike?: () => void;
  liked?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [burst, setBurst] = useState(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A click timer that outlives the component fires setState on an
  // unmounted tree — which a fast scroll through a long feed will do.
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  const onClick = () => {
    if (pending.current) {
      // Second click inside the window: this was a double.
      clearTimeout(pending.current);
      pending.current = null;
      if (!liked) onLike?.();
      // Re-key the animation so a repeat double click replays it.
      setBurst((n) => n + 1);
      return;
    }
    pending.current = setTimeout(() => {
      pending.current = null;
      onOpen?.(index);
    }, DOUBLE_CLICK_MS);
  };

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
        onClick={onClick}
      />

      {/* Keyed on the burst counter so React remounts it and the CSS
          animation restarts; a class toggle would only play once. */}
      {burst > 0 && (
        <Heart
          key={burst}
          size={92}
          className={styles.burst}
          fill="currentColor"
          aria-hidden
        />
      )}
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
