import { TILE_SIZE } from "../constants";
import { floorSize, frontOfDoor, keepClearTile } from "../world/houses";
import { isWalkable, tileAt, type HousePlan, type Rect, type WorldMap } from "../world/map";
import { wakeSpots } from "../world/places";
import type { Board } from "./pieces";

/**
 * Where furniture and decorations may go: a room's floor (except just inside its way out), or the
 * farm's open ground (not the field, not paths up to doors and stands, not under buildings).
 */

type Tile = { col: number; row: number };
const key = ({ col, row }: Tile) => `${col},${row}`;

/** The tiles inside an area, in map tiles. */
function tilesIn({ x, y, width, height }: Rect): Tile[] {
  const first = tileAt(x, y);
  const last = tileAt(x + width - 1, y + height - 1);
  const tiles: Tile[] = [];
  for (let row = first.row; row <= last.row; row++) for (let col = first.col; col <= last.col; col++) tiles.push({ col, row });
  return tiles;
}

/** The row of tiles just below an area: where you stand to use it. */
function rowBelow(rect: Rect): Tile[] {
  const first = tileAt(rect.x, rect.y);
  const last = tileAt(rect.x + rect.width - 1, rect.y + rect.height - 1);
  return Array.from({ length: last.col - first.col + 1 }, (_, i) => ({ col: first.col + i, row: last.row + 1 }));
}

/** A room's floor, in tiles from its top-left floor tile. `occupied` says where people stand. */
export function houseBoard(plan: HousePlan, occupied?: (col: number, row: number) => boolean): Board {
  const { width, height } = floorSize(plan);
  const clear = keepClearTile(plan);
  return {
    kind: "house",
    open: (col, row) => col >= 0 && row >= 0 && col < width && row < height && !(col === clear.col && row === clear.row),
    occupied,
  };
}

/**
 * Tiles on the farm that stay clear so everything can still be reached: in front of the tent, the
 * seed stand, the store and each cottage's door, all round the shipping crate, and where everyone
 * wakes up. Also every tile under a building or stand (you can walk behind their tops).
 */
export function farmKeepClear(map: WorldMap): Set<string> {
  const clear = new Set<string>();
  const add = (tiles: Tile[]) => tiles.forEach((tile) => clear.add(key(tile)));
  for (const rect of [map.tent, map.seedStand, map.store]) add([...tilesIn(rect), ...rowBelow(rect)]);
  const crate = map.shippingCrate;
  add(tilesIn({ x: crate.x - TILE_SIZE, y: crate.y - TILE_SIZE, width: crate.width + 2 * TILE_SIZE, height: crate.height + 2 * TILE_SIZE }));
  for (const plan of map.houses) {
    add(tilesIn(plan.building));
    const front = frontOfDoor(plan);
    add([front, { col: front.col - 1, row: front.row }, { col: front.col + 1, row: front.row }]);
  }
  add([map.spawn, ...wakeSpots(map.tent, 4)]);
  return clear;
}

/**
 * The farm's open ground, in map tiles. `dug` says which tiles have been dug (decorations stay off
 * the soil); `occupied` says where people stand.
 */
export function farmBoard(
  map: WorldMap,
  dug: (col: number, row: number) => boolean,
  occupied?: (col: number, row: number) => boolean,
  keepClear = farmKeepClear(map),
): Board {
  const inRoom = (col: number, row: number) =>
    map.houses.some(({ interior: r }) => {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      return x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height;
    });
  return {
    kind: "farm",
    open: (col, row) =>
      isWalkable(map, col, row) &&
      !map.farmland[row][col] &&
      !dug(col, row) &&
      !keepClear.has(key({ col, row })) &&
      !inRoom(col, row),
    occupied,
  };
}
