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
      foraged: [],
      built: [],
    });
    expect(words.title).toBe("Good morning! Day 4");
    expect(words.sales).toEqual([
      { text: "Radish 4 × 35", total: "140" },
      { text: "Carrot 2 × 60", total: "120" },
    ]);
    expect(words.earned).toEqual({ text: "+260 coins", coins: "900" });
  });

  it("keeps a quiet night short", () => {
    const words = morningWords({ day: 2, grew: 0, ready: 0, coins: 500, sale: { lines: [], total: 0 }, washedUp: [], foraged: [], built: [] });
    expect(words).toEqual({ title: "Good morning! Day 2", growth: null, storm: null, season: null, village: [], beach: null, sales: [], earned: null });
  });

  it("says when something washed up on the beach", () => {
    const words = morningWords({ day: 3, grew: 0, ready: 0, coins: 500, sale: { lines: [], total: 0 }, washedUp: ["starfish", "sea_glass"], foraged: [], built: [] });
    expect(words.beach).toBe("Something washed up on the beach!");
  });
});

describe("the morning card in the village (Milestone 6)", () => {
  const quiet = { day: 5, grew: 0, ready: 0, coins: 500, sale: { lines: [], total: 0 }, washedUp: [], foraged: [], built: [] };

  it("says what was built overnight, with Marlow's note", () => {
    const words = morningWords({ ...quiet, built: [{ project: "lighthouse", step: 1 }] });
    expect(words.village).toEqual([
      {
        built: { project: "lighthouse", step: 1 },
        line: "The lighthouse stairs are mended.",
        note: expect.stringContaining("Ninety-two steps"),
      },
    ]);
  });

  it("tells of the storm the morning Marlow arrives, and counts driftwood as washing up", () => {
    const words = morningWords({ ...quiet, foraged: ["driftwood", "branch"] }, true);
    expect(words.storm).toMatch(/boat is tied up at the dock/);
    expect(words.beach).toBe("Something washed up on the beach!");
    expect(morningWords(quiet).storm).toBeNull();
  });

  it("says whose cottage has a porch now", () => {
    const words = morningWords(
      { day: 9, grew: 0, ready: 0, coins: 0, sale: { lines: [], total: 0 }, washedUp: [], foraged: [], built: [{ project: "house2:porch", step: 0 }] },
      false,
      (houseId) => (houseId === "house2" ? "Juno" : "Pip"),
    );
    expect(words.village).toEqual([
      { built: { project: "house2:porch", step: 0 }, line: "Juno's cottage has a porch now.", note: "A porch! Somewhere to sit and watch the boats come in." },
    ]);
  });
});

describe("the morning card and the seasons (Milestone 8)", () => {
  const quiet = (day: number) => ({ day, grew: 0, ready: 0, coins: 500, sale: { lines: [], total: 0 }, washedUp: [], foraged: [], built: [] });

  it("says the season's day once the seasons begin, and the day before", () => {
    expect(morningWords(quiet(26), false, undefined, 24).title).toBe("Good morning! Spring 3");
    expect(morningWords(quiet(26)).title).toBe("Good morning! Day 26");
  });

  it("says when a season comes, with what it brings", () => {
    const spring = morningWords({ ...quiet(24), built: [{ project: "gardenShop", step: 2 }] }, false, undefined, 24);
    expect(spring.season?.title).toBe("Spring has come to the village!");
    expect(spring.village[0].line).toMatch(/garden shop is open/);
    expect(morningWords(quiet(38), false, undefined, 24).season?.title).toBe("Summer's here!");
    expect(morningWords(quiet(39), false, undefined, 24).season).toBeNull();
  });
});
