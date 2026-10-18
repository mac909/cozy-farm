import { describe, expect, it } from "vitest";
import { ITEMS } from "../content/items";
import { TOOLS, toolDef, toolKind } from "../content/tools";
import { addItems, newInventory, type Inventory } from "../inventory/inventory";
import { hasToolKind, toolOfKind, toolTiles } from "./tools";

function bagOf(...ids: string[]): Inventory {
  let bag = newInventory();
  for (const id of ids) {
    const added = addItems(bag, id, 1);
    if (!added.ok) throw new Error(id);
    bag = added.inventory;
  }
  return bag;
}

describe("the tools", () => {
  it("are all tools in the item list, never sold in the crate or bought at a shop", () => {
    for (const id of Object.keys(TOOLS)) {
      const item = ITEMS[id as keyof typeof ITEMS];
      expect(item?.category, id).toBe("tool");
      expect(item.sellPrice, id).toBeUndefined();
      expect(item.maxStack, id).toBe(1);
    }
  });

  it("go by kind, so an upgrade does what the tool it replaced did", () => {
    expect(toolKind("hoe")).toBe("hoe");
    expect(toolKind("wide_hoe")).toBe("hoe");
    expect(toolKind("big_watering_can")).toBe("can");
    expect(toolKind("good_rod")).toBe("rod");
    expect(toolKind("radish_seeds")).toBeNull();
    expect(toolKind(null)).toBeNull();
    expect(toolDef("toString")).toBeNull();
  });

  it("find the tool in hand first, or any of that kind in the bag", () => {
    const bag = bagOf("radish_seeds", "wide_hoe", "watering_can");
    expect(toolOfKind(bag, "hoe")?.itemId).toBe("wide_hoe");
    expect(toolOfKind(bag, "can", 2)?.itemId).toBe("watering_can");
    expect(toolOfKind(bag, "can", 0)?.itemId).toBe("watering_can");
    expect(toolOfKind(bag, "rod")).toBeNull();
    expect(hasToolKind(bag, "hoe")).toBe(true);
    expect(hasToolKind(bag, "net")).toBe(false);
  });
});

describe("toolTiles", () => {
  it("is just the tile in front for an ordinary hoe or can", () => {
    expect(toolTiles(TOOLS.hoe, { col: 5, row: 5 }, "up")).toEqual([{ col: 5, row: 5 }]);
    expect(toolTiles(null, { col: 5, row: 5 }, "up")).toEqual([{ col: 5, row: 5 }]);
  });

  it("covers the tiles either side, across the way you face, for a wide one", () => {
    expect(toolTiles(TOOLS.big_watering_can, { col: 5, row: 4 }, "up")).toEqual([
      { col: 5, row: 4 },
      { col: 4, row: 4 },
      { col: 6, row: 4 },
    ]);
    expect(toolTiles(TOOLS.wide_hoe, { col: 6, row: 5 }, "right")).toEqual([
      { col: 6, row: 5 },
      { col: 6, row: 4 },
      { col: 6, row: 6 },
    ]);
  });

  it("leaves out tiles off the top or left of the map", () => {
    expect(toolTiles(TOOLS.wide_hoe, { col: 0, row: 3 }, "down")).toEqual([
      { col: 0, row: 3 },
      { col: 1, row: 3 },
    ]);
  });
});
