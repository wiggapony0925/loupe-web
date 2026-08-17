/**
 * App lifecycle bridge (@capacitor/app):
 *  - resume: refresh-on-return (web fallback: visibilitychange)
 *  - Android hardware back: navigate back, or background the app at root
 *  - deep links: trackify://… and universal https links → in-app routes
 */
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { isNative } from './platform';

export function onAppResume(callback: () => void): () => void {
  if (isNative()) {
    let handle: PluginListenerHandle | null = null;
    void App.addListener('resume', callback).then((h) => {
      handle = h;
    });
    return () => {
      void handle?.remove();
    };
  }
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') callback();
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => document.removeEventListener('visibilitychange', onVisibility);
}

/** canGoBack() decides between history.back() and backgrounding the app. */
export function onHardwareBack(callback: () => { handled: boolean }): () => void {
  if (!isNative()) return () => undefined;
  let handle: PluginListenerHandle | null = null;
  void App.addListener('backButton', () => {
    const { handled } = callback();
    if (!handled) void App.minimizeApp().catch(() => undefined);
  }).then((h) => {
    handle = h;
  });
  return () => {
    void handle?.remove();
  };
}

/** Extracts an app path from `trackify://feed?txn=x` or a universal link. */
export function onDeepLink(callback: (path: string) => void): () => void {
  if (!isNative()) return () => undefined;
  let handle: PluginListenerHandle | null = null;
  void App.addListener('appUrlOpen', (event) => {
    try {
      const url = new URL(event.url);
      const path = url.protocol.startsWith('http')
        ? url.pathname + url.search
        : `/${url.host}${url.pathname}${url.search}`; // custom scheme: host is the first segment
      callback(path);
    } catch {
      // Malformed link — ignore rather than crash the resume path.
    }
  }).then((h) => {
    handle = h;
  });
  return () => {
    void handle?.remove();
  };
}
