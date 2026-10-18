import { describe, expect, it } from "vitest";
import { CROPS, isCropId } from "./crops";

describe("crop data", () => {
  const crops = Object.entries(CROPS);

  it("has 4–6 starter crops, at least one of which regrows", () => {
    expect(crops.length).toBeGreaterThanOrEqual(4);
    expect(crops.length).toBeLessThanOrEqual(6);
    expect(crops.some(([, crop]) => crop.regrows)).toBe(true);
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
