import { KEEPER_HOURS } from "../content/keeper";
import { KEEPER_BUILT } from "../village/built";
import type { KeeperPoint, KeeperSpotId, WorldMap } from "./map";

/**
 * Where Marlow is (Milestone 6): a pure rule on the clock, so both screens agree and he never has
 * to find his way anywhere. By the Village Board in the daytime; fishing off the end of the dock
 * in the evening (on the rocks at the point once the lighthouse is lit); in his boat by the dock
 * late at night (up in the lamp room once it's lit, out of sight). Nobody bumps into him.
 */

/** Which of his spots he's at, or null when he isn't anywhere to be seen (not arrived yet, or up in the lamp room). */
export function keeperSpotId(minute: number, built: ReadonlySet<string>): KeeperSpotId | null {
  if (!built.has(KEEPER_BUILT)) return null;
  const lit = built.has("lighthouse");
  if (minute < KEEPER_HOURS.evening) return "day";
  if (minute < KEEPER_HOURS.night) return lit ? "eveningLit" : "evening";
  return lit ? null : "night";
}

/** Where he stands now on `map` (as of today), or null. */
export function keeperAt(map: WorldMap, minute: number, built: ReadonlySet<string>): (KeeperPoint & { spot: KeeperSpotId }) | null {
  const spot = keeperSpotId(minute, built);
  const point = spot ? map.keeper[spot] : undefined;
  return spot && point ? { ...point, spot } : null;
}
