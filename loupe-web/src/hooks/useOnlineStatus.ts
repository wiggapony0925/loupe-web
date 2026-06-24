import { useState } from "react";
import { useEventListener } from "./useEventListener";

/**
 * Reactive network status — seeds from `navigator.onLine` and tracks the
 * `online`/`offline` window events. SSR-safe (assumes online when there's no
 * `navigator`).
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );

  useEventListener("online", () => setOnline(true));
  useEventListener("offline", () => setOnline(false));

  return online;
}
