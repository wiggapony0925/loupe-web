import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(mode));

  // Apply the resolved scheme to the DOM + keep React state in sync.
  useEffect(() => {
    const next = resolve(mode);
    document.documentElement.setAttribute("data-theme", next);
    setResolved(next);
  }, [mode]);

  // When following the system, react live to OS theme changes.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = systemScheme();
      document.documentElement.setAttribute("data-theme", next);
      setResolved(next);
    };
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
