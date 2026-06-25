import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  configureApi,
  usePublicTrending,
  usePublicSearch,
  useCardHoldings,
  type CardSummary,
  type CardOwnership,
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

  it("useCardHoldings maps the ownership envelope to a typed CardOwnership", async () => {
    server.use(
      http.get("*/v1/cards/:id/ownership", () =>
        HttpResponse.json({
          owned: true,
          copies: 2,
          cost_basis_usd: "160.00",
          holding_value_usd: "300.00",
          unrealized_pl_usd: "140.00",
          unrealized_pl_pct: 87.5,
          holdings: [
            {
              holding_id: "h1",
              grade: "9.0",
              house: "psa",
              is_graded: true,
              acquired_via: "scan",
              estimated_value_usd: "250.00",
              purchase_price_usd: "100.00",
              days_held: 30,
              unrealized_pl_usd: "150.00",
              unrealized_pl_pct: 150,
              graded_at: "2026-01-01T00:00:00Z",
            },
            {
              holding_id: "h2",
              grade: "8.0",
              house: "loupe",
              is_graded: false,
              estimated_value_usd: "50.00",
              purchase_price_usd: "60.00",
              graded_at: "2026-01-02T00:00:00Z",
            },
          ],
        }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCardHoldings("pkmn:1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const own: CardOwnership | undefined = result.current.data;
    expect(own?.owned).toBe(true);
    expect(own?.copies).toBe(2);
    // Decimal strings are coerced to numbers; snake_case → camelCase.
    expect(own?.costBasisUsd).toBe(160);
    expect(own?.holdingValueUsd).toBe(300);
    expect(own?.unrealizedPlUsd).toBe(140);
    expect(own?.holdings[0]).toMatchObject({
      holdingId: "h1",
      grade: 9,
      house: "psa",
      isGraded: true,
      acquiredVia: "scan",
      purchasePriceUsd: 100,
      estimatedValueUsd: 250,
      daysHeld: 30,
    });
    // Raw copy keeps is_graded=false and no acquisition source.
    expect(own?.holdings[1]?.isGraded).toBe(false);
    expect(own?.holdings[1]?.acquiredVia).toBeNull();
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
