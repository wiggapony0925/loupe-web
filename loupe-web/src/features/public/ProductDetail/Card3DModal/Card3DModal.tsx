import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type WheelEvent,
} from "react";
import { Dialog } from "radix-ui";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import styles from "./Card3DModal.module.scss";

interface Card3DModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt: string;
  /** Optional caption rendered under the card (card name). */
  title?: string;
  /** Optional sub-caption (set / number). */
  subtitle?: string;
  /**
   * "card" (default) — holographic tilt + foil glare, for flat card scans.
   * "product" — pan + zoom only, no tilt/glare, for sealed product photos
   * (which are angled shots that a 3D tilt would distort).
   */
  mode?: "card" | "product";
}

const FLAT = { rx: 0, ry: 0, scale: 1, active: 0, tx: 0, ty: 0 };
const MIN_SCALE = 1;
const MAX_SCALE = 2.5;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/**
 * Full-screen 3D card viewer — the web twin of the mobile `Card3DModal`.
 *
 * Drag (mouse or touch) to spin the card on a perspective with a foil glare;
 * scroll / pinch or the +/- controls to zoom (1x-2.5x, the "expand" feature).
 * Release lets it settle. Dismiss by tapping the dimmed backdrop, the X, or
 * Escape. Rotation is clamped so the (textureless) back never faces you.
 */
export function Card3DModal({
  open,
  onOpenChange,
  src,
  alt,
  title,
  subtitle,
  mode = "card",
}: Card3DModalProps) {
  const [t, setT] = useState(FLAT);
  const dragging = useRef(false);
  const moved = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    last.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setT((s) => ({ ...s, active: 1 }));
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      if (mode === "product") {
        // Pan the (zoomed) photo — no tilt, which would distort a box shot.
        setT((s) => ({ ...s, tx: s.tx + dx, ty: s.ty + dy, active: 1 }));
      } else {
        setT((s) => ({
          ...s,
          ry: clamp(s.ry + dx * 0.6, -55, 55),
          rx: clamp(s.rx - dy * 0.6, -55, 55),
          active: 1,
        }));
      }
    },
    [mode],
  );

  const onUp = useCallback(() => {
    dragging.current = false;
    setT((s) => ({ ...s, active: 0 }));
  }, []);

  const onWheel = useCallback((e: WheelEvent) => {
    setT((s) => ({
      ...s,
      scale: clamp(s.scale - e.deltaY * 0.0015, MIN_SCALE, MAX_SCALE),
    }));
  }, []);

  const zoomBy = useCallback(
    (delta: number) =>
      setT((s) => ({
        ...s,
        scale: clamp(s.scale + delta, MIN_SCALE, MAX_SCALE),
      })),
    [],
  );

  const reset = useCallback(() => setT(FLAT), []);

  // Tap on empty backdrop (not the card, not a drag) → dismiss, like mobile.
  const onStageClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !moved.current) onOpenChange(false);
    },
    [onOpenChange],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.viewer__overlay} />
        <Dialog.Content className={styles.viewer} aria-describedby={undefined}>
          <Dialog.Title className={styles.viewer__srTitle}>{alt}</Dialog.Title>

          <div className={styles.viewer__toolbar}>
            <button
              type="button"
              className={styles.viewer__tool}
              onClick={() => zoomBy(-0.3)}
              aria-label="Zoom out"
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              className={styles.viewer__tool}
              onClick={() => zoomBy(0.3)}
              aria-label="Zoom in"
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              className={styles.viewer__tool}
              onClick={reset}
              aria-label="Reset position"
            >
              <RotateCcw size={18} />
            </button>
            <Dialog.Close className={styles.viewer__tool} aria-label="Close">
              <X size={20} />
            </Dialog.Close>
          </div>

          <div
            className={styles.viewer__stage}
            onClick={onStageClick}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onDoubleClick={reset}
            onWheel={onWheel}
            style={
              {
                "--rx": `${t.rx}deg`,
                "--ry": `${t.ry}deg`,
                "--scale": t.scale,
                "--tx": `${t.tx}px`,
                "--ty": `${t.ty}px`,
                "--gx": `${50 + t.ry}%`,
                "--gy": `${50 - t.rx}%`,
                "--active": t.active,
              } as CSSProperties
            }
          >
            <div className={styles.viewer__card}>
              <img
                src={src}
                alt={alt}
                className={styles.viewer__img}
                draggable={false}
              />
              {mode === "card" && (
                <span className={styles.viewer__glare} aria-hidden />
              )}
            </div>
          </div>

          <div className={styles.viewer__caption}>
            {title && <span className={styles.viewer__title}>{title}</span>}
            {subtitle && (
              <span className={styles.viewer__subtitle}>{subtitle}</span>
            )}
            <span className={styles.viewer__hint}>
              {mode === "product"
                ? "DRAG TO PAN · SCROLL TO ZOOM · TAP TO CLOSE"
                : "DRAG TO TILT · SCROLL TO ZOOM · TAP TO CLOSE"}
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
