import { describe, expect, it } from "vitest";
import { ITEMS, STARTER_ITEMS, type ItemId } from "../content/items";
import {
  HOTBAR_SLOTS,
  INVENTORY_SLOTS,
  addItems,
  countOf,
  isHotbarSlot,
  isSlotIndex,
  moveSlot,
  newInventory,
  removeFromSlot,
  removeItems,
  roomFor,
  splitStack,
  starterInventory,
  type Inventory,
  type InventoryResult,
  type Slot,
} from "./inventory";

const MAX = ITEMS.radish.maxStack;

function stack(itemId: ItemId, count: number): Slot {
  return { itemId, count };
}

/** A bag with the given slots filled and the rest empty. */
function bag(filled: Record<number, Slot>): Inventory {
  const slots = [...newInventory()];
  for (const [i, slot] of Object.entries(filled)) slots[Number(i)] = slot;
  return slots;
}

/** A bag with every slot holding one hoe (tools don't stack), so nothing else fits. */
function fullOfHoes(): Inventory {
  return newInventory().map(() => stack("hoe", 1));
}

/** The bag from a result that's expected to succeed. */
function bagOf(result: InventoryResult<string, object>): Inventory {
  if (!result.ok) throw new Error(`expected success, got "${result.reason}"`);
  return result.inventory;
}

describe("a new bag", () => {
  it("has INVENTORY_SLOTS empty slots, the first HOTBAR_SLOTS of them the hotbar", () => {
    expect(newInventory()).toHaveLength(INVENTORY_SLOTS);
    expect(newInventory().every((slot) => slot === null)).toBe(true);
    expect(HOTBAR_SLOTS).toBeLessThanOrEqual(INVENTORY_SLOTS);
    expect(isHotbarSlot(0)).toBe(true);
    expect(isHotbarSlot(HOTBAR_SLOTS - 1)).toBe(true);
    expect(isHotbarSlot(HOTBAR_SLOTS)).toBe(false);
  });

  it("starts a new player with the starter items on the hotbar", () => {
    const start = starterInventory();
    STARTER_ITEMS.forEach(({ itemId, count }, i) => {
      expect(start[i]).toEqual({ itemId, count });
    });
    expect(STARTER_ITEMS.length).toBeLessThanOrEqual(HOTBAR_SLOTS);
  });
});

describe("isSlotIndex", () => {
  it("accepts slot numbers in the bag", () => {
    expect(isSlotIndex(newInventory(), 0)).toBe(true);
    expect(isSlotIndex(newInventory(), INVENTORY_SLOTS - 1)).toBe(true);
  });

  it("rejects anything else", () => {
    for (const bad of [-1, INVENTORY_SLOTS, 1.5, NaN, "3", undefined]) {
      expect(isSlotIndex(newInventory(), bad)).toBe(false);
    }
  });
});

