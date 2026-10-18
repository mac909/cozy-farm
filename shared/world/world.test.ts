import { describe, expect, it } from "vitest";
import { STARTING_COINS } from "../economy/wallet";
import { UNTILLED } from "../farming/farming";
import { starterInventory } from "../inventory/inventory";
import {
  addFarmer,
  farmTileAt,
  farmerOf,
  isFarmerId,
  listFarmers,
  newWorld,
  parseTileKey,
  setFarmTile,
  setFarmerBag,
  setFarmerLook,
  tileKey,
} from "./world";

describe("newWorld", () => {
  it("starts on day 1 at 6 am with the starting coins and nothing else", () => {
    expect(newWorld()).toEqual({
      clock: { day: 1, minute: 360 },
      coins: STARTING_COINS,
      crate: [],
      farm: {},
      farmers: {},
      lastMorning: null,
      houses: {},
      decorations: [],
      worldSeed: 0,
      beach: { day: 0, finds: [] },
      book: { fish: {}, finds: {}, bugs: {} },
      village: { keeperDay: 0, projects: {} },
      forage: { day: 0, items: [] },
    });
  });

  it("keeps the world seed it's given, as a whole 32-bit number", () => {
    expect(newWorld(12345).worldSeed).toBe(12345);
    expect(newWorld(-1).worldSeed).toBe(0xffffffff);
  });
});

describe("farm tiles", () => {
  it("are untilled until dug", () => {
    expect(farmTileAt(newWorld(), 4, 5)).toEqual(UNTILLED);
  });

  it("store only dug tiles", () => {
    const dug = setFarmTile(newWorld(), 4, 5, { kind: "tilled", watered: false });
    expect(dug.farm).toEqual({ "4,5": { kind: "tilled", watered: false } });
    expect(farmTileAt(dug, 4, 5)).toEqual({ kind: "tilled", watered: false });
    expect(setFarmTile(dug, 4, 5, UNTILLED).farm).toEqual({});
  });

  it("have keys that go both ways", () => {
    expect(tileKey(12, 4)).toBe("12,4");
    expect(parseTileKey("12,4")).toEqual({ col: 12, row: 4 });
    expect(parseTileKey("-1,4")).toBeNull();
    expect(parseTileKey("1.5,4")).toBeNull();
    expect(parseTileKey("constructor")).toBeNull();
  });

  it("don't confuse a missing tile with an object property", () => {
    expect(farmTileAt(newWorld(), Number.NaN, 0)).toEqual(UNTILLED);
  });
});

describe("farmers", () => {
  const pip = { name: "Pip", character: "woman" } as const;

  it("start with the starter bag", () => {
    const world = addFarmer(newWorld(), "a1", pip);
    expect(farmerOf(world, "a1")).toEqual({ name: "Pip", character: "woman", bag: starterInventory() });
  });

  it("aren't replaced by adding them again", () => {
    const world = setFarmerBag(addFarmer(newWorld(), "a1", pip), "a1", []);
    expect(addFarmer(world, "a1", { name: "Juno", character: "boy" })).toBe(world);
  });

  it("keep their bag when their look changes", () => {
    const world = setFarmerBag(addFarmer(newWorld(), "a1", pip), "a1", []);
    const changed = setFarmerLook(world, "a1", { name: "Juno", character: "boy" });
    expect(farmerOf(changed, "a1")).toEqual({ name: "Juno", character: "boy", bag: [] });
    expect(setFarmerLook(changed, "a1", { name: "Juno", character: "boy" })).toBe(changed);
  });

  it("aren't found by object property names", () => {
    expect(farmerOf(newWorld(), "constructor")).toBeUndefined();
    expect(farmerOf(newWorld(), "toString")).toBeUndefined();
  });

  it("have ids the server made", () => {
    expect(isFarmerId("3b241101-e2bb-4255-8caf-4136c566a962")).toBe(true);
    expect(isFarmerId("a")).toBe(true);
    for (const bad of ["", "__proto__", "-x", "a b", "x".repeat(65), 7, null, undefined]) expect(isFarmerId(bad)).toBe(false);
  });
});

describe("listFarmers", () => {
  it("lists everyone in the order they first joined, without their bags", () => {
    let world = addFarmer(newWorld(), "b2", { name: "Pip", character: "woman" });
    world = addFarmer(world, "a1", { name: "Juno", character: "boy" });
    expect(listFarmers(world)).toEqual([
      { id: "b2", name: "Pip", character: "woman" },
      { id: "a1", name: "Juno", character: "boy" },
    ]);
  });
});
