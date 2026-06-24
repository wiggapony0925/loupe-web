import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  configureApi,
  usePublicTrending,
  usePublicSearch,
  type CardSummary,
  type SearchPage,
} from "@loupe/core";
import { server } from "./msw/server";
import { createQueryWrapper } from "./queryWrapper";

const meta = { request_id: "t", timestamp: "", version: "1", duration_ms: 1 };

/**
 * Exercises the real `@loupe/core` TanStack Query hooks against a mocked
 * backend (MSW) — proving the query → api client → adapter → typed UI shape
 * pipeline works, with no live backend. The harness (createQueryWrapper +
 * the global MSW server) is reusable for any other hook.
 */
describe("@loupe/core query hooks · TanStack Query + MSW", () => {
  beforeEach(() => configureApi({ baseUrl: "" }));

  it("usePublicTrending resolves a typed CardSummary[]", async () => {
    server.use(
      http.get("*/v1/public/trending", () =>
        HttpResponse.json({
          cards: [
            {
              id: "pkmn:1",
              name: "Pikachu",
              set_name: "Base Set",
              image_url: "https://img.test/p.png",
              pricing_summary: { market: { amount: 5, currency: "USD" } },
            },
          ],
        }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePublicTrending({ limit: 1 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Type safety: data is `CardSummary[] | undefined` — this assignment only
    // compiles because the hook is generically typed end to end.
    const cards: CardSummary[] | undefined = result.current.data;
    expect(cards?.[0]).toMatchObject({
      id: "pkmn:1",
      name: "Pikachu",
      setName: "Base Set",
    });
    expect(cards?.[0]?.price).toEqual({ amount: 5, currency: "USD" });
  });

  it("usePublicSearch resolves a typed SearchPage", async () => {
    server.use(
      http.get("*/v1/public/search", () =>
        HttpResponse.json({
          results: [
            { id: "pkmn:2", name: "Charizard", set_name: "Base Set", image_url: "y" },
          ],
          total: 1,
          page: 1,
          page_size: 12,
          facets: { rarities: ["Rare"], sets: ["Base Set"] },
        }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => usePublicSearch({ q: "char", tcg: "pokemon" }, true),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const page: SearchPage | undefined = result.current.data;
    expect(page?.total).toBe(1);
    expect(page?.results[0]?.name).toBe("Charizard");
    expect(page?.facets.rarities).toContain("Rare");
  });

  it("surfaces backend errors as an error state", async () => {
    server.use(
      http.get("*/v1/public/trending", () =>
        HttpResponse.json(
          {
            data: null,
            meta,
            pagination: null,
            error: { code: "boom", message: "nope", status: 500, field: null, details: null },
          },
          { status: 500 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePublicTrending(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
