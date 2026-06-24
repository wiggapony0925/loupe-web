import { useEffect, useRef } from "react";

/**
 * Subscribe to an event with automatic cleanup. The handler is held in a ref so
 * the listener stays attached across re-renders while always invoking the latest
 * closure (no detach/reattach churn). Defaults to `window`; pass a `target` for
 * document- or element-scoped listeners.
 */
export function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  target: EventTarget | null = typeof window !== "undefined" ? window : null,
  options?: boolean | AddEventListenerOptions,
): void {
  const saved = useRef(handler);
  useEffect(() => {
    saved.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!target) return;
    const listener = (event: Event) => saved.current(event as WindowEventMap[K]);
    target.addEventListener(type, listener, options);
    return () => target.removeEventListener(type, listener, options);
  }, [type, target, options]);
}
