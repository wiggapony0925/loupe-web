import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useActiveTheme } from "./useActiveTheme";

/** Theme preference the user can pick. `system` follows the OS. */
export type ThemeMode = "light" | "dark" | "system";
/** The concrete scheme actually painted (never `system`). */
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = "loupe.theme";

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Read the current OS color-scheme preference. */
function systemScheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Collapse a `ThemeMode` to the scheme that should actually render. */
function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? systemScheme() : mode;
}

/**
 * Owns theme state, persists the preference, and stamps `data-theme` on
 * <html> — the single switch that flips every CSS variable (CXO pattern).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored ?? "system";
  });
  // The painted theme — derived from <html data-theme> via MutationObserver, so
  // it stays correct even when the attribute changes outside React (the OS in
  // system mode, another tab, or a native WebView injecting the app's theme into
  // the embedded dev portal).
  const resolved = useActiveTheme();

  // Stamp the resolved scheme onto <html> whenever the preference changes.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolve(mode));
  }, [mode]);

  // In system mode, mirror live OS theme changes onto <html>; the observer above
  // then propagates them into `resolved`.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () =>
      document.documentElement.setAttribute("data-theme", systemScheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  // Toggle flips to the opposite of what's currently painted.
  const toggle = useCallback(() => {
    setMode(resolve(mode) === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
