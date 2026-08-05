import { useState } from "react";
import { cx } from "@/lib/cx";
import styles from "./SocialAvatar.module.scss";

export interface SocialAvatarProps {
  name: string;
  src?: string | null;
  /** row = list rows (44px), hero = the profile header (86px). */
  size?: "row" | "hero";
  className?: string;
}

/** Round profile picture with an initials fallback, in the two social sizes.
 *  (The shared `Avatar` tops out at the TopBar's `md`; profiles need hero.) */
export function SocialAvatar({ name, src, size = "row", className }: SocialAvatarProps) {
  const [broken, setBroken] = useState(false);
  const initials = name
    .split(/[\s_.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className={cx(styles.avatar, styles[size], className)}>
      {src && !broken ? (
        <img
          className={styles.image}
          src={src}
          alt={name}
          onError={() => setBroken(true)}
        />
      ) : (
        <span className={styles.fallback} aria-hidden>
          {initials || "?"}
        </span>
      )}
    </span>
  );
}
