import { TILE_SIZE } from "../constants";

/** What the game rules need to know about a map. The art lives in the Tiled file itself. */
export interface WorldMap {
  /** Width in tiles. */
  width: number;
  /** Height in tiles. */
  height: number;
  /** Tiles nobody can walk on, indexed [row][col]. */
  blocked: boolean[][];
  /** Tiles where farming is allowed, indexed [row][col]. */
  farmland: boolean[][];
  /** The tile players appear on. */
  spawn: TilePos;
  /** Where the shipping crate stands, in world pixels (top left corner and size). */
  shippingCrate: { x: number; y: number; width: number; height: number };
}

export interface TilePos {
  col: number;
  row: number;
}

/** The world-pixel position of the middle of a tile. */
export function tileCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}

/** The tile under a world-pixel position. */
export function tileAt(x: number, y: number): TilePos {
  return { col: Math.floor(x / TILE_SIZE), row: Math.floor(y / TILE_SIZE) };
}

export function isWalkable(map: WorldMap, col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < map.width && row < map.height && !map.blocked[row][col];
}
