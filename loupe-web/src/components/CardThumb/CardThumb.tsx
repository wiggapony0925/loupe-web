import { useState, type CSSProperties } from "react";
import { cx } from "@/lib/cx";
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
  if (state === "error" || !src) {
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
        src={src}
        alt={alt}
        loading="lazy"
        className={cx(styles.img, state === "ok" && styles.loaded)}
        onLoad={() => setState("ok")}
        onError={() => setState("error")}
      />
    </div>
  );
}
