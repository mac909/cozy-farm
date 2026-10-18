import { describe, expect, it } from "vitest";
import { isForSale } from "../economy/shop";
import { CROPS } from "./crops";
import { ITEMS } from "./items";
import { SEED_STAND_STOCK } from "./seedStand";

describe("the seed stand", () => {
  it("sells seeds for every crop, once each", () => {
    expect(SEED_STAND_STOCK).toHaveLength(Object.keys(CROPS).length);
    expect(new Set(SEED_STAND_STOCK).size).toBe(SEED_STAND_STOCK.length);
    for (const id of SEED_STAND_STOCK) {
      expect(ITEMS[id].category).toBe("seed");
      expect(isForSale(id)).toBe(true);
    }
  });
});
