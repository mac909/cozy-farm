import { ITEMS, isItemId, type ItemId } from "../content/items";
import {
  addItems,
  isCount,
  isSlotIndex,
  removeFromSlot,
  type Inventory,
  type ItemStack,
} from "../inventory/inventory";
import { addCoins, spendCoins } from "./wallet";

/**
 * The general store and the shipping crate. Prices live in content/items.ts:
 * the store sells items with a `buyPrice`, the crate takes items with a `sellPrice`.
 */

/** What the general store sells, in shelf order. */
export const SHOP_STOCK: readonly ItemId[] = (Object.keys(ITEMS) as ItemId[]).filter(
  (id) => ITEMS[id].buyPrice !== undefined,
);

/**
 * The shipping crate on the dock: shared by both players, with no size limit.
 * One entry per item, in the order first shipped; counts aren't capped by
 * stack size. Everything in it sells overnight (see settleCrate).
 */
export type Crate = readonly ItemStack[];

export const EMPTY_CRATE: Crate = [];

export function isForSale(itemId: unknown): boolean {
  return isItemId(itemId) && ITEMS[itemId].buyPrice !== undefined;
}

export function isSellable(itemId: unknown): boolean {
  return isItemId(itemId) && ITEMS[itemId].sellPrice !== undefined;
}

function fail<Reason extends string>(reason: Reason): { ok: false; reason: Reason } {
  return { ok: false, reason };
}

export type BuyResult =
  | { ok: true; inventory: Inventory; coins: number; cost: number }
  | { ok: false; reason: "unknown-item" | "not-for-sale" | "bad-count" | "not-enough-coins" | "no-space" };

/**
 * Buy `count` of `itemId` from the general store with the shared wallet's
 * `coins`, into one player's bag. All or nothing: if the store doesn't sell it,
 * the coins don't cover it, or it won't all fit, nothing changes.
 */
export function buy(inventory: Inventory, coins: number, itemId: string, count: number): BuyResult {
  if (!isItemId(itemId)) return fail("unknown-item");
  const price = ITEMS[itemId].buyPrice;
  if (price === undefined) return fail("not-for-sale");
  if (!isCount(count)) return fail("bad-count");
  const cost = price * count;
  // The count is valid, so spending can only fail for lack of coins (a cost too big to count is more than anyone has).
  const spent = spendCoins(coins, cost);
  if (!spent.ok) return fail("not-enough-coins");
  const added = addItems(inventory, itemId, count);
  if (!added.ok || added.leftover > 0) return fail("no-space");
  return { ok: true, inventory: added.inventory, coins: spent.coins, cost };
}

/** Adds a stack to the crate, joining an entry for the same item if there is one. */
function addToCrate(crate: Crate, { itemId, count }: ItemStack): Crate {
  const i = crate.findIndex((entry) => entry.itemId === itemId);
  if (i === -1) return [...crate, { itemId, count }];
  return crate.map((entry, j) => (j === i ? { itemId, count: entry.count + count } : entry));
}

export type ShipResult =
  | { ok: true; inventory: Inventory; crate: Crate }
  | { ok: false; reason: "bad-slot" | "empty-slot" | "not-sellable" | "bad-count" | "not-enough" };

/** Put `count` items from one bag slot into the shipping crate. Items that can't be sold (tools) are refused. */
export function shipItems(inventory: Inventory, crate: Crate, slot: number, count: number): ShipResult {
  if (!isSlotIndex(inventory, slot)) return fail("bad-slot");
  const stack = inventory[slot];
  if (stack !== null && !isSellable(stack.itemId)) return fail("not-sellable");
  const removed = removeFromSlot(inventory, slot, count);
  if (!removed.ok) return removed;
  return { ok: true, inventory: removed.inventory, crate: addToCrate(crate, removed.removed) };
}

export type TakeResult =
  | { ok: true; inventory: Inventory; crate: Crate; taken: number; leftover: number }
  | { ok: false; reason: "unknown-item" | "bad-count" | "not-enough" | "no-space" };

/**
 * Take items back out of the crate before it sells, so nothing goes by
 * mistake. Like addItems, it takes what fits and leaves the rest (`leftover`)
 * in the crate.
 */
export function takeFromCrate(
  inventory: Inventory,
  crate: Crate,
  itemId: string,
  count: number,
): TakeResult {
  if (!isItemId(itemId)) return fail("unknown-item");
  if (!isCount(count)) return fail("bad-count");
  const i = crate.findIndex((entry) => entry.itemId === itemId);
  if (i === -1 || crate[i].count < count) return fail("not-enough");
  const added = addItems(inventory, itemId, count);
  if (!added.ok) return fail("no-space");
  const remaining = crate[i].count - added.added;
  const after =
    remaining === 0
      ? crate.filter((_, j) => j !== i)
      : crate.map((entry, j) => (j === i ? { itemId, count: remaining } : entry));
  return { ok: true, inventory: added.inventory, crate: after, taken: added.added, leftover: added.leftover };
}

/** One line of the morning's sale summary: "4 × Radish at 35 = 140". */
export interface SaleLine {
  itemId: ItemId;
  count: number;
  priceEach: number;
  total: number;
}

/** What the crate sold overnight, for the morning message. */
export interface CrateSale {
  /** In the order the items were first shipped. Empty if the crate was. */
  lines: SaleLine[];
  /** Coins earned in all. */
  total: number;
}

/**
 * At day end: sells everything in the crate at today's sell prices and pays the
 * shared wallet. Returns the new coins, the emptied crate, and a summary.
 * Anything that can't be sold (only possible if the item data changed since
 * it was shipped) stays in the crate rather than vanishing.
 */
export function settleCrate(
  crate: Crate,
  coins: number,
): { coins: number; crate: Crate; sale: CrateSale } {
  const lines: SaleLine[] = [];
  const unsold: ItemStack[] = [];
  for (const entry of crate) {
    const priceEach = isItemId(entry.itemId) ? ITEMS[entry.itemId].sellPrice : undefined;
    if (priceEach === undefined || !isCount(entry.count)) {
      unsold.push(entry);
      continue;
    }
    lines.push({ itemId: entry.itemId, count: entry.count, priceEach, total: priceEach * entry.count });
  }
  const total = lines.reduce((sum, line) => sum + line.total, 0);
  return { coins: addCoins(coins, total), crate: unsold, sale: { lines, total } };
}
