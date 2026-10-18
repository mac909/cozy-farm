import { FURNITURE } from "../content/furniture";
import { FEET_OFFSET, TILE_SIZE } from "../constants";
import { floorToMap, houseAt } from "../world/houses";
import type { HousePlan, Rect, WorldMap } from "../world/map";
import { distanceToRect, type Point } from "../world/places";
import { pieceArea, type PlacedPiece } from "./pieces";

/** Beds in houses: like the tent, Action says Sleep next to one. Any bed, in anyone's house. */

/** Where a piece in a house stands, in world pixels. */
export function pieceRectInHouse(plan: HousePlan, piece: PlacedPiece): Rect {
  const area = pieceArea(piece);
  const at = floorToMap(plan, area);
  return { x: at.col * TILE_SIZE, y: at.row * TILE_SIZE, width: area.width * TILE_SIZE, height: area.height * TILE_SIZE };
}

/**
 * The bed a character standing at `position` (the middle of their sprite) is within `tiles` of, in
 * the room they're in. `houses` is what's in each house, by id.
 */
export function bedNear(
  map: WorldMap,
  houses: Readonly<Record<string, { furniture: readonly PlacedPiece[] }>>,
  position: Point,
  tiles: number,
): { plan: HousePlan; piece: PlacedPiece; rect: Rect } | null {
  const plan = houseAt(map, position);
  if (!plan || !Object.hasOwn(houses, plan.id)) return null;
  const feet = { x: position.x, y: position.y + FEET_OFFSET };
  let best: { plan: HousePlan; piece: PlacedPiece; rect: Rect; distance: number } | null = null;
  for (const piece of houses[plan.id].furniture) {
    if (!FURNITURE[piece.itemId].bed) continue;
    const rect = pieceRectInHouse(plan, piece);
    const distance = distanceToRect(feet, rect);
    if (distance <= tiles * TILE_SIZE && (!best || distance < best.distance)) best = { plan, piece, rect, distance };
  }
  return best && { plan: best.plan, piece: best.piece, rect: best.rect };
}
