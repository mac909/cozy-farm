import { describe, expect, it } from "vitest";
import { CROPS } from "../content/crops";
import { ITEMS } from "../content/items";
import { INVENTORY_SLOTS, type Inventory } from "../inventory/inventory";
import { addFarmer, newWorld, setFarmerBag, type World } from "../world/world";
import { buyAtStand, buyAtStore, crateValue, shipToCrate, takeBackFromCrate } from "./trade";

const look = { name: "Pip", character: "woman" as const };

/** A world with Pip, whose bag starts as given (padded with empty slots). */
function withBag(slots: Inventory, base: World = newWorld()): World {
  const bag = [...slots, ...Array(INVENTORY_SLOTS - slots.length).fill(null)];
  return setFarmerBag(addFarmer(base, "pip", look), "pip", bag);
}

const bagOf = (world: World) => world.farmers.pip.bag;

describe("the shipping crate", () => {
  it("takes a stack from the bag", () => {
    const world = withBag([{ itemId: "hoe", count: 1 }, { itemId: "radish", count: 4 }]);
    const result = shipToCrate(world, "pip", 1, 4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.world.crate).toEqual([{ itemId: "radish", count: 4 }]);
    expect(bagOf(result.world)[1]).toBeNull();
  });

  it("joins what's already there, from either player", () => {
    const world = { ...withBag([{ itemId: "radish", count: 2 }]), crate: [{ itemId: "radish" as const, count: 3 }] };
    const result = shipToCrate(world, "pip", 0, 2);
    expect(result.ok && result.world.crate).toEqual([{ itemId: "radish", count: 5 }]);
  });

  it("won't take tools", () => {
    const world = withBag([{ itemId: "hoe", count: 1 }]);
    expect(shipToCrate(world, "pip", 0, 1)).toEqual({ ok: false, hint: { reason: "not-sellable" } });
  });

  it("refuses nonsense without changing anything", () => {
    const world = withBag([{ itemId: "radish", count: 1 }]);
    expect(shipToCrate(world, "pip", 0, 2).ok).toBe(false);
    expect(shipToCrate(world, "pip", 99, 1).ok).toBe(false);
    expect(shipToCrate(world, "nobody", 0, 1).ok).toBe(false);
  });

  it("gives things back", () => {
    const world = { ...withBag([]), crate: [{ itemId: "radish" as const, count: 4 }] };
    const result = takeBackFromCrate(world, "pip", "radish", 4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.world.crate).toEqual([]);
    expect(bagOf(result.world)[0]).toEqual({ itemId: "radish", count: 4 });
  });

  it("gives back what fits, says so, and keeps the rest", () => {
    const full: Inventory = Array.from({ length: INVENTORY_SLOTS }, (_, i) =>
      i === 0 ? { itemId: "radish" as const, count: ITEMS.radish.maxStack - 2 } : { itemId: "hoe" as const, count: 1 },
    );
    const world = { ...withBag(full), crate: [{ itemId: "radish" as const, count: 5 }] };
    const result = takeBackFromCrate(world, "pip", "radish", 5);
    expect(result).toMatchObject({ ok: true, hint: { reason: "crate-bag-full" } });
    if (!result.ok) return;
    expect(result.world.crate).toEqual([{ itemId: "radish", count: 3 }]);
  });

  it("is worth what it sells for tonight", () => {
    expect(crateValue([])).toBe(0);
    expect(crateValue([{ itemId: "radish", count: 4 }, { itemId: "carrot", count: 2 }])).toBe(4 * CROPS.radish.sellPrice + 2 * CROPS.carrot.sellPrice);
  });
});

describe("the seed stand", () => {
  it("sells seeds from the shared wallet into the bag", () => {
    const world = { ...withBag([]), coins: 500 };
    const result = buyAtStand(world, "pip", "strawberry_seeds", 5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.world.coins).toBe(500 - 5 * CROPS.strawberry.seedPrice);
    expect(bagOf(result.world)[0]).toEqual({ itemId: "strawberry_seeds", count: 5 });
  });

  it("only sells seeds", () => {
    const world = { ...withBag([]), coins: 5000 };
    expect(buyAtStand(world, "pip", "hoe", 1)).toEqual({ ok: false, hint: { reason: "not-for-sale" } });
    expect(buyAtStand(world, "pip", "wooden_chair", 1)).toEqual({ ok: false, hint: { reason: "not-for-sale" } });
  });

  it("says when the coins don't cover it or the bag is full", () => {
    const poor = { ...withBag([]), coins: 10 };
    expect(buyAtStand(poor, "pip", "radish_seeds", 1)).toEqual({ ok: false, hint: { reason: "not-enough-coins" } });
    const full: Inventory = Array.from({ length: INVENTORY_SLOTS }, () => ({ itemId: "hoe" as const, count: 1 }));
    expect(buyAtStand({ ...withBag(full), coins: 500 }, "pip", "radish_seeds", 1)).toEqual({ ok: false, hint: { reason: "bag-full" } });
  });

  it("buys between 1 and 99 at a time", () => {
    const world = { ...withBag([]), coins: 100_000 };
    expect(buyAtStand(world, "pip", "radish_seeds", 0).ok).toBe(false);
    expect(buyAtStand(world, "pip", "radish_seeds", 100).ok).toBe(false);
    expect(buyAtStand(world, "pip", "radish_seeds", 1.5).ok).toBe(false);
    expect(buyAtStand(world, "pip", "radish_seeds", 99).ok).toBe(true);
  });
});

describe("the general store", () => {
  it("sells furniture into your bag with the shared coins", () => {
    const world = withBag([]);
    const result = buyAtStore(world, "pip", "sofa", 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.world.coins).toBe(world.coins - 2 * ITEMS.sofa.buyPrice!);
    expect(bagOf(result.world)[0]).toEqual({ itemId: "sofa", count: 2 });
  });

  it("doesn't sell seeds (the seed stand does) or anything not on its shelves", () => {
    const world = withBag([]);
    expect(buyAtStore(world, "pip", "radish_seeds", 1)).toEqual({ ok: false, hint: { reason: "not-for-sale" } });
    expect(buyAtStore(world, "pip", "hoe", 1)).toEqual({ ok: false, hint: { reason: "not-for-sale" } });
  });

  it("says when the coins don't cover it", () => {
    const world = { ...withBag([]), coins: 10 };
    expect(buyAtStore(world, "pip", "big_bed", 1)).toEqual({ ok: false, hint: { reason: "not-enough-coins" } });
  });
});
