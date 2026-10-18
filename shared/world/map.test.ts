import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isWalkable, type Rect, tileAt, type TilePos, type WorldMap } from "./map";
import { exitTile, frontOfDoor } from "./houses";
import { mapFor } from "./gates";
import { PROJECT_IDS, PROJECTS, houseProjectId, isProjectId, stepName } from "../content/projects";
import { HOUSE_UPGRADE_IDS } from "../content/houseUpgrades";
import { houseLook } from "../content/houses";
import { isHint } from "../farming/actions";
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

/**
 * The Milestone 5 map (48 × 46), as it reached the real farm. Saves hold farm tiles, decorations,
 * beach finds and positions in map tiles (and furniture in room-floor tiles), so the map may only
 * ever grow east or down: everything here must stay exactly where it was.
 */
const MILESTONE_5 = {
  width: 48,
  height: 46,
  farmland: { cols: [4, 19], rows: [4, 10], tiles: 112 },
  spawn: { col: 7, row: 15 },
  shippingCrate: { x: 464, y: 416, width: 32, height: 32 },
  tent: { x: 96, y: 192, width: 48, height: 48 },
  seedStand: { x: 496, y: 224, width: 32, height: 32 },
  store: { x: 416, y: 192, width: 64, height: 48 },
  houses: [
    { id: "house1", building: { x: 448, y: 48, width: 64, height: 48 }, interior: { x: 48, y: 592, width: 176, height: 128 } },
    { id: "house2", building: { x: 544, y: 48, width: 64, height: 48 }, interior: { x: 272, y: 592, width: 176, height: 128 } },
  ],
  deepWater: [{ x: 400, y: 512, width: 128, height: 64 }],
  /** Where nobody could walk, "#". */
  collision: [
    "################################################",
    "################################################",
    "##............................................##",
    "##.##################.........................##",
    "##.#................#.........................##",
    "##.#................#....##.####..####.###....##",
    "##.#................#.........................##",
    "##.#................#.........................##",
    "##.#................#.........................##",
    "##.#................#............##...........##",
    "##.#................#.........................##",
    "##.########..########.........................##",
    "##.....................##.....................##",
    "##..................................###.......##",
    "##.##.###........##.......####................##",
    "##.............................##........####.##",
    "##..............................................",
    "##....##........................................",
    "................................................",
    "................................................",
    ".....................##.........................",
    "...............................................#",
    "#.............................................##",
    "###..........##..............................###",
    "#####.............................##...##..#####",
    "######.##...........##.........########...######",
    "###############...........#....#################",
    "###########################..###################",
    "###########################....#################",
    "###########################....#################",
    "###########################....#################",
    "###########################....#################",
    "###########################....#################",
    "###########################....#################",
    "################################################",
    "################################################",
    "################################################",
    "################################################",
    "####.........#####.........#####################",
    "####.........#####.........#####################",
    "####.........#####.........#####################",
    "####.........#####.........#####################",
    "####.........#####.........#####################",
    "####.........#####.........#####################",
    "########.#############.#########################",
    "################################################",
  ],
};

