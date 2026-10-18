import { describe, expect, it } from "vitest";
import { CROPS } from "../content/crops";
import { seedItemId, type ItemId } from "../content/items";
import { HOTBAR_SLOTS, countOf, newInventory, starterInventory, type Inventory } from "../inventory/inventory";
import { addFarmer, farmTileAt, setFarmTile, setFarmerBag, newWorld, type World } from "../world/world";
import {
  HOE,
  WATERING_CAN,
  applyFarmAction,
  chooseAction,
  daysLeft,
  hintFor,
  hintText,
  type FarmActionResult,
  type FarmRequest,
} from "./actions";
import { UNTILLED, ripeStage, type FarmTile, type PlantedTile } from "./farming";

const RADISH_SEEDS = seedItemId("radish");
const DRY: FarmTile = { kind: "tilled", watered: false };
const WET: FarmTile = { kind: "tilled", watered: true };
const crop = (cropId: PlantedTile["cropId"], stage: number, watered = false, daysInStage = 0): PlantedTile => ({
  kind: "planted",
  cropId,
  stage,
  daysInStage,
  watered,
});
const RIPE_RADISH = crop("radish", ripeStage(CROPS.radish));
const YOUNG_RADISH = crop("radish", 1);

describe("chooseAction", () => {
  // The Action button table in docs/plans/milestone-2.md, row by row.
  it("is Sleep next to the tent, Crate next to the crate, Seeds next to the stand, whatever else", () => {
    expect(chooseAction(RIPE_RADISH, true, HOE, "tent")).toEqual({ kind: "sleep" });
    expect(chooseAction(UNTILLED, false, null, "crate")).toEqual({ kind: "crate" });
    expect(chooseAction(DRY, true, WATERING_CAN, "seedStand")).toEqual({ kind: "seeds" });
  });

  it("picks a ripe crop with anything in hand", () => {
    for (const held of [HOE, WATERING_CAN, RADISH_SEEDS, "radish", null] as (ItemId | null)[]) {
      expect(chooseAction(RIPE_RADISH, true, held, null)).toEqual({ kind: "harvest", cropId: "radish" });
    }
  });

  it("digs farmland grass with the hoe, and nowhere else", () => {
    expect(chooseAction(UNTILLED, true, HOE, null)).toEqual({ kind: "till" });
    expect(chooseAction(UNTILLED, false, HOE, null)).toEqual({ kind: "none" });
    expect(chooseAction(DRY, true, HOE, null)).toEqual({ kind: "none" });
  });

  it("plants seeds in bare dug soil, wet or dry", () => {
    expect(chooseAction(DRY, true, RADISH_SEEDS, null)).toEqual({ kind: "plant", cropId: "radish" });
    expect(chooseAction(WET, true, seedItemId("pumpkin"), null)).toEqual({ kind: "plant", cropId: "pumpkin" });
    expect(chooseAction(UNTILLED, true, RADISH_SEEDS, null)).toEqual({ kind: "none" });
    expect(chooseAction(YOUNG_RADISH, true, RADISH_SEEDS, null)).toEqual({ kind: "none" });
  });

  it("waters soil that isn't watered yet, with or without a crop", () => {
    expect(chooseAction(DRY, true, WATERING_CAN, null)).toEqual({ kind: "water" });
    expect(chooseAction(YOUNG_RADISH, true, WATERING_CAN, null)).toEqual({ kind: "water" });
    expect(chooseAction(WET, true, WATERING_CAN, null)).toEqual({ kind: "none" });
    expect(chooseAction(crop("radish", 1, true), true, WATERING_CAN, null)).toEqual({ kind: "none" });
    expect(chooseAction(UNTILLED, true, WATERING_CAN, null)).toEqual({ kind: "none" });
  });

  it("does nothing otherwise", () => {
    expect(chooseAction(UNTILLED, true, null, null)).toEqual({ kind: "none" });
    expect(chooseAction(DRY, true, "radish", null)).toEqual({ kind: "none" });
    expect(chooseAction(YOUNG_RADISH, true, HOE, null)).toEqual({ kind: "none" });
  });
});

