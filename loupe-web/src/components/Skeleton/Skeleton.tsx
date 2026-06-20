import type { CSSProperties } from "react";
import { cx } from "@/lib/cx";
import styles from "./Skeleton.module.scss";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  className?: string;
}

/** Shimmering placeholder used while data loads. */
export function Skeleton({ width, height = 16, radius, circle, className }: SkeletonProps) {
  const style: CSSProperties = {
    width,
    height,
    borderRadius: circle ? "999px" : radius,
  };
  return <span className={cx(styles.skeleton, className)} style={style} aria-hidden />;
}
