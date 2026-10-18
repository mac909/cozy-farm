import { fishAvailable } from "../fishing/fishing";
import { describe, expect, it } from "vitest";
import { DAY_END_MINUTE, DAY_START_MINUTE } from "../time/clock";
import { FISH, FISH_IDS, FISHING_SPOTS, bitesAt, isFishId, isFishingSpot } from "./fish";
import { ITEMS, fishItemId } from "./items";
import { RARITY_WEIGHTS } from "./rarity";

const fish = Object.entries(FISH);

function isWholeAbove(n: number, min: number): boolean {
  return Number.isInteger(n) && n >= min;
}

describe("fish data", () => {
  it("has 8–15 fish (12, and three night fish at the point)", () => {
    expect(FISH_IDS.length).toBeGreaterThanOrEqual(8);
    expect(FISH_IDS.length).toBeLessThanOrEqual(15);
  });

  for (const [key, def] of fish) {
    it(`${key} has sensible numbers`, () => {
      expect(def.id).toBe(key);
      expect(def.name).not.toBe("");
      expect(def.spots.length).toBeGreaterThanOrEqual(1);
      for (const spot of def.spots) expect(isFishingSpot(spot)).toBe(true);
      expect(def.windows.length).toBeGreaterThanOrEqual(1);
      for (const w of def.windows) {
        expect(w.from).toBeGreaterThanOrEqual(DAY_START_MINUTE);
        expect(w.to).toBeLessThanOrEqual(DAY_END_MINUTE);
        expect(w.from).toBeLessThan(w.to);
      }
      expect(Object.hasOwn(RARITY_WEIGHTS, def.rarity)).toBe(true);
      expect(isWholeAbove(def.sellPrice, 1)).toBe(true);
      expect(isWholeAbove(def.sizeCm.min, 1)).toBe(true);
      expect(isWholeAbove(def.sizeCm.max, def.sizeCm.min)).toBe(true);
    });
  }

  it("always has something biting at every spot, all day", () => {
    for (const spot of FISHING_SPOTS) {
      for (let minute = DAY_START_MINUTE; minute < DAY_END_MINUTE; minute += 10) {
        // The point fishes like the shore by day (fishing.ts).
        const biting = fishAvailable(spot, minute);
        expect(biting.length, `${spot} at minute ${minute}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("has a rare fish for each spot, so there's always something to hope for", () => {
    for (const spot of FISHING_SPOTS) {
      expect(FISH_IDS.some((id) => FISH[id].spots.includes(spot) && FISH[id].rarity === "rare")).toBe(true);
    }
  });
});

describe("bitesAt", () => {
  it("includes a window's start and stops just before its end", () => {
    const squid = FISH.squid;
    const [{ from, to }] = squid.windows;
    expect(bitesAt(squid, from - 1)).toBe(false);
    expect(bitesAt(squid, from)).toBe(true);
    expect(bitesAt(squid, to - 0.5)).toBe(true);
    expect(bitesAt(squid, to)).toBe(false);
  });

  it("handles fish with more than one window", () => {
    expect(bitesAt(FISH.sea_bass, 7 * 60)).toBe(true);
    expect(bitesAt(FISH.sea_bass, 12 * 60)).toBe(false);
    expect(bitesAt(FISH.sea_bass, 20 * 60)).toBe(true);
  });
});

describe("fish items", () => {
  for (const fishId of FISH_IDS) {
    it(`${fishId} has an item that sells at the FISH price and can't be bought`, () => {
      const item = ITEMS[fishItemId(fishId)];
      expect(item.category).toBe("fish");
      expect(item.category === "fish" && item.fishId).toBe(fishId);
      expect(item.name).toBe(FISH[fishId].name);
      expect(item.sellPrice).toBe(FISH[fishId].sellPrice);
      expect(item.buyPrice).toBeUndefined();
    });
  }
});

describe("isFishId and isFishingSpot", () => {
  it("accept what's in the data and nothing else", () => {
    expect(isFishId("moonfish")).toBe(true);
    expect(isFishId("shark")).toBe(false);
    expect(isFishId("toString")).toBe(false);
    expect(isFishingSpot("dock")).toBe(true);
    expect(isFishingSpot("pond")).toBe(false);
    expect(isFishingSpot(undefined)).toBe(false);
  });
});
