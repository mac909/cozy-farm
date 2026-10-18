import { describe, expect, it } from "vitest";
import { CROPS } from "../../../shared/content/crops";
import { seedItemId } from "../../../shared/content/items";
import { ripeStage } from "../../../shared/farming/farming";
import { INVENTORY_SLOTS, newInventory, starterInventory } from "../../../shared/inventory/inventory";
import { addFarmer, newWorld, setFarmTile, type World } from "../../../shared/world/world";
import type { SaveJson } from "./saveFormat";
import { WORLD_SAVE, newWorldSave, worldFromSave, worldToSave, type WorldSave } from "./worldSave";

/** A world with something in every part of it. */
function busyWorld(): World {
  let world = addFarmer(newWorld(), "farmer-1", { name: "Pip", character: "woman" });
  world = addFarmer(world, "farmer-2", { name: "Juno 🌻", character: "boy" });
  world = setFarmTile(world, 5, 6, { kind: "tilled", watered: true });
  world = setFarmTile(world, 4, 6, { kind: "planted", watered: false, cropId: "potato", stage: 1, daysInStage: 1 });
  world = setFarmTile(world, 12, 4, { kind: "planted", watered: true, cropId: "radish", stage: 3, daysInStage: 0 });
  return {
    ...world,
    clock: { day: 4, minute: 1234.5678 },
    coins: 640,
    crate: [{ itemId: "radish", count: 120 }, { itemId: seedItemId("carrot"), count: 2 }],
    lastMorning: {
      day: 4,
      grew: 6,
      ready: 3,
      coins: 640,
      sale: { lines: [{ itemId: "radish", count: 4, priceEach: 35, total: 140 }], total: 140 },
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

  it("is version 1 and lists dug tiles in reading order", () => {
    const save = worldToSave(busyWorld());
    expect(save.version).toBe(1);
    expect(save.farm.map(({ col, row }) => `${col},${row}`)).toEqual(["12,4", "4,6", "5,6"]);
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
    ["an unknown crop", { farm: [{ col: 1, row: 1, kind: "planted", watered: false, cropId: "kale", stage: 0, daysInStage: 0 }] }, /cropId/],
    ["a tile kind that isn't", { farm: [{ col: 1, row: 1, kind: "untilled", watered: false }] }, /kind/],
    ["a tile off the edge", { farm: [{ col: -1, row: 1, kind: "tilled", watered: false }] }, /farm\[0\].col/],
    ["the same tile twice", { farm: [{ col: 1, row: 1, kind: "tilled", watered: false }, { col: 1, row: 1, kind: "tilled", watered: true }] }, /twice/],
    ["watered that isn't true or false", { farm: [{ col: 1, row: 1, kind: "tilled", watered: "yes" }] }, /watered/],
    ["a farmer id that isn't one", { farmers: { "": { name: "x", character: "boy", bag: newInventory() } } }, /id/],
    ["a short bag", { farmers: { a: { name: "x", character: "boy", bag: [] } } }, /24 slots/],
    ["an overfull stack", { farmers: { a: { name: "x", character: "boy", bag: [{ itemId: "hoe", count: 2 }, ...newInventory().slice(1)] } } }, /count/],
    ["a morning report with a bad sale", { lastMorning: { day: 2, grew: 0, ready: 0, coins: 0, sale: { lines: [{}], total: 0 } } }, /lastMorning.sale.lines\[0\]/],
    ["a missing part", { farm: undefined }, /farm should be a list/],
  ])("refuses %s", (_what, part, message) => {
    expect(() => WORLD_SAVE.validate(withPart(part))).toThrow(message);
  });

  it("tidies an odd name or character instead of refusing the save", () => {
    const save = WORLD_SAVE.validate(withPart({ farmers: { a: { name: "  ", character: "dragon", bag: starterInventory() } } }));
    expect(save.farmers.a).toMatchObject({ name: "Farmer", character: "villager4" });
  });

  it("keeps a crop within its crop's numbers if the growth times were tuned since", () => {
    const save = WORLD_SAVE.validate(
      withPart({ farm: [{ col: 1, row: 1, kind: "planted", watered: false, cropId: "radish", stage: 9, daysInStage: 5 }] }),
    );
    expect(save.farm[0]).toMatchObject({ stage: ripeStage(CROPS.radish), daysInStage: CROPS.radish.daysPerStage - 1 });
  });

  it("drops anything it doesn't know about", () => {
    const save = WORLD_SAVE.validate({ ...throughJson(newWorldSave()), extra: 1 });
    expect(save).toEqual(newWorldSave());
  });
});
