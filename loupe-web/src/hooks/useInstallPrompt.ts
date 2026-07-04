import { useSyncExternalStore } from "react";
import {
  canPromptInstall,
  isIosSafariBrowser,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from "@/lib/installPrompt";

export interface InstallPromptState {
  /** A native install prompt is ready (Chrome/Edge/Android). */
  canInstall: boolean;
  /** iOS Safari: installable only via the manual Share → Add to Home Screen. */
  showIosHint: boolean;
  /** Show the browser's install dialog; resolves true on accept. */
  install: () => Promise<boolean>;
}

/**
 * Install-to-home-screen state for the current browser. Everything is false
 * once the app already runs standalone, so install UI disappears after install.
 */
export function useInstallPrompt(): InstallPromptState {
  const canInstall = useSyncExternalStore(
    subscribeInstall,
    canPromptInstall,
    () => false,
  );
  const standalone = isStandalone();
  return {
    canInstall: canInstall && !standalone,
    showIosHint: !standalone && !canInstall && isIosSafariBrowser(),
    install: promptInstall,
  };
}
