import { describe, expect, it } from "vitest";
import { closedHintAt, inEffect, lookAt, mapFor, NOTHING_BUILT } from "./gates";
import { keeperAt, keeperSpotId } from "./keeper";
import { parseTiledMap, type TiledMapJson } from "./tiledMap";

/**
 * A tiny Tiled map, 4 × 3: brambles block the top-right tile until "path" is built, a board that
 * needs "keeper", a bit of water that only counts as the point's once "lighthouse" is built, and
 * scaffolding art from "stairs" until "lamp".
 */
function gatedMap(): TiledMapJson {
  const layer = (name: string, data: number[], properties?: { name: string; type: string; value: unknown }[]) => ({ name, type: "tilelayer", data, properties });
  const prop = (name: string, value: string) => ({ name, type: "string", value });
  return {
    width: 4,
    height: 3,
    tilewidth: 16,
    tileheight: 16,
    tilesets: [{ name: "markers", firstgid: 1, image: "../../client/public/assets/custom/map-markers.png" }],
    layers: [
      layer("Ground", Array(12).fill(1)),
      layer("Collision", [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      layer("Farmland", Array(12).fill(0)),
      layer("Collision brambles", [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], [prop("shownUntil", "path"), prop("hint", "brambles")]),
      layer("Brambles", [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0], [prop("shownUntil", "path")]),
      layer("Scaffolding", [0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0], [prop("shownFrom", "stairs"), prop("shownUntil", "lamp")]),
      layer("Boardwalk", [0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0], [prop("shownFrom", "boardwalk")]),
      {
        name: "Objects",
        type: "objectgroup",
        objects: [
          { name: "spawn", x: 24, y: 24 },
          { name: "shippingCrate", x: 0, y: 32, width: 16, height: 16 },
          { name: "tent", x: 16, y: 32, width: 16, height: 16 },
          { name: "seedStand", x: 32, y: 32, width: 16, height: 16 },
          { name: "store", x: 48, y: 32, width: 16, height: 16 },
          { name: "board", x: 16, y: 0, width: 32, height: 16, properties: [prop("needs", "keeper")] },
          { name: "pointWater", x: 0, y: 0, width: 16, height: 16, properties: [prop("needs", "lighthouse")] },
          { name: "keeperDay", x: 40, y: 8, point: true, properties: [prop("facing", "left")] },
          { name: "keeperEvening", x: 8, y: 40, point: true },
          { name: "gardenShop", x: 32, y: 0, width: 32, height: 16 },
          { name: "keeperOpening", x: 56, y: 24, point: true, properties: [prop("facing", "up"), prop("project", "gardenShop"), prop("needs", "gardenShop")] },
        ],
      },
    ],
  };
}

describe("the map as of today", () => {
  const map = parseTiledMap(gatedMap());

  it("starts with nothing built: the brambles block, no board, no point", () => {
    expect(map.blocked[0][3]).toBe(true);
    expect(map.board).toBeNull();
    expect(map.pointWater).toEqual([]);
    expect(closedHintAt(map, NOTHING_BUILT, { col: 3, row: 0 })).toBe("brambles");
  });

  it("opens up as things are built", () => {
    const built = new Set(["keeper", "path", "lighthouse"]);
    const today = mapFor(map, built);
    expect(today.blocked[0][3]).toBe(false);
    expect(today.blocked[0][0]).toBe(true);
    expect(today.board).toEqual({ x: 16, y: 0, width: 32, height: 16 });
    expect(today.pointWater).toEqual([{ x: 0, y: 0, width: 16, height: 16 }]);
    expect(closedHintAt(today, built, { col: 3, row: 0 })).toBeNull();
    // The map it came from is left as it was.
    expect(map.blocked[0][3]).toBe(true);
  });

  it("shows a layer from one thing until another", () => {
    const scaffolding = map.gates.layers.find((l) => l.name === "Scaffolding")!;
    expect(scaffolding.kind).toBe("art");
    expect(inEffect(scaffolding, new Set())).toBe(false);
    expect(inEffect(scaffolding, new Set(["stairs"]))).toBe(true);
    expect(inEffect(scaffolding, new Set(["stairs", "lamp"]))).toBe(false);
  });

  it("counts art that's shown as something drawn there (Milestone 8: nothing washes up on the boardwalk)", () => {
    expect(map.cluttered[2][0]).toBe(false);
    expect(mapFor(map, new Set(["boardwalk"])).cluttered[2][0]).toBe(true);
    // The brambles are drawn until the path is cleared.
    expect(map.cluttered[0][3]).toBe(true);
    expect(mapFor(map, new Set(["path"])).cluttered[0][3]).toBe(false);
  });

  it("has the garden shop standing whatever's built (it's boarded up until it opens)", () => {
    expect(map.gardenShop).toEqual({ x: 32, y: 0, width: 32, height: 16 });
  });

  it("looks at what changes when something's built", () => {
    expect(lookAt(map, "path", null)).toEqual({ x: 56, y: 8 });
    expect(lookAt(map, "stairs", null)).toEqual({ x: 48, y: 24 });
    expect(lookAt(map, "nothing", { x: 0, y: 0, width: 32, height: 32 })).toEqual({ x: 16, y: 16 });
  });
});

describe("where Marlow is", () => {
  const map = parseTiledMap(gatedMap());

  it("is nowhere until he arrives, by the board by day, fishing in the evening", () => {
    expect(keeperSpotId(600, new Set())).toBeNull();
    const here = new Set(["keeper"]);
    expect(keeperSpotId(600, here)).toBe("day");
    expect(keeperSpotId(19 * 60, here)).toBe("evening");
    expect(keeperSpotId(23 * 60, here)).toBe("night");
    expect(keeperAt(map, 600, here)).toEqual({ col: 2, row: 0, facing: "left", spot: "day" });
    expect(keeperAt(map, 19 * 60, here)).toEqual({ col: 0, row: 2, facing: "down", spot: "evening" });
    // No point drawn for his night spot on this map: nowhere.
    expect(keeperAt(map, 23 * 60, here)).toBeNull();
  });

  it("spends the day by a new place the day it opens (Milestone 8), back to his evening as usual", () => {
    const open = new Set(["keeper", "gardenShop"]);
    const today = mapFor(map, open);
    expect(keeperAt(today, 600, open, "gardenShop")).toEqual({ col: 3, row: 1, facing: "up", spot: "opening" });
    expect(keeperAt(today, 19 * 60, open, "gardenShop")?.spot).toBe("evening");
    // Another day, or a place with no spot for him: by the board.
    expect(keeperAt(today, 600, open)?.spot).toBe("day");
    expect(keeperAt(today, 600, open, "bridge")?.spot).toBe("day");
  });

  it("moves to the point once the lighthouse is lit, and up into the lamp room at night", () => {
    const lit = new Set(["keeper", "lighthouse"]);
    expect(keeperSpotId(19 * 60, lit)).toBe("eveningLit");
    expect(keeperSpotId(23 * 60, lit)).toBeNull();
  });
});
