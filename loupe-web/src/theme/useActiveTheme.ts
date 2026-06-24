import { useSyncExternalStore } from "react";
import type { ResolvedTheme } from "./ThemeProvider";

function getSnapshot(): ResolvedTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function subscribe(onChange: () => void): () => void {
  if (typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

/**
 * The theme actually painted on `<html data-theme>`, tracked reactively via a
 * MutationObserver — so it stays correct no matter who changes the attribute:
 * the ThemeProvider, the OS (system mode), another tab, or a native WebView
 * injecting the app's theme into the embedded dev portal. Built on
 * `useSyncExternalStore` (tearing-safe + SSR-safe).
 */
export function useActiveTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, getSnapshot, () => "dark");
}
