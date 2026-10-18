import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isWalkable, type Rect, tileAt, type TilePos, type WorldMap } from "./map";
import { exitTile, frontOfDoor } from "./houses";
import { parseTiledMap, type TiledMapJson, tilesetImageUrl } from "./tiledMap";
import { VILLAGE_MAP, VILLAGE_TILED } from "./villageMap";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** A tiny Tiled map: 3×2 tiles, the top-left tile blocked, the bottom-right one farmland. */
function smallMap(): TiledMapJson {
  const layer = (name: string, data: number[]) => ({ name, type: "tilelayer", data });
  return {
    width: 3,
    height: 2,
    tilewidth: 16,
    tileheight: 16,
    tilesets: [{ name: "markers", firstgid: 1, image: "../../client/public/assets/custom/map-markers.png" }],
    layers: [
      layer("Ground", [1, 1, 1, 1, 1, 1]),
      layer("Collision", [1, 0, 0, 0, 0, 0]),
      layer("Farmland", [0, 0, 0, 0, 0, 2]),
      {
        name: "Objects",
        type: "objectgroup",
        objects: [
          { name: "spawn", x: 24, y: 8, point: true },
          { name: "shippingCrate", x: 0, y: 16, width: 32, height: 16 },
          { name: "tent", x: 32, y: 0, width: 16, height: 16 },
          { name: "seedStand", x: 32, y: 16, width: 16, height: 16 },
          { name: "store", x: 16, y: 0, width: 16, height: 16 },
        ],
      },
    ],
  };
}

describe("parseTiledMap", () => {
  it("reads the size, collisions, farmland, spawn and the named spots", () => {
    const map = parseTiledMap(smallMap());
    expect(map.width).toBe(3);
    expect(map.height).toBe(2);
    expect(map.blocked).toEqual([
      [true, false, false],
      [false, false, false],
    ]);
    expect(map.farmland[1][2]).toBe(true);
    expect(map.farmland[0][0]).toBe(false);
    expect(map.spawn).toEqual({ col: 1, row: 0 });
    expect(map.shippingCrate).toEqual({ x: 0, y: 16, width: 32, height: 16 });
    expect(map.tent).toEqual({ x: 32, y: 0, width: 16, height: 16 });
    expect(map.seedStand).toEqual({ x: 32, y: 16, width: 16, height: 16 });
    expect(map.store).toEqual({ x: 16, y: 0, width: 16, height: 16 });
  });

  it("requires exactly one spawn point", () => {
    const none = smallMap();
    none.layers[3].objects = none.layers[3].objects!.filter((o) => o.name !== "spawn");
    expect(() => parseTiledMap(none)).toThrow(/no "spawn"/);
    const two = smallMap();
    two.layers[3].objects!.push({ name: "spawn", x: 8, y: 8, point: true });
    expect(() => parseTiledMap(two)).toThrow(/more than one "spawn"/);
  });

  it("rejects a spawn point off the map", () => {
    const map = smallMap();
    map.layers[3].objects![0].x = 100;
    expect(() => parseTiledMap(map)).toThrow(/outside the map/);
  });

  it("needs the Collision and Farmland layers at the map's size", () => {
    const missing = smallMap();
    missing.layers = missing.layers.filter((l) => l.name !== "Collision");
    expect(() => parseTiledMap(missing)).toThrow(/"Collision"/);
    const short = smallMap();
    short.layers[2].data = [0, 0];
    expect(() => parseTiledMap(short)).toThrow(/"Farmland" has 2 tiles, expected 6/);
  });

  it("reads the ground's terrain set, what's drawn on top, and the deep water", () => {
    const map = smallMap();
    map.tilesets[0].wangsets = [
      {
        name: "Beach",
        type: "corner",
        colors: [{ name: "Grass" }, { name: "Sand" }, { name: "Sea" }],
        wangtiles: [
          { tileid: 0, wangid: [0, 1, 0, 1, 0, 1, 0, 1] },
          { tileid: 1, wangid: [0, 2, 0, 3, 0, 3, 0, 2] },
          { tileid: 2, wangid: [0, 3, 0, 3, 0, 3, 0, 3] },
        ],
      },
    ];
    // Tiled keeps flips in the top bits; they don't change what the ground is.
    map.layers[0].data = [1, 2, 3, 0x80000000 + 3, 99, 0];
    map.layers.push({ name: "Details", type: "tilelayer", data: [0, 5, 0, 0, 0, 0] });
    map.layers[3].objects!.push({ name: "deepWater", x: 32, y: 0, width: 16, height: 32 });
    const parsed = parseTiledMap(map);
    expect(parsed.terrain).toEqual([
      ["grass", "shore", "sea"],
      ["sea", "other", "other"],
    ]);
    expect(parsed.cluttered).toEqual([
      [false, true, false],
      [false, false, false],
    ]);
    expect(parsed.deepWater).toEqual([{ x: 32, y: 0, width: 16, height: 32 }]);
  });

  it("copes with a map without terrain, clutter or deep water", () => {
    const parsed = parseTiledMap(smallMap());
    expect(parsed.terrain.flat().every((t) => t === "other")).toBe(true);
    expect(parsed.cluttered.flat().every((c) => !c)).toBe(true);
    expect(parsed.deepWater).toEqual([]);
  });

  it("explains compressed layers and external tilesets", () => {
    const compressed = smallMap();
    (compressed.layers[1] as { data: unknown }).data = "eJxjYGBgAAAABAAB";
    expect(() => parseTiledMap(compressed)).toThrow(/CSV/);
    const external = smallMap();
    (external.tilesets[0] as { source?: string }).source = "markers.tsx";
    expect(() => parseTiledMap(external)).toThrow(/Embed/);
  });
});

