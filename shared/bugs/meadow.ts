import { BUGS, bugsOutAt, type BugId } from "../content/bugs";
import { RARITY_WEIGHTS } from "../content/rarity";
import { mixSeed, pickWeighted, randomInt, randomSource, shuffled } from "../random/random";
import { DAY_START_MINUTE } from "../time/clock";
import type { TilePos } from "../world/map";

/**
 * Bugs in the meadow: every couple of game hours a new lot flutters over the grass, picked from
 * the kinds out at that time of day. They aren't saved: the same world seed, day and time always
 * bring the same bugs, and the room remembers which have been caught. Every number here is a
 * first guess, meant to be tuned by playing.
 */
export const MEADOW = {
  /** A new lot of bugs comes this often, in game minutes (about 100 real seconds). */
  slotMinutes: 120,
  /** How many in each lot. */
  perSlot: { min: 3, max: 6 },
  /** How far a bug wanders from its spot as it flutters about, in tiles. */
  wanderTiles: 1.25,
  /** The Action button says Catch when a bug (where it's drawn) is this close to your feet, in tiles. */
  catchTiles: 1.25,
  /**
   * The server accepts a catch this far from the bug's spot, in tiles: its wander, a reach and lag.
   * Generous, because each screen draws the flutter on its own clock.
   */
  serverCatchTiles: 4,
} as const;

/** Keeps the meadow's random numbers apart from the beach's (both come from the world seed). */
const MEADOW_SALT = 0xb077e;

/** One bug fluttering about its spot. */
export interface MeadowBug {
  /** Unique within the day and lot: "day.slot.n". */
  readonly id: string;
  readonly bugId: BugId;
  /** The tile it flutters around. */
  readonly col: number;
  readonly row: number;
}

/** Which lot of bugs is out at `minute` (game minutes after midnight): 0 from 6 am, 1 from 8 am, and so on. */
export function bugSlot(minute: number): number {
  return Math.max(0, Math.floor((minute - DAY_START_MINUTE) / MEADOW.slotMinutes));
}

/** When lot `slot` comes out, in game minutes after midnight. */
export function slotStart(slot: number): number {
  return DAY_START_MINUTE + slot * MEADOW.slotMinutes;
}

export interface MeadowLot {
  day: number;
  slot: number;
  worldSeed: number;
  /** Every tile a bug could flutter over (meadowGrass in shared/world/terrain.ts). */
  tiles: readonly TilePos[];
  /** Tiles with something standing on them (decorations that block the way, the paths kept clear). */
  blocked?: ReadonlySet<string>;
}

const key = (col: number, row: number) => `${col},${row}`;

/**
 * The bugs out in one lot: a few kinds from what's out at that time of day, rarer ones less often,
 * each on its own free tile. The same lot always gives the same bugs, whatever order the tiles come in.
 */
export function meadowBugs({ day, slot, worldSeed, tiles, blocked = new Set() }: MeadowLot): MeadowBug[] {
  const kinds = bugsOutAt(slotStart(slot));
  if (kinds.length === 0) return [];
  const seen = new Set<string>();
  const free: TilePos[] = [];
  for (const { col, row } of tiles) {
    const k = key(col, row);
    if (!Number.isInteger(col) || !Number.isInteger(row) || blocked.has(k) || seen.has(k)) continue;
    seen.add(k);
    free.push({ col, row });
  }
  free.sort((a, b) => a.row - b.row || a.col - b.col);

  const random = randomSource(mixSeed(worldSeed, day, slot, MEADOW_SALT));
  const count = Math.min(randomInt(random, MEADOW.perSlot), free.length);
  const bugs: MeadowBug[] = [];
  shuffled(random, free)
    .slice(0, count)
    .forEach(({ col, row }, n) => {
      const bugId = pickWeighted(random, kinds, (id) => RARITY_WEIGHTS[BUGS[id].rarity]);
      if (bugId !== undefined) bugs.push({ id: `${day}.${slot}.${n}`, bugId, col, row });
    });
  return bugs;
}

/** A number from a bug's id, so each one flutters its own way. */
function idSeed(id: string): number {
  let hash = 0;
  for (const ch of id) hash = mixSeed(hash, ch.charCodeAt(0));
  return hash;
}

/**
 * Where a bug is drawn, in pixels from the middle of its spot, at `timeMs` (any steady clock):
 * a slow loop round its spot with a little bob. Both screens use the wall clock, so they roughly agree.
 */
export function flutterOffset(id: string, timeMs: number, tileSize = 16): { x: number; y: number } {
  const random = randomSource(idSeed(id));
  const periodX = 7000 + random.next() * 4000;
  const periodY = 5000 + random.next() * 3000;
  const phaseX = random.next() * Math.PI * 2;
  const phaseY = random.next() * Math.PI * 2;
  const reach = MEADOW.wanderTiles * tileSize;
  const t = (timeMs / 1000) * Math.PI * 2;
  return {
    x: reach * Math.sin(t / (periodX / 1000) + phaseX),
    y: reach * 0.6 * Math.sin(t / (periodY / 1000) + phaseY) + 1.5 * Math.sin(t * 1.7 + phaseX),
  };
}
