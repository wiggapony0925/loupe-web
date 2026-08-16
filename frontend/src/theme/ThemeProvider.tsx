/**
 * Theme system — the loupe-web pattern: a mode ('light' | 'dark' | 'system')
 * persisted in localStorage, resolved against prefers-color-scheme, and
 * applied as `data-theme` on <html> where the CSS custom properties live.
 * index.html runs the same resolution pre-paint, so this provider never
 * causes a theme flash — it only keeps the attribute current (system
 * changes, user toggles) and syncs the native chrome (status bar, tab tint).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'trackify.theme';
const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#f2f3f5', dark: '#0b0c0e' };

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function storedMode(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(storedMode);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent): void => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolved: ResolvedTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[resolved]);
    if (Capacitor.isNativePlatform()) {
      // Capacitor naming: Style.Dark = dark bar (light text), Style.Light =
      // light bar (dark text) — i.e. it matches the THEME, not the text.
      void StatusBar.setStyle({ style: resolved === 'dark' ? Style.Dark : Style.Light }).catch(
        () => undefined,
      );
      void StatusBar.setBackgroundColor({ color: THEME_COLOR[resolved] }).catch(() => undefined);
    }
  }, [resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private-mode storage failure: theme still works for the session.
    }
  }, []);

  const cycleMode = useCallback(() => {
    setMode(mode === 'system' ? 'dark' : mode === 'dark' ? 'light' : 'system');
  }, [mode, setMode]);

  const value = useMemo(
    () => ({ mode, resolved, setMode, cycleMode }),
    [mode, resolved, setMode, cycleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
