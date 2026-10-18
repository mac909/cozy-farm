import { describe, expect, it } from "vitest";
import { growthLine, morningWords } from "./morningText";

describe("the morning card's words", () => {
  it("says what grew and what's ripe", () => {
    expect(growthLine(6, 3)).toBe("6 crops grew overnight. 3 are ready to pick.");
    expect(growthLine(1, 1)).toBe("1 crop grew overnight. 1 is ready to pick.");
    expect(growthLine(2, 0)).toBe("2 crops grew overnight.");
    expect(growthLine(0, 1)).toBe("1 crop is ready to pick.");
    expect(growthLine(0, 4)).toBe("4 crops are ready to pick.");
    expect(growthLine(0, 0)).toBeNull();
  });

  it("lists the sale and the coins after it", () => {
    const words = morningWords({
      day: 4,
      grew: 6,
      ready: 3,
      coins: 900,
      sale: {
        lines: [
          { itemId: "radish", count: 4, priceEach: 35, total: 140 },
          { itemId: "carrot", count: 2, priceEach: 60, total: 120 },
        ],
        total: 260,
      },
      washedUp: [],
    });
    expect(words.title).toBe("Good morning! Day 4");
    expect(words.sales).toEqual([
      { text: "Radish 4 × 35", total: "140" },
      { text: "Carrot 2 × 60", total: "120" },
    ]);
    expect(words.earned).toEqual({ text: "+260 coins", coins: "900" });
  });

  it("keeps a quiet night short", () => {
    const words = morningWords({ day: 2, grew: 0, ready: 0, coins: 500, sale: { lines: [], total: 0 }, washedUp: [] });
    expect(words).toEqual({ title: "Good morning! Day 2", growth: null, sales: [], earned: null });
  });
});
