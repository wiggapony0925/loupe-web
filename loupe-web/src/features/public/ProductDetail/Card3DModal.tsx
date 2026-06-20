import { useCallback, useRef, useState, type CSSProperties } from "react";
import { Dialog } from "radix-ui";
import { RotateCcw, X } from "lucide-react";
import styles from "./Card3DModal.module.scss";

interface Card3DModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt: string;
}

const FLAT = { rx: 0, ry: 0, active: 0 };
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/**
 * Full-screen 3D card viewer — the web twin of the mobile `Card3DModal`.
 *
 * Drag (mouse or touch) to spin the card on a perspective; release lets it
 * settle and the glare/lift fade. Double-click or the reset button snaps it
 * flat. Rotation is clamped so the (textureless) back never faces you.
 */
export function Card3DModal({
  open,
  onOpenChange,
  src,
  alt,
}: Card3DModalProps) {
  const [t, setT] = useState(FLAT);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setT((s) => ({ ...s, active: 1 }));
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setT((s) => ({
      ry: clamp(s.ry + dx * 0.6, -55, 55),
      rx: clamp(s.rx - dy * 0.6, -55, 55),
      active: 1,
    }));
  }, []);

  const onUp = useCallback(() => {
    dragging.current = false;
    setT((s) => ({ ...s, active: 0 }));
  }, []);

  const reset = useCallback(() => setT(FLAT), []);

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
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onDoubleClick={reset}
            style={
              {
                "--rx": `${t.rx}deg`,
                "--ry": `${t.ry}deg`,
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
              <span className={styles.viewer__glare} aria-hidden />
            </div>
          </div>

          <p className={styles.viewer__hint}>
            Drag to rotate · double-click to reset
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
