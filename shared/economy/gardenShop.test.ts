import { describe, expect, it } from "vitest";
import { GARDEN_SHOP_SEEDS, LATER_TOOL_UPGRADES, TOOL_UPGRADES } from "../content/gardenShop";
import { ITEMS, type ItemId } from "../content/items";
import { TOOLS } from "../content/tools";
import { countOf, newInventory, starterInventory, type Inventory } from "../inventory/inventory";
import type { ProjectProgress } from "../village/village";
import { addFarmer, newWorld, setFarmerBag, type World } from "../world/world";
import { buyAtGardenShop, gardenShopOpen, lookAtUpgrade, seedsLater, seedsOut, upgradeTool, upgradesFor } from "./gardenShop";

const PIP = "pip";
const JUNO = "juno";

/** Day 30, the garden shop open since day 24 (spring 7), 5,000 coins. */
function world(pip: Inventory = starterInventory(), open = true): World {
  let w = addFarmer(addFarmer(newWorld(), PIP, { name: "Pip", character: "woman" }), JUNO, { name: "Juno", character: "boy" });
  w = setFarmerBag(w, PIP, pip);
  const done = (doneDay: number): ProjectProgress => ({ gathered: 3, built: 3, given: {}, helpers: [PIP], doneDay });
  return {
    ...w,
    clock: { day: 30, minute: 600 },
    coins: 5000,
    village: { keeperDay: 2, projects: open ? { lighthouse: done(12), gardenShop: done(24) } : { lighthouse: done(12) } },
    yearStart: open ? 24 : 0,
  };
}

function bagWith(...stacks: [ItemId, number][]): Inventory {
  const bag = [...starterInventory()];
  stacks.forEach(([itemId, count], i) => (bag[8 + i] = { itemId, count }));
  return bag;
}

const bagOf = (w: World, id = PIP) => w.farmers[id].bag;

describe("the garden shop's seeds", () => {
  it("has each season's out in its season, and wheat and cotton all year", () => {
    expect(seedsOut({ season: "spring", day: 1, year: 1 })).toEqual(["peas_seeds", "cauliflower_seeds", "wheat_seeds", "cotton_seeds"]);
    expect(seedsOut({ season: "winter", day: 14, year: 2 })).toEqual(["kale_seeds", "leek_seeds", "wheat_seeds", "cotton_seeds"]);
    expect(seedsLater({ season: "spring", day: 1, year: 1 })).toEqual(["tomato_seeds", "melon_seeds", "beetroot_seeds", "cranberries_seeds"].concat(["kale_seeds", "leek_seeds"]));
    expect(seedsOut(null)).toEqual(GARDEN_SHOP_SEEDS);
  });

  it("sells this season's seeds, paid from the shared wallet into your own bag", () => {
    const result = buyAtGardenShop(world(), PIP, "peas_seeds", 5);
    if (!result.ok) throw new Error(result.hint.reason);
    expect(countOf(bagOf(result.world), "peas_seeds")).toBe(5);
    expect(result.world.coins).toBe(5000 - 5 * 40);
    expect(ITEMS.peas_seeds.name).toBe("Pea Seeds");
  });

  it("keeps the other seasons' seeds in the drawers, and says when they grow", () => {
    expect(buyAtGardenShop(world(), PIP, "melon_seeds", 1)).toEqual({ ok: false, hint: { reason: "out-of-season", cropId: "melon" } });
    expect(buyAtGardenShop(world(), PIP, "radish_seeds", 1)).toEqual({ ok: false, hint: { reason: "not-for-sale" } });
  });

  it("is boarded up until the garden shop opens", () => {
    expect(gardenShopOpen(world())).toBe(true);
    expect(gardenShopOpen(world(undefined, false))).toBe(false);
    expect(buyAtGardenShop(world(undefined, false), PIP, "peas_seeds", 1)).toEqual({ ok: false, hint: { reason: "shop-boarded" } });
    expect(upgradeTool(world(undefined, false), PIP, "wide_hoe")).toEqual({ ok: false, hint: { reason: "shop-boarded" } });
  });
});

