import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Observe an element and report when it scrolls into view (for scroll-reveal). */
export function useInView<T extends HTMLElement>(opts?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          if (opts?.once !== false) ob.disconnect();
        } else if (opts?.once === false) {
          setInView(false);
        }
      },
      { threshold: opts?.threshold ?? 0.25, rootMargin: opts?.rootMargin ?? "0px" },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [opts?.threshold, opts?.rootMargin, opts?.once]);

  return [ref, inView] as const;
}

/** Animate a number from 0 → target once `active` becomes true. */
export function useCountUp(target: number, active: boolean, duration = 950) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
}
