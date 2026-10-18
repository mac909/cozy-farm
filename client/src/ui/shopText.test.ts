import { describe, expect, it } from "vitest";
import { buyLabel, clampCount, furnitureLine, generalStoreCatalog, seedLine, seedStandCatalog, startingCount } from "./shopText";

describe("the seed stand's words", () => {
  it("says how long a crop takes, whether it regrows, and what it sells for", () => {
    expect(seedLine("radish_seeds")).toEqual({ itemId: "radish_seeds", name: "Radish", detail: "Ripe in 3 days · sells for 35", price: 20 });
    expect(seedLine("strawberry_seeds").detail).toBe("Ripe in 6 days, then regrows · sells for 45");
    expect(seedLine("samphire_seeds").name).toBe("Sea Samphire");
  });

  it("starts at 5, or as many as the coins cover", () => {
    expect(startingCount(20, 500)).toBe(5);
    expect(startingCount(120, 500)).toBe(4);
    expect(startingCount(120, 50)).toBe(1);
  });

  it("starts furniture at 1", () => {
    expect(startingCount(180, 500, 1)).toBe(1);
    expect(startingCount(180, 0, 1)).toBe(1);
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

describe("the general store's words", () => {
  it("says where a piece goes, its size and what's special about it", () => {
    expect(furnitureLine("red_bed")).toEqual({ itemId: "red_bed", name: "Red Bed", detail: "For your house · 1 × 2 · sleep in it · turns", price: 180 });
    expect(furnitureLine("straw_rug").detail).toBe("For your house · 3 × 3 · walk over it");
    expect(furnitureLine("fence").detail).toBe("For the farm · 1 tile · turns");
    expect(furnitureLine("potted_fern").detail).toBe("House or farm · 1 tile");
  });

  it("has a shelf for the house and one for the farm", () => {
    const catalog = generalStoreCatalog();
    expect(catalog.title).toBe("General store");
    expect(catalog.shelves.map((shelf) => shelf.title)).toEqual(["For your house", "For the farm"]);
    expect(catalog.quick).toEqual([1, 10]);
  });

  it("leaves the seed stand as it was", () => {
    const catalog = seedStandCatalog();
    expect(catalog.shelves).toHaveLength(1);
    expect(catalog.shelves[0].lines).toHaveLength(6);
    expect(catalog.quick).toEqual([5, 10]);
  });
});
