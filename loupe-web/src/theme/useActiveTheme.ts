/**
 * Back-compat alias. The implementation now lives in `useThemeMode` — the
 * shared-observer hook built on the framework-agnostic `@loupe/theme` core.
 * `useActiveTheme` is kept so existing call sites (ThemeProvider, ThemedImage)
 * keep working; both return the resolved `'light' | 'dark'` scheme.
 */
export { useThemeMode as useActiveTheme } from "./useThemeMode";
