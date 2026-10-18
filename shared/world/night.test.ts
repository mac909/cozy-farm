import { describe, expect, it } from "vitest";
import { CROPS } from "../content/crops";
import { ripeStage, type FarmTile, type PlantedTile } from "../farming/farming";
import { DAY_START_MINUTE } from "../time/clock";
import { endNight } from "./night";
import { farmTileAt, newWorld, setFarmTile, type World } from "./world";

const crop = (cropId: PlantedTile["cropId"], stage: number, watered: boolean, daysInStage = 0): PlantedTile => ({
  kind: "planted",
  cropId,
  stage,
  daysInStage,
  watered,
});

function farm(tiles: [number, number, FarmTile][], base: World = newWorld()): World {
  return tiles.reduce((w, [col, row, tile]) => setFarmTile(w, col, row, tile), base);
}

describe("endNight", () => {
  it("grows only watered crops, and dries all the soil", () => {
    const before = farm([
      [0, 0, crop("radish", 0, true)],
      [1, 0, crop("radish", 0, false)],
      [2, 0, { kind: "tilled", watered: true }],
      [3, 0, crop("potato", 0, true)],
    ]);
    const { world } = endNight(before);
    expect(farmTileAt(world, 0, 0)).toEqual(crop("radish", 1, false));
    expect(farmTileAt(world, 1, 0)).toEqual(crop("radish", 0, false));
    expect(farmTileAt(world, 2, 0)).toEqual({ kind: "tilled", watered: false });
    expect(farmTileAt(world, 3, 0)).toEqual(crop("potato", 0, false, 1));
  });

  it("counts what grew and what's ready to pick", () => {
    const radishRipe = ripeStage(CROPS.radish);
    const before = farm([
      [0, 0, crop("radish", radishRipe - 1, true)], // ripens tonight
      [1, 0, crop("radish", radishRipe, true)], // already ripe: watered, but doesn't grow
      [2, 0, crop("carrot", 0, true)], // grows
      [3, 0, crop("carrot", 0, false)], // waits
      [4, 0, crop("potato", 0, true)], // grows a day, same stage
    ]);
    const { report } = endNight(before);
    expect(report.grew).toBe(3);
    expect(report.ready).toBe(2);
  });

  it("sells the crate into the wallet and empties it", () => {
    const before: World = { ...newWorld(), coins: 100, crate: [{ itemId: "radish", count: 4 }, { itemId: "carrot", count: 2 }] };
    const { world, report } = endNight(before);
    expect(world.crate).toEqual([]);
    expect(world.coins).toBe(100 + 4 * CROPS.radish.sellPrice + 2 * CROPS.carrot.sellPrice);
    expect(report.sale.lines).toEqual([
      { itemId: "radish", count: 4, priceEach: CROPS.radish.sellPrice, total: 4 * CROPS.radish.sellPrice },
      { itemId: "carrot", count: 2, priceEach: CROPS.carrot.sellPrice, total: 2 * CROPS.carrot.sellPrice },
    ]);
    expect(report.coins).toBe(world.coins);
  });

  it("starts the next day at 6 am and keeps the report for whoever missed it", () => {
    const before: World = { ...newWorld(), clock: { day: 3, minute: 23 * 60 } };
    const { world, report } = endNight(before);
    expect(world.clock).toEqual({ day: 4, minute: DAY_START_MINUTE });
    expect(report).toEqual({ day: 4, grew: 0, ready: 0, sale: { lines: [], total: 0 }, coins: before.coins });
    expect(world.lastMorning).toEqual(report);
  });

  it("leaves the farmers alone", () => {
    const before: World = { ...newWorld(), farmers: { pip: { name: "Pip", character: "woman", bag: [] } } };
    expect(endNight(before).world.farmers).toBe(before.farmers);
  });
});
