import { describe, expect, it } from "vitest";
import { isWalkable } from "./map";
import { BEACH_REACH_TILES, beachSand, inRoom, isDock, isWater, meadowGrass } from "./terrain";
import { VILLAGE_MAP } from "./villageMap";

const map = VILLAGE_MAP;

describe("the village's terrain", () => {
  it("reads grass, sand and sea from the Ground layer", () => {
    expect(map.terrain[8][30]).toBe("grass");
    expect(map.terrain[23][20]).toBe("sand");
    expect(map.terrain[34][10]).toBe("sea");
  });

  it("finds the dock: walkable planks over the sea", () => {
    for (let row = 28; row <= 33; row++) {
      for (let col = 27; col <= 30; col++) expect(isDock(map, col, row), `${col},${row}`).toBe(true);
    }
    expect(isDock(map, 20, 23)).toBe(false);
    expect(isDock(map, 26, 30)).toBe(false);
  });

  it("finds the water beside the dock and along the shore, but not the land or the dock itself", () => {
    expect(isWater(map, 26, 30)).toBe(true);
    expect(isWater(map, 31, 30)).toBe(true);
    expect(isWater(map, 28, 34)).toBe(true);
    expect(isWater(map, 10, 26)).toBe(true);
    expect(isWater(map, 28, 30)).toBe(false);
    expect(isWater(map, 20, 23)).toBe(false);
    expect(isWater(map, -1, 30)).toBe(false);
  });

  it("doesn't count the planks under the shipping crate as water", () => {
    expect(isWater(map, 29, 27)).toBe(false);
    expect(isWater(map, 30, 27)).toBe(false);
  });

  it("has deep water off the end of the dock", () => {
    expect(map.deepWater.length).toBeGreaterThanOrEqual(1);
  });
});

describe("beachSand", () => {
  const sand = beachSand(map);
  const has = (col: number, row: number) => sand.some((t) => t.col === col && t.row === row);

  it("is plenty of open sand by the sea", () => {
    expect(sand.length).toBeGreaterThan(40);
    for (const { col, row } of sand) {
      expect(map.terrain[row][col]).toBe("sand");
      expect(isWalkable(map, col, row)).toBe(true);
      expect(map.cluttered[row][col]).toBe(false);
      expect(inRoom(map, col, row)).toBe(false);
    }
    expect(has(20, 23)).toBe(true);
  });

  it("stays on the beach, not the sandy path up to the farm", () => {
    expect(has(15, 16)).toBe(false);
    for (const { col, row } of sand) {
      let near = false;
      for (let r = row - BEACH_REACH_TILES; r <= row + BEACH_REACH_TILES && !near; r++) {
        for (let c = col - BEACH_REACH_TILES; c <= col + BEACH_REACH_TILES && !near; c++) near = isWater(map, c, r);
      }
      expect(near, `${col},${row}`).toBe(true);
    }
  });
});

describe("meadowGrass", () => {
  const grass = meadowGrass(map);

  it("is open grass outside the farm field and the rooms", () => {
    expect(grass.length).toBeGreaterThan(100);
    for (const { col, row } of grass) {
      expect(map.terrain[row][col]).toBe("grass");
      expect(isWalkable(map, col, row)).toBe(true);
      expect(map.farmland[row][col]).toBe(false);
    }
    expect(grass.some((t) => t.col === 30 && t.row === 8)).toBe(true);
  });
});
