import { useEffect, useRef, useState, type PointerEvent } from "react";
import { cx } from "@/lib/cx";
import type { Frame } from "./grade";
import styles from "./InspectCanvas.module.scss";

type Which = "outer" | "inner";
type Side = "top" | "right" | "bottom" | "left";

interface Props {
  src: string;
  outer: Frame;
  inner: Frame;
  onChange: (which: Which, frame: Frame) => void;
}

const ZOOMS = [2, 5, 10] as const;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * The inspection surface: the card photo with two adjustable frames (outer =
 * card edge, inner = print border) whose gaps drive the centering measurement,
 * plus a corner loupe for reading condition. Pure pointer math — no CV yet, so
 * the read is honest and fully user-controlled.
 */
export function InspectCanvas({ src, outer, inner, onChange }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ which: Which; side: Side } | null>(null);
  // Keep latest frames in refs so the global drag listener never goes stale.
  const frames = useRef({ outer, inner });
  frames.current = { outer, inner };

  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]>(5);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  // Match the stage to the photo's real aspect ratio so the % frames map to
  // the actual image edges (no letterboxing) — essential for centering math.
  const [ratio, setRatio] = useState(5 / 7);
  const MAX_H = 620;

  useEffect(() => {
    function move(e: globalThis.PointerEvent) {
      const box = boxRef.current;
      if (!drag.current || !box) return;
      const r = box.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / r.width, 0, 1);
      const y = clamp((e.clientY - r.top) / r.height, 0, 1);
      const { which, side } = drag.current;
      const f = { ...frames.current[which] };
      if (side === "left") f.left = Math.min(x, f.right - 0.02);
      else if (side === "right") f.right = Math.max(x, f.left + 0.02);
      else if (side === "top") f.top = Math.min(y, f.bottom - 0.02);
      else f.bottom = Math.max(y, f.top + 0.02);
      onChange(which, f);
    }
    function up() {
      drag.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [onChange]);

  function startDrag(which: Which, side: Side) {
    return (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      drag.current = { which, side };
      setLens(null);
    };
  }

  function onHover(e: PointerEvent) {
    if (drag.current) return;
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    setLens({
      x: clamp((e.clientX - r.left) / r.width, 0, 1),
      y: clamp((e.clientY - r.top) / r.height, 0, 1),
    });
  }

  function frameEl(which: Which, f: Frame) {
    const style = {
      left: `${f.left * 100}%`,
      top: `${f.top * 100}%`,
      right: `${(1 - f.right) * 100}%`,
      bottom: `${(1 - f.bottom) * 100}%`,
    };
    return (
      <div className={cx(styles.frame, styles[`frame--${which}`])} style={style}>
        {(["top", "right", "bottom", "left"] as Side[]).map((s) => (
          <span
            key={s}
            className={cx(styles.edge, styles[`edge--${s}`])}
            onPointerDown={startDrag(which, s)}
            role="slider"
            aria-label={`${which} ${s} edge`}
            tabIndex={0}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <span className={styles.legend}>
          <span className={cx(styles.dot, styles["dot--outer"])} /> Card edge
        </span>
        <span className={styles.legend}>
          <span className={cx(styles.dot, styles["dot--inner"])} /> Print border
        </span>
        <span className={styles.spacer} />
        <span className={styles.zoomLabel}>Loupe</span>
        {ZOOMS.map((z) => (
          <button
            key={z}
            type="button"
            className={cx(styles.zoom, zoom === z && styles["zoom--on"])}
            onClick={() => setZoom(z)}
          >
            {z}×
          </button>
        ))}
      </div>

      <div
        ref={boxRef}
        className={styles.stage}
        style={{ aspectRatio: String(ratio), maxWidth: `calc(${MAX_H}px * ${ratio})` }}
        onPointerMove={onHover}
        onPointerLeave={() => setLens(null)}
      >
        <img
          className={styles.img}
          src={src}
          alt="Card under inspection"
          draggable={false}
          onLoad={(e) => {
            const im = e.currentTarget;
            if (im.naturalWidth && im.naturalHeight)
              setRatio(im.naturalWidth / im.naturalHeight);
          }}
        />
        {frameEl("outer", outer)}
        {frameEl("inner", inner)}

        {lens && (
          <div
            className={styles.lens}
            style={{
              left: `${lens.x * 100}%`,
              top: `${lens.y * 100}%`,
              backgroundImage: `url(${src})`,
              backgroundSize: `${zoom * 100}% ${zoom * 100}%`,
              backgroundPosition: `${lens.x * 100}% ${lens.y * 100}%`,
            }}
            aria-hidden
          />
        )}
      </div>
      <p className={styles.hint}>
        Drag the <strong>green</strong> frame to the card edges and the{" "}
        <strong>amber</strong> frame to the inner print border. Hover anywhere to
        loupe the corners.
      </p>
    </div>
  );
}
