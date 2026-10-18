import { describe, expect, it } from "vitest";
import { FEET_OFFSET, TILE_SIZE } from "../constants";
import { isWalkable, tileCenter } from "./map";
import {
  CLIENT_NEAR_TILES,
  SERVER_NEAR_TILES,
  canStandAt,
  distanceToRect,
  feetTile,
  inReach,
  isNeighbour,
  nearPlace,
  placeArea,
  placeNear,
  targetTile,
  wakeSpots,
} from "./places";
import { mapFor } from "./gates";
import { VILLAGE_MAP } from "./villageMap";

describe("feetTile and targetTile", () => {
  it("finds the tile under your feet, a little below your middle", () => {
    expect(feetTile(tileCenter(5, 7))).toEqual({ col: 5, row: 7 });
    // Standing at the very bottom of a tile, the middle of the sprite is still in the tile above.
    expect(feetTile({ x: 5 * TILE_SIZE + 8, y: 8 * TILE_SIZE - FEET_OFFSET + 1 })).toEqual({ col: 5, row: 8 });
  });

  it("is the tile next to your feet in the direction you face", () => {
    const feet = { col: 5, row: 7 };
    expect(targetTile(feet, "up")).toEqual({ col: 5, row: 6 });
    expect(targetTile(feet, "down")).toEqual({ col: 5, row: 8 });
    expect(targetTile(feet, "left")).toEqual({ col: 4, row: 7 });
    expect(targetTile(feet, "right")).toEqual({ col: 6, row: 7 });
  });
});

describe("inReach", () => {
  const feet = { col: 10, row: 10 };
  it("reaches 2 tiles in every direction, diagonals included", () => {
    expect(inReach(feet, { col: 12, row: 8 })).toBe(true);
    expect(inReach(feet, { col: 10, row: 10 })).toBe(true);
    expect(inReach(feet, { col: 13, row: 10 })).toBe(false);
    expect(inReach(feet, { col: 10, row: 7 })).toBe(false);
  });

  it("knows the 8 tiles around you", () => {
    expect(isNeighbour(feet, { col: 11, row: 9 })).toBe(true);
    expect(isNeighbour(feet, { col: 10, row: 10 })).toBe(false);
    expect(isNeighbour(feet, { col: 12, row: 10 })).toBe(false);
  });
});

describe("nearPlace", () => {
  const rect = { x: 32, y: 32, width: 32, height: 16 };
  it("measures to the nearest edge", () => {
    expect(distanceToRect({ x: 40, y: 40 }, rect)).toBe(0);
    expect(distanceToRect({ x: 40, y: 58 }, rect)).toBe(10);
    expect(distanceToRect({ x: 67, y: 52 }, rect)).toBe(5);
  });

  it("counts in tiles", () => {
    expect(nearPlace({ x: 40, y: 48 + 24 }, rect, 1.5)).toBe(true);
    expect(nearPlace({ x: 40, y: 48 + 25 }, rect, 1.5)).toBe(false);
  });
});

describe("places in the village", () => {
  const map = VILLAGE_MAP;
  const standingOn = (col: number, row: number) => tileCenter(col, row);

  it("puts the Sleep button on the tent's door, where you wake up", () => {
    expect(placeNear(map, standingOn(map.spawn.col, map.spawn.row), CLIENT_NEAR_TILES)).toBe("tent");
  });

  it("doesn't put it on the farm field behind the fence", () => {
    map.farmland.forEach((cols, row) =>
      cols.forEach((farm, col) => {
        if (farm) expect(placeNear(map, standingOn(col, row), CLIENT_NEAR_TILES), `${col},${row}`).toBeNull();
      }),
    );
  });

  it("lets the server accept a little further away than the button shows", () => {
    const door = placeArea(map, "tent")!;
    const justOutside = { x: door.x + door.width / 2, y: door.y + door.height + CLIENT_NEAR_TILES * TILE_SIZE + 4 - FEET_OFFSET };
    expect(placeNear(map, justOutside, CLIENT_NEAR_TILES)).toBeNull();
    expect(placeNear(map, justOutside, SERVER_NEAR_TILES)).toBe("tent");
  });

  it("only looks for the places asked about", () => {
    const crate = map.shippingCrate;
    const below = { x: crate.x + crate.width / 2, y: crate.y + crate.height + 8 };
    expect(placeNear(map, below, CLIENT_NEAR_TILES)).toBe("crate");
    expect(placeNear(map, below, CLIENT_NEAR_TILES, ["tent"])).toBeNull();
  });

  it("wakes everyone on walkable tiles in front of the tent, starting at the door", () => {
    const spots = wakeSpots(map.tent);
    expect(spots[0]).toEqual(map.spawn);
    expect(new Set(spots.map((s) => `${s.col},${s.row}`)).size).toBe(spots.length);
    for (const spot of spots) expect(isWalkable(map, spot.col, spot.row), `${spot.col},${spot.row}`).toBe(true);
  });
});

describe("rejoining", () => {
  const map = VILLAGE_MAP;
  const at = (col: number, row: number) => ({ x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 - FEET_OFFSET });

  it("carries on where you were if you can stand there, and sends you to the spawn point if not", () => {
    expect(canStandAt(map, at(map.spawn.col, map.spawn.row))).toBe(true);
    // In the sea, off the map, or somewhere since built over.
    expect(canStandAt(map, at(10, 30))).toBe(false);
    expect(canStandAt(map, { x: -50, y: 20 })).toBe(false);
    expect(canStandAt(map, { x: 99_999, y: 20 })).toBe(false);
    const board = mapFor(map, new Set(["keeper"])).board!;
    const underBoard = at(board.x / TILE_SIZE, board.y / TILE_SIZE + 1);
    expect(canStandAt(map, underBoard)).toBe(true);
    expect(canStandAt(mapFor(map, new Set(["keeper"])), underBoard)).toBe(false);
  });
});
