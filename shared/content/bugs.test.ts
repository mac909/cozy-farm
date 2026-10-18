import { describe, expect, it } from "vitest";
import { DAY_END_MINUTE, DAY_START_MINUTE } from "../time/clock";
import { BUG_IDS, BUGS, bugOutAt, bugsOutAt, isBugId } from "./bugs";
import { RARITY_WEIGHTS } from "./rarity";

describe("bug data", () => {
  for (const [key, def] of Object.entries(BUGS)) {
    it(`${key} has sensible numbers`, () => {
      expect(def.id).toBe(key);
      expect(def.name).not.toBe("");
      expect(Object.hasOwn(RARITY_WEIGHTS, def.rarity)).toBe(true);
      expect(Number.isInteger(def.sellPrice) && def.sellPrice >= 1).toBe(true);
      expect(def.windows.length).toBeGreaterThanOrEqual(1);
      for (const w of def.windows) {
        expect(w.from).toBeGreaterThanOrEqual(DAY_START_MINUTE);
        expect(w.to).toBeLessThanOrEqual(DAY_END_MINUTE);
        expect(w.from).toBeLessThan(w.to);
        // Whole two-hour blocks from 6 am, so each lot of bugs is one set of kinds.
        expect((w.from - DAY_START_MINUTE) % 120).toBe(0);
        expect((w.to - DAY_START_MINUTE) % 120).toBe(0);
      }
    });
  }

  it("always has something out, all day", () => {
    for (let minute = DAY_START_MINUTE; minute < DAY_END_MINUTE; minute += 10) {
      expect(bugsOutAt(minute).length, `minute ${minute}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("has butterflies by day and something glowing in the evening", () => {
    expect(bugsOutAt(9 * 60)).toEqual(expect.arrayContaining(["cabbage_white", "red_admiral", "brimstone"]));
    expect(bugsOutAt(21 * 60)).toContain("firefly");
    expect(BUGS.firefly.glows).toBe(true);
  });

  it("has a rare one to hope for", () => {
    expect(BUG_IDS.some((id) => BUGS[id].rarity === "rare")).toBe(true);
  });
});

describe("bugOutAt", () => {
  it("includes a window's start and stops just before its end", () => {
    const moth = BUGS.luna_moth;
    expect(bugOutAt(moth, 20 * 60 - 1)).toBe(false);
    expect(bugOutAt(moth, 20 * 60)).toBe(true);
    expect(bugOutAt(moth, DAY_END_MINUTE)).toBe(false);
  });
});

describe("isBugId", () => {
  it("knows the bugs and nothing else", () => {
    expect(isBugId("firefly")).toBe(true);
    expect(isBugId("toString")).toBe(false);
    expect(isBugId(3)).toBe(false);
  });
});
