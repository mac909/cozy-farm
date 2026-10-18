import { pickUp } from "../beachcombing/beachcombing";
import { isBugId, type BugId } from "../content/bugs";
import { FISH, isFishId, type FishId } from "../content/fish";
import { bugItemId, fishItemId, type ItemId } from "../content/items";
import { PERK } from "../content/skills";
import { hasPerk } from "../progress/farmerProgress";
import type { RandomSource } from "../random/random";
import type { Hint } from "../farming/actions";
import { addItems, roomFor } from "../inventory/inventory";
import { farmerOf, setFarmerBag, type FarmerId, type World } from "../world/world";
import { recordBug, recordCatch, recordFind, type BookEvent, type CollectionBook, type Finder } from "./collection";

/**
 * Something found goes into the finder's bag and the shared collection book, together: picking up
 * a beach find, landing a fish, catching a bug. All or nothing: with no room in the bag it stays
 * where it is (on the sand, in the meadow) and the hint says why.
 */

export type CollectResult =
  /** `count`: how many went in the bag (two, now and then, with a perk). */
  | { ok: true; world: World; itemId: ItemId; count: number; events: BookEvent[] }
  | { ok: false; hint: Hint };

const refuse = (reason: Hint["reason"]): CollectResult => ({ ok: false, hint: { reason } });

/**
 * Adds `itemId` to the farmer's bag and writes it in the book with `record`: once, or twice with
 * `twice` if there's room for two (otherwise once).
 */
function collect(
  world: World,
  farmerId: FarmerId,
  itemId: ItemId,
  record: (book: CollectionBook, finder: Finder) => { ok: true; book: CollectionBook; events: BookEvent[] } | { ok: false },
  twice = false,
): CollectResult {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return refuse("gone");
  if (roomFor(farmer.bag, itemId) < 1) return refuse("bag-full");
  const count = twice && roomFor(farmer.bag, itemId) >= 2 ? 2 : 1;
  const added = addItems(farmer.bag, itemId, count);
  if (!added.ok || added.leftover > 0) return refuse("bag-full");
  let book = world.book;
  const events: BookEvent[] = [];
  for (let i = 0; i < count; i++) {
    const recorded = record(book, { day: world.clock.day, by: farmer.name });
    if (!recorded.ok) return refuse("gone");
    book = recorded.book;
    events.push(...recorded.events);
  }
  const next = { ...setFarmerBag(world, farmerId, added.inventory), book };
  return { ok: true, world: next, itemId, count, events };
}

/**
 * Everything lying within `radius` tiles of `centre` (diagonals count as one), beach finds and
 * driftwood or branches alike, nearest first: what the shell basket sweeps up (Milestone 8).
 */
export function lyingAround(world: Pick<World, "beach" | "forage">, centre: { col: number; row: number }, radius: number): { col: number; row: number }[] {
  const near = ({ col, row }: { col: number; row: number }) => Math.max(Math.abs(col - centre.col), Math.abs(row - centre.row));
  return [...world.beach.finds, ...world.forage.items]
    .map(({ col, row }) => ({ col, row }))
    .filter((tile) => near(tile) <= radius)
    .sort((a, b) => near(a) - near(b) || a.row - b.row || a.col - b.col);
}

/** Picks up the find lying on (col, row). The caller has checked it's within reach. */
export function collectFind(world: World, farmerId: FarmerId, col: number, row: number): CollectResult {
  const taken = pickUp(world.beach.finds, col, row);
  if (!taken.ok) return refuse("gone");
  const result = collect(world, farmerId, taken.findId, (book, finder) => recordFind(book, taken.findId, finder));
  if (!result.ok) return result;
  return { ...result, world: { ...result.world, beach: { ...result.world.beach, finds: taken.beach } } };
}

/**
 * Lands a caught fish of `sizeCm` (kept within the fish's sizes). The caller has checked there was
 * a cast. With `random`, a farmer with Double catch (Fishing level 10) now and then lands two.
 */
export function collectFish(world: World, farmerId: FarmerId, fishId: FishId, sizeCm: number, random?: RandomSource): CollectResult {
  if (!isFishId(fishId)) return refuse("gone");
  const { min, max } = FISH[fishId].sizeCm;
  const size = Math.min(max, Math.max(min, Math.round(Number.isFinite(sizeCm) ? sizeCm : min)));
  const twice = random !== undefined && hasPerk(farmerOf(world, farmerId)?.progress, "doubleCatch") && random.next() < PERK.doubleCatch;
  return collect(world, farmerId, fishItemId(fishId), (book, finder) => recordCatch(book, fishId, size, finder), twice);
}

/** Catches a bug. The caller has checked it's out and within reach. */
export function collectBug(world: World, farmerId: FarmerId, bugId: BugId): CollectResult {
  if (!isBugId(bugId)) return refuse("gone");
  return collect(world, farmerId, bugItemId(bugId), (book, finder) => recordBug(book, bugId, finder));
}
