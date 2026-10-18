import { describe, expect, it } from "vitest";
import { buyLabel, clampCount, seedLine, startingCount } from "./shopText";

describe("the seed stand's words", () => {
  it("says how long a crop takes, whether it regrows, and what it sells for", () => {
    expect(seedLine("radish_seeds")).toEqual({ name: "Radish", detail: "Ripe in 3 days · sells for 35", price: 20 });
    expect(seedLine("strawberry_seeds").detail).toBe("Ripe in 6 days, then regrows · sells for 45");
    expect(seedLine("samphire_seeds").name).toBe("Sea Samphire");
  });

  it("starts at 5, or as many as the coins cover", () => {
    expect(startingCount(20, 500)).toBe(5);
    expect(startingCount(120, 500)).toBe(4);
    expect(startingCount(120, 50)).toBe(1);
  });

  it("keeps the count from 1 to 99", () => {
    expect(clampCount(0)).toBe(1);
    expect(clampCount(150)).toBe(99);
  });

  it("says why the Buy button doesn't work", () => {
    expect(buyLabel(5, 20, 500, 99)).toEqual({ text: "Buy 5 for 100", enabled: true });
    expect(buyLabel(5, 80, 380, 99)).toEqual({ text: "Need 20 more coins", enabled: false });
    expect(buyLabel(5, 20, 500, 0)).toEqual({ text: "Your bag is full", enabled: false });
    expect(buyLabel(5, 20, 500, 3)).toEqual({ text: "Room for only 3", enabled: false });
  });
});
