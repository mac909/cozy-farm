import { describe, expect, it } from "vitest";
import { BEACH_FINDS, BEACH_FIND_IDS, isBeachFindId } from "./beachFinds";
import { ITEMS } from "./items";
import { RARITY_WEIGHTS } from "./rarity";

describe("beach finds", () => {
  it("are all beach items, keyed by their item id", () => {
    for (const [key, find] of Object.entries(BEACH_FINDS)) {
      expect(find.itemId).toBe(key);
      expect(ITEMS[find.itemId].category).toBe("beach");
      expect(Object.hasOwn(RARITY_WEIGHTS, find.rarity)).toBe(true);
    }
  });

  it("cover every beach item, so everything on the sand can wash up", () => {
    const beachItems = Object.values(ITEMS).filter((item) => item.category === "beach").map((item) => item.id);
    expect([...BEACH_FIND_IDS].sort()).toEqual([...beachItems].sort());
  });

  it("include at least one rare find", () => {
    expect(BEACH_FIND_IDS.some((id) => BEACH_FINDS[id].rarity === "rare")).toBe(true);
  });

  it("can be checked from raw message data", () => {
    expect(isBeachFindId("starfish")).toBe(true);
    expect(isBeachFindId("radish")).toBe(false);
    expect(isBeachFindId("toString")).toBe(false);
  });
});