describe("tilesetImageUrl", () => {
  it("turns a path relative to the map into a URL under client/public", () => {
    expect(tilesetImageUrl("../../client/public/assets/custom/soil.png")).toBe("/assets/custom/soil.png");
    expect(tilesetImageUrl("..\\..\\client\\public\\assets\\a b.png")).toBe("/assets/a%20b.png");
    expect(() => tilesetImageUrl("C:/Downloads/tiles.png")).toThrow(/client\/public/);
  });
});

/** Every tile you can walk to from `from`, as "col,row". */
function reachable(map: WorldMap, from: TilePos): Set<string> {
  const seen = new Set<string>();
  const queue = [from];
  while (queue.length) {
    const { col, row } = queue.pop()!;
    const key = `${col},${row}`;
    if (seen.has(key) || !isWalkable(map, col, row)) continue;
    seen.add(key);
    queue.push({ col: col + 1, row }, { col: col - 1, row }, { col, row: row + 1 }, { col, row: row - 1 });
  }
  return seen;
}

describe("the village map", () => {
  const map = VILLAGE_MAP;

  it("spawns players on a walkable tile", () => {
    expect(isWalkable(map, map.spawn.col, map.spawn.row)).toBe(true);
  });

  it("is tall enough to fill a phone screen standing up", () => {
    // At zoom 2 a tall phone shows about 27 tiles top to bottom.
    expect(map.height).toBeGreaterThanOrEqual(27);
    expect(map.width).toBeGreaterThanOrEqual(27);
  });

  it("has a farm field you can walk all over", () => {
    const walk = reachable(map, map.spawn);
    const field: string[] = [];
    map.farmland.forEach((row, r) => row.forEach((farm, c) => farm && field.push(`${c},${r}`)));
    expect(field.length).toBeGreaterThan(40);
    for (const tile of field) {
      const [col, row] = tile.split(",").map(Number);
      expect(map.blocked[row][col], `farmland at ${tile} is blocked`).toBe(false);
      expect(walk.has(tile), `farmland at ${tile} can't be reached from the spawn point`).toBe(true);
    }
  });

  it("lets you walk up to the shipping crate, the tent, the seed stand and the store", () => {
    const walk = reachable(map, map.spawn);
    /** The tiles in and around an area. */
    const around = ({ x, y, width, height }: Rect) => {
      const first = tileAt(x, y);
      const last = tileAt(x + width - 1, y + height - 1);
      const tiles: string[] = [];
      for (let row = first.row - 1; row <= last.row + 1; row++)
        for (let col = first.col - 1; col <= last.col + 1; col++) tiles.push(`${col},${row}`);
      return tiles;
    };
    for (const spot of ["shippingCrate", "tent", "seedStand", "store"] as const) {
      expect(around(map[spot]).some((tile) => walk.has(tile)), spot).toBe(true);
    }
  });

  it("lets you walk up to every cottage's door", () => {
    const walk = reachable(map, map.spawn);
    expect(map.houses.length).toBeGreaterThanOrEqual(2);
    for (const plan of map.houses) {
      const front = frontOfDoor(plan);
      expect(walk.has(`${front.col},${front.row}`), plan.id).toBe(true);
    }
  });

  it("keeps the rooms apart from the village: no walking in without a door", () => {
    const walk = reachable(map, map.spawn);
    for (const plan of map.houses) {
      const exit = exitTile(plan);
      expect(walk.has(`${exit.col},${exit.row}`), plan.id).toBe(false);
    }
  });

  it("blocks the shipping crate's bottom row, so nobody walks through it", () => {
    const { x, y, width, height } = map.shippingCrate;
    const last = tileAt(x + width - 1, y + height - 1);
    for (let col = tileAt(x, y).col; col <= last.col; col++) expect(map.blocked[last.row][col], `${col},${last.row}`).toBe(true);
  });

  it("wakes you up just in front of the tent", () => {
    const { x, y, width, height } = map.tent;
    const door = tileAt(x + width / 2, y + height);
    expect(map.spawn).toEqual(door);
  });

  it("keeps the tent, seed stand and store off the farm field and the shipping crate", () => {
    const crate = map.shippingCrate;
    for (const spot of [map.tent, map.seedStand, map.store]) {
      const first = tileAt(spot.x, spot.y);
      const last = tileAt(spot.x + spot.width - 1, spot.y + spot.height - 1);
      for (let row = first.row; row <= last.row; row++)
        for (let col = first.col; col <= last.col; col++) {
          expect(map.farmland[row][col]).toBe(false);
          // Both are drawn, so their bottom row (where their feet would be) is blocked; you can walk behind their tops.
          expect(map.blocked[row][col], `${col},${row}`).toBe(row === last.row);
        }
      const overlapsCrate =
        spot.x < crate.x + crate.width && crate.x < spot.x + spot.width && spot.y < crate.y + crate.height && crate.y < spot.y + spot.height;
      expect(overlapsCrate).toBe(false);
    }
  });

  it("paints the ground everywhere", () => {
    const ground = VILLAGE_TILED.layers.find((l) => l.name === "Ground")!.data as number[];
    expect(ground.every((gid) => gid !== 0)).toBe(true);
  });

  it("only uses tileset images that are in client/public", () => {
    for (const tileset of VILLAGE_TILED.tilesets) {
      const url = tilesetImageUrl(tileset.image!);
      expect(fs.existsSync(path.join(ROOT, "client/public", decodeURI(url))), url).toBe(true);
    }
  });
});
