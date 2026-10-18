import { NO_SHORE, tideIn, type Shore } from "../beachcombing/tide";
import { settleCrate } from "../economy/shop";
import { advanceTile, isRipe, type FarmTile } from "../farming/farming";
import { forageMorning, NO_GROUNDS, type ForageGrounds } from "../foraging/forage";
import { nextDay } from "../time/clock";
import { builtThings } from "../village/built";
import { buildOvernight, keeperArrives, keeperHere } from "../village/projects";
import type { MorningReport, TileKey, World } from "./world";

/** Where the morning brings things: the beach's sand for finds, and the grounds for driftwood and branches. */
export interface MorningPlaces {
  shore: Shore;
  grounds: ForageGrounds;
}

/** Nowhere at all (tests, and a map without a beach). */
export const NO_PLACES: MorningPlaces = { shore: NO_SHORE, grounds: NO_GROUNDS };

/** Where things turn up, given what's built by then (the path to the point opens new sand). See shared/world/today.ts. */
export type PlacesFor = (built: ReadonlySet<string>) => MorningPlaces;

/** In a new world, Marlow arrives on the morning of this day, so the first day stays the farming tutorial it is. */
export const KEEPER_ARRIVES_DAY = 2;

/**
 * The night, all at once: every watered crop grows a day, the soil dries out, the shipping crate
 * sells, the clock moves to 6 am the next day, the village's gathered steps are built, Marlow
 * arrives (in a new world, on day 2) with a storm, the tide brings a few finds, and (once he's here)
 * driftwood and branches turn up. Returns the morning's world and what to tell everyone about it
 * (also kept in the world as lastMorning, for whoever wasn't there).
 */
export function endNight(world: World, placesFor: PlacesFor = () => NO_PLACES): { world: World; report: MorningReport } {
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
  const { world: builtWorld, built } = buildOvernight({ ...world, clock, coins, crate, farm });
  const storm = builtWorld.village.keeperDay === 0 && clock.day >= KEEPER_ARRIVES_DAY;
  const morning = storm ? keeperArrives(builtWorld) : builtWorld;
  const places = placesFor(builtThings(morning));
  const tide = tideIn(morning, places.shore);
  const forage = keeperHere(tide.world) ? forageMorning(tide.world, places.grounds, storm) : { world: tide.world, added: [] };
  const report: MorningReport = {
    day: clock.day,
    grew,
    ready,
    sale,
    coins,
    washedUp: tide.washedUp.map((find) => find.findId),
    foraged: forage.added.map((item) => item.itemId),
    built,
  };
  return { world: { ...forage.world, lastMorning: report }, report };
}

/**
 * When the server starts: on a world that's past its first day, Marlow arrives now if he hasn't
 * (the real farm, the first time it starts after Milestone 6) and a storm washes driftwood up;
 * a beach that hasn't had today's tide gets it (a brand-new world, or a save from before Milestone
 * 5); and once he's here, today's driftwood and branches turn up if they haven't yet.
 */
export function startOfServer(world: World, placesFor: PlacesFor = () => NO_PLACES): World {
  const storm = world.village.keeperDay === 0 && world.clock.day >= KEEPER_ARRIVES_DAY;
  const arrived = storm ? keeperArrives(world) : world;
  const places = placesFor(builtThings(arrived));
  const tide = tideIn(arrived, places.shore).world;
  return keeperHere(tide) ? forageMorning(tide, places.grounds, storm).world : tide;
}
