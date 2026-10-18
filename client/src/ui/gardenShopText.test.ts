import { describe, expect, it } from "vitest";
import { newInventory, starterInventory, type Inventory } from "../../../shared/inventory/inventory";
import { gardenSeedShelves, gardenShopNote, toolRows } from "./gardenShopText";

describe("the garden shop's seeds on its card", () => {
  it("shows this season's seeds, then wheat and cotton, then the rest of the year's faded, next season first", () => {
    const shelves = gardenSeedShelves({ season: "summer", day: 2, year: 1 });
    expect(shelves.map((shelf) => [shelf.title, shelf.later, shelf.lines.map((line) => line.itemId)])).toEqual([
      ["Summer seeds", false, ["tomato_seeds", "melon_seeds"]],
      ["All year", false, ["wheat_seeds", "cotton_seeds"]],
      ["Later in the year", true, ["beetroot_seeds", "cranberries_seeds", "kale_seeds", "leek_seeds", "peas_seeds", "cauliflower_seeds"]],
    ]);
    const later = shelves[2].lines;
    expect(later.map((line) => line.later)).toEqual(["Autumn", "Autumn", "Winter", "Winter", "Spring", "Spring"]);
    expect(shelves[0].lines[0]).toMatchObject({ name: "Tomato", price: 60, detail: "Ripe in 6 days, then regrows · sells for 50 · summer" });
    expect(shelves[1].lines[0].detail).toMatch(/all year$/);
  });

  it("says the season's day and the honesty box", () => {
    expect(gardenShopNote({ season: "spring", day: 7, year: 1 })).toMatch(/^Spring 7 · new seeds every season\. An honesty box/);
  });
});

describe("the garden shop's tools on its card", () => {
  const withThings = (...stacks: [string, number][]): Inventory => {
    const bag = [...starterInventory()];
    stacks.forEach(([itemId, count], i) => (bag[10 + i] = { itemId: itemId as never, count }));
    return bag;
  };

  it("lists each upgrade with what it does and costs, and its button", () => {
    const rows = toolRows(withThings(["driftwood", 8], ["branch", 2]), 1600);
    expect(rows.map((row) => [row.name, row.cost, row.state, row.button])).toEqual([
      ["Big Watering Can", "1,500 coins · 8 driftwood", "ready", "Upgrade"],
      ["Wide Hoe", "1,200 coins · 8 branches", "short", "Need 6 more branches"],
      ["Good Rod", "2,000 coins · 6 driftwood", "short", "Need 400 more coins"],
      ["Bug Net", "800 coins · 6 branches", "short", "Need 4 more branches"],
      ["Shell Basket", "800 coins · 6 driftwood", "ready", "Buy"],
      ["Sprinkling Can", "Once the bridge to the cove is mended", "later", "Later"],
    ]);
  });

  it("says when one's yours already, or your bag's too full for a new one", () => {
    const bag = [...withThings(["driftwood", 20])];
    bag[1] = { itemId: "big_watering_can", count: 1 };
    expect(toolRows(bag, 5000)[0]).toMatchObject({ state: "have", button: "Yours" });
    const full = newInventory().map((): Inventory[number] => ({ itemId: "radish", count: 1 }));
    full[0] = { itemId: "branch", count: 99 };
    full[1] = { itemId: "driftwood", count: 99 };
    expect(toolRows(full, 5000).find((row) => row.name === "Bug Net")).toMatchObject({ state: "short", button: "Your bag is full" });
  });
});
