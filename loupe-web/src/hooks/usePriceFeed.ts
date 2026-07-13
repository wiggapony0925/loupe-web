/**
 * usePriceFeed — live `price.tick` frames from `/ws/prices`.
 *
 * Opens one authenticated socket while signed in (same-origin; nginx/vite
 * proxy the upgrade to the API). Every tick means a card the user OWNS
 * just changed price, so we refresh the money surfaces — throttled, since
 * a backfill sweep can tick a whole vault in seconds and each surface
 * only needs one repaint per burst.
 *
 * Reconnects with capped backoff; closes on sign-out/unmount. Silent on
 * failure — polling staleTimes remain the fallback freshness path.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS, getApiConfig } from "@loupe/core";

const INVALIDATE_EVERY_MS = 5_000;
const RECONNECT_MAX_MS = 60_000;

export function usePriceFeed(enabled: boolean): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let ws: WebSocket | null = null;
    let closed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let lastInvalidate = 0;

    const invalidate = () => {
      const now = Date.now();
      if (now - lastInvalidate < INVALIDATE_EVERY_MS) return;
      lastInvalidate = now;
      for (const key of [
        ["vault-summary"],
        ["grades"],
        ["analytics-overview"],
        ["home-feed"],
      ]) {
        void qc.invalidateQueries({ queryKey: key });
      }
    };

    const connect = () => {
      const token = getApiConfig().getToken?.();
      if (closed || !token) return;
      const origin = window.location.origin.replace(/^http/, "ws");
      ws = new WebSocket(
        `${origin}${ENDPOINTS.ws.prices}?token=${encodeURIComponent(token)}`,
      );
      ws.onopen = () => {
        attempt = 0;
      };
      ws.onmessage = (ev) => {
        try {
          const frame = JSON.parse(String(ev.data)) as { type?: string };
          if (frame?.type === "price.tick") invalidate();
        } catch {
          // Non-JSON frame — ignore.
        }
      };
      ws.onclose = () => {
        if (closed) return;
        attempt += 1;
        const delay = Math.min(1_000 * 2 ** attempt, RECONNECT_MAX_MS);
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled, qc]);
}
