import { describe, expect, it } from "vitest";
import { CROPS } from "../../../shared/content/crops";
import { seedItemId } from "../../../shared/content/items";
import { ripeStage } from "../../../shared/farming/farming";
import { INVENTORY_SLOTS, newInventory, starterInventory } from "../../../shared/inventory/inventory";
import { EMPTY_PROGRESS } from "../../../shared/progress/farmerProgress";
import { addFarmer, newWorld, setFarmTile, setFarmerProgress, type World } from "../../../shared/world/world";
import type { SaveJson } from "./saveFormat";
import { WORLD_SAVE, newWorldSave, worldFromSave, worldToSave, type WorldSave } from "./worldSave";

/** A world with something in every part of it. */
function busyWorld(): World {
  let world = addFarmer(newWorld(), "farmer-1", { name: "Pip", character: "woman" });
  world = addFarmer(world, "farmer-2", { name: "Juno 🌻", character: "boy" });
  world = setFarmTile(world, 5, 6, { kind: "tilled", watered: true });
  world = setFarmTile(world, 4, 6, { kind: "planted", watered: false, cropId: "potato", stage: 1, daysInStage: 1 });
  world = setFarmTile(world, 12, 4, { kind: "planted", watered: true, cropId: "radish", stage: 3, daysInStage: 0 });
  world = setFarmTile(world, 13, 4, { kind: "planted", watered: false, cropId: "strawberry", stage: 2, daysInStage: 1, regrown: true });
  world = setFarmerProgress(world, "farmer-1", {
    xp: { farming: 95, fishing: 31, foraging: 0 },
    today: { day: 4, xp: { farming: 12, fishing: 0, foraging: 0 } },
    stats: { crops: 20, fish: 6, given: 14 },
    kinds: ["radish", "sardine", "potato"],
    badges: { first_harvest: 2, first_catch: 3, moved_in: 2 },
    gifts: [],
  });
  return {
    ...world,
    houses: {
      house1: {
        owner: "farmer-1",
        furniture: [
          { itemId: "red_bed", col: 0, row: 0, turn: 0 },
          { itemId: "straw_rug", col: 2, row: 1, turn: 0 },
          { itemId: "sofa", col: 3, row: 1, turn: 0 },
        ],
      },
    },
    decorations: [
      { itemId: "fence", col: 25, row: 8, turn: 2 },
      { itemId: "sunflower", col: 26, row: 8, turn: 0 },
    ],
    clock: { day: 4, minute: 1234.5678 },
    coins: 640,
    crate: [{ itemId: "radish", count: 120 }, { itemId: seedItemId("carrot"), count: 2 }],
    lastMorning: {
      day: 4,
      grew: 6,
      ready: 3,
      coins: 640,
      sale: { lines: [{ itemId: "radish", count: 4, priceEach: 35, total: 140 }], total: 140 },
      washedUp: ["scallop_shell", "sea_glass"],
      foraged: ["driftwood", "branch"],
      built: [{ project: "lighthouse", step: 0 }],
    },
    worldSeed: 3141592653,
    beach: {
      day: 4,
      finds: [
        { findId: "scallop_shell", col: 20, row: 23 },
        { findId: "sea_glass", col: 12, row: 24 },
      ],
    },
    book: {
      fish: { sea_bream: { caught: 2, firstDay: 3, firstBy: "Pip", biggestCm: 41, biggestBy: "Juno 🌻" } },
      finds: { starfish: { found: 1, firstDay: 2, firstBy: "Juno 🌻" } },
      bugs: { brimstone: { caught: 3, firstDay: 4, firstBy: "Pip" } },
    },
    village: {
      keeperDay: 2,
      projects: {
        lighthouse: { gathered: 1, built: 1, given: { driftwood: 4, "any:fish": 2, coins: 150 }, helpers: ["farmer-2", "farmer-1"], doneDay: null },
        "house1:porch": { gathered: 0, built: 0, given: { driftwood: 5, coins: 500 }, helpers: ["farmer-2"], doneDay: null },
      },
    },
    forage: {
      day: 4,
      items: [
        { itemId: "driftwood", col: 22, row: 23 },
        { itemId: "branch", col: 40, row: 6 },
      ],
    },
  };
}

