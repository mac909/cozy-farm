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
  /** The tile players appear on, and wake up on: just in front of the tent. */
  spawn: TilePos;
  /** Where the shipping crate stands. */
  shippingCrate: Rect;
  /** Where the tent for sleeping goes (Milestone 2), beside the farm field. */
  tent: Rect;
  /** Where the seed stand goes (Milestone 2), at the top of the path down to the beach. */
  seedStand: Rect;
  /** The general store (Milestone 3), by the path just left of the seed stand. Its door is on its bottom row. */
  store: Rect;
  /** The cottages (Milestone 4), each with its room: `house1` and `interior1` in Tiled, and so on. */
  houses: HousePlan[];
}

/** A cottage on the map and its one room, drawn out of sight at the bottom of the map. */
export interface HousePlan {
  /** The Tiled object's name, "house1": also how the save knows the house. */
  id: string;
  /** The building in the village; its door is on its bottom row. */
  building: Rect;
  /** The room, walls included; the way out is the gap in the middle of its bottom wall. */
  interior: Rect;
}

/** An area in world pixels: top left corner and size. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
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
