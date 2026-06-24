import { describe, it, expect } from "vitest";
import { hasScheme, isExternalUrl, isMarketplaceUrl } from "./url";

describe("url helpers", () => {
  it("hasScheme distinguishes in-app routes from URLs", () => {
    expect(hasScheme("/cards/123")).toBe(false);
    expect(hasScheme("cards/123")).toBe(false);
    expect(hasScheme("https://ebay.com")).toBe(true);
    expect(hasScheme("mailto:x@y.com")).toBe(true);
  });

  it("isExternalUrl is true only for off-origin links", () => {
    expect(isExternalUrl("https://ebay.com/x")).toBe(true);
    expect(isExternalUrl("/cards/1")).toBe(false);
  });

  it("isMarketplaceUrl flags known marketplaces only", () => {
    expect(isMarketplaceUrl("https://www.ebay.com/itm/123")).toBe(true);
    expect(isMarketplaceUrl("https://shop.tcgplayer.com/x")).toBe(true);
    expect(isMarketplaceUrl("https://www.facebook.com/marketplace/item/1")).toBe(true);
    expect(isMarketplaceUrl("https://example.com/blog")).toBe(false);
    expect(isMarketplaceUrl("/cards/1")).toBe(false);
  });
});
