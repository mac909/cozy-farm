import { ArraySchema, MapSchema } from "@colyseus/schema";
import { describe, expect, it } from "vitest";
import { newInventory, starterInventory } from "./inventory/inventory";
import type { FarmTile } from "./farming/farming";
import { BagSlot, Clock, CrateEntry, FarmPlot } from "./schema";
import { readBag, readClock, readCrate, readFarm, steppedMinute, writeBag, writeClock, writeCrate, writeFarm } from "./stateSync";
import type { TileKey } from "./world/world";

describe("the clock", () => {
  it("is copied rounded down to the 10-minute step, and only when that changes", () => {
    const clock = new Clock();
    expect(writeClock(clock, { day: 1, minute: 360 })).toBe(false);
    expect(writeClock(clock, { day: 1, minute: 369.9 })).toBe(false);
    expect(writeClock(clock, { day: 1, minute: 370.1 })).toBe(true);
    expect(readClock(clock)).toEqual({ day: 1, minute: 370 });
    expect(writeClock(clock, { day: 2, minute: 370.5 })).toBe(true);
    expect(readClock(clock)).toEqual({ day: 2, minute: 370 });
  });

  it("steps in tens", () => {
    expect(steppedMinute(1439.99)).toBe(1430);
    expect(steppedMinute(1440)).toBe(1440);
  });
});

describe("bags", () => {
  it("come back as they were sent", () => {
    const target = new ArraySchema<BagSlot>();
    writeBag(target, starterInventory());
    expect(target.length).toBe(starterInventory().length);
    expect(readBag(target)).toEqual(starterInventory());
  });

  it("only change the slots that changed", () => {
    const target = new ArraySchema<BagSlot>();
    writeBag(target, starterInventory());
    const cells = [...target];
    const next = [...starterInventory()];
    next[2] = { itemId: "radish_seeds", count: 9 };
    next[5] = { itemId: "radish", count: 1 };
    next[0] = null;
    writeBag(target, next);
    expect([...target]).toEqual(cells);
    expect(readBag(target)).toEqual(next);
  });

  it("read nonsense slots as empty", () => {
    const target = new ArraySchema<BagSlot>();
    writeBag(target, newInventory());
    target[0].itemId = "gold_bar";
    target[0].count = 3;
    target[1].itemId = "radish";
    expect(readBag(target)[0]).toBeNull();
    expect(readBag(target)[1]).toBeNull();
  });
});

describe("the farm", () => {
  const farm: Record<TileKey, FarmTile> = {
    "4,5": { kind: "tilled", watered: true },
    "5,5": { kind: "planted", watered: false, cropId: "potato", stage: 1, daysInStage: 1 },
  };

  it("comes back as it was sent", () => {
    const target = new MapSchema<FarmPlot>();
    writeFarm(target, farm);
    expect(readFarm(target)).toEqual(farm);
  });

  it("keeps each tile's plot, changing only what changed", () => {
    const target = new MapSchema<FarmPlot>();
    writeFarm(target, farm);
    const plot = target.get("5,5");
    const next: Record<TileKey, FarmTile> = { ...farm, "5,5": { kind: "tilled", watered: false }, "6,5": { kind: "tilled", watered: false } };
    writeFarm(target, next);
    expect(target.get("5,5")).toBe(plot);
    expect(readFarm(target)).toEqual(next);
  });

  it("drops tiles that are gone", () => {
    const target = new MapSchema<FarmPlot>();
    writeFarm(target, farm);
    writeFarm(target, { "4,5": farm["4,5"] });
    expect([...target.keys()]).toEqual(["4,5"]);
  });
});

describe("the crate", () => {
  it("comes back as it was sent, line by line", () => {
    const target = new ArraySchema<CrateEntry>();
    writeCrate(target, [{ itemId: "radish", count: 4 }, { itemId: "carrot", count: 120 }]);
    expect(readCrate(target)).toEqual([{ itemId: "radish", count: 4 }, { itemId: "carrot", count: 120 }]);
    const first = target[0];
    writeCrate(target, [{ itemId: "radish", count: 5 }]);
    expect(target[0]).toBe(first);
    expect(readCrate(target)).toEqual([{ itemId: "radish", count: 5 }]);
    writeCrate(target, []);
    expect(target.length).toBe(0);
  });

  it("leaves out lines that don't make sense", () => {
    const target = new ArraySchema<CrateEntry>();
    writeCrate(target, [{ itemId: "radish", count: 4 }]);
    target[0].itemId = "gold_bar";
    expect(readCrate(target)).toEqual([]);
  });
});