describe("tool upgrades", () => {
  it("are tools, each from the plan's list, costing coins and a material", () => {
    expect(TOOL_UPGRADES.map((u) => u.id)).toEqual(["big_watering_can", "wide_hoe", "good_rod", "bug_net", "shell_basket"]);
    for (const upgrade of TOOL_UPGRADES) {
      expect(TOOLS[upgrade.id], upgrade.id).toBeDefined();
      if (upgrade.from) expect(TOOLS[upgrade.from].kind).toBe(TOOLS[upgrade.id].kind);
      expect(upgrade.costs.some((cost) => cost.kind === "coins")).toBe(true);
      expect(upgrade.costs.some((cost) => cost.kind === "item" && ITEMS[cost.itemId].category === "material")).toBe(true);
    }
    // The sprinkling can waits for stone from the cove (Milestone 9).
    expect(LATER_TOOL_UPGRADES.map((u) => u.name)).toEqual(["Sprinkling Can"]);
  });

  it("swaps the old tool for the new one in the same slot, paid from the wallet and your bag", () => {
    const before = world(bagWith(["driftwood", 10]));
    const result = upgradeTool(before, PIP, "big_watering_can");
    if (!result.ok) throw new Error(result.hint.reason);
    const bag = bagOf(result.world);
    expect(bag[1]).toEqual({ itemId: "big_watering_can", count: 1 });
    expect(countOf(bag, "watering_can")).toBe(0);
    expect(countOf(bag, "driftwood")).toBe(2);
    expect(result.world.coins).toBe(5000 - 1500);
    // Only yours: the other farmer's can is as it was.
    expect(bagOf(result.world, JUNO)).toEqual(bagOf(before, JUNO));
  });

  it("puts a new tool (the net, the basket) in a free slot, even one its materials just freed", () => {
    const result = upgradeTool(world(bagWith(["branch", 6])), PIP, "bug_net");
    if (!result.ok) throw new Error(result.hint.reason);
    expect(countOf(bagOf(result.world), "bug_net")).toBe(1);
    const full = [...newInventory()].map((_, i): Inventory[number] => (i === 0 ? { itemId: "driftwood", count: 6 } : { itemId: "radish", count: 1 }));
    expect(lookAtUpgrade(TOOL_UPGRADES.find((u) => u.id === "shell_basket")!, full, 5000).ready).toBe(true);
    const basket = upgradeTool(world(full), PIP, "shell_basket");
    expect(basket.ok && basket.world.farmers[PIP].bag[0]).toEqual({ itemId: "shell_basket", count: 1 });
  });

  it("says why not: coins short, things short, a full bag, or you have it", () => {
    expect(upgradeTool({ ...world(bagWith(["driftwood", 10])), coins: 100 }, PIP, "big_watering_can")).toEqual({ ok: false, hint: { reason: "not-enough-coins" } });
    expect(upgradeTool(world(bagWith(["driftwood", 3])), PIP, "big_watering_can")).toEqual({ ok: false, hint: { reason: "not-enough-things" } });
    const full = [...newInventory()].map((): Inventory[number] => ({ itemId: "radish", count: 1 }));
    full[23] = { itemId: "branch", count: 50 };
    expect(upgradeTool(world(full), PIP, "bug_net")).toEqual({ ok: false, hint: { reason: "bag-full" } });
    const upgraded = upgradeTool(world(bagWith(["driftwood", 20])), PIP, "big_watering_can");
    if (!upgraded.ok) throw new Error(upgraded.hint.reason);
    expect(upgradeTool(upgraded.world, PIP, "big_watering_can")).toEqual({ ok: false, hint: { reason: "has-tool" } });
    expect(upgradeTool(world(), PIP, "sprinkling_can")).toEqual({ ok: false, hint: { reason: "not-for-sale" } });
    expect(upgradeTool(world(), PIP, "toString")).toEqual({ ok: false, hint: { reason: "not-for-sale" } });
  });

  it("tells the shop's card what you're short of", () => {
    const looks = upgradesFor(bagWith(["branch", 5]), 1000);
    const hoe = looks.find((l) => l.upgrade.id === "wide_hoe")!;
    expect(hoe.short).toEqual([
      { kind: "coins", count: 200 },
      { kind: "item", itemId: "branch", count: 3 },
    ]);
    expect(hoe.ready).toBe(false);
    expect(looks.find((l) => l.upgrade.id === "bug_net")!.short).toEqual([{ kind: "item", itemId: "branch", count: 1 }]);
  });
});
