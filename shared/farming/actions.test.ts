import { describe, expect, it } from "vitest";
import { CROPS } from "../content/crops";
import { seedItemId, type ItemId } from "../content/items";
import { HOTBAR_SLOTS, countOf, newInventory, starterInventory, type Inventory } from "../inventory/inventory";
import { addFarmer, farmTileAt, setFarmTile, setFarmerBag, newWorld, type World } from "../world/world";
import {
  HOE,
  WATERING_CAN,
  actionWord,
  applyFarmAction,
  chooseAction,
  daysLeft,
  hintFor,
  hintText,
  isHint,
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
    expect(chooseAction(RIPE_RADISH, true, HOE, { kind: "place", place: "tent" })).toEqual({ kind: "sleep" });
    expect(chooseAction(UNTILLED, false, null, { kind: "place", place: "crate" })).toEqual({ kind: "crate" });
    expect(chooseAction(DRY, true, WATERING_CAN, { kind: "place", place: "seedStand" })).toEqual({ kind: "seeds" });
    expect(chooseAction(DRY, true, WATERING_CAN, { kind: "place", place: "store" })).toEqual({ kind: "shop" });
  });

  it("goes in at a door, out at the way out, and to bed by a bed", () => {
    expect(chooseAction(UNTILLED, false, HOE, { kind: "door", houseId: "house1", how: "moveIn" })).toEqual({ kind: "enter", houseId: "house1", how: "moveIn" });
    expect(actionWord({ kind: "enter", houseId: "house1", how: "home" })).toBe("Home");
    expect(actionWord({ kind: "enter", houseId: "house1", how: "visit" })).toBe("Visit");
    expect(actionWord({ kind: "enter", houseId: "house1", how: "moveIn" })).toBe("Move in");
    expect(chooseAction(UNTILLED, false, null, { kind: "exit", houseId: "house2" })).toEqual({ kind: "leave", houseId: "house2" });
    expect(actionWord({ kind: "leave", houseId: "house2" })).toBe("Leave");
    expect(chooseAction(UNTILLED, false, "sofa", { kind: "bed" })).toEqual({ kind: "sleep" });
  });

  it("puts furniture down where it can go", () => {
    expect(chooseAction(UNTILLED, false, "sofa", null, "house")).toEqual({ kind: "place", itemId: "sofa" });
    expect(chooseAction(UNTILLED, false, "fence", null, "farm")).toEqual({ kind: "place", itemId: "fence" });
    expect(actionWord({ kind: "place", itemId: "fence" })).toBe("Place");
    // A sofa outside, a fence inside, or anything in someone else's house: nothing.
    expect(chooseAction(UNTILLED, false, "sofa", null, "farm")).toEqual({ kind: "none" });
    expect(chooseAction(UNTILLED, false, "fence", null, "house")).toEqual({ kind: "none" });
    expect(chooseAction(UNTILLED, false, "sofa", null, null)).toEqual({ kind: "none" });
    // Seeds and tools don't care where you are.
    expect(chooseAction(UNTILLED, true, HOE, null, "farm")).toEqual({ kind: "till" });
  });

  it("picks up a beach find and catches a bug with anything in hand", () => {
    const find = { itemId: "starfish" as const, col: 20, row: 23 };
    const bug = { id: "3.1.0", bugId: "brimstone" as const };
    for (const held of [HOE, "fishing_rod", "fence", null] as (ItemId | null)[]) {
      expect(chooseAction(UNTILLED, false, held, null, "farm", { find })).toEqual({ kind: "pickUp", ...find });
      expect(chooseAction(UNTILLED, false, held, null, "farm", { bug })).toEqual({ kind: "catch", ...bug });
    }
    // A find in front comes before a bug flying past.
    expect(chooseAction(UNTILLED, false, null, null, null, { find, bug }).kind).toBe("pickUp");
    // Places still win.
    expect(chooseAction(UNTILLED, false, null, { kind: "place", place: "crate" }, null, { find, bug })).toEqual({ kind: "crate" });
    expect(actionWord({ kind: "pickUp", ...find })).toBe("Pick up");
    expect(actionWord({ kind: "catch", ...bug })).toBe("Catch");
  });

  it("fishes with the rod, facing water", () => {
    const fishing = { spot: "dock" as const, col: 26, row: 29 };
    expect(chooseAction(UNTILLED, false, "fishing_rod", null, "farm", { fishing })).toEqual({ kind: "fish", ...fishing });
    expect(actionWord({ kind: "fish", ...fishing })).toBe("Fish");
    // Without the rod, or without water, nothing.
    expect(chooseAction(UNTILLED, false, HOE, null, "farm", { fishing })).toEqual({ kind: "none" });
    expect(chooseAction(UNTILLED, false, "fishing_rod", null, "farm", {})).toEqual({ kind: "none" });
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

describe("actionWord", () => {
  it("says what the button will do, and nothing when it's faded", () => {
    expect(actionWord({ kind: "sleep" })).toBe("Sleep");
    expect(actionWord({ kind: "crate" })).toBe("Crate");
    expect(actionWord({ kind: "seeds" })).toBe("Seeds");
    expect(actionWord({ kind: "harvest", cropId: "radish" })).toBe("Pick");
    expect(actionWord({ kind: "till" })).toBe("Dig");
    expect(actionWord({ kind: "plant", cropId: "radish" })).toBe("Plant");
    expect(actionWord({ kind: "water" })).toBe("Water");
    expect(actionWord({ kind: "none" })).toBeNull();
  });
});

describe("isHint", () => {
  it("accepts hints the client knows how to say", () => {
    expect(isHint({ reason: "bag-full" })).toBe(true);
    expect(isHint({ reason: "growing", cropId: "radish", days: 2 })).toBe(true);
    for (const bad of [null, {}, { reason: "toString" }, { reason: "explode" }, "bag-full"]) expect(isHint(bad)).toBe(false);
  });

  it("copes with a growing hint about a crop it doesn't know", () => {
    expect(hintText({ reason: "growing", cropId: "cactus" as never, days: 2 })).toBe("It: about 2 more watered days.");
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

  it("says where to fish", () => {
    expect(text(UNTILLED, false, "fishing_rod")).toBe("Face the water from the dock or the beach to fish.");
  });

  it("says where furniture goes", () => {
    expect(hintText(hintFor(UNTILLED, false, "sofa", "farm")!)).toBe("That goes inside your house.");
    expect(hintText(hintFor(UNTILLED, false, "fence", "house")!)).toBe("That goes outside, on the farm.");
    expect(hintText(hintFor(UNTILLED, false, "sofa", null)!)).toBe("Only whoever lives here can arrange it.");
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

describe("tools and seasons (Milestone 8)", () => {
  const FARMER = "pip";
  // A 5 × 3 field, all farmland.
  const field = { farmland: [0, 1, 2].map(() => [true, true, true, true, true]) };
  const SPRING = { season: "spring", day: 3, year: 1 } as const;
  const SUMMER = { season: "summer", day: 3, year: 1 } as const;

  function world(bag: Inventory, tiles: [number, number, FarmTile][] = [], season: "spring" | "summer" | null = null): World {
    let w = setFarmerBag(addFarmer(newWorld(), FARMER, { name: "Pip", character: "woman" }), FARMER, bag);
    for (const [col, row, tile] of tiles) w = setFarmTile(w, col, row, tile);
    // Day 10; spring began on day 8 (or summer on day 8, a season later).
    return season === null ? { ...w, clock: { day: 10, minute: 600 } } : { ...w, clock: { day: 10, minute: 600 }, yearStart: season === "spring" ? 8 : 8 - 14 + 56 };
  }
  const bagWith = (...stacks: [ItemId, number][]): Inventory => {
    const bag = [...newInventory()];
    stacks.forEach(([itemId, count], i) => (bag[i] = { itemId, count }));
    return bag;
  };
  const done = (result: FarmActionResult) => {
    if (!result.ok) throw new Error(`expected success, got "${result.hint.reason}"`);
    return result;
  };

  it("digs three across with the wide hoe, across the way you face", () => {
    const w = world(bagWith(["wide_hoe", 1]));
    const result = done(applyFarmAction(w, field, { farmerId: FARMER, action: "till", col: 2, row: 1, slot: 0, facing: "up" }));
    expect(result.tiles).toEqual([
      { col: 2, row: 1 },
      { col: 1, row: 1 },
      { col: 3, row: 1 },
    ]);
    for (const col of [1, 2, 3]) expect(farmTileAt(result.world, col, 1)).toEqual(DRY);
    expect(farmTileAt(result.world, 2, 0)).toEqual(UNTILLED);
    // Without knowing which way you face, just the one.
    expect(done(applyFarmAction(w, field, { farmerId: FARMER, action: "till", col: 2, row: 1 })).tiles).toHaveLength(1);
  });

  it("waters three across with the big can, skipping what can't be watered, and only digs farmland", () => {
    const w = world(bagWith(["big_watering_can", 1]), [
      [1, 2, DRY],
      [2, 2, WET],
      [3, 2, YOUNG_RADISH],
    ]);
    const result = done(applyFarmAction(w, field, { farmerId: FARMER, action: "water", col: 2, row: 2, slot: 0, facing: "down" }));
    expect(result.tiles).toEqual([
      { col: 1, row: 2 },
      { col: 3, row: 2 },
    ]);
    expect(farmTileAt(result.world, 3, 2)).toMatchObject({ cropId: "radish", watered: true });
    // Nothing at all to water: the tile asked for says why.
    const dry = world(bagWith(["big_watering_can", 1]), [[2, 2, WET]]);
    expect(applyFarmAction(dry, field, { farmerId: FARMER, action: "water", col: 2, row: 2, slot: 0, facing: "down" })).toEqual({
      ok: false,
      hint: { reason: "already-watered" },
    });
    const halfField = { farmland: [[false, true, false]] };
    const hoed = done(applyFarmAction(world(bagWith(["wide_hoe", 1])), halfField, { farmerId: FARMER, action: "till", col: 1, row: 0, facing: "down" }));
    expect(hoed.tiles).toEqual([{ col: 1, row: 0 }]);
  });

  it("still digs and waters with the old tools, one tile at a time", () => {
    const w = world(starterInventory());
    expect(done(applyFarmAction(w, field, { farmerId: FARMER, action: "till", col: 2, row: 1, slot: 0, facing: "up" })).tiles).toHaveLength(1);
  });

  it("plants a seasonal seed only in its season, and anything before the seasons begin", () => {
    const bag = bagWith(["peas_seeds", 3], ["tomato_seeds", 3]);
    const plant = (w: World, slot: number) => applyFarmAction(w, field, { farmerId: FARMER, action: "plant", col: 0, row: 0, slot });
    expect(plant(world(bag, [[0, 0, DRY]], "spring"), 0).ok).toBe(true);
    expect(plant(world(bag, [[0, 0, DRY]], "spring"), 1)).toEqual({ ok: false, hint: { reason: "out-of-season", cropId: "tomato" } });
    expect(plant(world(bag, [[0, 0, DRY]], "summer"), 1).ok).toBe(true);
    expect(plant(world(bag, [[0, 0, DRY]], null), 1).ok).toBe(true);
    // Wheat grows all year.
    expect(plant(world(bagWith(["wheat_seeds", 1]), [[0, 0, DRY]], "summer"), 0).ok).toBe(true);
  });

  it("lets a crop in the ground finish whatever the season, and a regrowing one makes way after its last pick", () => {
    const ripePeas = crop("peas", ripeStage(CROPS.peas));
    const pick = (season: "spring" | "summer") =>
      done(applyFarmAction(world(newInventory(), [[0, 0, ripePeas]], season), field, { farmerId: FARMER, action: "harvest", col: 0, row: 0 }));
    expect(pick("spring").tile).toMatchObject({ kind: "planted", cropId: "peas", regrown: true });
    const late = pick("summer");
    expect(late.tile).toEqual(DRY);
    expect(countOf(late.world.farmers[FARMER].bag, "peas")).toBe(1);
  });

  it("shows Plant only in season, with a hint that says when", () => {
    expect(chooseAction(DRY, true, seedItemId("peas"), null, null, { season: SPRING })).toEqual({ kind: "plant", cropId: "peas" });
    expect(chooseAction(DRY, true, seedItemId("peas"), null, null, { season: SUMMER })).toEqual({ kind: "none" });
    const hint = hintFor(DRY, true, seedItemId("peas"), null, SUMMER);
    expect(hint).toEqual({ reason: "out-of-season", cropId: "peas" });
    expect(hintText(hint!)).toBe("Peas: plant in spring. Keep the seeds till then.");
    expect(isHint(hint)).toBe(true);
  });

  it("shows Dig or Water with a wide tool when only a tile beside the one in front wants it", () => {
    const side = (tile: FarmTile, farmland = true) => ({ tile, farmland });
    expect(chooseAction(DRY, true, "wide_hoe", null, null, { sides: [side(UNTILLED), side(DRY)] })).toEqual({ kind: "till" });
    expect(chooseAction(DRY, true, "wide_hoe", null, null, { sides: [side(UNTILLED, false)] })).toEqual({ kind: "none" });
    expect(chooseAction(WET, true, "big_watering_can", null, null, { sides: [side(DRY)] })).toEqual({ kind: "water" });
    expect(chooseAction(WET, true, "big_watering_can", null, null, { sides: [side(WET)] })).toEqual({ kind: "none" });
    expect(chooseAction(UNTILLED, true, "wide_hoe", null)).toEqual({ kind: "till" });
    expect(chooseAction(DRY, true, "big_watering_can", null)).toEqual({ kind: "water" });
  });

  it("fishes with the good rod, and opens the garden shop", () => {
    const fishing = { spot: "dock", col: 3, row: 3 } as const;
    expect(chooseAction(UNTILLED, false, "good_rod", null, null, { fishing })).toEqual({ kind: "fish", ...fishing });
    expect(chooseAction(UNTILLED, false, null, { kind: "place", place: "gardenShop" })).toEqual({ kind: "gardenShop" });
    expect(actionWord({ kind: "gardenShop" })).toBe("Garden shop");
    expect(chooseAction(UNTILLED, false, null, { kind: "closed", reason: "shop-boarded" })).toEqual({ kind: "closed", reason: "shop-boarded" });
    expect(hintText({ reason: "shop-boarded" })).toMatch(/Boarded up/);
  });
});
