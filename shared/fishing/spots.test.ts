import { describe, expect, it } from "vitest";
import { VILLAGE_MAP } from "../world/villageMap";
import { bobberTile, fishingSpot } from "./spots";

const map = VILLAGE_MAP;
const at = (col: number, row: number) => ({ col, row });

describe("fishingSpot", () => {
  it("fishes off the sides of the dock", () => {
    expect(fishingSpot(map, at(27, 29), at(26, 29))).toBe("dock");
    expect(fishingSpot(map, at(30, 29), at(31, 29))).toBe("dock");
  });

  it("fishes the deep water from the end of the dock", () => {
    expect(fishingSpot(map, at(28, 33), at(28, 34))).toBe("deep");
    expect(fishingSpot(map, at(27, 33), at(26, 33))).toBe("deep");
  });

  it("fishes from the beach into the sea", () => {
    expect(fishingSpot(map, at(10, 25), at(10, 26))).toBe("shore");
  });

  it("needs water in front", () => {
    expect(fishingSpot(map, at(20, 23), at(20, 24))).toBeNull();
    expect(fishingSpot(map, at(30, 8), at(30, 9))).toBeNull();
    // The planks under the shipping crate.
    expect(fishingSpot(map, at(29, 28), at(29, 27))).toBeNull();
  });

  it("needs somewhere to stand", () => {
    expect(fishingSpot(map, at(26, 30), at(26, 31))).toBeNull();
  });
});

describe("bobberTile", () => {
  it("lands two tiles out when there's water there", () => {
    expect(bobberTile(map, at(30, 29), at(31, 29))).toEqual(at(32, 29));
  });

  it("lands in front when two tiles out isn't water", () => {
    // A strip of land, one tile of water, then land again.
    const strip = {
      ...map,
      width: 3,
      height: 1,
      blocked: [[false, true, false]],
      terrain: [["sand", "shore", "sand"] as const].map((row) => [...row]),
      cluttered: [[false, false, false]],
      farmland: [[false, false, false]],
    };
    expect(bobberTile(strip, at(0, 0), at(1, 0))).toEqual(at(1, 0));
  });
});
