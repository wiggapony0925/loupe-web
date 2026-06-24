import { describe, it, expect } from "vitest";
import type { ScanCandidate } from "@loupe/core";
import { candidateArt } from "./candidateArt";

const cand = (
  p: Partial<ScanCandidate> & Pick<ScanCandidate, "id">,
): ScanCandidate => ({ name: "Card", confidence: 0.9, ...p });

describe("candidateArt", () => {
  it("prefers an explicit imageUrl", () => {
    expect(
      candidateArt(cand({ id: "pokemontcg:base1-58", imageUrl: "https://img/x.png" })),
    ).toBe("https://img/x.png");
  });

  it("derives Pokémon art from a pokemontcg id", () => {
    expect(candidateArt(cand({ id: "pokemontcg:base1-58" }))).toBe(
      "https://images.pokemontcg.io/base1/58.png",
    );
  });

  it("derives Yu-Gi-Oh! art from a ygoprodeck id", () => {
    expect(candidateArt(cand({ id: "ygoprodeck:12345" }))).toBe(
      "https://images.ygoprodeck.com/images/cards/12345.jpg",
    );
  });

  it("derives Magic art from a scryfall id", () => {
    expect(candidateArt(cand({ id: "scryfall:abc-123" }))).toBe(
      "https://api.scryfall.com/cards/abc-123?format=image&version=small",
    );
  });

  it("returns an empty string when nothing can be derived", () => {
    expect(candidateArt(cand({ id: "" }))).toBe("");
  });
});