describe("addItems", () => {
  it("puts items in the first empty slot", () => {
    const result = addItems(newInventory(), "radish", 3);
    expect(result).toEqual({
      ok: true,
      inventory: bag({ 0: stack("radish", 3) }),
      added: 3,
      leftover: 0,
    });
  });

  it("tops up an existing stack before using an empty slot", () => {
    const before = bag({ 0: stack("carrot", 1), 5: stack("radish", 10) });
    expect(bagOf(addItems(before, "radish", 4))).toEqual(
      bag({ 0: stack("carrot", 1), 5: stack("radish", 14) }),
    );
  });

  it("fills a stack exactly to the max without starting a new one", () => {
    const before = bag({ 2: stack("radish", MAX - 5) });
    expect(addItems(before, "radish", 5)).toEqual({
      ok: true,
      inventory: bag({ 2: stack("radish", MAX) }),
      added: 5,
      leftover: 0,
    });
  });

  it("spills one past the max into the next empty slot", () => {
    const before = bag({ 2: stack("radish", MAX - 5) });
    expect(bagOf(addItems(before, "radish", 6))).toEqual(
      bag({ 0: stack("radish", 1), 2: stack("radish", MAX) }),
    );
  });

  it("splits a big add into full stacks", () => {
    expect(bagOf(addItems(newInventory(), "starfish", MAX * 2 + 1))).toEqual(
      bag({ 0: stack("starfish", MAX), 1: stack("starfish", MAX), 2: stack("starfish", 1) }),
    );
  });

  it("puts each tool in its own slot", () => {
    expect(bagOf(addItems(newInventory(), "hoe", 2))).toEqual(
      bag({ 0: stack("hoe", 1), 1: stack("hoe", 1) }),
    );
  });

  it("adds what fits and reports the rest as leftover", () => {
    const almostFull = [...fullOfHoes()];
    almostFull[7] = stack("radish", MAX - 2);
    const result = addItems(almostFull, "radish", 5);
    expect(result.ok && result.added).toBe(2);
    expect(result.ok && result.leftover).toBe(3);
    expect(bagOf(result)[7]).toEqual(stack("radish", MAX));
  });

  it("fails when nothing fits", () => {
    expect(addItems(fullOfHoes(), "radish", 1)).toEqual({ ok: false, reason: "no-space" });
    const fullRadishes = newInventory().map(() => stack("radish", MAX));
    expect(addItems(fullRadishes, "radish", 1)).toEqual({ ok: false, reason: "no-space" });
  });

  it("rejects unknown items and bad counts", () => {
    expect(addItems(newInventory(), "cactus", 1)).toEqual({ ok: false, reason: "unknown-item" });
    for (const bad of [0, -2, 1.5, NaN, Infinity]) {
      expect(addItems(newInventory(), "radish", bad)).toEqual({ ok: false, reason: "bad-count" });
    }
  });

  it("doesn't change the bag it was given", () => {
    const before = bag({ 0: stack("radish", 1) });
    const copy = structuredClone(before);
    addItems(before, "radish", 5);
    expect(before).toEqual(copy);
  });
});

describe("countOf and roomFor", () => {
  it("counts an item across slots", () => {
    const b = bag({ 0: stack("radish", 4), 9: stack("radish", 6), 3: stack("carrot", 2) });
    expect(countOf(b, "radish")).toBe(10);
    expect(countOf(b, "pumpkin")).toBe(0);
  });

  it("counts room in partial stacks and empty slots", () => {
    const b = [...fullOfHoes()];
    b[0] = stack("radish", MAX - 3);
    b[1] = null;
    expect(roomFor(b, "radish")).toBe(3 + MAX);
    expect(roomFor(b, "carrot")).toBe(MAX);
    expect(roomFor(fullOfHoes(), "carrot")).toBe(0);
  });
});

describe("removeItems", () => {
  it("takes from later slots first, so the hotbar keeps its stack", () => {
    const before = bag({ 1: stack("radish", 5), 12: stack("radish", 3) });
    expect(bagOf(removeItems(before, "radish", 4))).toEqual(bag({ 1: stack("radish", 4) }));
  });

  it("empties slots that run out", () => {
    const before = bag({ 1: stack("radish", 5) });
    expect(bagOf(removeItems(before, "radish", 5))).toEqual(newInventory());
  });

  it("fails without changing anything if there aren't enough", () => {
    const before = bag({ 1: stack("radish", 2), 4: stack("radish", 2) });
    expect(removeItems(before, "radish", 5)).toEqual({ ok: false, reason: "not-enough" });
    expect(removeItems(newInventory(), "radish", 1)).toEqual({ ok: false, reason: "not-enough" });
  });

  it("rejects unknown items and bad counts", () => {
    expect(removeItems(newInventory(), "cactus", 1)).toEqual({ ok: false, reason: "unknown-item" });
    expect(removeItems(newInventory(), "radish", 0)).toEqual({ ok: false, reason: "bad-count" });
  });
});

describe("removeFromSlot", () => {
  it("takes some of a stack and says what it took", () => {
    expect(removeFromSlot(bag({ 3: stack("carrot", 5) }), 3, 2)).toEqual({
      ok: true,
      inventory: bag({ 3: stack("carrot", 3) }),
      removed: stack("carrot", 2),
    });
  });

  it("empties the slot when taking the whole stack", () => {
    expect(bagOf(removeFromSlot(bag({ 3: stack("carrot", 5) }), 3, 5))).toEqual(newInventory());
  });

  it("explains why it can't", () => {
    const b = bag({ 3: stack("carrot", 5) });
    expect(removeFromSlot(b, 99, 1)).toEqual({ ok: false, reason: "bad-slot" });
    expect(removeFromSlot(b, 4, 1)).toEqual({ ok: false, reason: "empty-slot" });
    expect(removeFromSlot(b, 3, 0)).toEqual({ ok: false, reason: "bad-count" });
    expect(removeFromSlot(b, 3, 6)).toEqual({ ok: false, reason: "not-enough" });
  });
});

