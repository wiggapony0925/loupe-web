/**
 * AnimatedNumber — tweens between values with an ease-out rAF loop, the
 * Robinhood/Polymarket ticker feel. `instant` bypasses the tween (used while
 * scrubbing, where the finger IS the animation); reduced-motion always jumps.
 */
import { useEffect, useRef, useState } from 'react';

export interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  instant?: boolean;
  durationMs?: number;
}

export function AnimatedNumber({ value, format, instant = false, durationMs = 420 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  displayRef.current = display;

  useEffect(() => {
    const from = displayRef.current;
    if (from === value) return;
    if (instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, instant, durationMs]);

  return <span className="animated-number">{format(display)}</span>;
}
