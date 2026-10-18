import { KEEPER_HOURS } from "../content/keeper";
import { KEEPER_BUILT } from "../village/built";
import type { KeeperPoint, KeeperSpotId, WorldMap } from "./map";

/**
 * Where Marlow is (Milestone 6): a pure rule on the clock, so both screens agree and he never has
 * to find his way anywhere. By the Village Board in the daytime; fishing off the end of the dock
 * in the evening (on the rocks at the point once the lighthouse is lit); in his boat by the dock
 * late at night (up in the lamp room once it's lit, out of sight). Nobody bumps into him.
 */

/**
 * Which of his spots he's at, or null when he isn't anywhere to be seen (not arrived yet, or up in
 * the lamp room). `opening`: a project opened this morning, so he spends the day by it (Milestone 8).
 */
export function keeperSpotId(minute: number, built: ReadonlySet<string>, opening = false): KeeperSpotId | null {
  if (!built.has(KEEPER_BUILT)) return null;
  const lit = built.has("lighthouse");
  if (minute < KEEPER_HOURS.evening) return opening ? "opening" : "day";
  if (minute < KEEPER_HOURS.night) return lit ? "eveningLit" : "evening";
  return lit ? null : "night";
}

/**
 * Where he stands now on `map` (as of today), or null. `openedToday`: the project that opened this
 * morning, if any (openedToday in shared/village/projects.ts): he's by it all day, if the map says
 * where (a `keeperOpening` point for it), otherwise by the board as usual.
 */
export function keeperAt(
  map: WorldMap,
  minute: number,
  built: ReadonlySet<string>,
  openedToday: string | null = null,
): (KeeperPoint & { spot: KeeperSpotId }) | null {
  const opening = openedToday !== null ? map.keeperOpenings[openedToday] : undefined;
  const spot = keeperSpotId(minute, built, opening !== undefined);
  const point = spot === "opening" ? opening : spot ? map.keeper[spot] : undefined;
  return spot && point ? { ...point, spot } : null;
}
