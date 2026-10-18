import { describe, expect, it } from "vitest";
import { CROPS } from "../content/crops";
import { ITEMS, type ItemId } from "../content/items";
import { newInventory, type Inventory, type Slot } from "../inventory/inventory";
import {
  EMPTY_CRATE,
  SHOP_STOCK,
  buy,
  isForSale,
  isSellable,
  settleCrate,
  shipItems,
  takeFromCrate,
  type Crate,
} from "./shop";

const MAX = ITEMS.radish.maxStack;
const SEED_PRICE = CROPS.carrot.seedPrice;

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

describe("what the store sells", () => {
  it("sells seeds, tools, and furniture, but not crops or beach finds", () => {
    expect(SHOP_STOCK).toContain("carrot_seeds");
    expect(SHOP_STOCK).toContain("watering_can");
    expect(SHOP_STOCK).toContain("bookshelf");
    expect(SHOP_STOCK).not.toContain("carrot");
    expect(SHOP_STOCK).not.toContain("starfish");
    expect(SHOP_STOCK.every(isForSale)).toBe(true);
  });

  it("knows what the crate takes", () => {
    expect(isSellable("carrot")).toBe(true);
    expect(isSellable("sea_glass")).toBe(true);
    expect(isSellable("hoe")).toBe(false);
    expect(isSellable("cactus")).toBe(false);
  });
});

describe("buy", () => {
  it("takes coins and puts the items in the bag", () => {
    expect(buy(newInventory(), 1000, "carrot_seeds", 3)).toEqual({
      ok: true,
      inventory: bag({ 0: stack("carrot_seeds", 3) }),
      coins: 1000 - 3 * SEED_PRICE,
      cost: 3 * SEED_PRICE,
    });
  });

  it("works with exactly enough coins, leaving zero", () => {
    const result = buy(newInventory(), 4 * SEED_PRICE, "carrot_seeds", 4);
    expect(result.ok && result.coins).toBe(0);
  });

  it("fails one coin short, changing nothing", () => {
    expect(buy(newInventory(), 4 * SEED_PRICE - 1, "carrot_seeds", 4)).toEqual({
      ok: false,
      reason: "not-enough-coins",
    });
  });

  it("joins an existing stack", () => {
    const result = buy(bag({ 2: stack("carrot_seeds", 5) }), 1000, "carrot_seeds", 5);
    expect(result.ok && result.inventory).toEqual(bag({ 2: stack("carrot_seeds", 10) }));
  });

  it("fits exactly into the last bit of room", () => {
    const almostFull = [...fullOfHoes()];
    almostFull[0] = stack("carrot_seeds", MAX - 2);
    const result = buy(almostFull, 1000, "carrot_seeds", 2);
    expect(result.ok && result.inventory[0]).toEqual(stack("carrot_seeds", MAX));
  });

  it("buys nothing if only some would fit", () => {
    const almostFull = [...fullOfHoes()];
    almostFull[0] = stack("carrot_seeds", MAX - 2);
    expect(buy(almostFull, 1000, "carrot_seeds", 3)).toEqual({ ok: false, reason: "no-space" });
    expect(buy(fullOfHoes(), 1000, "carrot_seeds", 1)).toEqual({ ok: false, reason: "no-space" });
  });

  it("only sells what the store stocks", () => {
    expect(buy(newInventory(), 1000, "starfish", 1)).toEqual({ ok: false, reason: "not-for-sale" });
    expect(buy(newInventory(), 1000, "pumpkin", 1)).toEqual({ ok: false, reason: "not-for-sale" });
    expect(buy(newInventory(), 1000, "cactus_seeds", 1)).toEqual({ ok: false, reason: "unknown-item" });
  });

  it("rejects bad counts, including ones too big to price", () => {
    for (const bad of [0, -1, 1.5, NaN]) {
      expect(buy(newInventory(), 1000, "carrot_seeds", bad)).toEqual({ ok: false, reason: "bad-count" });
    }
    expect(buy(newInventory(), 1000, "carrot_seeds", Number.MAX_SAFE_INTEGER)).toEqual({
      ok: false,
      reason: "not-enough-coins",
    });
  });
});

