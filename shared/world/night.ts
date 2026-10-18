import { NO_SHORE, tideIn, type Shore } from "../beachcombing/tide";
import { settleCrate } from "../economy/shop";
import { advanceTile, isRipe, type FarmTile } from "../farming/farming";
import { nextDay } from "../time/clock";
import type { MorningReport, TileKey, World } from "./world";

/**
 * The night, all at once: every watered crop grows a day, the soil dries out, the shipping crate
 * sells, the clock moves to 6 am the next day, and the tide brings a few finds onto `shore`'s sand.
 * Returns the morning's world and what to tell everyone about it (also kept in the world as
 * lastMorning, for whoever wasn't there).
 */
export function endNight(world: World, shore: Shore = NO_SHORE): { world: World; report: MorningReport } {
  let grew = 0;
  let ready = 0;
  const farm: Record<TileKey, FarmTile> = {};
  for (const [key, tile] of Object.entries(world.farm) as [TileKey, FarmTile][]) {
    if (tile.kind === "planted" && tile.watered && !isRipe(tile)) grew++;
    const after = advanceTile(tile);
    if (isRipe(after)) ready++;
    farm[key] = after;
  }
  const { coins, crate, sale } = settleCrate(world.crate, world.coins);
  const clock = nextDay(world.clock);
  const tide = tideIn({ ...world, clock, coins, crate, farm }, shore);
  const report: MorningReport = { day: clock.day, grew, ready, sale, coins, washedUp: tide.washedUp.map((find) => find.findId) };
  return { world: { ...tide.world, lastMorning: report }, report };
}
