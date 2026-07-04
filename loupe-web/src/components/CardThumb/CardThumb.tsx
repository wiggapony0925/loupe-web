import { useState, type CSSProperties } from "react";
import { cx } from "@/lib/cx";
import { cardImageSrc } from "@/lib/cardImage";
import { MediaPlaceholder } from "@/components/MediaPlaceholder/MediaPlaceholder";
import styles from "./CardThumb.module.scss";

export interface CardThumbProps {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Photo-forward card thumbnail with a quiet skeleton + graceful image fallback. */
export function CardThumb({ src, alt, size = "md", className }: CardThumbProps) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const style = { aspectRatio: "5 / 7" } as CSSProperties;
  // Some CDNs (One Piece) block cross-origin embedding via CORP — route those
  // through our same-origin image proxy so the <img> actually paints.
  const resolved = cardImageSrc(src);
  if (state === "error" || !resolved) {
    return (
      <MediaPlaceholder
        kind="card"
        className={cx(styles.thumb, styles[size], className)}
      />
    );
  }
  return (
    <div className={cx(styles.thumb, styles[size], className)} style={style}>
      {state !== "ok" && <div className={styles.placeholder} aria-hidden />}
      <img
        src={resolved}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cx(styles.img, state === "ok" && styles.loaded)}
        onLoad={() => setState("ok")}
        onError={() => setState("error")}
      />
    </div>
  );
}