describe("shipItems", () => {
  it("moves items from a bag slot into the crate", () => {
    expect(shipItems(bag({ 3: stack("radish", 5) }), EMPTY_CRATE, 3, 2)).toEqual({
      ok: true,
      inventory: bag({ 3: stack("radish", 3) }),
      crate: [{ itemId: "radish", count: 2 }],
    });
  });

  it("keeps one entry per item, in the order first shipped, past the stack size", () => {
    const crate: Crate = [
      { itemId: "radish", count: MAX },
      { itemId: "starfish", count: 1 },
    ];
    const result = shipItems(bag({ 0: stack("radish", 5) }), crate, 0, 5);
    expect(result.ok && result.crate).toEqual([
      { itemId: "radish", count: MAX + 5 },
      { itemId: "starfish", count: 1 },
    ]);
    expect(result.ok && result.inventory).toEqual(newInventory());
  });

  it("refuses to sell a tool", () => {
    expect(shipItems(bag({ 0: stack("hoe", 1) }), EMPTY_CRATE, 0, 1)).toEqual({
      ok: false,
      reason: "not-sellable",
    });
  });

  it("explains other reasons it can't", () => {
    const b = bag({ 0: stack("radish", 2) });
    expect(shipItems(b, EMPTY_CRATE, -1, 1)).toEqual({ ok: false, reason: "bad-slot" });
    expect(shipItems(b, EMPTY_CRATE, 1, 1)).toEqual({ ok: false, reason: "empty-slot" });
    expect(shipItems(b, EMPTY_CRATE, 0, 0)).toEqual({ ok: false, reason: "bad-count" });
    expect(shipItems(b, EMPTY_CRATE, 0, 3)).toEqual({ ok: false, reason: "not-enough" });
  });
});

describe("takeFromCrate", () => {
  const crate: Crate = [
    { itemId: "radish", count: 5 },
    { itemId: "starfish", count: 1 },
  ];

  it("gives items back before they sell", () => {
    expect(takeFromCrate(newInventory(), crate, "radish", 2)).toEqual({
      ok: true,
      inventory: bag({ 0: stack("radish", 2) }),
      crate: [
        { itemId: "radish", count: 3 },
        { itemId: "starfish", count: 1 },
      ],
      taken: 2,
      leftover: 0,
    });
  });

  it("drops the entry when all of it is taken back", () => {
    const result = takeFromCrate(newInventory(), crate, "starfish", 1);
    expect(result.ok && result.crate).toEqual([{ itemId: "radish", count: 5 }]);
  });

  it("leaves what doesn't fit in the bag in the crate", () => {
    const almostFull = [...fullOfHoes()];
    almostFull[0] = stack("radish", MAX - 2);
    const result = takeFromCrate(almostFull, crate, "radish", 5);
    expect(result.ok && result.taken).toBe(2);
    expect(result.ok && result.leftover).toBe(3);
    expect(result.ok && result.crate[0]).toEqual({ itemId: "radish", count: 3 });
  });

  it("explains why it can't", () => {
    expect(takeFromCrate(fullOfHoes(), crate, "radish", 1)).toEqual({ ok: false, reason: "no-space" });
    expect(takeFromCrate(newInventory(), crate, "radish", 6)).toEqual({ ok: false, reason: "not-enough" });
    expect(takeFromCrate(newInventory(), crate, "carrot", 1)).toEqual({ ok: false, reason: "not-enough" });
    expect(takeFromCrate(newInventory(), crate, "cactus", 1)).toEqual({ ok: false, reason: "unknown-item" });
    expect(takeFromCrate(newInventory(), crate, "radish", 0)).toEqual({ ok: false, reason: "bad-count" });
  });
});

describe("settleCrate", () => {
  it("sells everything at the item's sell price and pays the wallet", () => {
    const crate: Crate = [
      { itemId: "radish", count: 4 },
      { itemId: "starfish", count: 2 },
    ];
    const radishes = 4 * CROPS.radish.sellPrice;
    const starfish = 2 * ITEMS.starfish.sellPrice!;
    expect(settleCrate(crate, 100)).toEqual({
      coins: 100 + radishes + starfish,
      crate: [],
      sale: {
        lines: [
          { itemId: "radish", count: 4, priceEach: CROPS.radish.sellPrice, total: radishes },
          { itemId: "starfish", count: 2, priceEach: ITEMS.starfish.sellPrice, total: starfish },
        ],
        total: radishes + starfish,
      },
    });
  });

  it("does nothing for an empty crate", () => {
    expect(settleCrate(EMPTY_CRATE, 250)).toEqual({
      coins: 250,
      crate: [],
      sale: { lines: [], total: 0 },
    });
  });

  it("keeps anything it can't sell in the crate instead of losing it", () => {
    const crate = [
      { itemId: "hoe", count: 1 },
      { itemId: "old_boot", count: 1 },
      { itemId: "radish", count: 1 },
    ] as Crate;
    const settled = settleCrate(crate, 0);
    expect(settled.coins).toBe(CROPS.radish.sellPrice);
    expect(settled.crate).toEqual([
      { itemId: "hoe", count: 1 },
      { itemId: "old_boot", count: 1 },
    ]);
  });
});
