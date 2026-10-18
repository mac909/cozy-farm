import { describe, expect, it } from "vitest";
import { parseMap } from "./map";
import { isBlocked } from "./tiles";
import { VILLAGE_MAP } from "./villageMap";

describe("parseMap", () => {
  it("reads the size and the spawn point", () => {
    const map = parseMap(["T.", ".P"]);
    expect(map.width).toBe(2);
    expect(map.height).toBe(2);
    expect(map.spawn).toEqual({ col: 1, row: 1 });
  });

  it("rejects rows of different widths", () => {
    expect(() => parseMap(["..P", ".."])).toThrow(/row 1/);
  });

  it("rejects unknown characters", () => {
    expect(() => parseMap([".P?"])).toThrow(/Unknown map character/);
  });

  it("requires exactly one spawn point", () => {
    expect(() => parseMap([".."])).toThrow(/no spawn/);
    expect(() => parseMap(["PP"])).toThrow(/more than one/);
  });
});

describe("village map", () => {
  it("spawns players on a walkable tile", () => {
    const { spawn, tiles } = VILLAGE_MAP;
    expect(isBlocked(tiles[spawn.row][spawn.col])).toBe(false);
  });
});