describe("moveSlot", () => {
  it("moves a stack into an empty slot", () => {
    expect(bagOf(moveSlot(bag({ 0: stack("hoe", 1) }), 0, 10))).toEqual(bag({ 10: stack("hoe", 1) }));
  });

  it("swaps two different items", () => {
    const before = bag({ 0: stack("hoe", 1), 1: stack("radish", 4) });
    expect(bagOf(moveSlot(before, 0, 1))).toEqual(bag({ 0: stack("radish", 4), 1: stack("hoe", 1) }));
  });

  it("merges the same item into one stack", () => {
    const before = bag({ 0: stack("radish", 4), 1: stack("radish", 6) });
    expect(bagOf(moveSlot(before, 0, 1))).toEqual(bag({ 1: stack("radish", 10) }));
  });

  it("merges only up to the max and leaves the rest behind", () => {
    const before = bag({ 0: stack("radish", 10), 1: stack("radish", MAX - 4) });
    expect(bagOf(moveSlot(before, 0, 1))).toEqual(
      bag({ 0: stack("radish", 6), 1: stack("radish", MAX) }),
    );
  });

  it("does nothing when dropped on its own slot", () => {
    const before = bag({ 0: stack("radish", 4) });
    expect(bagOf(moveSlot(before, 0, 0))).toEqual(before);
  });

  it("explains why it can't", () => {
    const b = bag({ 0: stack("radish", 4) });
    expect(moveSlot(b, 0, INVENTORY_SLOTS)).toEqual({ ok: false, reason: "bad-slot" });
    expect(moveSlot(b, -1, 0)).toEqual({ ok: false, reason: "bad-slot" });
    expect(moveSlot(b, 5, 0)).toEqual({ ok: false, reason: "empty-slot" });
  });
});

describe("splitStack", () => {
  it("splits into the first empty slot", () => {
    const before = bag({ 0: stack("radish", 10), 1: stack("hoe", 1) });
    expect(bagOf(splitStack(before, 0, 4))).toEqual(
      bag({ 0: stack("radish", 6), 1: stack("hoe", 1), 2: stack("radish", 4) }),
    );
  });

  it("splits into a chosen empty slot", () => {
    expect(bagOf(splitStack(bag({ 0: stack("radish", 10) }), 0, 5, 20))).toEqual(
      bag({ 0: stack("radish", 5), 20: stack("radish", 5) }),
    );
  });

  it("can't split a stack of 1", () => {
    expect(splitStack(bag({ 0: stack("radish", 1) }), 0, 1)).toEqual({
      ok: false,
      reason: "single-item",
    });
  });

  it("must leave at least one behind and move at least one", () => {
    const b = bag({ 0: stack("radish", 10) });
    expect(splitStack(b, 0, 10)).toEqual({ ok: false, reason: "bad-count" });
    expect(splitStack(b, 0, 0)).toEqual({ ok: false, reason: "bad-count" });
    expect(splitStack(b, 0, 2.5)).toEqual({ ok: false, reason: "bad-count" });
    expect(bagOf(splitStack(b, 0, 9))).toEqual(bag({ 0: stack("radish", 1), 1: stack("radish", 9) }));
  });

  it("needs an empty slot", () => {
    const full = [...fullOfHoes()];
    full[0] = stack("radish", 10);
    expect(splitStack(full, 0, 5)).toEqual({ ok: false, reason: "no-space" });
    expect(splitStack(full, 0, 5, 3)).toEqual({ ok: false, reason: "slot-taken" });
  });

  it("explains other reasons it can't", () => {
    const b = bag({ 0: stack("radish", 10) });
    expect(splitStack(b, 1, 1)).toEqual({ ok: false, reason: "empty-slot" });
    expect(splitStack(b, INVENTORY_SLOTS, 1)).toEqual({ ok: false, reason: "bad-slot" });
    expect(splitStack(b, 0, 1, -1)).toEqual({ ok: false, reason: "bad-slot" });
  });
});
