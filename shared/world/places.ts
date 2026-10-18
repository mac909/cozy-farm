import { FEET_OFFSET, TILE_SIZE } from "../constants";
import type { Facing } from "../movement";
import { type Rect, tileAt, type TilePos, type WorldMap } from "./map";

/**
 * Where things are in the village: which tile is under your feet and in front of you, what you can
 * reach, and which place (tent, crate, seed stand, store) you're standing next to.
 */

/** The places that take over the Action button when you're next to them. */
export type PlaceId = "tent" | "crate" | "seedStand" | "store";

/** Every place, in the order the Action button checks them. */
export const PLACES: readonly PlaceId[] = ["tent", "crate", "seedStand", "store"];

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
 * The part of a place you walk up to. For the tent and the store that's their bottom row, where the
 * door is, so farming the field's bottom row on the other side of the fence doesn't turn the button
 * into Sleep, and walking past the store's roof doesn't open it. The crate and stand count all over.
 */
export function placeArea(map: WorldMap, place: PlaceId): Rect {
  switch (place) {
    case "tent": {
      const { x, y, width, height } = map.tent;
      return { x, y: y + height - TILE_SIZE, width, height: TILE_SIZE };
    }
    case "store": {
      const { x, y, width, height } = map.store;
      return { x, y: y + height - TILE_SIZE, width, height: TILE_SIZE };
    }
    case "crate":
      return map.shippingCrate;
    case "seedStand":
      return map.seedStand;
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
  return places.find((place) => nearPlace(feet, placeArea(map, place), tiles)) ?? null;
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
