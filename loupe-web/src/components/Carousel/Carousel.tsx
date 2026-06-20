import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/cx";
import styles from "./Carousel.module.scss";

export interface CarouselProps {
  title?: string;
  subtitle?: string;
  /** Show the pulsing "Live" indicator next to the title. */
  live?: boolean;
  /** Optional element rendered on the right of the header (e.g. a "See all" link). */
  action?: ReactNode;
  /** Per-item track width (CSS length). Defaults to a responsive clamp. */
  itemWidth?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable horizontal carousel — scroll-snap track + arrow controls that
 * disable at the ends. Touch users swipe; pointer users get arrows. Any fixed
 * set of children works (cards, tiles, packs…).
 */
export function Carousel({ title, subtitle, live, action, itemWidth, children, className }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync, children]);

  const nudge = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const style = itemWidth ? ({ ["--carousel-item" as string]: itemWidth } as React.CSSProperties) : undefined;

  return (
    <section className={cx(styles.carousel, className)}>
      {(title || action) && (
        <div className={styles.carousel__head}>
          <div className={styles.carousel__heading}>
            {title && (
              <h2 className={styles.carousel__title}>
                {title}
                {live && (
                  <span className={styles.carousel__live}>
                    <span className={styles.carousel__dot} /> Live
                  </span>
                )}
              </h2>
            )}
            {subtitle && <p className={styles.carousel__sub}>{subtitle}</p>}
          </div>
          <div className={styles.carousel__nav}>
            {action}
            <button
              className={styles.carousel__arrow}
              onClick={() => nudge(-1)}
              disabled={atStart}
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className={styles.carousel__arrow}
              onClick={() => nudge(1)}
              disabled={atEnd}
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
      <div ref={trackRef} className={styles.carousel__track} style={style}>
        {children}
      </div>
    </section>
  );
}
