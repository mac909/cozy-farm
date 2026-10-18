import { describe, expect, it } from "vitest";
import { UNTILLED, type FarmTile, type PlantedTile } from "../../../shared/farming/farming";
import { changeBetween, sameTile, soilFrame } from "./farmChanges";

const DRY: FarmTile = { kind: "tilled", watered: false };
const WET: FarmTile = { kind: "tilled", watered: true };
const radish = (stage: number, watered = false): PlantedTile => ({ kind: "planted", cropId: "radish", stage, daysInStage: 0, watered });

describe("soilFrame", () => {
  it("joins a tile to its dug neighbours", () => {
    const dug = new Set(["5,5", "5,4", "6,5", "5,6", "4,5"]);
    const isDug = (c: number, r: number) => dug.has(`${c},${r}`);
    expect(soilFrame(isDug, 5, 5, false)).toBe(15);
    expect(soilFrame(isDug, 5, 5, true)).toBe(31);
    expect(soilFrame(isDug, 5, 4, false)).toBe(4);
    expect(soilFrame(isDug, 6, 5, true)).toBe(8 + 16);
    expect(soilFrame(() => false, 0, 0, false)).toBe(0);
  });
});

describe("changeBetween", () => {
  it("puffs for digging and planting, splashes for watering, pops for picking", () => {
    expect(changeBetween(UNTILLED, DRY)).toBe("dug");
    expect(changeBetween(DRY, radish(0))).toBe("planted");
    expect(changeBetween(DRY, WET)).toBe("watered");
    expect(changeBetween(radish(1), radish(1, true))).toBe("watered");
    expect(changeBetween(radish(3, true), WET)).toBe("picked");
  });

  it("stays quiet overnight", () => {
    expect(changeBetween(WET, DRY)).toBeNull();
    expect(changeBetween(radish(1, true), radish(2))).toBeNull();
    expect(changeBetween(radish(2, true), radish(3))).toBeNull();
  });

  it("pops when a regrowing crop is picked and drops back a stage", () => {
    const ripe: PlantedTile = { kind: "planted", cropId: "strawberry", stage: 3, daysInStage: 0, watered: false };
    expect(changeBetween(ripe, { ...ripe, stage: 2 })).toBe("picked");
  });
});

describe("sameTile", () => {
  it("compares everything that's drawn or hinted", () => {
    expect(sameTile(radish(1), radish(1))).toBe(true);
    expect(sameTile(radish(1), radish(2))).toBe(false);
    expect(sameTile(radish(1), { ...radish(1), daysInStage: 1 })).toBe(false);
    expect(sameTile(DRY, WET)).toBe(false);
    expect(sameTile(DRY, radish(0))).toBe(false);
  });
});
