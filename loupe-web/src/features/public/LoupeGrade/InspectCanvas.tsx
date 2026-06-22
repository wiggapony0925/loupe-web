import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Crosshair, Square, Wand2 } from "lucide-react";
import { cx } from "@/lib/cx";
import type { Frame } from "./grade";
import styles from "./InspectCanvas.module.scss";

type Which = "outer" | "inner";
type Side = "top" | "right" | "bottom" | "left";
type View = "card" | "corners";

interface Props {
  src: string;
  outer: Frame;
  inner: Frame;
  onChange: (which: Which, frame: Frame) => void;
  /** Re-run auto-detection of the card edge + print border. */
  onAutoFit?: () => void;
}

// The four card corners (from the outer frame), nudged slightly inward so each
// corner sits with a little context inside its grid cell.
const CORNER_KEYS = [
  ["TL", "left", "top"],
  ["TR", "right", "top"],
  ["BL", "left", "bottom"],
  ["BR", "right", "bottom"],
] as const;

const ZOOMS = [2, 5, 10] as const;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * The inspection surface: the card photo with two adjustable frames (outer =
 * card edge, inner = print border) whose gaps drive the centering measurement,
 * plus a corner loupe for reading condition. Pure pointer math — no CV yet, so
 * the read is honest and fully user-controlled.
 */
export function InspectCanvas({ src, outer, inner, onChange, onAutoFit }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ which: Which; side: Side } | null>(null);
  // Keep latest frames in refs so the global drag listener never goes stale.
  const frames = useRef({ outer, inner });
  frames.current = { outer, inner };

  const zoneRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("card");
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]>(5);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  // Match the stage to the photo's real aspect ratio so the % frames map to
  // the actual image edges (no letterboxing) — essential for centering math.
  const [ratio, setRatio] = useState(5 / 7);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // Fit the stage to the largest size that fits the zone while keeping ratio.
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const fit = () => {
      const zw = zone.clientWidth;
      // Reserve room at the bottom so the floating dock never covers the card.
      const zh = zone.clientHeight - 96;
      if (zw <= 0 || zh <= 0) return;
      const w = Math.min(zw, zh * ratio);
      setBox({ w, h: w / ratio });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(zone);
    return () => ro.disconnect();
  }, [ratio]);

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

  const pad = 0.05;
  const cornerPos = (xSide: "left" | "right", ySide: "top" | "bottom") => ({
    x: xSide === "left" ? outer.left + pad : outer.right - pad,
    y: ySide === "top" ? outer.top + pad : outer.bottom - pad,
  });

  return (
    <div className={styles.wrap}>
      {view === "card" && (
        <div className={styles.legendChip}>
          <span className={styles.legend}>
            <span className={cx(styles.dot, styles["dot--outer"])} /> Card edge
          </span>
          <span className={styles.legend}>
            <span className={cx(styles.dot, styles["dot--inner"])} /> Print border
          </span>
        </div>
      )}

      <div ref={zoneRef} className={styles.stageBox}>
        {view === "card" ? (
          <div
            ref={boxRef}
            className={styles.stage}
            style={{ width: box.w || undefined, height: box.h || undefined }}
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
        ) : (
          <div
            className={styles.corners}
            style={{ width: box.w || undefined, height: box.h || undefined }}
          >
            {CORNER_KEYS.map(([key, xSide, ySide]) => {
              const p = cornerPos(xSide, ySide);
              return (
                <div key={key} className={styles.corner}>
                  <div
                    className={styles.cornerImg}
                    style={{
                      backgroundImage: `url(${src})`,
                      backgroundSize: `${zoom * 100}% ${zoom * 100}%`,
                      backgroundPosition: `${p.x * 100}% ${p.y * 100}%`,
                    }}
                  />
                  <span className={styles.cornerTag}>{key}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Figma-style floating control dock */}
      <div className={styles.dock}>
        <div className={styles.seg}>
          <button
            type="button"
            className={cx(styles.segBtn, view === "card" && styles["segBtn--on"])}
            onClick={() => setView("card")}
            title="Card view"
          >
            <Square size={14} /> Card
          </button>
          <button
            type="button"
            className={cx(
              styles.segBtn,
              view === "corners" && styles["segBtn--on"],
            )}
            onClick={() => setView("corners")}
            title="4-corner view"
          >
            <Crosshair size={14} /> Corners
          </button>
        </div>

        <span className={styles.dockDiv} />

        <span className={styles.dockLabel}>Loupe</span>
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

        {onAutoFit && (
          <>
            <span className={styles.dockDiv} />
            <button
              type="button"
              className={styles.autofit}
              onClick={onAutoFit}
              title="Re-detect the card edges"
            >
              <Wand2 size={14} /> Auto-fit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
