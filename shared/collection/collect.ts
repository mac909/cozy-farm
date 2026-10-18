import { pickUp } from "../beachcombing/beachcombing";
import { isBugId, type BugId } from "../content/bugs";
import { FISH, isFishId, type FishId } from "../content/fish";
import { bugItemId, fishItemId, type ItemId } from "../content/items";
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
  | { ok: true; world: World; itemId: ItemId; events: BookEvent[] }
  | { ok: false; hint: Hint };

const refuse = (reason: Hint["reason"]): CollectResult => ({ ok: false, hint: { reason } });

/** Adds one `itemId` to the farmer's bag and writes it in the book with `record`. */
function collect(
  world: World,
  farmerId: FarmerId,
  itemId: ItemId,
  record: (book: CollectionBook, finder: Finder) => { ok: true; book: CollectionBook; events: BookEvent[] } | { ok: false },
): CollectResult {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return refuse("gone");
  if (roomFor(farmer.bag, itemId) < 1) return refuse("bag-full");
  const added = addItems(farmer.bag, itemId, 1);
  if (!added.ok || added.leftover > 0) return refuse("bag-full");
  const recorded = record(world.book, { day: world.clock.day, by: farmer.name });
  if (!recorded.ok) return refuse("gone");
  const next = { ...setFarmerBag(world, farmerId, added.inventory), book: recorded.book };
  return { ok: true, world: next, itemId, events: recorded.events };
}

/** Picks up the find lying on (col, row). The caller has checked it's within reach. */
export function collectFind(world: World, farmerId: FarmerId, col: number, row: number): CollectResult {
  const taken = pickUp(world.beach.finds, col, row);
  if (!taken.ok) return refuse("gone");
  const result = collect(world, farmerId, taken.findId, (book, finder) => recordFind(book, taken.findId, finder));
  if (!result.ok) return result;
  return { ...result, world: { ...result.world, beach: { ...result.world.beach, finds: taken.beach } } };
}

/** Lands a caught fish of `sizeCm` (kept within the fish's sizes). The caller has checked there was a cast. */
export function collectFish(world: World, farmerId: FarmerId, fishId: FishId, sizeCm: number): CollectResult {
  if (!isFishId(fishId)) return refuse("gone");
  const { min, max } = FISH[fishId].sizeCm;
  const size = Math.min(max, Math.max(min, Math.round(Number.isFinite(sizeCm) ? sizeCm : min)));
  return collect(world, farmerId, fishItemId(fishId), (book, finder) => recordCatch(book, fishId, size, finder));
}

/** Catches a bug. The caller has checked it's out and within reach. */
export function collectBug(world: World, farmerId: FarmerId, bugId: BugId): CollectResult {
  if (!isBugId(bugId)) return refuse("gone");
  return collect(world, farmerId, bugItemId(bugId), (book, finder) => recordBug(book, bugId, finder));
}