describe("hintFor", () => {
  // The hint table in docs/plans/milestone-2.md, row by row.
  const text = (tile: FarmTile, farmland: boolean, held: ItemId | null) => {
    const hint = hintFor(tile, farmland, held);
    return hint && hintText(hint);
  };

  it("has no hint when the button does something", () => {
    expect(hintFor(UNTILLED, true, HOE)).toBeNull();
    expect(hintFor(DRY, true, RADISH_SEEDS)).toBeNull();
    expect(hintFor(DRY, true, WATERING_CAN)).toBeNull();
    expect(hintFor(RIPE_RADISH, true, null)).toBeNull();
  });

  it("says where digging works", () => {
    expect(text(UNTILLED, false, HOE)).toBe("You can only dig in the farm field.");
    expect(text(DRY, true, HOE)).toBe("Already dug. Plant some seeds!");
  });

  it("says to dig first", () => {
    expect(text(UNTILLED, true, RADISH_SEEDS)).toBe("Dig it with the hoe first.");
    expect(text(UNTILLED, true, WATERING_CAN)).toBe("Dig it with the hoe first.");
    expect(text(UNTILLED, false, RADISH_SEEDS)).toBe("That works in the farm field.");
  });

  it("says something's already growing", () => {
    expect(text(YOUNG_RADISH, true, RADISH_SEEDS)).toBe("Something's already growing here.");
  });

  it("says it's already watered", () => {
    expect(text(WET, true, WATERING_CAN)).toBe("Already watered today.");
    expect(text(crop("carrot", 1, true), true, WATERING_CAN)).toBe("Already watered today.");
  });

  it("says how long a growing crop has left", () => {
    expect(text(crop("radish", 1), true, HOE)).toBe("Radish: about 2 more watered days.");
    expect(text(crop("radish", 1), true, null)).toBe("Radish: about 2 more watered days.");
    expect(text(crop("radish", 2), true, "carrot")).toBe("Radish: about 1 more watered day.");
    expect(text(crop("radish", 2, true), true, HOE)).toBe("Radish: ripe tomorrow!");
    expect(text(crop("potato", 0, false, 1), true, HOE)).toBe("Potato: about 5 more watered days.");
  });

  it("says to pick something when the slot is empty", () => {
    expect(text(UNTILLED, true, null)).toBe("Pick something from your hotbar.");
    expect(text(DRY, true, null)).toBe("Pick something from your hotbar.");
  });

  it("says what farms when holding something that doesn't", () => {
    expect(text(DRY, true, "radish")).toBe("Hold the hoe, seeds or watering can to farm.");
    expect(text(UNTILLED, true, "radish")).toBe("Hold the hoe, seeds or watering can to farm.");
  });

  it("has words for every reason", () => {
    for (const reason of ["bag-full", "too-far", "gone", "no-hoe", "no-can", "no-seeds", "not-near-tent", "coming-soon"] as const) {
      expect(hintText({ reason })).toMatch(/\w/);
    }
  });
});

describe("daysLeft", () => {
  it("counts the watered days to ripe", () => {
    expect(daysLeft(crop("radish", 0))).toBe(3);
    expect(daysLeft(crop("potato", 1, false, 1))).toBe(3);
    expect(daysLeft(RIPE_RADISH)).toBe(0);
  });
});

