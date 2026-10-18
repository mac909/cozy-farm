import { FEET_OFFSET, TILE_SIZE } from "../constants";
import type { Facing } from "../movement";
import { type Rect, tileAt, type TilePos, type WorldMap } from "./map";

/**
 * Where things are in the village: which tile is under your feet and in front of you, what you can
 * reach, and which place (tent, crate, seed stand, store, the Village Board, the garden shop) you're
 * standing next to.
 */

/** The places that take over the Action button when you're next to them. */
export type PlaceId = "tent" | "crate" | "seedStand" | "store" | "board" | "gardenShop";

/** Every place, in the order the Action button checks them. */
export const PLACES: readonly PlaceId[] = ["tent", "crate", "seedStand", "store", "board", "gardenShop"];

/** The Action button switches to a place this close to it, in tiles. */
export const CLIENT_NEAR_TILES = 1.5;

/** The server accepts a place's action this close, in tiles: a little more, to cover lag. */
export const SERVER_NEAR_TILES = 2.5;

/**
 * Farm actions reach this many tiles from the tile under your feet (in any direction, diagonals
 * included). On screen you only act on the 8 tiles around you; the extra tile covers lag.
 */
export const REACH_TILES = 2;

/** A point in world pixels. */
export interface Point {
  x: number;
  y: number;
}

/** The tile under a character's feet. Characters' positions are the middle of their 16×16 sprite. */
export function feetTile(position: Point): TilePos {
  return tileAt(position.x, position.y + FEET_OFFSET);
}

const STEP: Record<Facing, TilePos> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

/** The tile in front of your feet, in the direction you're facing. */
export function targetTile(feet: TilePos, facing: Facing): TilePos {
  return { col: feet.col + STEP[facing].col, row: feet.row + STEP[facing].row };
}

/** Whether `target` is within `reach` tiles of `feet`, counting diagonal steps as one. */
export function inReach(feet: TilePos, target: TilePos, reach = REACH_TILES): boolean {
  return Math.max(Math.abs(target.col - feet.col), Math.abs(target.row - feet.row)) <= reach;
}

/** Whether `target` is one of the 8 tiles around `feet` (not `feet` itself). */
export function isNeighbour(feet: TilePos, target: TilePos): boolean {
  return inReach(feet, target, 1) && (target.col !== feet.col || target.row !== feet.row);
}

/** Distance from a point to the nearest edge of a rectangle, in pixels: 0 inside it. */
export function distanceToRect(point: Point, rect: Rect): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}

/** Whether a point is within `tiles` tiles of a rectangle. */
export function nearPlace(point: Point, rect: Rect, tiles: number): boolean {
  return distanceToRect(point, rect) <= tiles * TILE_SIZE;
}

/**
 * The part of a place you walk up to. For the tent, the store and the garden shop that's their
 * bottom row, where the door is, so farming the field's bottom row on the other side of the fence
 * doesn't turn the button into Sleep, and walking past a roof doesn't open it. The crate, the stand
 * and the board count all over. Null for a place that isn't there (yet): the board before Marlow
 * arrives. (The garden shop stands boarded up until it's reopened; the Action button says so.)
 */
export function placeArea(map: WorldMap, place: PlaceId): Rect | null {
  switch (place) {
    case "tent": {
      const { x, y, width, height } = map.tent;
      return { x, y: y + height - TILE_SIZE, width, height: TILE_SIZE };
    }
    case "store": {
      const { x, y, width, height } = map.store;
      return { x, y: y + height - TILE_SIZE, width, height: TILE_SIZE };
    }
    case "gardenShop": {
      if (!map.gardenShop) return null;
      const { x, y, width, height } = map.gardenShop;
      return { x, y: y + height - TILE_SIZE, width, height: TILE_SIZE };
    }
    case "crate":
      return map.shippingCrate;
    case "seedStand":
      return map.seedStand;
    case "board":
      return map.board;
  }
}

/** The first of `places` that a character standing at `position` is near, or null. */
export function placeNear(
  map: WorldMap,
  position: Point,
  tiles: number,
  places: readonly PlaceId[] = PLACES,
): PlaceId | null {
  const feet = { x: position.x, y: position.y + FEET_OFFSET };
  return (
    places.find((place) => {
      const area = placeArea(map, place);
      return area !== null && nearPlace(feet, area, tiles);
    }) ?? null
  );
}

/** The lighthouse's door: the middle of its bottom row. */
export function lighthouseDoor(lighthouse: Rect): TilePos {
  return tileAt(lighthouse.x + lighthouse.width / 2, lighthouse.y + lighthouse.height - 1);
}

/** Whether a character's feet are by the lighthouse's door (in front of it, or beside that). */
export function nearLighthouseDoor(map: WorldMap, position: Point, tiles: number): boolean {
  if (!map.lighthouse) return false;
  const door = lighthouseDoor(map.lighthouse);
  const feet = { x: position.x, y: position.y + FEET_OFFSET };
  return distanceToRect(feet, { x: door.col * TILE_SIZE, y: door.row * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }) <= tiles * TILE_SIZE;
}

/**
 * Whether a player rejoining can carry on where they say they were: their feet are on a tile you
 * can walk on in today's map. If not (a stale tab, a map edit, somewhere since built over), the
 * room puts them at the spawn point instead.
 */
export function canStandAt(map: WorldMap, at: Point): boolean {
  const feet = feetTile(at);
  return feet.col >= 0 && feet.row >= 0 && feet.col < map.width && feet.row < map.height && !map.blocked[feet.row][feet.col];
}

/**
 * Where everyone wakes up: the tile in front of the tent's door first, then the tiles beside it,
 * right and left in turn, so nobody stands on anyone else.
 */
export function wakeSpots(tent: Rect, count = 4): TilePos[] {
  const door = tileAt(tent.x + tent.width / 2, tent.y + tent.height);
  const offsets = [0, 1, -1, 2, -2, 3, -3];
  return offsets.slice(0, Math.max(1, Math.min(count, offsets.length))).map((dc) => ({ col: door.col + dc, row: door.row }));
}
