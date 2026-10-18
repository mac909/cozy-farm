import { describe, expect, it } from "vitest";
import { isForSale } from "../economy/shop";
import { FURNITURE_IDS, isGift } from "./furniture";
import { ITEMS } from "./items";
import { GENERAL_STORE_STOCK, STORE_SHELVES } from "./generalStore";

describe("the general store", () => {
  it("sells every piece of furniture but a skill's gifts, once each", () => {
    expect(new Set(GENERAL_STORE_STOCK).size).toBe(GENERAL_STORE_STOCK.length);
    expect([...GENERAL_STORE_STOCK].sort()).toEqual(FURNITURE_IDS.filter((id) => !isGift(id)).sort());
    for (const id of GENERAL_STORE_STOCK) {
      expect(ITEMS[id].category).toBe("furniture");
      expect(isForSale(id)).toBe(true);
    }
  });

  it("has a shelf for the house and one for the farm", () => {
    expect(STORE_SHELVES.map((shelf) => shelf.title)).toEqual(["For your house", "For the farm"]);
    for (const shelf of STORE_SHELVES) expect(shelf.stock.length).toBeGreaterThan(5);
  });
});
