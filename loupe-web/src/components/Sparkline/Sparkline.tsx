import { useId, useMemo } from "react";
import { trendOf } from "@/lib/format";
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
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const stepX = width / (data.length - 1);
    // Inset vertically by the stroke so the peak/trough aren't clipped.
    const pad = strokeWidth;
    const points = data.map((value, i) => {
      const x = i * stepX;
      const y = pad + (height - pad * 2) * (1 - (value - min) / span);
      return [x, y] as const;
    });
    const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
    const lastPoint = points[points.length - 1];
    const lastX = lastPoint ? lastPoint[0] : width;
    const areaPath = `${linePath} L${lastX.toFixed(2)} ${height} L0 ${height} Z`;
    const dir = trendOf((data[data.length - 1] ?? 0) - (data[0] ?? 0));
    const resolved = color ?? (dir === "down" ? token.down : token.up);
    return { line: linePath, area: areaPath, stroke: resolved };
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
