import { type RefObject } from "react";
import { useEventListener } from "./useEventListener";

/**
 * Invoke `handler` when a pointer press lands outside the referenced element.
 * Drives dropdowns, popovers, and comboboxes that should dismiss on outside
 * click. Listens on `mousedown` (fires before focus shifts / click completes).
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent) => void,
): void {
  useEventListener(
    "mousedown",
    (event) => {
      const el = ref.current;
      if (el && !el.contains(event.target as Node)) handler(event);
    },
    document,
  );
}
