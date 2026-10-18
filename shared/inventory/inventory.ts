import { ITEMS, STARTER_ITEMS, isItemId, type ItemId } from "../content/items";

/** Slots in each player's bag. */
export const INVENTORY_SLOTS = 24;

/** The first this-many slots are the hotbar, always on screen. */
export const HOTBAR_SLOTS = 8;

/** Some number of one item. In a bag slot, `count` is 1 to the item's maxStack. */
export interface ItemStack {
  readonly itemId: ItemId;
  readonly count: number;
}

export type Slot = ItemStack | null;

/**
 * One player's bag: INVENTORY_SLOTS slots, each empty (null) or holding one
 * stack. Slots 0 to HOTBAR_SLOTS - 1 are the hotbar. Each player has their own;
 * the wallet is shared. Never changed in place; the actions below return new ones.
 */
export type Inventory = readonly Slot[];

/** What an action returns: the bag's new state, or why the action isn't allowed. */
export type InventoryResult<Reason extends string, Extra = {}> =
  | ({ ok: true; inventory: Inventory } & Extra)
  | { ok: false; reason: Reason };

function fail<Reason extends string>(reason: Reason): { ok: false; reason: Reason } {
  return { ok: false, reason };
}

/** A whole number of items, at least 1. */
export function isCount(n: unknown): n is number {
  return Number.isSafeInteger(n) && (n as number) >= 1;
}

/** True if `slot` is a slot number in `inventory`. Use it to check slots that arrive in client messages. */
export function isSlotIndex(inventory: Inventory, slot: unknown): slot is number {
  return Number.isInteger(slot) && (slot as number) >= 0 && (slot as number) < inventory.length;
}

export function isHotbarSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < HOTBAR_SLOTS;
}

/** An empty bag. */
export function newInventory(): Inventory {
  return Array<Slot>(INVENTORY_SLOTS).fill(null);
}

/** A new player's bag: STARTER_ITEMS, in order, from the first hotbar slot. */
export function starterInventory(): Inventory {
  let inventory = newInventory();
  for (const { itemId, count } of STARTER_ITEMS) {
    const added = addItems(inventory, itemId, count);
    if (added.ok) inventory = added.inventory;
  }
  return inventory;
}

/** How many of `itemId` the bag holds, across all slots. */
export function countOf(inventory: Inventory, itemId: ItemId): number {
  let total = 0;
  for (const slot of inventory) if (slot?.itemId === itemId) total += slot.count;
  return total;
}

/** How many more of `itemId` would fit, topping up its stacks and filling empty slots. */
export function roomFor(inventory: Inventory, itemId: ItemId): number {
  const max = ITEMS[itemId].maxStack;
  let room = 0;
  for (const slot of inventory) {
    if (slot === null) room += max;
    else if (slot.itemId === itemId) room += Math.max(0, max - slot.count);
  }
  return room;
}

/**
 * Puts `count` of `itemId` in the bag: first topping up stacks of that item
 * (in slot order), then into empty slots (hotbar first). If only some fit, it
 * adds those and reports the rest as `leftover`; if none fit, it fails.
 */
export function addItems(
  inventory: Inventory,
  itemId: string,
  count: number,
): InventoryResult<"unknown-item" | "bad-count" | "no-space", { added: number; leftover: number }> {
  if (!isItemId(itemId)) return fail("unknown-item");
  if (!isCount(count)) return fail("bad-count");
  const max = ITEMS[itemId].maxStack;
  const slots = [...inventory];
  let left = count;

  for (let i = 0; i < slots.length && left > 0; i++) {
    const slot = slots[i];
    if (slot?.itemId !== itemId || slot.count >= max) continue;
    const put = Math.min(left, max - slot.count);
    slots[i] = { itemId, count: slot.count + put };
    left -= put;
  }
  for (let i = 0; i < slots.length && left > 0; i++) {
    if (slots[i] !== null) continue;
    const put = Math.min(left, max);
    slots[i] = { itemId, count: put };
    left -= put;
  }

  if (left === count) return fail("no-space");
  return { ok: true, inventory: slots, added: count - left, leftover: left };
}

