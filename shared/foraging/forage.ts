import type { CollectResult } from "../collection/collect";
import { FORAGE, FORAGE_IDS, type ForageGround, type ForageId } from "../content/forage";
import { coveredTiles } from "../decor/pieces";
import { addItems, roomFor } from "../inventory/inventory";
import { mixSeed, randomInt, randomSource, shuffled } from "../random/random";
import type { TilePos } from "../world/map";
import { farmerOf, setFarmerBag, type FarmerId, type World } from "../world/world";

/**
 * Foraging (Milestone 6): each morning a few pieces of driftwood wash up on the beach and a few
 * branches fall under the meadow's trees, for anyone to pick up. What and where follow from the
 * world's seed and the day, like the beach's finds, so a restart never re-rolls them. Nothing
 * nobody picks up goes away. The numbers are in shared/content/forage.ts.
 */

/** Something lying on one tile. */
export interface ForageItem extends TilePos {
  readonly itemId: ForageId;
}

/** Everything lying about, in the order it turned up. At most one thing per tile. */
export type Forage = readonly ForageItem[];

/** Where things can turn up today, worked out from the map as it is today (shared/world/today.ts). */
export type ForageGrounds = Readonly<Record<ForageGround, readonly TilePos[]>>;

/** Nowhere at all (tests, and a map without beach or woods). */
export const NO_GROUNDS: ForageGrounds = { beach: [], woods: [] };

/** Keeps the forage's random numbers apart from the beach's and the bugs'. */
const FORAGE_SALT = 0xf0a6e;

const key = (col: number, row: number) => `${col},${row}`;

export interface Morning {
  /** The day that's starting. */
  day: number;
  worldSeed: number;
  grounds: ForageGrounds;
  /** Tiles with something on them already (a beach find, a decoration). Nothing turns up there. */
  blocked?: readonly TilePos[];
  /** What's lying about now, from earlier mornings. */
  items: Forage;
  /** The storm the morning Marlow arrives: each material's storm amount instead of the usual. */
  storm?: boolean;
}

/**
 * The morning's driftwood and branches, on free tiles of their ground: a few of each (never past
 * the most that can lie about), or the storm's amounts. The same day, seed and tiles always give
 * the same, whatever order the tiles come in. Returns everything lying about, and just the new ones.
 */
export function forageIn({ day, worldSeed, grounds, blocked = [], items, storm = false }: Morning): { items: ForageItem[]; added: ForageItem[] } {
  const taken = new Set([...blocked, ...items].map((t) => key(t.col, t.row)));
  const random = randomSource(mixSeed(worldSeed, day, FORAGE_SALT));
  const added: ForageItem[] = [];
  for (const itemId of FORAGE_IDS) {
    const def = FORAGE[itemId];
    const lying = items.filter((item) => item.itemId === itemId).length;
    const wanted = storm ? def.storm : Math.min(randomInt(random, def.perMorning), Math.max(0, def.most - lying));
    const free = new Map<string, TilePos>();
    for (const { col, row } of grounds[def.ground]) {
      if (!Number.isInteger(col) || !Number.isInteger(row)) continue;
      const k = key(col, row);
      if (!taken.has(k)) free.set(k, { col, row });
    }
    const tiles = [...free.values()].sort((a, b) => a.row - b.row || a.col - b.col);
    for (const { col, row } of shuffled(random, tiles).slice(0, wanted)) {
      added.push({ itemId, col, row });
      taken.add(key(col, row));
    }
  }
  return { items: [...items, ...added], added };
}

/**
 * If the morning hasn't brought anything yet today, it does now (`storm`: the storm's amounts).
 * Never onto a decoration or a beach find. Returns the world (with today's day) and what's new.
 */
export function forageMorning(world: World, grounds: ForageGrounds, storm = false): { world: World; added: ForageItem[] } {
  if (world.forage.day >= world.clock.day) return { world, added: [] };
  const blocked = [...world.decorations.flatMap(coveredTiles), ...world.beach.finds];
  const { items, added } = forageIn({ day: world.clock.day, worldSeed: world.worldSeed, grounds, blocked, items: world.forage.items, storm });
  return { world: { ...world, forage: { day: world.clock.day, items } }, added };
}

/** What's lying on tile (col, row), if anything. */
export function forageAt(items: Forage, col: number, row: number): ForageItem | undefined {
  return items.find((item) => item.col === col && item.row === row);
}

/**
 * Picks up the driftwood or branch lying on (col, row) into the farmer's bag. All or nothing: with
 * no room it stays where it is. The caller has checked it's within reach. Materials aren't in the
 * collection book, so there are never any book events.
 */
export function collectForage(world: World, farmerId: FarmerId, col: number, row: number): CollectResult {
  const farmer = farmerOf(world, farmerId);
  const found = forageAt(world.forage.items, col, row);
  if (!farmer || !found) return { ok: false, hint: { reason: "gone" } };
  if (roomFor(farmer.bag, found.itemId) < 1) return { ok: false, hint: { reason: "bag-full" } };
  const added = addItems(farmer.bag, found.itemId, 1);
  if (!added.ok || added.leftover > 0) return { ok: false, hint: { reason: "bag-full" } };
  const items = world.forage.items.filter((item) => item !== found);
  const next = { ...setFarmerBag(world, farmerId, added.inventory), forage: { ...world.forage, items } };
  return { ok: true, world: next, itemId: found.itemId, events: [] };
}