describe("applyFarmAction", () => {
  const FARMER = "pip";
  const field = { farmland: [[true, true, false]] };

  function world(bag: Inventory = starterInventory(), tiles: [number, number, FarmTile][] = []): World {
    let w = setFarmerBag(addFarmer(newWorld(), FARMER, { name: "Pip", character: "woman" }), FARMER, bag);
    for (const [col, row, tile] of tiles) w = setFarmTile(w, col, row, tile);
    return w;
  }
  const act = (w: World, action: FarmRequest["action"], col = 0, slot?: number) =>
    applyFarmAction(w, field, { farmerId: FARMER, action, col, row: 0, slot });
  const done = (result: FarmActionResult): World => {
    if (!result.ok) throw new Error(`expected success, got "${result.hint.reason}"`);
    return result.world;
  };
  const reasonOf = (result: FarmActionResult) => (result.ok ? "ok" : result.hint.reason);
  const bagOf = (w: World) => w.farmers[FARMER].bag;

  it("digs, plants, waters and leaves the rest of the world alone", () => {
    let w = done(act(world(), "till"));
    expect(farmTileAt(w, 0, 0)).toEqual(DRY);
    w = done(act(w, "plant", 0, 2));
    expect(farmTileAt(w, 0, 0)).toEqual(crop("radish", 0));
    w = done(act(w, "water"));
    expect(farmTileAt(w, 0, 0)).toEqual(crop("radish", 0, true));
    expect(w.coins).toBe(newWorld().coins);
    expect(w.clock).toEqual(newWorld().clock);
  });

  it("takes exactly one seed from the slot it was given", () => {
    const before = world(undefined, [[0, 0, DRY]]);
    const w = done(act(before, "plant", 0, 2));
    expect(bagOf(w)[2]).toEqual({ itemId: RADISH_SEEDS, count: 9 });
    expect(countOf(bagOf(w), RADISH_SEEDS)).toBe(countOf(bagOf(before), RADISH_SEEDS) - 1);
  });

  it("empties the slot when the last seed is planted, and the slot stays put", () => {
    const bag = [...newInventory()];
    bag[0] = { itemId: HOE, count: 1 };
    bag[5] = { itemId: seedItemId("carrot"), count: 1 };
    const w = done(act(world(bag, [[0, 0, DRY]]), "plant", 0, 5));
    expect(bagOf(w)[5]).toBeNull();
    expect(farmTileAt(w, 0, 0)).toEqual(crop("carrot", 0));
  });

  it("won't plant without seeds in that slot", () => {
    const w = world(undefined, [[0, 0, DRY]]);
    expect(reasonOf(act(w, "plant", 0, 0))).toBe("no-seeds");
    expect(reasonOf(act(w, "plant", 0, 7))).toBe("no-seeds");
    expect(reasonOf(act(w, "plant", 0, 99))).toBe("no-seeds");
    expect(reasonOf(act(w, "plant", 0))).toBe("no-seeds");
  });

  it("won't plant on grass or on a crop, and keeps the seed", () => {
    const w = world(undefined, [[1, 0, YOUNG_RADISH]]);
    expect(reasonOf(act(w, "plant", 0, 2))).toBe("dig-first");
    expect(reasonOf(act(w, "plant", 1, 2))).toBe("has-crop");
  });

  it("digs only farmland, and only with a hoe", () => {
    expect(reasonOf(act(world(), "till", 2))).toBe("not-farmland");
    expect(reasonOf(act(world(newInventory()), "till"))).toBe("no-hoe");
    expect(reasonOf(act(world(undefined, [[0, 0, DRY]]), "till"))).toBe("already-dug");
  });

  it("waters only with a can, and once a day", () => {
    expect(reasonOf(act(world(newInventory(), [[0, 0, DRY]]), "water"))).toBe("no-can");
    expect(reasonOf(act(world(undefined, [[0, 0, WET]]), "water"))).toBe("already-watered");
    expect(reasonOf(act(world(), "water"))).toBe("dig-first");
  });

  it("picks a ripe crop into the bag, leaving dug soil", () => {
    const w = done(act(world(undefined, [[0, 0, RIPE_RADISH]]), "harvest"));
    expect(farmTileAt(w, 0, 0)).toEqual(DRY);
    expect(countOf(bagOf(w), "radish")).toBe(1);
  });

  it("says when a crop isn't ripe, or is already gone", () => {
    expect(act(world(undefined, [[0, 0, YOUNG_RADISH]]), "harvest")).toEqual({
      ok: false,
      hint: { reason: "growing", cropId: "radish", days: 2, watered: false },
    });
    expect(reasonOf(act(world(undefined, [[0, 0, DRY]]), "harvest"))).toBe("gone");
  });

  it("changes nothing when picking with a full bag", () => {
    const full = newInventory().map(() => ({ itemId: HOE, count: 1 }));
    const before = world(full, [[0, 0, RIPE_RADISH]]);
    const result = act(before, "harvest");
    expect(reasonOf(result)).toBe("bag-full");
    expect(farmTileAt(before, 0, 0)).toEqual(RIPE_RADISH);
  });

  it("picks into a stack that has room even when every slot is taken", () => {
    const full: Inventory = newInventory().map((_, i) => (i === HOTBAR_SLOTS ? { itemId: "radish", count: 3 } : { itemId: HOE, count: 1 }));
    const w = done(act(world(full, [[0, 0, RIPE_RADISH]]), "harvest"));
    expect(bagOf(w)[HOTBAR_SLOTS]).toEqual({ itemId: "radish", count: 4 });
  });

  it("lets a regrowing crop be picked again once it ripens again", () => {
    const strawberry = CROPS.strawberry;
    let w = world(undefined, [[0, 0, crop("strawberry", ripeStage(strawberry))]]);
    w = done(act(w, "harvest"));
    const after = farmTileAt(w, 0, 0) as PlantedTile;
    expect(after).toMatchObject({ kind: "planted", cropId: "strawberry", stage: ripeStage(strawberry) - 1 });
    expect(reasonOf(act(w, "harvest"))).toBe("growing");
    w = setFarmTile(w, 0, 0, { ...after, stage: ripeStage(strawberry) });
    w = done(act(w, "harvest"));
    expect(countOf(bagOf(w), "strawberry")).toBe(2);
  });

  it("refuses a farmer it doesn't know", () => {
    expect(applyFarmAction(world(), field, { farmerId: "nobody", action: "till", col: 0, row: 0 })).toEqual({
      ok: false,
      hint: { reason: "gone" },
    });
  });
});
