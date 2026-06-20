import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Layers, ScanLine, Share2, Sparkles } from "lucide-react";
import { GraderDevice } from "@/assets";
import { Button } from "@/components";
import { useCountUp, useInView } from "@/hooks/useReveal";
import { cx } from "@/lib/cx";
import styles from "./DeviceReveal.module.scss";

const FEATURES = [
  { Icon: ScanLine, text: "Computer-vision centering, edges & corners" },
  { Icon: Sparkles, text: "Instant PSA / BGS / CGC grade estimate" },
  { Icon: Layers, text: "Every scan syncs straight to your vault" },
];

/** "Coming soon" hardware section — scroll-revealed scanner + companion app. */
export function DeviceReveal() {
  const navigate = useNavigate();
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.3 });
  const centering = useCountUp(9.5, inView);
  const edges = useCountUp(9.0, inView);
  const corners = useCountUp(9.5, inView);

  return (
    <section id="device" ref={ref} className={cx(styles.device, inView && styles["device--in"])}>
      <div className={styles.device__glow} aria-hidden />
      <div className={styles.device__inner}>
        <div className={styles.device__copy}>
          <p className={styles.device__eyebrow}>Hardware · Coming soon</p>
          <h2 className={styles.device__headline}>Grade it before you grade it.</h2>
          <p className={styles.device__sub}>
            Meet the Loupe Scanner. Drop any card in the tray and our vision model measures centering,
            edges, and corners in seconds — then predicts the grade it would earn, so you only send the
            slabs worth sending.
          </p>
          <ul className={styles.device__features}>
            {FEATURES.map(({ Icon, text }) => (
              <li key={text} className={styles["device__feature"]}>
                <span className={styles["device__feature-icon"]}>
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <Button size="lg" trailingIcon={<ArrowRight size={18} />} onClick={() => navigate("/scanner")}>
            Join the waitlist
          </Button>
        </div>

        <div className={styles.device__scene}>
          <GraderDevice revealed={inView} className={styles["device__hardware"]} />

          <div className={styles.phone}>
            <span className={styles.phone__notch} />
            <div className={styles.phone__status}>
              <span className={styles["phone__time"]}>9:41</span>
              <span className={styles["phone__title"]}>Charizard Card</span>
              <Share2 size={15} className={styles["phone__share"]} />
            </div>

            <svg className={styles.phone__card} viewBox="0 0 120 150" aria-hidden>
              <defs>
                <linearGradient id="pc-card" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffd884" />
                  <stop offset="50%" stopColor="#ff9b3d" />
                  <stop offset="100%" stopColor="#ef5f2c" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="116" height="146" rx="9" fill="url(#pc-card)" />
              <rect x="12" y="10" width="96" height="12" rx="3" fill="#fff" opacity="0.55" />
              <rect x="14" y="30" width="92" height="64" rx="5" fill="#fff" opacity="0.28" />
              <path
                d="M40 86 l14 -22 10 12 16 -26"
                stroke="#7a2d12"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
              <rect x="14" y="104" width="92" height="8" rx="3" fill="#7a2d12" opacity="0.35" />
              <rect x="14" y="118" width="64" height="8" rx="3" fill="#7a2d12" opacity="0.25" />
            </svg>

            <div className={styles.phone__grades}>
              {[
                ["Centering", centering],
                ["Edges", edges],
                ["Corners", corners],
              ].map(([label, val]) => (
                <div key={label as string} className={styles["phone__grade"]}>
                  <span className={styles["phone__grade-label"]}>{label as string}</span>
                  <span className={styles["phone__grade-value"]}>{(val as number).toFixed(1)}</span>
                </div>
              ))}
            </div>

            <div className={styles.phone__verdict}>
              <span className={styles["phone__psa"]}>PSA 10</span>
              <span className={styles["phone__pill"]}>
                <Check size={13} /> Candidate
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
