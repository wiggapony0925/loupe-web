import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./TiltCard.module.scss";

export interface TiltCardProps {
  children: ReactNode;
  /** Max tilt in degrees toward the cursor. */
  maxDeg?: number;
  className?: string;
}

/**
 * 3D holographic card tilt — the web twin of the mobile `Card3DModal`.
 *
 * On pointer-move the card rotates toward the cursor (±`maxDeg`) on a
 * perspective, and a glare highlight tracks the pointer for a "foil" sheen.
 * Pure CSS transforms (no deps); falls flat for touch / reduced-motion.
 */
export function TiltCard({ children, maxDeg = 14, className }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: 0 });

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height;
    setT({
      ry: (px - 0.5) * 2 * maxDeg, // left/right → rotateY
      rx: -(py - 0.5) * 2 * maxDeg, // up/down → rotateX
      gx: px * 100,
      gy: py * 100,
      active: 1,
    });
  }

  function reset() {
    setT({ rx: 0, ry: 0, gx: 50, gy: 50, active: 0 });
  }

  return (
    <div
      ref={ref}
      className={cx(styles.tilt, className)}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={
        {
          "--rx": `${t.rx}deg`,
          "--ry": `${t.ry}deg`,
          "--gx": `${t.gx}%`,
          "--gy": `${t.gy}%`,
          "--active": t.active,
        } as CSSProperties
      }
    >
      <div className={styles.tilt__inner}>
        {children}
        <span className={styles.tilt__glare} aria-hidden />
      </div>
    </div>
  );
}
