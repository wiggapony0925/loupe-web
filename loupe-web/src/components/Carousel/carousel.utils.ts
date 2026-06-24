import { Children, cloneElement, isValidElement, type ReactNode } from "react";

/**
 * Buttery-smooth custom ease-in-out scroll transition using requestAnimationFrame (for manual arrow clicks)
 */
export function smoothScrollTo(element: HTMLDivElement, target: number, duration: number = 750) {
  const start = element.scrollLeft;
  const change = target - start;
  if (change === 0) return;
  const startTime = performance.now();

  function animateScroll(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease In Out Quad curve
    const easeProgress = progress < 0.5 
      ? 2 * progress * progress 
      : -1 + (4 - 2 * progress) * progress;

    element.scrollLeft = start + change * easeProgress;

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }

  requestAnimationFrame(animateScroll);
}

/**
 * Clones and appends children multiple times to enable infinite wrap-around scrolling without duplicate React key warnings.
 */
export function cloneCarouselChildren(children: ReactNode, count: number = 2): ReactNode[] {
  const original = Children.toArray(children);
  const result: ReactNode[] = [...original];

  for (let i = 1; i < count; i++) {
    const clones = original.map((child, index) => {
      if (isValidElement(child)) {
        return cloneElement(child, {
          key: `clone-${i}-${child.key ?? index}`,
        });
      }
      return child;
    });
    result.push(...clones);
  }

  return result;
}
