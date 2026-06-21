import { cx } from "@/lib/cx";
import styles from "./GraderDevice.module.scss";

export interface GraderDeviceProps {
  /** When true, the tray slides out and the glow pulses (scroll-reveal). */
  revealed?: boolean;
  className?: string;
}

/**
 * The upcoming Loupe Scanner — a brushed-aluminum desktop grader with a card
 * tray. Pure SVG (metal gradients + soft shadows); the tray animates on reveal.
 */
export function GraderDevice({ revealed = false, className }: GraderDeviceProps) {
  return (
    <svg
      className={cx(styles.device, revealed && styles["device--in"], className)}
      viewBox="0 0 560 380"
      fill="none"
      role="img"
      aria-label="Loupe Scanner device with a trading card in its tray"
    >
      <defs>
        <linearGradient id="gd-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f6f8" />
          <stop offset="14%" stopColor="#dfe3e8" />
          <stop offset="55%" stopColor="#c3c9d0" />
          <stop offset="100%" stopColor="#a7adb5" />
        </linearGradient>
        <linearGradient id="gd-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbfcfd" />
          <stop offset="100%" stopColor="#d7dce1" />
        </linearGradient>
        <linearGradient id="gd-tray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9edf1" />
          <stop offset="100%" stopColor="#b9bfc7" />
        </linearGradient>
        <linearGradient id="gd-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd27a" />
          <stop offset="45%" stopColor="#ff9b3d" />
          <stop offset="100%" stopColor="#f2622e" />
        </linearGradient>
        <radialGradient id="gd-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent-mint)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--accent-mint)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ambient glow */}
      <ellipse className={styles.device__glow} cx="280" cy="210" rx="250" ry="120" fill="url(#gd-glow)" />

      {/* contact shadow */}
      <ellipse cx="280" cy="318" rx="210" ry="26" fill="#000" opacity="0.16" />

      {/* sliding tray (behind the body front lip) */}
      <g className={styles.device__tray}>
        <rect x="150" y="246" width="260" height="70" rx="12" fill="url(#gd-tray)" />
        <rect x="166" y="258" width="228" height="46" rx="7" fill="#16181c" />
        {/* card on black foam */}
        <g transform="rotate(-2 280 281)">
          <rect x="246" y="252" width="68" height="58" rx="6" fill="url(#gd-card)" />
          <rect x="252" y="258" width="56" height="30" rx="3" fill="#fff" opacity="0.22" />
          <path d="M262 300 l8 -12 6 6 10 -16" stroke="#7a2d12" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        </g>
      </g>

      {/* device body */}
      <rect x="96" y="96" width="368" height="170" rx="26" fill="url(#gd-body)" />
      {/* top highlight face */}
      <rect x="110" y="104" width="340" height="40" rx="20" fill="url(#gd-top)" opacity="0.9" />
      {/* front lip that hides the tray seam */}
      <rect x="96" y="244" width="368" height="22" rx="11" fill="#b3b9c1" />
      <rect x="150" y="250" width="260" height="6" rx="3" fill="#23262b" opacity="0.55" />

      {/* power button */}
      <circle cx="280" cy="150" r="16" fill="none" stroke="#8b9098" strokeWidth="2.4" />
      <line x1="280" y1="142" x2="280" y2="152" stroke="#8b9098" strokeWidth="2.4" strokeLinecap="round" />

      {/* Loupe lens emboss */}
      <g opacity="0.5" transform="translate(280 200)">
        <circle cx="-4" cy="-2" r="9" stroke="#7e858d" strokeWidth="2" fill="none" />
        <line x1="3" y1="5" x2="9" y2="11" stroke="#7e858d" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
