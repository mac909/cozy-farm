import { describe, expect, it } from "vitest";
import { BUGS, bugOutAt } from "../content/bugs";
import { DAY_END_MINUTE, DAY_START_MINUTE } from "../time/clock";
import { bugSlot, flutterOffset, MEADOW, meadowBugs, slotStart } from "./meadow";

const tiles = Array.from({ length: 60 }, (_, i) => ({ col: i % 10, row: Math.floor(i / 10) }));
const lot = { day: 3, slot: 1, worldSeed: 12345, tiles };

describe("bugSlot", () => {
  it("counts two-hour lots from 6 am", () => {
    expect(bugSlot(DAY_START_MINUTE)).toBe(0);
    expect(bugSlot(DAY_START_MINUTE + 119)).toBe(0);
    expect(bugSlot(8 * 60)).toBe(1);
    expect(bugSlot(23 * 60 + 59)).toBe(8);
    expect(slotStart(bugSlot(13 * 60))).toBe(12 * 60);
  });
});

describe("meadowBugs", () => {
  it("puts a few bugs out, each on its own tile", () => {
    const bugs = meadowBugs(lot);
    expect(bugs.length).toBeGreaterThanOrEqual(MEADOW.perSlot.min);
    expect(bugs.length).toBeLessThanOrEqual(MEADOW.perSlot.max);
    expect(new Set(bugs.map((b) => `${b.col},${b.row}`)).size).toBe(bugs.length);
    expect(new Set(bugs.map((b) => b.id)).size).toBe(bugs.length);
    for (const bug of bugs) expect(tiles).toContainEqual({ col: bug.col, row: bug.row });
  });

  it("only puts out bugs that are out at that time of day", () => {
    for (let slot = 0; slot < 9; slot++) {
      for (let day = 1; day <= 10; day++) {
        for (const bug of meadowBugs({ ...lot, day, slot })) expect(bugOutAt(BUGS[bug.bugId], slotStart(slot))).toBe(true);
      }
    }
  });

  it("brings fireflies out in the evening", () => {
    const evening = Array.from({ length: 10 }, (_, day) => meadowBugs({ ...lot, day, slot: bugSlot(21 * 60) })).flat();
    expect(evening.some((b) => b.bugId === "firefly")).toBe(true);
    expect(evening.every((b) => b.bugId === "firefly" || b.bugId === "luna_moth")).toBe(true);
  });

  it("is the same for the same lot, whatever order the tiles come in", () => {
    expect(meadowBugs({ ...lot, tiles: [...tiles].reverse() })).toEqual(meadowBugs(lot));
  });

  it("changes with the day, the lot and the world", () => {
    const base = JSON.stringify(meadowBugs(lot));
    expect(JSON.stringify(meadowBugs({ ...lot, day: 4 }))).not.toBe(base);
    expect(JSON.stringify(meadowBugs({ ...lot, slot: 2 }))).not.toBe(base);
    expect(JSON.stringify(meadowBugs({ ...lot, worldSeed: 999 }))).not.toBe(base);
  });

  it("keeps off blocked tiles, and copes with too few tiles", () => {
    const blocked = new Set(tiles.slice(0, 58).map((t) => `${t.col},${t.row}`));
    const bugs = meadowBugs({ ...lot, blocked });
    expect(bugs.length).toBeLessThanOrEqual(2);
    for (const bug of bugs) expect(blocked.has(`${bug.col},${bug.row}`)).toBe(false);
    expect(meadowBugs({ ...lot, tiles: [] })).toEqual([]);
  });

  it("has nothing out after midnight", () => {
    expect(meadowBugs({ ...lot, slot: bugSlot(DAY_END_MINUTE) })).toEqual([]);
  });
});

describe("flutterOffset", () => {
  it("stays near the bug's spot", () => {
    for (let t = 0; t < 60_000; t += 250) {
      const { x, y } = flutterOffset("3.1.0", t);
      expect(Math.abs(x)).toBeLessThanOrEqual(MEADOW.wanderTiles * 16 + 0.001);
      expect(Math.abs(y)).toBeLessThanOrEqual(MEADOW.wanderTiles * 16 * 0.6 + 1.5 + 0.001);
    }
  });

  it("is the same for the same bug and time, and differs between bugs", () => {
    expect(flutterOffset("3.1.0", 5000)).toEqual(flutterOffset("3.1.0", 5000));
    expect(flutterOffset("3.1.0", 5000)).not.toEqual(flutterOffset("3.1.1", 5000));
  });

  it("moves slowly enough to walk up to", () => {
    const a = flutterOffset("3.1.2", 10_000);
    const b = flutterOffset("3.1.2", 10_100);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(3);
  });
});
