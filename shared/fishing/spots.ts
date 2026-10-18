import type { FishingSpot } from "../content/fish";
import { isWalkable, type TilePos, type WorldMap } from "../world/map";
import { inAnyRect, isDock, isWater } from "../world/terrain";

/**
 * Where a line goes in: standing somewhere you can walk, with water in front. The deep water off
 * the dock's end (the map's `deepWater` rectangles) is "deep"; anywhere else it's "dock" if you're
 * on the dock and "shore" if you're on the beach (or any other bit of land by the sea).
 * `feet` is the tile you stand on, `water` the tile the line goes into. Null if it can't go in there.
 */
export function fishingSpot(map: WorldMap, feet: TilePos, water: TilePos): FishingSpot | null {
  if (!isWater(map, water.col, water.row) || !isWalkable(map, feet.col, feet.row)) return null;
  const onDock = isDock(map, feet.col, feet.row);
  if (onDock && inAnyRect(map.deepWater, water.col, water.row)) return "deep";
  return onDock ? "dock" : "shore";
}

/** How the spots are called on screen. */
export const SPOT_NAMES: Readonly<Record<FishingSpot, string>> = {
  dock: "the dock",
  shore: "the shore",
  deep: "the end of the dock",
};

/** Where the bobber lands: two tiles out if that's water too, else the tile in front. */
export function bobberTile(map: WorldMap, feet: TilePos, water: TilePos): TilePos {
  const far = { col: water.col + (water.col - feet.col), row: water.row + (water.row - feet.row) };
  return isWater(map, far.col, far.row) ? far : water;
}
