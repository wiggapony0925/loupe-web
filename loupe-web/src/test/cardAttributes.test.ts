import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { api, configureApi } from "@loupe/core";
import { server } from "./msw/server";

/**
 * `api.cards.attributes` end-to-end: the basic card endpoint's `attributes`
 * block → typed CardAttributes. Locks down that the structured Pokémon data
 * (attacks / abilities / weakness / resistance / retreat / artist) survives the
 * adapter instead of being dropped, and that links/ids don't leak into `extra`.
 */
describe("card attributes adapter", () => {
  beforeEach(() => configureApi({ baseUrl: "" }));

  it("carries through structured Pokémon attributes", async () => {
    server.use(
      http.get("*/v1/cards/*", () =>
        HttpResponse.json({
          id: "pokemontcg:dp3-3",
          name: "Charizard",
          tcg: "pokemon",
          attributes: {
            hp: "130",
            types: ["Fire"],
            subtypes: ["Stage 2"],
            evolvesFrom: "Charmeleon",
            abilities: [{ name: "Fury Blaze", text: "…", type: "Poké-Body" }],
            attacks: [
              {
                name: "Blast Burn",
                cost: ["Fire", "Fire", "Fire", "Colorless"],
                damage: "120",
                text: "Flip a coin…",
              },
            ],
            weaknesses: [{ type: "Water", value: "+40" }],
            resistances: [{ type: "Fighting", value: "-20" }],
            retreatCost: ["Colorless", "Colorless", "Colorless"],
            artist: "Daisuke Ito",
            flavorText: "It is said that…",
            tcgplayer_url: "https://www.tcgplayer.com/x",
            legalities: { unlimited: "Legal" },
          },
        }),
      ),
    );

    const a = await api.cards.attributes("pokemontcg:dp3-3");
    expect(a).not.toBeNull();
    expect(a!.tcg).toBe("pokemon");
    expect(a!.hp).toBe(130); // "130" → number
    expect(a!.subtypes).toEqual(["Stage 2"]);
    expect(a!.evolvesFrom).toBe("Charmeleon");
    expect(a!.attacks?.[0]).toMatchObject({
      name: "Blast Burn",
      cost: ["Fire", "Fire", "Fire", "Colorless"],
      damage: "120",
    });
    expect(a!.abilities?.[0]).toMatchObject({ name: "Fury Blaze", type: "Poké-Body" });
    expect(a!.weaknesses?.[0]).toEqual({ type: "Water", value: "+40" });
    expect(a!.resistances?.[0]).toEqual({ type: "Fighting", value: "-20" });
    expect(a!.retreatCost).toHaveLength(3);
    expect(a!.artist).toBe("Daisuke Ito");

    // Links / opaque blobs must not leak into the generic `extra` table.
    expect(a!.extra.tcgplayer_url).toBeUndefined();
    expect(a!.extra.legalities).toBeUndefined();
  });

  it("returns null when a card has no attributes", async () => {
    server.use(
      http.get("*/v1/cards/*", () =>
        HttpResponse.json({ id: "x", name: "X", tcg: "pokemon", attributes: null }),
      ),
    );
    expect(await api.cards.attributes("x")).toBeNull();
  });
});
