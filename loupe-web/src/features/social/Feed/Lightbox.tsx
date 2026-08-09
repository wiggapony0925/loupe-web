import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PostMedia } from "@loupe/core";
import { cx } from "@/lib/cx";
import styles from "./Lightbox.module.scss";

/**
 * A post's photos, full screen.
 *
 * Clicking a photo used to open the comments — reasonable on a phone where
 * a tap has to mean one thing, wrong on a desktop with a 27" display, where
 * the obvious reading of "click the picture" is "show me the picture".
 * Comments have their own button.
 *
 * Rendered through a portal so the overlay escapes the feed's stacking
 * context: `position: fixed` inside an ancestor with a transform (the card
 * hover lift) is positioned against that ancestor, not the viewport, and
 * the overlay would sit inside one post's box.
 */
export function Lightbox({
  media,
  startIndex = 0,
  onClose,
}: {
  media: PostMedia[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);

  const go = useCallback(
    (delta: number) =>
      setIndex((i) => Math.min(media.length - 1, Math.max(0, i + delta))),
    [media.length],
  );

  // Keyboard is the whole point of a desktop viewer: Escape out, arrows
  // through. Bound on the document because focus starts on the close
  // button and moves as the user tabs.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll under the overlay.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  const current = media[Math.min(index, media.length - 1)];
  if (!current) return null;

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      // Clicking the backdrop closes; clicking the photo itself must not,
      // or dragging to select or simply mis-clicking dumps you out.
      onClick={onClose}
    >
      <button
        type="button"
        className={styles.close}
        aria-label="Close photo viewer"
        onClick={onClose}
        autoFocus
      >
        <X size={22} />
      </button>

      <img
        src={current.url}
        alt=""
        className={styles.image}
        onClick={(event) => event.stopPropagation()}
      />

      {media.length > 1 && (
        <>
          <button
            type="button"
            className={cx(styles.nav, styles.prev)}
            aria-label="Previous photo"
            disabled={index === 0}
            onClick={(event) => {
              event.stopPropagation();
              go(-1);
            }}
          >
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            className={cx(styles.nav, styles.next)}
            aria-label="Next photo"
            disabled={index === media.length - 1}
            onClick={(event) => {
              event.stopPropagation();
              go(1);
            }}
          >
            <ChevronRight size={26} />
          </button>
          <span className={styles.counter} aria-live="polite">
            {index + 1} / {media.length}
          </span>
        </>
      )}
    </div>,
    document.body,
  );
}
