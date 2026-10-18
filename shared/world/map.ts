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
  /**
   * What the ground is, indexed [row][col], from the Ground layer's terrain set (Milestone 5): grass,
   * sand, sea, or a mix along the edges. "other" where the Ground tile isn't part of the terrain set.
   */
  terrain: Terrain[][];
  /** Tiles with something drawn on the Decor or Details layers (a palm, a tuft, a plank), indexed [row][col]. */
  cluttered: boolean[][];
  /** The deep water off the end of the dock, where the big fish are: `deepWater` rectangles in Tiled. */
  deepWater: Rect[];
  /**
   * The Village Board (Milestone 6), right of the seed stand, 2 × 2 tiles: null until Marlow
   * arrives (its object `needs: keeper`). Like the seed stand, it counts all over.
   */
  board: Rect | null;
  /** The lighthouse on the point (Milestone 6), drawn whatever state it's in. Its door is the middle of its bottom row. */
  lighthouse: Rect | null;
  /** The water round the point, where the night fish bite: `pointWater` rectangles, `needs: lighthouse`. */
  pointWater: Rect[];
  /** Round the meadow's trees, where branches fall each morning: `woods` rectangles. */
  woods: Rect[];
  /** Where Marlow stands at each time of day: `keeper…` points (see shared/world/keeper.ts). */
  keeper: Readonly<Partial<Record<KeeperSpotId, KeeperPoint>>>;
  /** What changes as the village is built: layers and objects shown from or until something is (shared/world/gates.ts). */
  gates: MapGates;
}

/** The times of day Marlow has a spot for: by the board, fishing in the evening, his boat at night, and the point once it's lit. */
export type KeeperSpotId = "day" | "evening" | "night" | "eveningLit";

/** Where Marlow stands, and which way he faces. */
export interface KeeperPoint extends TilePos {
  facing: "up" | "down" | "left" | "right";
}

/**
 * A tile layer shown only from (`shownFrom`) or until (`shownUntil`) something is built. Layers named
 * "Collision …" or "Farmland …" count as walls or farmland while they're shown; the rest are art.
 */
export interface GatedLayer {
  name: string;
  kind: "collision" | "farmland" | "art";
  from: string | null;
  until: string | null;
  /** Painted tiles, indexed [row][col]. */
  tiles: boolean[][];
  /** What the Action button says facing it, for a collision layer (a hint reason, e.g. "brambles"), or null. */
  hint: string | null;
}

/** A named object in Tiled's Objects layer, with the built thing it `needs` (null: always there). */
export interface MapObject {
  name: string;
  rect: Rect;
  point: boolean;
  needs: string | null;
  /** Its string properties besides `needs` (`facing` for Marlow's points). */
  props: Readonly<Record<string, string>>;
}

/** Everything the map needs to work out "the map as of today" (gates.ts's mapFor). */
export interface MapGates {
  layers: GatedLayer[];
  /** The objects that can come and go (board, lighthouse, pointWater, woods, deepWater, keeper points). */
  objects: MapObject[];
  /** The plain Collision and Farmland layers, before any gated layer is added. */
  baseBlocked: boolean[][];
  baseFarmland: boolean[][];
}

/**
 * The ground on one tile, from its four corners: all grass, all sand or all sea, "shore" where sea
 * meets sand, "edge" where grass meets sand, or "other" (not part of the beach terrain).
 */
export type Terrain = "grass" | "sand" | "sea" | "shore" | "edge" | "other";

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
