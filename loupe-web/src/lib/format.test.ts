import { describe, it, expect } from "vitest";
import { formatMoney, formatPercent, formatSignedMoney, trendOf } from "./format";

describe("format", () => {
  it("formats money with currency + 2 decimals", () => {
    expect(formatMoney({ amount: 1240.5, currency: "USD" })).toBe("$1,240.50");
    expect(formatMoney(12)).toBe("$12.00");
  });

  it("formats signed percentages with a real minus glyph", () => {
    expect(formatPercent(3.42)).toBe("+3.42%");
    expect(formatPercent(-1.1)).toBe("−1.10%");
    expect(formatPercent(0)).toBe("0.00%");
  });

  it("formats signed money", () => {
    expect(formatSignedMoney(240.5)).toBe("+$240.50");
    expect(formatSignedMoney(-12)).toBe("−$12.00");
  });

  it("classifies trend direction", () => {
    expect(trendOf(2)).toBe("up");
    expect(trendOf(-2)).toBe("down");
    expect(trendOf(0)).toBe("flat");
  });
});