/** What a save looks like after being stored as JSON and read back. */
const throughJson = (save: WorldSave): SaveJson => JSON.parse(JSON.stringify(save));

/** A valid save with one part replaced. */
const withPart = (part: Partial<Record<keyof WorldSave, unknown>>): SaveJson => ({ ...throughJson(worldToSave(busyWorld())), ...part });

describe("the world save", () => {
  it("brings back exactly the world that was saved", () => {
    const world = busyWorld();
    const loaded = worldFromSave(WORLD_SAVE.validate(throughJson(worldToSave(world))));
    expect(loaded).toEqual(world);
  });

  it("is version 6 and lists dug tiles in reading order", () => {
    const save = worldToSave(busyWorld());
    expect(save.version).toBe(6);
    expect(save.farm.map(({ col, row }) => `${col},${row}`)).toEqual(["12,4", "13,4", "4,6", "5,6"]);
    expect(save.farmers["farmer-1"].bag).toHaveLength(INVENTORY_SLOTS);
  });

  it("starts a new world on day 1 at 6 am with 500 coins and nobody in it", () => {
    expect(worldFromSave(newWorldSave())).toEqual(newWorld());
  });

  it.each<[string, Partial<Record<keyof WorldSave, unknown>>, RegExp]>([
    ["a day before 1", { clock: { day: 0, minute: 400 } }, /clock.day/],
    ["a time after midnight", { clock: { day: 1, minute: 24 * 60 + 1 } }, /clock.minute/],
    ["a time before 6 am", { clock: { day: 1, minute: 100 } }, /clock.minute/],
    ["negative coins", { coins: -5 }, /coins/],
    ["fractional coins", { coins: 1.5 }, /coins/],
    ["an unknown item in the crate", { crate: [{ itemId: "gold_bar", count: 1 }] }, /crate\[0\].itemId/],
    ["an empty crate line", { crate: [{ itemId: "radish", count: 0 }] }, /crate\[0\].count/],
    ["an item twice in the crate", { crate: [{ itemId: "radish", count: 1 }, { itemId: "radish", count: 2 }] }, /twice/],
    ["an unknown crop", { farm: [{ col: 1, row: 1, kind: "planted", watered: false, cropId: "cactus", stage: 0, daysInStage: 0 }] }, /cropId/],
    ["a year that starts before day 0", { yearStart: -3 }, /yearStart/],
    ["a tile kind that isn't", { farm: [{ col: 1, row: 1, kind: "untilled", watered: false }] }, /kind/],
    ["a tile off the edge", { farm: [{ col: -1, row: 1, kind: "tilled", watered: false }] }, /farm\[0\].col/],
    ["the same tile twice", { farm: [{ col: 1, row: 1, kind: "tilled", watered: false }, { col: 1, row: 1, kind: "tilled", watered: true }] }, /twice/],
    ["watered that isn't true or false", { farm: [{ col: 1, row: 1, kind: "tilled", watered: "yes" }] }, /watered/],
    ["a farmer id that isn't one", { farmers: { "": { name: "x", character: "boy", bag: newInventory() } } }, /id/],
    ["a short bag", { farmers: { a: { name: "x", character: "boy", bag: [] } } }, /24 slots/],
    ["an overfull stack", { farmers: { a: { name: "x", character: "boy", bag: [{ itemId: "hoe", count: 2 }, ...newInventory().slice(1)] } } }, /count/],
    [
      "a morning report with a bad sale",
      { lastMorning: { day: 2, grew: 0, ready: 0, coins: 0, sale: { lines: [{}], total: 0 }, washedUp: [] } },
      /lastMorning.sale.lines\[0\]/,
    ],
    [
      "a morning report with something odd washed up",
      { lastMorning: { day: 2, grew: 0, ready: 0, coins: 0, sale: { lines: [], total: 0 }, washedUp: ["boot"] } },
      /lastMorning.washedUp\[0\]/,
    ],
    ["a world seed that isn't one", { worldSeed: -1 }, /worldSeed/],
    ["an unknown beach find", { beach: { day: 1, finds: [{ findId: "boot", col: 1, row: 1 }] } }, /beach.finds\[0\].findId/],
    [
      "two finds on one tile",
      { beach: { day: 1, finds: [{ findId: "starfish", col: 1, row: 1 }, { findId: "sea_glass", col: 1, row: 1 }] } },
      /two things on tile 1,1/,
    ],
    ["a beach without a day", { beach: { finds: [] } }, /beach.day/],
    ["a fish the game doesn't know in the book", { book: { fish: { shark: {} }, finds: {}, bugs: {} } }, /book.fish has something/],
    [
      "a book entry caught no times",
      { book: { fish: {}, finds: {}, bugs: { firefly: { caught: 0, firstDay: 1, firstBy: "Pip" } } } },
      /book.bugs.firefly.caught/,
    ],
    ["a book without its bug pages", { book: { fish: {}, finds: {} } }, /book.bugs should be an object/],
    ["a missing part", { farm: undefined }, /farm should be a list/],
    ["a house with an odd id", { houses: { "": { owner: "farmer-1", furniture: [] } } }, /houses has an id/],
    ["a house nobody in the save owns", { houses: { house1: { owner: "farmer-9", furniture: [] } } }, /houses.house1.owner/],
    [
      "two houses for one farmer",
      { houses: { house1: { owner: "farmer-1", furniture: [] }, house2: { owner: "farmer-1", furniture: [] } } },
      /already has another house/,
    ],
    ["furniture that isn't", { houses: { house1: { owner: "farmer-1", furniture: [{ itemId: "radish", col: 0, row: 0, turn: 0 }] } } }, /isn't furniture/],
    ["a decoration off the edge", { decorations: [{ itemId: "fence", col: -1, row: 0, turn: 0 }] }, /decorations\[0\].col/],
    ["decorations that aren't a list", { decorations: {} }, /decorations should be a list/],
    ["a project the game doesn't know", { village: { keeperDay: 2, projects: { castle: { gathered: 0, built: 0, given: {}, helpers: [], doneDay: null } } } }, /village.projects has a project/],
    ["a village without its projects", { village: { keeperDay: 0 } }, /village.projects should be an object/],
    ["a keeper's day that isn't one", { village: { keeperDay: -2, projects: {} } }, /village.keeperDay/],
    ["something odd lying about", { forage: { day: 1, items: [{ itemId: "anchor", col: 1, row: 1 }] } }, /forage.items\[0\].itemId/],
    [
      "two things lying on one tile",
      { forage: { day: 1, items: [{ itemId: "branch", col: 1, row: 1 }, { itemId: "driftwood", col: 1, row: 1 }] } },
      /two things on tile 1,1/,
    ],
    ["a farmer without progress", { farmers: { a: { name: "x", character: "boy", bag: newInventory() } } }, /farmers.a.progress should be an object/],
    ["a badge the game doesn't know", { farmers: { a: { name: "x", character: "boy", bag: newInventory(), progress: { ...EMPTY_PROGRESS, badges: { gold_star: 2 } } } } }, /badge the game doesn't know/],
    ["a skill the game doesn't know", { farmers: { a: { name: "x", character: "boy", bag: newInventory(), progress: { ...EMPTY_PROGRESS, xp: { ...EMPTY_PROGRESS.xp, sailing: 3 } } } } }, /skill the game doesn't know/],
    ["experience that isn't a whole number", { farmers: { a: { name: "x", character: "boy", bag: newInventory(), progress: { ...EMPTY_PROGRESS, xp: { ...EMPTY_PROGRESS.xp, fishing: -1 } } } } }, /progress.xp.fishing/],
    ["a count the game doesn't know", { farmers: { a: { name: "x", character: "boy", bag: newInventory(), progress: { ...EMPTY_PROGRESS, stats: { naps: 3 } } } } }, /count the game doesn't know/],
    ["a kind of thing that isn't an item", { farmers: { a: { name: "x", character: "boy", bag: newInventory(), progress: { ...EMPTY_PROGRESS, kinds: ["unicorn"] } } } }, /progress.kinds\[0\]/],
    ["a regrown flag that isn't true or false", { farm: [{ col: 1, row: 1, kind: "planted", watered: false, cropId: "radish", stage: 0, daysInStage: 0, regrown: "yes" }] }, /regrown/],
    ["an upgrade for a cottage the game doesn't know", { village: { keeperDay: 2, projects: { "house9:porch": { gathered: 0, built: 0, given: {}, helpers: [], doneDay: null } } } }, /village.projects has a project/],
    ["an upgrade the game doesn't know", { village: { keeperDay: 2, projects: { "house1:pool": { gathered: 0, built: 0, given: {}, helpers: [], doneDay: null } } } }, /village.projects has a project/],
    [
      "a morning that built a step that isn't",
      { lastMorning: { day: 2, grew: 0, ready: 0, coins: 0, sale: { lines: [], total: 0 }, washedUp: [], foraged: [], built: [{ project: "lighthouse", step: 7 }] } },
      /lastMorning.built\[0\].step/,
    ],
  ])("refuses %s", (_what, part, message) => {
    expect(() => WORLD_SAVE.validate(withPart(part))).toThrow(message);
  });

  it("tidies an odd name or character instead of refusing the save", () => {
    const save = WORLD_SAVE.validate(withPart({ farmers: { a: { name: "  ", character: "dragon", bag: starterInventory(), progress: EMPTY_PROGRESS } }, houses: {} }));
    expect(save.farmers.a).toMatchObject({ name: "Farmer", character: "villager4" });
  });

  it("keeps a crop within its crop's numbers if the growth times were tuned since", () => {
    const save = WORLD_SAVE.validate(
      withPart({ farm: [{ col: 1, row: 1, kind: "planted", watered: false, cropId: "radish", stage: 9, daysInStage: 5 }] }),
    );
    expect(save.farm[0]).toMatchObject({ stage: ripeStage(CROPS.radish), daysInStage: CROPS.radish.daysPerStage - 1 });
  });

  it("turns a piece back to its first way round if it can't turn that way any more", () => {
    const save = WORLD_SAVE.validate(withPart({ decorations: [{ itemId: "sofa", col: 3, row: 3, turn: 4 }] }));
    expect(save.decorations[0].turn).toBe(0);
  });

  it("keeps a project within its data if its steps were tuned since", () => {
    const project = (p: unknown) => WORLD_SAVE.validate(withPart({ village: { keeperDay: 2, projects: { lighthouse: p } } })).village.projects.lighthouse;
    // Past the last step: kept at the last, and finished on its day.
    expect(project({ gathered: 9, built: 9, given: {}, helpers: [], doneDay: 5 })).toEqual({ gathered: 3, built: 3, given: {}, helpers: [], doneDay: 5 });
    // More given than a need asks: kept at the need; gifts to a need the step doesn't have: dropped; strangers: left out.
    expect(project({ gathered: 0, built: 0, given: { driftwood: 99, starfish: 3 }, helpers: ["farmer-1", "farmer-9"], doneDay: 4 })).toEqual({
      gathered: 0,
      built: 0,
      given: { driftwood: 10 },
      helpers: ["farmer-1"],
      doneDay: null,
    });
    // Everything a step asks for is in: it counts as gathered, to be built tonight.
    expect(project({ gathered: 0, built: 0, given: { driftwood: 10, branch: 6, coins: 300 }, helpers: [], doneDay: null })).toMatchObject({ gathered: 1, built: 0, given: {} });
  });

  it("drops anything it doesn't know about", () => {
    const save = WORLD_SAVE.validate({ ...throughJson(newWorldSave()), extra: 1 });
    expect(save).toEqual(newWorldSave());
  });
});
