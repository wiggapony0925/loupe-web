import { Avatar as RAvatar } from "radix-ui";
import { cx } from "@/lib/cx";
import styles from "./Avatar.module.scss";

export interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md";
  className?: string;
}

/** Round avatar with image + initials fallback (Radix Avatar). */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <RAvatar.Root className={cx(styles.root, styles[size], className)}>
      {src && <RAvatar.Image className={styles.image} src={src} alt={name} />}
      <RAvatar.Fallback className={styles.fallback} delayMs={src ? 300 : 0}>
        {initials}
      </RAvatar.Fallback>
    </RAvatar.Root>
  );
}
