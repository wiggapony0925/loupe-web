import { useEffect, useState } from "react";

/**
 * Debounce a fast-changing value. Returns the latest value only after it has
 * stopped changing for `delayMs`; the pending update is cancelled on each
 * change and on unmount. Ideal for search inputs that drive a query.
 */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
