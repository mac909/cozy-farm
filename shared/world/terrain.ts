import { TILE_SIZE } from "../constants";
import { isWalkable, type Rect, type TilePos, type WorldMap } from "./map";

/**
 * The seaside, read from the map's Ground terrain (see `terrain` in map.ts): where the water is,
 * the dock, the beach sand where things wash up, and the meadow grass where butterflies flutter.
 * Painting new beach or meadow in Tiled with the terrain brush just works.
 */

/** Beach finds wash up no further than this many tiles from the water (so not on the path up to the farm). */
export const BEACH_REACH_TILES = 5;

const inBounds = (map: WorldMap, col: number, row: number) => col >= 0 && row >= 0 && col < map.width && row < map.height;

/**
 * Water you can cast into: sea on the Ground layer (or the foam along the shore) that nobody can
 * walk on, with nothing drawn on it (the boat, the planks under the shipping crate).
 */
export function isWater(map: WorldMap, col: number, row: number): boolean {
  if (!inBounds(map, col, row) || !map.blocked[row][col] || map.cluttered[row][col]) return false;
  const ground = map.terrain[row][col];
  return ground === "sea" || ground === "shore";
}

/** The dock: planks over the sea that you can walk on. */
export function isDock(map: WorldMap, col: number, row: number): boolean {
  return isWalkable(map, col, row) && map.terrain[row][col] === "sea";
}

/** Whether a tile is inside one of the map's rectangles. */
export function inAnyRect(rects: readonly Rect[], col: number, row: number): boolean {
  const x = col * TILE_SIZE + TILE_SIZE / 2;
  const y = row * TILE_SIZE + TILE_SIZE / 2;
  return rects.some((r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);
}

/** Whether a tile is in one of the cottages' rooms (drawn at the bottom of the map, out of sight). */
export function inRoom(map: WorldMap, col: number, row: number): boolean {
  return inAnyRect(
    map.houses.map((plan) => plan.interior),
    col,
    row,
  );
}

/**
 * Every tile a beach find could wash up on: plain sand, walkable, with nothing drawn on it, no more
 * than BEACH_REACH_TILES from the water. In reading order.
 */
export function beachSand(map: WorldMap): TilePos[] {
  const water: TilePos[] = [];
  for (let row = 0; row < map.height; row++) for (let col = 0; col < map.width; col++) if (isWater(map, col, row)) water.push({ col, row });
  const nearWater = (col: number, row: number) =>
    water.some((w) => Math.max(Math.abs(w.col - col), Math.abs(w.row - row)) <= BEACH_REACH_TILES);
  const tiles: TilePos[] = [];
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      if (map.terrain[row][col] !== "sand" || !isWalkable(map, col, row) || map.cluttered[row][col]) continue;
      if (inRoom(map, col, row) || !nearWater(col, row)) continue;
      tiles.push({ col, row });
    }
  }
  return tiles;
}

/** Every tile of open grass outside the farm field and the rooms: where bugs flutter. In reading order. */
export function meadowGrass(map: WorldMap): TilePos[] {
  const tiles: TilePos[] = [];
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      if (map.terrain[row][col] !== "grass" || !isWalkable(map, col, row) || map.farmland[row][col]) continue;
      if (inRoom(map, col, row)) continue;
      tiles.push({ col, row });
    }
  }
  return tiles;
}
