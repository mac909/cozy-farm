import { NO_SHORE, type Shore } from "../beachcombing/tide";
import { farmKeepClear } from "../decor/boards";
import type { ForageGrounds } from "../foraging/forage";
import { builtKey } from "../village/built";
import { mapFor } from "./gates";
import { isWalkable, type TilePos, type WorldMap } from "./map";
import { beachSand, inAnyRect, meadowGrass } from "./terrain";

/**
 * The village as of today (Milestone 6): the map with what's built (gates.ts), and the places
 * worked out from it that only change when something's built: where you can walk to from the
 * spawn point, the beach sand finds and driftwood wash up on, the woods where branches fall, and
 * the meadow where bugs flutter. Nothing ever lands where nobody can get to it (the point, before
 * its path is cleared). Worked out once per set of built things and kept.
 */
export interface Today {
  readonly built: ReadonlySet<string>;
  readonly map: WorldMap;
  /** Tiles you can walk to from the spawn point, as "col,row". */
  readonly reachable: ReadonlySet<string>;
  /** Tiles that stay clear of decorations, finds and bugs (in front of doors and stands). */
  readonly keepClear: ReadonlySet<string>;
  /** Where beach finds wash up. */
  readonly shore: Shore;
  /** Where driftwood and branches turn up. */
  readonly grounds: ForageGrounds;
  /** Where bugs flutter. */
  readonly meadow: readonly TilePos[];
}

const key = ({ col, row }: TilePos) => `${col},${row}`;

/** Every tile you can walk to from `from`, as "col,row". */
export function reachableFrom(map: WorldMap, from: TilePos): Set<string> {
  const seen = new Set<string>();
  const queue = [from];
  while (queue.length > 0) {
    const { col, row } = queue.pop()!;
    const k = `${col},${row}`;
    if (seen.has(k) || !isWalkable(map, col, row)) continue;
    seen.add(k);
    queue.push({ col: col + 1, row }, { col: col - 1, row }, { col, row: row + 1 }, { col, row: row - 1 });
  }
  return seen;
}

function workOut(base: WorldMap, built: ReadonlySet<string>): Today {
  const map = mapFor(base, built);
  const reachable = reachableFrom(map, map.spawn);
  const keepClear = farmKeepClear(map);
  const open = (tile: TilePos) => reachable.has(key(tile)) && !keepClear.has(key(tile));
  const sand = beachSand(map).filter(open);
  const woods = meadowGrass(map).filter((tile) => open(tile) && inAnyRect(map.woods, tile.col, tile.row));
  return {
    built,
    map,
    reachable,
    keepClear,
    shore: sand.length > 0 ? { sand } : NO_SHORE,
    grounds: { beach: sand, woods },
    meadow: meadowGrass(map).filter(open),
  };
}

const remembered = new Map<WorldMap, Map<string, Today>>();

/** The village with `built` done, worked out once and kept (a few at a time). */
export function todayFor(base: WorldMap, built: ReadonlySet<string>): Today {
  let byKey = remembered.get(base);
  if (!byKey) {
    byKey = new Map();
    remembered.set(base, byKey);
  }
  const k = builtKey(built);
  let today = byKey.get(k);
  if (!today) {
    today = workOut(base, new Set(built));
    if (byKey.size >= 8) byKey.delete(byKey.keys().next().value!);
    byKey.set(k, today);
  }
  return today;
}
