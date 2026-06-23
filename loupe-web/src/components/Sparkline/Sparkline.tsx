import { useId, useMemo } from "react";
import { buildSparkline } from "@loupe/chart";
import { token } from "@/theme";
import styles from "./Sparkline.module.scss";

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Stroke color; defaults to mint/rose based on first→last direction. */
  color?: string;
  /** Render the soft area fill under the line. */
  fill?: boolean;
  strokeWidth?: number;
}

/** Lightweight, theme-aware sparkline. Pure SVG — no chart dependency. */
export function Sparkline({
  data,
  width = 96,
  height = 32,
  color,
  fill = true,
  strokeWidth = 2,
}: SparklineProps) {
  const gradientId = useId();

  const { line, area, stroke } = useMemo(() => {
    if (data.length < 2) {
      return { line: "", area: "", stroke: token.ink.dim };
    }
    // Geometry from the shared `@loupe/chart` package — the mobile Sparkline
    // draws the same path. Inset vertically by the stroke so peaks/troughs
    // aren't clipped.
    const geom = buildSparkline({ values: data, width, height, pad: strokeWidth });
    const resolved = color ?? (geom.direction === "down" ? token.down : token.up);
    return { line: geom.line, area: geom.area, stroke: resolved };
  }, [data, width, height, strokeWidth, color]);

  return (
    <svg
      className={styles.spark}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && area && <path d={area} fill={`url(#${gradientId})`} />}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
