import { describe, expect, it } from "vitest";
import { CROP_IDS, CROPS, MAX_STAGES, isCropId } from "./crops";
import { SEASON_IDS } from "./seasons";

describe("crop data", () => {
  const crops = Object.entries(CROPS);
  const starters = crops.filter(([, crop]) => crop.sold === "seedStand");
  const garden = crops.filter(([, crop]) => crop.sold === "gardenShop");

  it("has 4–6 starter crops, at least one of which regrows, all growing all year", () => {
    expect(starters.length).toBeGreaterThanOrEqual(4);
    expect(starters.length).toBeLessThanOrEqual(6);
    expect(starters.some(([, crop]) => crop.regrows)).toBe(true);
    for (const [id, crop] of starters) expect(crop.seasons, id).toBeUndefined();
  });

  it("has ten from the garden shop (Milestone 8): two for each season, and two all year", () => {
    expect(garden).toHaveLength(10);
    for (const season of SEASON_IDS) expect(garden.filter(([, crop]) => crop.seasons?.includes(season)), season).toHaveLength(2);
    expect(garden.filter(([, crop]) => !crop.seasons).map(([id]) => id)).toEqual(["wheat", "cotton"]);
    // The starters first, so the seed stand and the sprite sheet keep their order.
    expect(CROP_IDS.slice(0, starters.length)).toEqual(starters.map(([id]) => id));
  });

  it("ripens and sells as the plan says (docs/plans/progression.md, section 2.3)", () => {
    const plan = {
      peas: [4, 2, 40, 30],
      cauliflower: [8, 0, 90, 230],
      tomato: [6, 3, 60, 50],
      melon: [10, 0, 150, 400],
      beetroot: [4, 0, 30, 70],
      cranberries: [6, 2, 120, 40],
      kale: [4, 0, 35, 75],
      leek: [5, 0, 45, 95],
      wheat: [4, 0, 15, 30],
      cotton: [6, 0, 40, 75],
    } as const;
    for (const [id, [days, regrowEvery, seed, sells]] of Object.entries(plan)) {
      const crop = CROPS[id as keyof typeof plan];
      expect((crop.stages - 1) * crop.daysPerStage, id).toBe(days);
      expect(crop.regrows ? crop.daysPerStage : 0, id).toBe(regrowEvery);
      expect([crop.seedPrice, crop.sellPrice], id).toEqual([seed, sells]);
      expect(crop.stages, id).toBeLessThanOrEqual(MAX_STAGES);
    }
  });

  for (const [key, crop] of crops) {
    it(`${key} has sensible numbers`, () => {
      expect(crop.id).toBe(key);
      expect(crop.name).not.toBe("");
      expect(Number.isInteger(crop.stages) && crop.stages >= 2).toBe(true);
      expect(Number.isInteger(crop.daysPerStage) && crop.daysPerStage >= 1).toBe(true);
      expect(Number.isInteger(crop.harvestAmount) && crop.harvestAmount >= 1).toBe(true);
      expect(crop.seedPrice).toBeGreaterThan(0);
      expect(crop.sellPrice).toBeGreaterThan(0);
    });
  }
});

describe("isCropId", () => {
  it("accepts crops in the data", () => {
    expect(isCropId("radish")).toBe(true);
  });

  it("rejects anything else, including object built-ins", () => {
    expect(isCropId("cactus")).toBe(false);
    expect(isCropId("toString")).toBe(false);
    expect(isCropId(42)).toBe(false);
    expect(isCropId(undefined)).toBe(false);
  });
});
