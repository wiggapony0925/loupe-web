import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/cx";
import { smoothScrollTo, cloneCarouselChildren } from "./carousel.utils";
import styles from "./Carousel.module.scss";

/** Configuration constants for Carousel autoplay & slide transitions */
const SCROLL_STEP_RATIO = 1.0; // Scroll 100% of the visible container to show a completely fresh batch of cards
const WRAP_OFFSET_TOLERANCE = 5; // Pixel threshold to trigger seamless loop wrap-around
const ARROW_NUDGE_DURATION = 400; // Smoother 400ms transition for manual arrow clicks

export interface CarouselProps {
  title?: string;
  subtitle?: string;
  /** Show the pulsing "Live" indicator next to the title. */
  live?: boolean;
  /** Optional element rendered on the right of the header (e.g. a "See all" link). */
  action?: ReactNode;
  /** Per-item track width (CSS length). Defaults to a responsive clamp. */
  itemWidth?: string;
  /** Autoplay animation to scroll at a constant speed (boolean for 3s, or number for custom ms). */
  animation?: boolean | number;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable horizontal carousel — scroll-snap track + arrow controls that
 * disable at the ends. Touch users swipe; pointer users get arrows. Any fixed
 * set of children works (cards, tiles, packs…).
 */
export function Carousel({
  title,
  subtitle,
  live,
  action,
  itemWidth,
  animation,
  children,
  className,
}: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isArrowAnimating, setIsArrowAnimating] = useState(false);

  const [repetitionCount, setRepetitionCount] = useState(3);
  const scrollTimeoutRef = useRef<number | null>(null);
  const isScrollingRef = useRef(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;

    // Track user active scrolling (e.g. trackpad, mouse wheel, or momentum)
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);

    if (animation) {
      setAtStart(false);
      setAtEnd(false);

      // Handle seamless wrap-around when the user is NOT interacting or animating
      if (!isInteracting && !isArrowAnimating) {
        const originalWidth = el.scrollWidth / repetitionCount;
        const leftLimit = originalWidth;
        const rightLimit = el.scrollWidth - el.clientWidth - originalWidth;

        if (el.scrollLeft < leftLimit) {
          el.scrollLeft += originalWidth;
        } else if (el.scrollLeft >= rightLimit) {
          el.scrollLeft -= originalWidth;
        }
      }
    } else {
      setAtStart(el.scrollLeft <= 2);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - WRAP_OFFSET_TOLERANCE);
    }
  }, [animation, repetitionCount, isInteracting, isArrowAnimating]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [sync, children]);

  // Track pointer/touch events to pause continuous autoplay when user is interacting
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const start = () => setIsInteracting(true);
    const end = () => setIsInteracting(false);

    el.addEventListener("pointerdown", start, { passive: true });
    window.addEventListener("pointerup", end, { passive: true });
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchend", end, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", start);
      window.removeEventListener("pointerup", end);
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchend", end);
    };
  }, []);

  // Measure container and content width to dynamically calculate required clone repetitions.
  // This supports ultra-wide monitors, zoomed-out browsers, or small lists seamlessly.
  useEffect(() => {
    if (!animation) return;
    const el = trackRef.current;
    if (!el) return;

    const measure = () => {
      const clientWidth = el.clientWidth;
      const scrollWidth = el.scrollWidth;
      if (clientWidth <= 0 || scrollWidth <= 0) return;

      const originalWidth = scrollWidth / repetitionCount;
      if (originalWidth <= 0) return;

      // Initialize scroll position to the first clone set (middle section) to avoid starting at 0
      if (el.scrollLeft === 0) {
        el.scrollLeft = originalWidth;
      }

      // We need enough copies so that: (N - 3) * originalWidth >= clientWidth
      // which simplifies to: N >= (clientWidth / originalWidth) + 3
      const neededCount = Math.max(3, Math.ceil(clientWidth / originalWidth) + 3);

      if (neededCount !== repetitionCount) {
        setRepetitionCount(neededCount);
      }
    };

    measure();
    // Run measure again after a short timeout to ensure children layout is fully completed
    const t = setTimeout(measure, 100);

    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [animation, children, repetitionCount]);

  const nudge = useCallback((dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;

    setIsArrowAnimating(true);

    const boundaryWidth = animation ? el.scrollWidth / repetitionCount : el.scrollWidth;
    const step = el.clientWidth * SCROLL_STEP_RATIO;
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (animation) {
      // For infinite carousel, first handle wrapping left if we are near the left edge
      let currentScroll = el.scrollLeft;
      if (dir === -1 && currentScroll - step < boundaryWidth) {
        // Instantly jump forward by boundaryWidth
        currentScroll += boundaryWidth;
        el.scrollLeft = currentScroll;
      }

      const target = currentScroll + dir * step;
      smoothScrollTo(el, Math.max(0, Math.min(target, maxScroll)), ARROW_NUDGE_DURATION);

      setTimeout(() => {
        setIsArrowAnimating(false);
        // Clean wrap-around after animation ends
        const updatedScroll = el.scrollLeft;
        const rightLimit = el.scrollWidth - el.clientWidth - boundaryWidth;
        if (updatedScroll >= rightLimit) {
          el.scrollLeft = updatedScroll - boundaryWidth;
        } else if (updatedScroll < boundaryWidth) {
          el.scrollLeft = updatedScroll + boundaryWidth;
        }
      }, ARROW_NUDGE_DURATION + 50);
    } else {
      // Normal bounded scrolling
      const target = el.scrollLeft + dir * step;
      const maxNormalScroll = boundaryWidth - el.clientWidth;
      smoothScrollTo(el, Math.max(0, Math.min(target, maxNormalScroll)), ARROW_NUDGE_DURATION);
      
      setTimeout(() => {
        setIsArrowAnimating(false);
      }, ARROW_NUDGE_DURATION + 50);
    }
  }, [animation, repetitionCount]);

  // Auto-swipe every 3 seconds (or custom ms) if animation is enabled
  useEffect(() => {
    if (!animation) return;

    const interval = typeof animation === "number" ? animation : 3000;

    const tick = () => {
      if (!isHovered && !isInteracting && !isArrowAnimating && !isScrollingRef.current) {
        nudge(1);
      }
    };

    const timer = setInterval(tick, interval);

    return () => {
      clearInterval(timer);
    };
  }, [animation, isHovered, isInteracting, isArrowAnimating, nudge]);

  const style = itemWidth ? ({ ["--carousel-item" as string]: itemWidth } as React.CSSProperties) : undefined;

  return (
    <section
      className={cx(styles.carousel, className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
              disabled={animation ? false : atStart}
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className={styles.carousel__arrow}
              onClick={() => nudge(1)}
              disabled={animation ? false : atEnd}
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
      <div 
        ref={trackRef} 
        className={cx(
          styles.carousel__track, 
          (Boolean(animation) || isArrowAnimating) && styles.carousel__trackNoSnap
        )} 
        style={style}
      >
        {animation ? cloneCarouselChildren(children, repetitionCount) : children}
      </div>
    </section>
  );
}
