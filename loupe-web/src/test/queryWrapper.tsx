import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";

/**
 * A fresh QueryClient + provider for hook tests. Retries off and zero cache so
 * each test is isolated, deterministic, and fast. Pair with MSW (the global
 * server in test/setup.ts) to drive `@loupe/core` query hooks end to end:
 *
 *   const { Wrapper } = createQueryWrapper();
 *   const { result } = renderHook(() => usePublicTrending(), { wrapper: Wrapper });
 *   await waitFor(() => expect(result.current.isSuccess).toBe(true));
 */
export function createQueryWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, Wrapper };
}
