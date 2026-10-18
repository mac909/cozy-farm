import { describe, expect, it } from "vitest";
import { FORAGE } from "../content/forage";
import { countOf, newInventory } from "../inventory/inventory";
import { addFarmer, newWorld, setFarmerBag, type World } from "../world/world";
import { collectForage, forageAt, forageIn, forageMorning, type ForageGrounds } from "./forage";

const strip = (row: number, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ({ col: from + i, row }));
const GROUNDS: ForageGrounds = { beach: [...strip(20, 0, 30), ...strip(21, 0, 30)], woods: [...strip(3, 0, 30), ...strip(4, 0, 30)] };

describe("the morning's driftwood and branches", () => {
  it("brings a few of each onto their own ground", () => {
    const { items, added } = forageIn({ day: 4, worldSeed: 9, grounds: GROUNDS, items: [] });
    expect(items).toEqual(added);
    const driftwood = added.filter((i) => i.itemId === "driftwood");
    const branches = added.filter((i) => i.itemId === "branch");
    for (const [kind, list] of [
      ["driftwood", driftwood],
      ["branch", branches],
    ] as const) {
      expect(list.length).toBeGreaterThanOrEqual(FORAGE[kind].perMorning.min);
      expect(list.length).toBeLessThanOrEqual(FORAGE[kind].perMorning.max);
    }
    for (const item of driftwood) expect(GROUNDS.beach).toContainEqual({ col: item.col, row: item.row });
    for (const item of branches) expect(GROUNDS.woods).toContainEqual({ col: item.col, row: item.row });
  });

  it("brings the same things to the same places for the same day and seed, whatever order the tiles come in", () => {
    const one = forageIn({ day: 7, worldSeed: 3, grounds: GROUNDS, items: [] });
    const two = forageIn({ day: 7, worldSeed: 3, grounds: { beach: [...GROUNDS.beach].reverse(), woods: [...GROUNDS.woods].reverse() }, items: [] });
    expect(two).toEqual(one);
    expect(forageIn({ day: 8, worldSeed: 3, grounds: GROUNDS, items: [] })).not.toEqual(one);
  });

  it("never puts two things on a tile, or anything on a blocked one", () => {
    const blocked = strip(20, 0, 30);
    const { items } = forageIn({ day: 2, worldSeed: 1, grounds: GROUNDS, items: [], blocked, storm: true });
    const keys = items.map((i) => `${i.col},${i.row}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const item of items) expect(item.row).not.toBe(20);
  });

  it("stops bringing more once there's plenty lying about", () => {
    let items = forageIn({ day: 1, worldSeed: 1, grounds: GROUNDS, items: [] }).items;
    for (let day = 2; day < 12; day++) items = forageIn({ day, worldSeed: 1, grounds: GROUNDS, items }).items;
    expect(items.filter((i) => i.itemId === "driftwood")).toHaveLength(FORAGE.driftwood.most);
    expect(items.filter((i) => i.itemId === "branch")).toHaveLength(FORAGE.branch.most);
  });

  it("brings the storm's amounts the morning Marlow arrives", () => {
    const { added } = forageIn({ day: 2, worldSeed: 6, grounds: GROUNDS, items: [], storm: true });
    expect(added.filter((i) => i.itemId === "driftwood")).toHaveLength(FORAGE.driftwood.storm);
    expect(added.filter((i) => i.itemId === "branch")).toHaveLength(FORAGE.branch.storm);
  });

  it("comes once a day, and never onto a decoration or a shell", () => {
    const world: World = {
      ...newWorld(2),
      clock: { day: 3, minute: 360 },
      decorations: [{ itemId: "fence", col: 0, row: 20, turn: 0 }],
      beach: { day: 3, finds: [{ findId: "starfish", col: 1, row: 20 }] },
    };
    const once = forageMorning(world, { beach: [{ col: 0, row: 20 }, { col: 1, row: 20 }, { col: 2, row: 20 }], woods: [] }, true);
    expect(once.world.forage.day).toBe(3);
    expect(once.added).toEqual([{ itemId: "driftwood", col: 2, row: 20 }]);
    expect(forageMorning(once.world, GROUNDS).added).toEqual([]);
  });
});

describe("picking up driftwood and branches", () => {
  const lying: World = {
    ...addFarmer(newWorld(), "pip", { name: "Pip", character: "woman" }),
    forage: { day: 1, items: [{ itemId: "branch", col: 5, row: 4 }] },
  };

  it("goes in your bag and off the ground", () => {
    const result = collectForage(lying, "pip", 5, 4);
    if (!result.ok) throw new Error(result.hint.reason);
    expect(countOf(result.world.farmers.pip.bag, "branch")).toBe(1);
    expect(forageAt(result.world.forage.items, 5, 4)).toBeUndefined();
    expect(result.events).toEqual([]);
  });

  it("stays where it is with a full bag, or if someone got there first", () => {
    const full = setFarmerBag(lying, "pip", newInventory().map(() => ({ itemId: "radish" as const, count: 99 })));
    expect(collectForage(full, "pip", 5, 4)).toEqual({ ok: false, hint: { reason: "bag-full" } });
    expect(collectForage(lying, "pip", 6, 4)).toEqual({ ok: false, hint: { reason: "gone" } });
  });
});
