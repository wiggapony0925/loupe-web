import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { api, configureApi } from "@loupe/core";
import { server } from "./server";

/**
 * Demonstrates the MSW setup end to end: a mocked backend response flows
 * through the real `@loupe/core` API client + adapters and comes out as the
 * UI-facing `CardSummary` shape — no live backend required.
 */
describe("MSW · API client integration", () => {
  it("maps a mocked /v1/public/trending payload into CardSummary[]", async () => {
    configureApi({ baseUrl: "" });
    server.use(
      http.get("*/v1/public/trending", () =>
        HttpResponse.json({
          cards: [
            {
              id: "pkmn:1",
              name: "Pikachu",
              set_name: "Base Set",
              image_url: "https://img.test/pika.png",
              pricing_summary: { market: { amount: 12.5, currency: "USD" } },
            },
          ],
        }),
      ),
    );

    const cards = await api.cards.publicTrending({ limit: 1 });

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: "pkmn:1",
      name: "Pikachu",
      setName: "Base Set",
    });
    expect(cards[0]?.price).toEqual({ amount: 12.5, currency: "USD" });
  });
});
