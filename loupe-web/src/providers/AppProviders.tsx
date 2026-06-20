import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useState, type ReactNode } from "react";
import { ThemeProvider } from "@/theme";
import { AuthProvider } from "@/auth/AuthProvider";
import { TooltipProvider } from "@/components";

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Catalog query keys worth persisting to disk. Card identity (names, sets, art,
 * rarity) barely changes — only pricing drifts — so we cache these across
 * reloads: cards render instantly from disk while prices refresh in the
 * background. User-specific/admin queries are intentionally NOT persisted
 * (no stale private data across sessions; they refetch live).
 */
const PERSISTED_QUERY_KEYS = new Set([
  "trending",
  "public-trending",
  "public-browse",
  "public-search",
  "search",
  "card",
  "market",
  "prices",
  "marketplace-prices",
  "flags",
]);

/**
 * Root provider stack — kept shallow (CXO avoids "provider hell").
 * Server state: TanStack Query (persisted catalog cache) · Theme + Auth:
 * Context · global UI: Zustand.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // gcTime must outlive the persisted maxAge so restored catalog
          // queries aren't garbage-collected before they're reused.
          queries: { staleTime: 30_000, gcTime: DAY_MS, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  const [persistOptions] = useState(() => ({
    persister: createSyncStoragePersister({
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      key: "loupe.query-cache",
    }),
    maxAge: DAY_MS,
    dehydrateOptions: {
      // Only persist successful catalog queries (skip private/admin data).
      shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string } }) =>
        query.state.status === "success" && PERSISTED_QUERY_KEYS.has(query.queryKey[0] as string),
    },
  }));

  return (
    <PersistQueryClientProvider client={client} persistOptions={persistOptions}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