describe("growing the map (Milestone 6: 32 columns east)", () => {
  const map = VILLAGE_MAP;
  const porches = map.houses.flatMap((plan) => [houseProjectId(plan.id, "porch"), `${houseProjectId(plan.id, "porch")}/build`]);
  const everything = new Set(["keeper", "lighthouse/path", "lighthouse/stairs", "lighthouse/lamp", "lighthouse", ...porches]);

  it("only grows east or down, so the farm, the places and the rooms stay exactly where they were", () => {
    expect(map.width).toBeGreaterThanOrEqual(MILESTONE_5.width);
    expect(map.height).toBe(MILESTONE_5.height);
    expect(map.spawn).toEqual(MILESTONE_5.spawn);
    for (const place of ["shippingCrate", "tent", "seedStand", "store"] as const) expect(map[place], place).toEqual(MILESTONE_5[place]);
    expect(map.houses).toEqual(MILESTONE_5.houses);
    expect(map.deepWater).toEqual(MILESTONE_5.deepWater);
    const farm: string[] = [];
    map.farmland.forEach((row, r) => row.forEach((on, c) => on && farm.push(`${c},${r}`)));
    expect(farm).toHaveLength(MILESTONE_5.farmland.tiles);
    const { cols, rows } = MILESTONE_5.farmland;
    for (const tile of farm) {
      const [c, r] = tile.split(",").map(Number);
      expect(c >= cols[0] && c <= cols[1] && r >= rows[0] && r <= rows[1], tile).toBe(true);
    }
  });

  it("keeps everywhere you could walk before walkable, so no saved decoration, find or position is shut in", () => {
    MILESTONE_5.collision.forEach((line, row) =>
      [...line].forEach((was, col) => {
        if (was === ".") expect(map.blocked[row][col], `${col},${row}`).toBe(false);
      }),
    );
  });

  it("keeps the point closed until its path is cleared, and opens it then", () => {
    const lighthouse = map.lighthouse!;
    const front = tileAt(lighthouse.x + lighthouse.width / 2, lighthouse.y + lighthouse.height);
    expect(reachable(map, map.spawn).has(`${front.col},${front.row}`)).toBe(false);
    const cleared = mapFor(map, new Set(["keeper", "lighthouse/path"]));
    expect(reachable(cleared, cleared.spawn).has(`${front.col},${front.row}`)).toBe(true);
  });

  it("reaches the new land from the old, and the board once Marlow is here", () => {
    const all = mapFor(map, everything);
    const walk = reachable(all, all.spawn);
    for (const plan of all.houses) expect(walk.has(`${frontOfDoor(plan).col},${frontOfDoor(plan).row}`), plan.id).toBe(true);
    const board = all.board!;
    expect(board).not.toBeNull();
    const below = tileAt(board.x, board.y + board.height);
    expect(walk.has(`${below.col},${below.row}`)).toBe(true);
    // The far east of the meadow, and the end of the beach by the inlet.
    expect(walk.has("70,5")).toBe(true);
    expect(walk.has("65,18")).toBe(true);
    // The night fishing round the point.
    expect(all.pointWater.length).toBeGreaterThan(0);
    // Marlow's spots are all on the map.
    for (const spot of ["day", "evening", "night", "eveningLit"] as const) expect(all.keeper[spot], spot).toBeDefined();
  });

  it("keeps the cove shut away until its bridge is mended (Milestone 9)", () => {
    const all = mapFor(map, everything);
    expect(reachable(all, all.spawn).has("74,20")).toBe(false);
    const bridged = mapFor(map, new Set(["keeper", "lighthouse/path", "bridge"]));
    expect(reachable(bridged, bridged.spawn).has("74,20")).toBe(true);
  });

  it("only gates layers and objects on things that can be built", () => {
    const steps = PROJECT_IDS.flatMap((id) => PROJECTS[id].steps.map((_, i) => stepName(PROJECTS[id], i)));
    // House upgrades (Milestone 7): "house1:porch", for every cottage on the map.
    const upgrades = map.houses.flatMap((plan) => HOUSE_UPGRADE_IDS.map((upgrade) => houseProjectId(plan.id, upgrade)));
    for (const id of upgrades) expect(isProjectId(id), id).toBe(true);
    // "bridge" is Milestone 9's project; its broken bridge is drawn already, as a teaser.
    const known = new Set(["keeper", "bridge", ...PROJECT_IDS, ...steps, ...upgrades]);
    for (const layer of map.gates.layers) {
      for (const name of [layer.from, layer.until]) if (name) expect(known.has(name), `${layer.name}: ${name}`).toBe(true);
      if (layer.hint) expect(isHint({ reason: layer.hint }), `${layer.name}'s hint`).toBe(true);
    }
    for (const object of map.gates.objects) if (object.needs) expect(known.has(object.needs), `${object.name}: ${object.needs}`).toBe(true);
  });
});

describe("porches (Milestone 7)", () => {
  const map = VILLAGE_MAP;
  const front = (plan: (typeof map.houses)[number]) => tileAt(plan.building.x, plan.building.y + plan.building.height).row;
  const leftCol = (plan: (typeof map.houses)[number]) => tileAt(plan.building.x, plan.building.y).col;

  it("wall off the lantern and the bench in front of each cottage, once its porch is built, as houses.ts says", () => {
    for (const plan of map.houses) {
      const layer = map.gates.layers.find((l) => l.name === `Collision porch ${plan.id}`);
      expect(layer, plan.id).toBeDefined();
      expect(layer!.kind).toBe("collision");
      expect(layer!.from).toBe(houseProjectId(plan.id, "porch"));
      const { porch } = houseLook(plan.id);
      const painted: string[] = [];
      layer!.tiles.forEach((row, r) => row.forEach((on, c) => on && painted.push(`${c},${r}`)));
      const row = front(plan);
      const col = leftCol(plan);
      expect(painted.sort()).toEqual([col + porch.lantern, col + porch.bench, col + porch.bench + 1].map((c) => `${c},${row}`).sort());
    }
  });

  it("leave the way to each door open, and everywhere else reachable, with every porch built", () => {
    const built = new Set(["keeper", "lighthouse/path", "lighthouse", ...map.houses.map((plan) => houseProjectId(plan.id, "porch"))]);
    const all = mapFor(map, built);
    const walk = reachable(all, all.spawn);
    for (const plan of all.houses) {
      const door = frontOfDoor(plan);
      expect(walk.has(`${door.col},${door.row}`), plan.id).toBe(true);
      // The door's own column isn't part of the porch's walls.
      expect(all.blocked[door.row][door.col]).toBe(false);
    }
    const before = reachable(mapFor(map, new Set(["keeper", "lighthouse/path", "lighthouse"])), map.spawn);
    // Only the porch's own tiles stop being walkable.
    expect(before.size - walk.size).toBe(map.houses.length * 3);
  });
});
