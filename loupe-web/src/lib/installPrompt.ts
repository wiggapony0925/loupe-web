/**
 * PWA install plumbing. Chrome/Edge/Android fire `beforeinstallprompt` once,
 * often before React mounts — so this module captures it at import time
 * (main.tsx imports it as a side effect) and `useInstallPrompt` subscribes to
 * the stashed event. iOS Safari never fires it; there the UI shows the
 * Share → "Add to Home Screen" hint instead.
 */

/** The non-standard Chromium event — not in TS's DOM lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we surface install from Settings, not the mini-infobar
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

/** Subscribe to install-state changes; returns the unsubscribe. */
export function subscribeInstall(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** True when a captured prompt is ready to show. */
export function canPromptInstall(): boolean {
  return deferred !== null;
}

/** Show the browser's install dialog. Resolves true when the user accepts. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null; // a prompt event is single-use
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}

/** Already running as an installed app (home-screen / dock launch). */
export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari's pre-standard flag.
      (navigator as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/**
 * iOS Safari — installable, but only manually via Share → Add to Home Screen
 * (no `beforeinstallprompt`). Excludes in-app WebViews, where installing
 * makes no sense.
 */
export function isIosSafariBrowser(): boolean {
  const ua = navigator.userAgent;
  const isIos =
    /iPhone|iPad|iPod/.test(ua) ||
    // iPadOS 13+ masquerades as macOS but is still touch-first Safari.
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const isWebView = !/Safari/.test(ua);
  return isIos && isSafari && !isWebView;
}
