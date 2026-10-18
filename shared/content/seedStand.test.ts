import { describe, expect, it } from "vitest";
import { isForSale } from "../economy/shop";
import { CROP_IDS, CROPS } from "./crops";
import { GARDEN_SHOP_SEEDS } from "./gardenShop";
import { ITEMS, seedItemId } from "./items";
import { SEED_STAND_STOCK } from "./seedStand";

describe("the seed stand", () => {
  it("sells seeds for every starter crop, once each, and the garden shop the rest", () => {
    expect(SEED_STAND_STOCK).toEqual(CROP_IDS.filter((id) => CROPS[id].sold === "seedStand").map(seedItemId));
    expect(SEED_STAND_STOCK).toEqual(["radish_seeds", "carrot_seeds", "samphire_seeds", "potato_seeds", "strawberry_seeds", "pumpkin_seeds"]);
    expect([...SEED_STAND_STOCK, ...GARDEN_SHOP_SEEDS].sort()).toEqual(CROP_IDS.map(seedItemId).sort());
    expect(new Set(SEED_STAND_STOCK).size).toBe(SEED_STAND_STOCK.length);
    for (const id of SEED_STAND_STOCK) {
      expect(ITEMS[id].category).toBe("seed");
      expect(isForSale(id)).toBe(true);
    }
  });
});
