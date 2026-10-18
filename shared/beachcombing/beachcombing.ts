import { BEACH_FINDS, BEACH_FIND_IDS, type BeachFindId } from "../content/beachFinds";
import { RARITY_WEIGHTS } from "../content/rarity";
import { mixSeed, pickWeighted, randomInt, randomSource, shuffled } from "../random/random";

/**
 * Beachcombing: each morning a few shells, bits of sea glass and the odd
 * starfish wash up on the sand, for anyone to pick up. Finds nobody picks up
 * stay where they are. Every number here is a first guess, meant to be tuned by playing.
 */
export const BEACHCOMBING = {
  /** Finds that wash up each morning, picked at random in this range (fewer if the beach is nearly full). */
  perMorning: { min: 2, max: 5 },
  /** Most finds lying on the sand at once. When it's full, nothing new washes up until someone picks some up. */
  maxOnBeach: 10,
} as const;

/** A map tile, by column and row. */
export interface TilePos {
  readonly col: number;
  readonly row: number;
}

/** Something lying on one sand tile. */
export interface BeachFind extends TilePos {
  /** What it is. Also the id of the item it gives. */
  readonly findId: BeachFindId;
}

/** Everything lying on the sand, in the order it washed up. At most one find per tile. */
export type Beach = readonly BeachFind[];

export const EMPTY_BEACH: Beach = [];

/** Keeps the beach's random numbers apart from anything else seeded from the same world seed. */
const BEACH_SALT = 0xbeac4;

export interface Tide {
  /** The day that's starting (the game clock's `day`). */
  day: number;
  /** The world's own seed, picked once when the world was made. */
  worldSeed: number;
  /** Every sand tile a find could wash up on. Read from the map by the caller. */
  sandTiles: readonly TilePos[];
  /** Sand tiles with something on them (a player, a decoration, the crate). Nothing washes up there. */
  blocked?: readonly TilePos[];
  /** What's on the sand now, from earlier mornings. */
  beach: Beach;
}

export interface WashedUp {
  /** The beach afterwards: what was there, then the new finds. */
  beach: Beach;
  /** Just this morning's finds. */
  washedUp: BeachFind[];
}

function key(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * The morning tide: scatters a few finds on free sand tiles. The same day,
 * world seed and tiles always give the same finds, whatever order the tiles
 * come in. Never more than one find per tile, never on a blocked tile, and
 * never more than BEACHCOMBING.maxOnBeach on the sand in all.
 */
export function washUpFinds({ day, worldSeed, sandTiles, blocked = [], beach }: Tide): WashedUp {
  const room = BEACHCOMBING.maxOnBeach - beach.length;
  if (room <= 0) return { beach, washedUp: [] };

  const taken = new Set([...blocked, ...beach].map((t) => key(t.col, t.row)));
  const free = new Map<string, TilePos>();
  for (const { col, row } of sandTiles) {
    if (!Number.isInteger(col) || !Number.isInteger(row)) continue;
    const k = key(col, row);
    if (!taken.has(k)) free.set(k, { col, row });
  }
  const freeTiles = [...free.values()].sort((a, b) => a.row - b.row || a.col - b.col);

  const random = randomSource(mixSeed(worldSeed, day, BEACH_SALT));
  const count = Math.min(randomInt(random, BEACHCOMBING.perMorning), room, freeTiles.length);
  const washedUp: BeachFind[] = [];
  for (const { col, row } of shuffled(random, freeTiles).slice(0, count)) {
    const findId = pickWeighted(random, BEACH_FIND_IDS, (id) => RARITY_WEIGHTS[BEACH_FINDS[id].rarity]);
    if (findId !== undefined) washedUp.push({ col, row, findId });
  }
  return { beach: [...beach, ...washedUp], washedUp };
}

/** What's lying on tile (col, row), if anything. */
export function findAt(beach: Beach, col: number, row: number): BeachFind | undefined {
  return beach.find((f) => f.col === col && f.row === row);
}

export type PickUpResult =
  | { ok: true; beach: Beach; findId: BeachFindId }
  | { ok: false; reason: "nothing-here" };

/**
 * Picks up the find on tile (col, row), taking it off the beach. The room
 * checks the player's bag has room first, so a full bag leaves it lying there.
 */
export function pickUp(beach: Beach, col: number, row: number): PickUpResult {
  const found = findAt(beach, col, row);
  if (found === undefined) return { ok: false, reason: "nothing-here" };
  return { ok: true, beach: beach.filter((f) => f !== found), findId: found.findId };
}
