import { ArraySchema } from "@colyseus/schema";
import { describe, expect, it } from "vitest";
import { newInventory, starterInventory } from "./inventory/inventory";
import { BagSlot, Clock } from "./schema";
import { readBag, readClock, steppedMinute, writeBag, writeClock } from "./stateSync";

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
