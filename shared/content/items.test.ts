import { describe, expect, it } from "vitest";
import { CROPS, type CropId } from "./crops";
import { BUG_IDS, BUGS } from "./bugs";
import { ITEMS, STARTER_ITEMS, bugItemId, cropItemId, goldenItemId, isItemId, seedItemId, type ItemDef } from "./items";
import { isGift } from "./furniture";
import { PERK } from "./skills";

const CROP_IDS = Object.keys(CROPS) as CropId[];
const items = Object.entries(ITEMS);

function inCategory(category: ItemDef["category"]): ItemDef[] {
  return Object.values(ITEMS).filter((item) => item.category === category);
}

function isWholeAbove(n: number | undefined, min: number): boolean {
  return n !== undefined && Number.isInteger(n) && n >= min;
}

describe("item data", () => {
  for (const [key, item] of items) {
    it(`${key} has sensible numbers`, () => {
      expect(item.id).toBe(key);
      expect(item.name).not.toBe("");
      expect(isWholeAbove(item.maxStack, 1)).toBe(true);
      if (item.buyPrice !== undefined) expect(isWholeAbove(item.buyPrice, 1)).toBe(true);
      if (item.sellPrice !== undefined) expect(isWholeAbove(item.sellPrice, 1)).toBe(true);
    });
  }

  it("never sells anything back for more than the store charges", () => {
    for (const item of Object.values(ITEMS)) {
      if (item.buyPrice !== undefined && item.sellPrice !== undefined) {
        expect(item.sellPrice).toBeLessThan(item.buyPrice);
      }
    }
  });

  it("has no two items with the same id across categories", () => {
    const expected =
      CROP_IDS.length * 3 +
      inCategory("tool").length +
      inCategory("beach").length +
      inCategory("material").length +
      inCategory("fish").length +
      inCategory("bug").length +
      inCategory("furniture").length;
    expect(items.length).toBe(expected);
  });
});

describe("seeds and crops", () => {
  for (const cropId of CROP_IDS) {
    it(`${cropId} has a seed priced from CROPS`, () => {
      const seed = ITEMS[seedItemId(cropId)];
      expect(seed.category).toBe("seed");
      expect(seed.category === "seed" && seed.cropId).toBe(cropId);
      expect(seed.buyPrice).toBe(CROPS[cropId].seedPrice);
    });

    it(`${cropId} has a harvested item that sells at the CROPS price`, () => {
      const crop = ITEMS[cropItemId(cropId)];
      expect(crop.category).toBe("crop");
      expect(crop.category === "crop" && crop.cropId).toBe(cropId);
      expect(crop.sellPrice).toBe(CROPS[cropId].sellPrice);
      expect(crop.buyPrice).toBeUndefined();
    });
  }

  it("has a golden one for each crop, selling for more and never bought", () => {
    for (const cropId of CROP_IDS) {
      const golden = ITEMS[goldenItemId(cropId)];
      expect(golden.category === "crop" && golden.cropId).toBe(cropId);
      expect(golden.category === "crop" && golden.golden).toBe(true);
      expect(golden.sellPrice).toBe(CROPS[cropId].sellPrice * PERK.goldenPrice);
      expect(golden.buyPrice).toBeUndefined();
      expect(golden.name).toBe(`Golden ${CROPS[cropId].name}`);
    }
  });

  it("derives seed ids from crop ids", () => {
    expect(seedItemId("radish")).toBe("radish_seeds");
    expect(ITEMS.radish_seeds.name).toBe("Radish Seeds");
  });
});

describe("tools", () => {
  it("has a hoe, a watering can and a fishing rod", () => {
    expect(ITEMS.hoe.category).toBe("tool");
    expect(ITEMS.watering_can.category).toBe("tool");
    expect(ITEMS.fishing_rod.category).toBe("tool");
  });

  it("can't be sold and don't stack", () => {
    for (const tool of inCategory("tool")) {
      expect(tool.sellPrice).toBeUndefined();
      expect(tool.maxStack).toBe(1);
    }
  });
});

describe("beach finds", () => {
  it("has shells, sea glass, and a starfish", () => {
    const ids = inCategory("beach").map((item) => item.id);
    expect(ids.filter((id) => id.endsWith("_shell")).length).toBeGreaterThanOrEqual(2);
    expect(ids).toContain("sea_glass");
    expect(ids).toContain("starfish");
  });

  it("can be sold but not bought", () => {
    for (const find of inCategory("beach")) {
      expect(find.sellPrice).toBeDefined();
      expect(find.buyPrice).toBeUndefined();
    }
  });
});

describe("bugs", () => {
  it("has an item for every bug, sold at its price and never bought", () => {
    for (const bugId of BUG_IDS) {
      const item = ITEMS[bugItemId(bugId)];
      expect(item.category).toBe("bug");
      expect(item.category === "bug" && item.bugId).toBe(bugId);
      expect(item.name).toBe(BUGS[bugId].name);
      expect(item.sellPrice).toBe(BUGS[bugId].sellPrice);
      expect(item.buyPrice).toBeUndefined();
    }
  });
});

describe("furniture", () => {
  const furniture = inCategory("furniture");

  it("is all for sale but for a skill's gifts, and sells back for less", () => {
    expect(furniture.length).toBeGreaterThanOrEqual(10);
    for (const piece of furniture) {
      if (piece.category !== "furniture") throw new Error("filtered by category");
      expect(piece.buyPrice === undefined).toBe(isGift(piece.furnitureId));
      expect(piece.sellPrice).toBeDefined();
    }
  });

  it("names the piece it is", () => {
    for (const piece of furniture) {
      if (piece.category !== "furniture") throw new Error("filtered by category");
      expect(piece.furnitureId).toBe(piece.id);
    }
  });
});

describe("starter items", () => {
  it("include the hoe, the watering can, radish seeds and the fishing rod", () => {
    expect(STARTER_ITEMS.map((stack) => stack.itemId)).toEqual(["hoe", "watering_can", "radish_seeds", "fishing_rod"]);
  });

  it("are real items in counts that fit one slot each", () => {
    for (const { itemId, count } of STARTER_ITEMS) {
      expect(isItemId(itemId)).toBe(true);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(ITEMS[itemId].maxStack);
    }
  });
});

describe("isItemId", () => {
  it("accepts items in the data", () => {
    expect(isItemId("radish")).toBe(true);
    expect(isItemId("radish_seeds")).toBe(true);
    expect(isItemId("starfish")).toBe(true);
  });

  it("rejects anything else, including object built-ins", () => {
    expect(isItemId("cactus_seeds")).toBe(false);
    expect(isItemId("toString")).toBe(false);
    expect(isItemId(7)).toBe(false);
    expect(isItemId(null)).toBe(false);
  });
});
