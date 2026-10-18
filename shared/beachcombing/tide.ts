import { farmKeepClear } from "../decor/boards";
import { coveredTiles } from "../decor/pieces";
import type { TilePos, WorldMap } from "../world/map";
import { beachSand } from "../world/terrain";
import type { World } from "../world/world";
import { wantedFinds } from "../village/projects";
import { MARLOWS_LUCK, washUpFinds, type BeachFind } from "./beachcombing";

/**
 * The tide on the village's beach: once a day, a few finds wash up on the sand (the merged rules in
 * beachcombing.ts pick what and where). It comes overnight, and also when the server first starts
 * on a world whose beach has never had a tide (a brand-new world, or a save from before Milestone 5).
 */

/** Where things can wash up, read from the map once: the beach's open sand, minus the tiles kept clear. */
export interface Shore {
  readonly sand: readonly TilePos[];
}

/** No beach at all (tests, and a map without sand). */
export const NO_SHORE: Shore = { sand: [] };

/** The village's shore: its beach sand (see terrain.ts), except round the crate and the other places kept clear. */
export function shoreOf(map: WorldMap): Shore {
  const keepClear = farmKeepClear(map);
  return { sand: beachSand(map).filter(({ col, row }) => !keepClear.has(`${col},${row}`)) };
}

/**
 * If the tide hasn't come yet today, it brings a few finds: never onto a decoration or driftwood,
 * never more than the beach holds. A find the board is waiting for comes more often (Marlow's
 * luck). Returns the world (with the day of this tide) and what washed up.
 */
export function tideIn(world: World, shore: Shore): { world: World; washedUp: BeachFind[] } {
  if (world.beach.day >= world.clock.day) return { world, washedUp: [] };
  const blocked = [...world.decorations.flatMap(coveredTiles), ...world.forage.items];
  const { beach, washedUp } = washUpFinds({
    day: world.clock.day,
    worldSeed: world.worldSeed,
    sandTiles: shore.sand,
    blocked,
    beach: world.beach.finds,
    luck: { finds: wantedFinds(world), times: MARLOWS_LUCK },
  });
  return { world: { ...world, beach: { day: world.clock.day, finds: beach } }, washedUp };
}
