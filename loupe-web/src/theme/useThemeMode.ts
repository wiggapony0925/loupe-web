import { useSyncExternalStore } from "react";
import {
  THEME_ATTRIBUTE,
  THEME_MODE,
  resolveThemeMode,
  type ThemeMode,
} from "@loupe/theme";

// Reads the current scheme from `<html data-theme>`; loupe is dark-first, so a
// missing/unknown attribute resolves to DARK (the host/ThemeProvider stamps the
// real value before paint).
const readThemeMode = (): ThemeMode => {
  if (typeof document === "undefined") return THEME_MODE.DARK;
  return resolveThemeMode(
    document.documentElement.getAttribute(THEME_ATTRIBUTE),
    THEME_MODE.DARK,
  );
};

// Multiple components may call useThemeMode(); a single shared observer +
// listener set lets them all react to the one `data-theme` change without each
// spinning up its own MutationObserver.
type ThemeChangeListener = () => void;
const themeChangeListeners = new Set<ThemeChangeListener>();
let observer: MutationObserver | null = null;

const notifyAllListeners = () => {
  themeChangeListeners.forEach((listener) => listener());
};

// Starts the shared observer the first time anyone subscribes.
const startObserving = () => {
  if (observer || typeof MutationObserver === "undefined") return;
  observer = new MutationObserver(notifyAllListeners);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTRIBUTE],
  });
};

const stopObserving = () => {
  if (!observer) return;
  observer.disconnect();
  observer = null;
};

// Adds a listener and returns its cleanup → the last unsubscribe tears the
// shared observer down so nothing leaks.
const subscribe = (listener: ThemeChangeListener): (() => void) => {
  themeChangeListeners.add(listener);
  startObserving();
  return () => {
    themeChangeListeners.delete(listener);
    if (themeChangeListeners.size === 0) stopObserving();
  };
};

/**
 * Returns the current `ThemeMode` and re-renders the consumer when the host
 * toggles `<html data-theme>` — no matter who changes it (ThemeProvider, the
 * OS in system mode, another tab, or a native WebView injecting the app's
 * theme into the embedded dev portal). Built on `useSyncExternalStore`
 * (tearing-safe + SSR-safe).
 */
export const useThemeMode = (): ThemeMode =>
  useSyncExternalStore(
    subscribe,
    readThemeMode,
    /* getServerSnapshot */ () => THEME_MODE.DARK,
  );