/**
 * Takes `count` of `itemId` out of the bag, wherever it is. It empties later
 * slots first, so the hotbar keeps its stacks the longest. All or nothing.
 */
export function removeItems(
  inventory: Inventory,
  itemId: string,
  count: number,
): InventoryResult<"unknown-item" | "bad-count" | "not-enough"> {
  if (!isItemId(itemId)) return fail("unknown-item");
  if (!isCount(count)) return fail("bad-count");
  if (countOf(inventory, itemId) < count) return fail("not-enough");
  const slots = [...inventory];
  let left = count;
  for (let i = slots.length - 1; i >= 0 && left > 0; i--) {
    const slot = slots[i];
    if (slot?.itemId !== itemId) continue;
    const take = Math.min(left, slot.count);
    slots[i] = take === slot.count ? null : { itemId, count: slot.count - take };
    left -= take;
  }
  return { ok: true, inventory: slots };
}

/** Takes `count` items out of one slot, for example to plant a seed or fill the shipping crate. */
export function removeFromSlot(
  inventory: Inventory,
  slot: number,
  count: number,
): InventoryResult<"bad-slot" | "empty-slot" | "bad-count" | "not-enough", { removed: ItemStack }> {
  if (!isSlotIndex(inventory, slot)) return fail("bad-slot");
  const stack = inventory[slot];
  if (stack === null) return fail("empty-slot");
  if (!isCount(count)) return fail("bad-count");
  if (count > stack.count) return fail("not-enough");
  const slots = [...inventory];
  slots[slot] = count === stack.count ? null : { itemId: stack.itemId, count: stack.count - count };
  return { ok: true, inventory: slots, removed: { itemId: stack.itemId, count } };
}

/**
 * Drags the stack in `from` onto `to`. Onto an empty slot it moves; onto the
 * same item it tops that stack up and leaves any extra behind; onto a
 * different item the two swap.
 */
export function moveSlot(
  inventory: Inventory,
  from: number,
  to: number,
): InventoryResult<"bad-slot" | "empty-slot"> {
  if (!isSlotIndex(inventory, from) || !isSlotIndex(inventory, to)) return fail("bad-slot");
  const moving = inventory[from];
  if (moving === null) return fail("empty-slot");
  if (from === to) return { ok: true, inventory };
  const target = inventory[to];
  const slots = [...inventory];

  if (target?.itemId === moving.itemId) {
    const max = ITEMS[moving.itemId].maxStack;
    const put = Math.min(moving.count, Math.max(0, max - target.count));
    slots[to] = { itemId: target.itemId, count: target.count + put };
    slots[from] = put === moving.count ? null : { itemId: moving.itemId, count: moving.count - put };
  } else {
    slots[to] = moving;
    slots[from] = target;
  }
  return { ok: true, inventory: slots };
}

/**
 * Splits `count` items off the stack in `from` into a new stack: in the empty
 * slot `to` if given, otherwise the first empty slot. At least one item stays
 * behind, so a stack of 1 can't be split.
 */
export function splitStack(
  inventory: Inventory,
  from: number,
  count: number,
  to?: number,
): InventoryResult<"bad-slot" | "empty-slot" | "single-item" | "bad-count" | "slot-taken" | "no-space"> {
  if (!isSlotIndex(inventory, from)) return fail("bad-slot");
  if (to !== undefined && !isSlotIndex(inventory, to)) return fail("bad-slot");
  const stack = inventory[from];
  if (stack === null) return fail("empty-slot");
  if (stack.count === 1) return fail("single-item");
  if (!isCount(count) || count >= stack.count) return fail("bad-count");

  let target: number;
  if (to === undefined) {
    target = inventory.indexOf(null);
    if (target === -1) return fail("no-space");
  } else {
    if (inventory[to] !== null) return fail("slot-taken");
    target = to;
  }

  const slots = [...inventory];
  slots[from] = { itemId: stack.itemId, count: stack.count - count };
  slots[target] = { itemId: stack.itemId, count };
  return { ok: true, inventory: slots };
}
