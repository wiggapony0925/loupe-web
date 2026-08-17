/**
 * Connectivity bridge — Capacitor Network on device, online/offline events
 * on the web. One subscription shape either way; fires immediately with the
 * current state so consumers never start out of sync.
 */
import { Network } from '@capacitor/network';
import type { PluginListenerHandle } from '@capacitor/core';
import { isNative } from './platform';

export function subscribeConnectivity(onChange: (connected: boolean) => void): () => void {
  if (isNative()) {
    let handle: PluginListenerHandle | null = null;
    void Network.getStatus()
      .then((status) => onChange(status.connected))
      .catch(() => onChange(true));
    void Network.addListener('networkStatusChange', (status) => onChange(status.connected)).then(
      (h) => {
        handle = h;
      },
    );
    return () => {
      void handle?.remove();
    };
  }

  onChange(navigator.onLine);
  const online = (): void => onChange(true);
  const offline = (): void => onChange(false);
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  return () => {
    window.removeEventListener('online', online);
    window.removeEventListener('offline', offline);
  };
}
