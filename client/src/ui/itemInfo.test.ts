import { describe, expect, it } from "vitest";
import { CROPS } from "../../../shared/content/crops";
import { ITEMS } from "../../../shared/content/items";
import { itemInfo } from "./itemInfo";

describe("itemInfo", () => {
  it("names the stack and says what it sells for", () => {
    expect(itemInfo({ itemId: "radish", count: 4 })).toEqual({
      title: "Radish ×4",
      detail: `Sells for ${CROPS.radish.sellPrice} each in the crate`,
    });
    expect(itemInfo({ itemId: "radish", count: 1 }).title).toBe("Radish");
  });

  it("says seeds are for planting", () => {
    expect(itemInfo({ itemId: "carrot_seeds", count: 5 }).detail).toBe(
      `Plant in dug soil · sells back for ${ITEMS.carrot_seeds.sellPrice} each`,
    );
  });

  it("says where furniture goes", () => {
    expect(itemInfo({ itemId: "sofa", count: 1 }).detail).toBe(`For your house · 2 × 1 · sells back for ${ITEMS.sofa.sellPrice}`);
  });

  it("says tools can't be sold", () => {
    expect(itemInfo({ itemId: "hoe", count: 1 })).toEqual({ title: "Hoe", detail: "A tool: it never wears out, and can't be sold" });
  });
});
