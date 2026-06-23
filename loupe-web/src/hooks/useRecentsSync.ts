import { useEffect, useRef } from "react";
import { api, type RecentViewedItem } from "@loupe/core";
import { useAuth } from "@/auth/AuthProvider";
import { useRecentStore } from "@/stores/recentStore";

const MAX_SEARCHES = 8;
const MAX_VIEWED = 12;

function mergeSearches(local: string[], server: string[]): string[] {
  const out: string[] = [];
  for (const s of [...local, ...server]) {
    if (s && !out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
    if (out.length >= MAX_SEARCHES) break;
  }
  return out;
}

function mergeViewed(
  local: RecentViewedItem[],
  server: RecentViewedItem[],
): RecentViewedItem[] {
  const out: RecentViewedItem[] = [];
  const seen = new Set<string>();
  for (const v of [...local, ...server]) {
    if (v?.id && !seen.has(v.id)) {
      seen.add(v.id);
      out.push(v);
    }
    if (out.length >= MAX_VIEWED) break;
  }
  return out;
}

/**
 * Cross-device sync for the local recents store. On sign-in we pull the
 * server copy, merge it with whatever the device accumulated while signed
 * out, and push the merged list back. While signed in, local changes are
 * debounced up to the server so the user's recents follow them between
 * web + mobile. Failures stay silent — recents are best-effort, never block.
 */
export function useRecentsSync() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const pulledFor = useRef<string | null>(null);

  // Pull + merge on sign-in (once per user).
  useEffect(() => {
    if (!userId) {
      pulledFor.current = null;
      return;
    }
    if (pulledFor.current === userId) return;
    pulledFor.current = userId;
    let cancelled = false;
    void (async () => {
      try {
        const server = await api.me.recents();
        if (cancelled) return;
        const local = useRecentStore.getState();
        const searches = mergeSearches(local.searches, server.searches ?? []);
        const viewed = mergeViewed(local.viewed, server.viewed ?? []);
        useRecentStore.setState({ searches, viewed });
        await api.me.putRecents({ searches, viewed });
      } catch {
        /* offline / not-yet-authed — keep the device-local copy */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Debounced push of local changes while signed in.
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useRecentStore.subscribe((state) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void api.me
          .putRecents({ searches: state.searches, viewed: state.viewed })
          .catch(() => {});
      }, 1500);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [userId]);
}
