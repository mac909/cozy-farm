import { describe, expect, it } from "vitest";
import { CROPS, type CropId } from "../content/crops";
import {
  UNTILLED,
  advanceDay,
  advanceTile,
  daysToRipe,
  harvest,
  isRipe,
  plant,
  ripeStage,
  till,
  water,
  type FarmResult,
  type FarmTile,
  type PlantedTile,
} from "./farming";

const CROP_IDS = Object.keys(CROPS) as CropId[];
const DRY: FarmTile = { kind: "tilled", watered: false };
const WET: FarmTile = { kind: "tilled", watered: true };

/** The tile from a result that's expected to succeed. */
function tileOf(result: FarmResult<string>): FarmTile {
  if (!result.ok) throw new Error(`expected success, got "${result.reason}"`);
  return result.tile;
}

function seedling(cropId: CropId): FarmTile {
  return tileOf(plant(DRY, cropId));
}

/** Water, then sleep, `nights` times in a row. */
function waterAndSleep(tile: FarmTile, nights: number): FarmTile {
  for (let i = 0; i < nights; i++) tile = advanceTile(tileOf(water(tile)));
  return tile;
}

function ripe(cropId: CropId): FarmTile {
  return waterAndSleep(seedling(cropId), daysToRipe(CROPS[cropId]));
}

function asPlanted(tile: FarmTile): PlantedTile {
  if (tile.kind !== "planted") throw new Error(`expected a crop, got ${tile.kind}`);
  return tile;
}

describe("till", () => {
  it("turns untilled ground into dry soil", () => {
    expect(till(UNTILLED)).toEqual({ ok: true, tile: DRY });
  });

  it("won't till soil twice", () => {
    expect(till(DRY)).toEqual({ ok: false, reason: "already-tilled" });
    expect(till(WET)).toEqual({ ok: false, reason: "already-tilled" });
  });

  it("won't dig up a crop", () => {
    expect(till(seedling("radish"))).toEqual({ ok: false, reason: "has-crop" });
  });
});

describe("plant", () => {
  it("plants a seed in tilled soil", () => {
    expect(plant(DRY, "carrot")).toEqual({
      ok: true,
      tile: { kind: "planted", watered: false, cropId: "carrot", stage: 0, daysInStage: 0 },
    });
  });

  it("keeps the soil watered if it already was", () => {
    expect(asPlanted(tileOf(plant(WET, "carrot"))).watered).toBe(true);
  });

  it("needs tilled soil", () => {
    expect(plant(UNTILLED, "carrot")).toEqual({ ok: false, reason: "not-tilled" });
  });

  it("won't plant on top of another crop", () => {
    expect(plant(seedling("radish"), "carrot")).toEqual({ ok: false, reason: "has-crop" });
  });

  it("rejects crops that don't exist", () => {
    expect(plant(DRY, "cactus")).toEqual({ ok: false, reason: "unknown-crop" });
  });
});

describe("water", () => {
  it("waters dry soil", () => {
    expect(water(DRY)).toEqual({ ok: true, tile: WET });
  });

  it("waters a crop", () => {
    expect(asPlanted(tileOf(water(seedling("radish")))).watered).toBe(true);
  });

  it("says so when watering twice in a day", () => {
    expect(water(WET)).toEqual({ ok: false, reason: "already-watered" });
    const wetCrop = tileOf(water(seedling("radish")));
    expect(water(wetCrop)).toEqual({ ok: false, reason: "already-watered" });
  });

  it("needs tilled soil", () => {
    expect(water(UNTILLED)).toEqual({ ok: false, reason: "not-tilled" });
  });
});

describe("growing overnight", () => {
  it("grows a watered crop and dries the soil", () => {
    const tile = asPlanted(waterAndSleep(seedling("radish"), 1));
    expect(tile.stage).toBe(1);
    expect(tile.watered).toBe(false);
  });

  it("keeps an unwatered crop waiting, alive, for as long as it takes", () => {
    let tile = seedling("radish");
    for (let night = 0; night < 30; night++) tile = advanceTile(tile);
    expect(tile).toEqual(seedling("radish"));
  });

  it("dries out empty soil but leaves it tilled", () => {
    expect(advanceTile(WET)).toEqual(DRY);
    expect(advanceTile(DRY)).toEqual(DRY);
    expect(advanceTile(UNTILLED)).toEqual(UNTILLED);
  });

  it("keeps a ripe crop ripe", () => {
    const tile = ripe("radish");
    expect(waterAndSleep(tile, 3)).toEqual(tile);
    expect(advanceTile(tile)).toEqual(tile);
  });

  it("moves the whole farm forward one night without changing the old tiles", () => {
    const tiles = [UNTILLED, WET, tileOf(water(seedling("radish"))), seedling("carrot")];
    const before = structuredClone(tiles);
    const after = advanceDay(tiles);
    expect(tiles).toEqual(before);
    expect(after.map((t) => t.kind)).toEqual(["untilled", "tilled", "planted", "planted"]);
    expect(after.every((t) => t.kind === "untilled" || !t.watered)).toBe(true);
    expect(asPlanted(after[2]).stage).toBe(1);
    expect(asPlanted(after[3]).stage).toBe(0);
  });

  for (const id of CROP_IDS) {
    const crop = CROPS[id];
    it(`ripens ${id} after exactly ${daysToRipe(crop)} watered nights`, () => {
      const almost = waterAndSleep(seedling(id), daysToRipe(crop) - 1);
      expect(isRipe(almost)).toBe(false);
      expect(isRipe(waterAndSleep(almost, 1))).toBe(true);
      expect(asPlanted(waterAndSleep(almost, 1)).stage).toBe(ripeStage(crop));
    });
  }
});

describe("harvest", () => {
  it("picks a ripe crop and leaves empty soil, still watered if it was", () => {
    const wetRipe = tileOf(water(ripe("radish")));
    expect(harvest(wetRipe)).toEqual({
      ok: true,
      tile: WET,
      harvested: { cropId: "radish", amount: CROPS.radish.harvestAmount },
    });
  });

  it("won't pick an unripe crop", () => {
    expect(harvest(seedling("radish"))).toEqual({ ok: false, reason: "not-ripe" });
    const almost = waterAndSleep(seedling("radish"), daysToRipe(CROPS.radish) - 1);
    expect(harvest(almost)).toEqual({ ok: false, reason: "not-ripe" });
  });

  it("has nothing to pick on empty ground", () => {
    expect(harvest(UNTILLED)).toEqual({ ok: false, reason: "no-crop" });
    expect(harvest(DRY)).toEqual({ ok: false, reason: "no-crop" });
  });

  for (const id of CROP_IDS.filter((id) => CROPS[id].regrows)) {
    it(`keeps ${id} planted after harvest and lets it ripen again`, () => {
      const crop = CROPS[id];
      const result = harvest(ripe(id));
      if (!result.ok) throw new Error(result.reason);
      expect(result.harvested).toEqual({ cropId: id, amount: crop.harvestAmount });

      const regrown = asPlanted(result.tile);
      expect(regrown.cropId).toBe(id);
      expect(regrown.stage).toBe(ripeStage(crop) - 1);
      expect(harvest(regrown)).toEqual({ ok: false, reason: "not-ripe" });

      const again = waterAndSleep(regrown, crop.daysPerStage);
      expect(isRipe(again)).toBe(true);
      expect(harvest(again).ok).toBe(true);
    });
  }
});
