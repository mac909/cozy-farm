import { describe, expect, it } from "vitest";
import { CROPS } from "../content/crops";
import { ripeStage, type FarmTile, type PlantedTile } from "../farming/farming";
import { DAY_START_MINUTE } from "../time/clock";
import { BEACHCOMBING } from "../beachcombing/beachcombing";
import { shoreOf } from "../beachcombing/tide";
import { NO_GROUNDS } from "../foraging/forage";
import { endNight, startOfServer } from "./night";
import { FORAGE } from "../content/forage";
import { VILLAGE_MAP } from "./villageMap";
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
    expect(report).toEqual({ day: 4, grew: 0, ready: 0, sale: { lines: [], total: 0 }, coins: before.coins, washedUp: [], foraged: [], built: [] });
    expect(world.lastMorning).toEqual(report);
  });

  it("brings a few finds onto the beach, and says what on the morning card", () => {
    const shore = shoreOf(VILLAGE_MAP);
    const before: World = { ...newWorld(42), clock: { day: 3, minute: 23 * 60 }, beach: { day: 3, finds: [] } };
    const { world, report } = endNight(before, () => ({ shore, grounds: NO_GROUNDS }));
    expect(world.beach.day).toBe(4);
    expect(world.beach.finds.length).toBeGreaterThanOrEqual(BEACHCOMBING.perMorning.min);
    expect(report.washedUp).toEqual(world.beach.finds.map((find) => find.findId));
    for (const find of world.beach.finds) expect(shore.sand).toContainEqual({ col: find.col, row: find.row });
  });

  it("keeps what nobody picked up, and stops when the beach is full", () => {
    const shore = shoreOf(VILLAGE_MAP);
    let world: World = { ...newWorld(7), beach: { day: 1, finds: [] } };
    for (let night = 0; night < 10; night++) world = endNight(world, () => ({ shore, grounds: NO_GROUNDS })).world;
    expect(world.beach.finds.length).toBe(BEACHCOMBING.maxOnBeach);
    const full = endNight(world, () => ({ shore, grounds: NO_GROUNDS }));
    expect(full.report.washedUp).toEqual([]);
    expect(full.world.beach.finds).toEqual(world.beach.finds);
  });

  it("doesn't wash anything up under a decoration", () => {
    const shore = { sand: [{ col: 20, row: 23 }] };
    const before: World = {
      ...newWorld(1),
      beach: { day: 1, finds: [] },
      decorations: [{ itemId: "beach_umbrella", col: 20, row: 23, turn: 0 }],
    };
    expect(endNight(before, () => ({ shore, grounds: NO_GROUNDS })).world.beach.finds).toEqual([]);
  });

  it("leaves the farmers alone", () => {
    const before: World = { ...newWorld(), farmers: { pip: { name: "Pip", character: "woman", bag: [] } } };
    expect(endNight(before).world.farmers).toBe(before.farmers);
  });
});

describe("the village overnight (Milestone 6)", () => {
  const strip = (row: number, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ({ col: from + i, row }));
  const places = () => ({ shore: { sand: strip(22, 0, 40) }, grounds: { beach: strip(22, 0, 40), woods: strip(4, 0, 40) } });

  it("brings Marlow on the morning of day 2, with a storm of driftwood and branches", () => {
    const { world, report } = endNight(newWorld(11), places);
    expect(world.village.keeperDay).toBe(2);
    expect(world.forage.items.filter((i) => i.itemId === "driftwood")).toHaveLength(FORAGE.driftwood.storm);
    expect(world.forage.items.filter((i) => i.itemId === "branch")).toHaveLength(FORAGE.branch.storm);
    expect(report.foraged).toEqual(world.forage.items.map((i) => i.itemId));
    // Nothing lies on top of a shell.
    const finds = new Set(world.beach.finds.map((f) => `${f.col},${f.row}`));
    for (const item of world.forage.items) expect(finds.has(`${item.col},${item.row}`)).toBe(false);
  });

  it("brings no driftwood before Marlow, and the usual few after", () => {
    const later = endNight({ ...newWorld(11), clock: { day: 5, minute: 1000 }, village: { keeperDay: 2, projects: {} }, forage: { day: 5, items: [] } }, places);
    const driftwood = later.report.foraged.filter((id) => id === "driftwood").length;
    expect(driftwood).toBeGreaterThanOrEqual(FORAGE.driftwood.perMorning.min);
    expect(driftwood).toBeLessThanOrEqual(FORAGE.driftwood.perMorning.max);
  });

  it("builds what was gathered, and says so on the morning card", () => {
    const gathered = { gathered: 1, built: 0, given: {}, helpers: ["pip"], doneDay: null };
    const before: World = { ...newWorld(), clock: { day: 4, minute: 1300 }, village: { keeperDay: 2, projects: { lighthouse: gathered } } };
    const { world, report } = endNight(before);
    expect(world.village.projects.lighthouse).toMatchObject({ gathered: 1, built: 1 });
    expect(report.built).toEqual([{ project: "lighthouse", step: 0 }]);
    expect(world.lastMorning?.built).toEqual(report.built);
  });

  it("brings Marlow when the server starts on a world past its first day, but not on day 1", () => {
    const real = startOfServer({ ...newWorld(3), clock: { day: 9, minute: 700 }, beach: { day: 9, finds: [] } }, places);
    expect(real.village.keeperDay).toBe(9);
    expect(real.forage.items.filter((i) => i.itemId === "driftwood")).toHaveLength(FORAGE.driftwood.storm);
    expect(real.beach.finds).toEqual([]);
    const fresh = startOfServer(newWorld(3), places);
    expect(fresh.village.keeperDay).toBe(0);
    expect(fresh.forage.items).toEqual([]);
    // Started again later the same day: no second storm.
    expect(startOfServer(real, places)).toBe(real);
  });
});
