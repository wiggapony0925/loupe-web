import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { ThemeProvider } from "@/theme";
import { AuthProvider } from "@/auth/AuthProvider";
import { ProProvider } from "@/pro";
import { DisplayCurrencyProvider } from "@/providers/DisplayCurrencyProvider";
import { ConfirmProvider, TooltipProvider } from "@/components";
import { reportError } from "@/observability/sentry";

const DAY_MS = 1000 * 60 * 60 * 24;

// React Query inspector — dev-only. The lazy import is gated on `import.meta.env.DEV`
// so it compiles to `() => null` and is tree-shaken out of the production bundle.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : () => null;

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
        // Report every failed query/mutation to Sentry from one place — the key
        // gives context for which request failed — so no per-call error plumbing
        // is needed anywhere in the app.
        queryCache: new QueryCache({
          onError: (error, query) =>
            reportError(error, { kind: "query", queryKey: query.queryKey }),
        }),
        mutationCache: new MutationCache({
          onError: (error, _vars, _ctx, mutation) =>
            reportError(error, {
              kind: "mutation",
              mutationKey: mutation.options.mutationKey,
            }),
        }),
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
          <ProProvider>
            <DisplayCurrencyProvider>
              <ConfirmProvider>
                <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
              </ConfirmProvider>
            </DisplayCurrencyProvider>
          </ProProvider>
        </AuthProvider>
      </ThemeProvider>
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </Suspense>
      )}
    </PersistQueryClientProvider>
  );
}
