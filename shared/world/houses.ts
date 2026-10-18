import { TILE_SIZE } from "../constants";
import { houseLook } from "../content/houses";
import type { HousePlan, Rect, TilePos, WorldMap } from "./map";
import { distanceToRect, type Point } from "./places";

/**
 * Where the cottages and their rooms are: doors, the way out of each room, the floor furniture
 * stands on, and which room (if any) someone is in. The rooms are part of the village map, drawn
 * out of sight at its bottom; going through a door moves you there.
 */

/** Everywhere that isn't one of the rooms. */
export const VILLAGE = "village";

/** Where someone is: the village, or a house's room (by house id). */
export type AreaId = string;

const rectOf = (tile: TilePos): Rect => ({ x: tile.col * TILE_SIZE, y: tile.row * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
const tileOf = (x: number, y: number): TilePos => ({ col: Math.floor(x / TILE_SIZE), row: Math.floor(y / TILE_SIZE) });

/** The room's floor: inside its walls. */
export function floorRect(plan: HousePlan): Rect {
  const { x, y, width, height } = plan.interior;
  return { x: x + TILE_SIZE, y: y + TILE_SIZE, width: width - 2 * TILE_SIZE, height: height - 2 * TILE_SIZE };
}

/** The map tile of the floor's top-left corner: furniture positions count from here. */
export function floorOrigin(plan: HousePlan): TilePos {
  const floor = floorRect(plan);
  return tileOf(floor.x, floor.y);
}

/** The floor's size in tiles. */
export function floorSize(plan: HousePlan): { width: number; height: number } {
  const floor = floorRect(plan);
  return { width: Math.round(floor.width / TILE_SIZE), height: Math.round(floor.height / TILE_SIZE) };
}

/** The way out: the gap in the middle of the room's bottom wall, with a mat on it. You arrive on it too. */
export function exitTile(plan: HousePlan): TilePos {
  const first = tileOf(plan.interior.x, plan.interior.y);
  const cols = Math.round(plan.interior.width / TILE_SIZE);
  const rows = Math.round(plan.interior.height / TILE_SIZE);
  return { col: first.col + Math.floor(cols / 2), row: first.row + rows - 1 };
}

/** The floor tile just inside the way out, in floor tiles: always kept clear, so nobody's ever shut in or out. */
export function keepClearTile(plan: HousePlan): TilePos {
  const exit = exitTile(plan);
  const origin = floorOrigin(plan);
  return { col: exit.col - origin.col, row: exit.row - 1 - origin.row };
}

/** The cottage's door, on its bottom row. */
export function doorTile(plan: HousePlan): TilePos {
  const first = tileOf(plan.building.x, plan.building.y);
  const rows = Math.round(plan.building.height / TILE_SIZE);
  const cols = Math.round(plan.building.width / TILE_SIZE);
  return { col: first.col + Math.min(houseLook(plan.id).door, cols - 1), row: first.row + rows - 1 };
}

/** Where you come out of a cottage: just in front of its door. */
export function frontOfDoor(plan: HousePlan): TilePos {
  const door = doorTile(plan);
  return { col: door.col, row: door.row + 1 };
}

export function houseById(map: WorldMap, houseId: string): HousePlan | null {
  return map.houses.find((plan) => plan.id === houseId) ?? null;
}

/** The house whose room a point (in world pixels) is in, or null in the village. */
export function houseAt(map: WorldMap, point: Point): HousePlan | null {
  return (
    map.houses.find(({ interior: r }) => point.x >= r.x && point.x < r.x + r.width && point.y >= r.y && point.y < r.y + r.height) ?? null
  );
}

/** Where a point is: VILLAGE, or the id of the house whose room it's in. */
export function areaOf(map: WorldMap, point: Point): AreaId {
  return houseAt(map, point)?.id ?? VILLAGE;
}

/** The cottage whose door a pair of feet is within `tiles` of, if any. */
export function doorNear(map: WorldMap, feet: Point, tiles: number): HousePlan | null {
  return map.houses.find((plan) => distanceToRect(feet, rectOf(doorTile(plan))) <= tiles * TILE_SIZE) ?? null;
}

/** The room whose way out a pair of feet is on, or right by. */
export function exitNear(map: WorldMap, feet: Point): HousePlan | null {
  return map.houses.find((plan) => distanceToRect(feet, rectOf(exitTile(plan))) <= TILE_SIZE * 0.75) ?? null;
}

/** A floor position (furniture's) as map tiles. */
export function floorToMap(plan: HousePlan, at: TilePos): TilePos {
  const origin = floorOrigin(plan);
  return { col: at.col + origin.col, row: at.row + origin.row };
}

/** Map tiles as a floor position. */
export function mapToFloor(plan: HousePlan, at: TilePos): TilePos {
  const origin = floorOrigin(plan);
  return { col: at.col - origin.col, row: at.row - origin.row };
}

/**
 * The village itself: the whole map above the rooms. The camera stays inside it outdoors, so the
 * rooms below the sea are never seen from outside.
 */
export function villageRect(map: WorldMap): Rect {
  const width = map.width * TILE_SIZE;
  const top = Math.min(...map.houses.map((plan) => plan.interior.y), map.height * TILE_SIZE + TILE_SIZE);
  return { x: 0, y: 0, width, height: Math.min(map.height * TILE_SIZE, top - TILE_SIZE) };
}
