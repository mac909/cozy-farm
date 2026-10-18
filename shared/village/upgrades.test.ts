import { describe, expect, it } from "vitest";
import { HOUSE_UPGRADES, HOUSE_UPGRADE_IDS, LATER_UPGRADES, ownerWords } from "../content/houseUpgrades";
import { HOUSES } from "../content/houses";
import { isItemId } from "../content/items";
import { houseProject, houseProjectId, houseProjectOf, isProjectId, needKey, projectDef } from "../content/projects";
import { addItems, countOf, newInventory, type Inventory } from "../inventory/inventory";
import { addFarmer, newWorld, setFarmerBag, type World } from "../world/world";
import { builtThings } from "./built";
import type { ProjectProgress } from "./village";
import { buildOvernight, everythingOpen, fillStep, giveEverything, giveToProject, isOpen, openProjects, openUpgrades, progressOf, wantedFor } from "./projects";

/** House upgrades (Milestone 7): one-step projects per cottage, built overnight like the village's. */

const PIP = "pip-1";
const JUNO = "juno-2";

function bagOf(...stacks: [string, number][]): Inventory {
  let bag = newInventory();
  for (const [itemId, count] of stacks) {
    const added = addItems(bag, itemId, count);
    if (!added.ok) throw new Error(`can't add ${itemId}`);
    bag = added.inventory;
  }
  return bag;
}

/**
 * Day 20, Marlow here, two farmers in their cottages, 5,000 coins; the lighthouse lit (or not). With
 * the lighthouse lit, the garden shop (Milestone 8) is open too, so the village has nothing up and
 * the porches have the board to themselves; `shopOpen` false leaves the garden shop up on the board.
 */
function village(lit = true, pip: Inventory = newInventory(), juno: Inventory = newInventory(), shopOpen = true): World {
  let world = addFarmer(newWorld(5), PIP, { name: "Pip", character: "woman" });
  world = addFarmer(world, JUNO, { name: "Juno", character: "boy" });
  world = setFarmerBag(setFarmerBag(world, PIP, pip), JUNO, juno);
  const done = (doneDay: number): ProjectProgress => ({ gathered: 3, built: 3, given: {}, helpers: [PIP], doneDay });
  const lighthouse: Record<string, ProjectProgress> = lit ? { lighthouse: done(16), ...(shopOpen ? { gardenShop: done(18) } : {}) } : {};
  return {
    ...world,
    clock: { day: 20, minute: 600 },
    coins: 5000,
    houses: { house1: { owner: PIP, furniture: [] }, house2: { owner: JUNO, furniture: [] } },
    village: { keeperDay: 2, projects: lighthouse },
  };
}

describe("house upgrade data", () => {
  it("is a project per cottage and upgrade, with ids the saves can hold", () => {
    expect(houseProjectId("house1", "porch")).toBe("house1:porch");
    expect(houseProjectOf("house2:porch")).toEqual({ houseId: "house2", upgrade: "porch" });
    expect(houseProjectOf("house9:porch")).toBeNull();
    expect(houseProjectOf("house1:pool")).toBeNull();
    expect(houseProjectOf("lighthouse")).toBeNull();
    expect(isProjectId("house1:porch")).toBe(true);
    expect(isProjectId("house1:constructor")).toBe(false);
    for (const houseId of Object.keys(HOUSES)) {
      for (const upgrade of HOUSE_UPGRADE_IDS) {
        const project = projectDef(houseProjectId(houseId, upgrade))!;
        expect(project).toBe(houseProject(houseId, upgrade));
        expect(project.steps).toHaveLength(1);
        expect(project.house).toEqual({ houseId, upgrade });
      }
    }
  });

  it("asks for things that exist, waits for something real, and has words for its cheer", () => {
    for (const id of HOUSE_UPGRADE_IDS) {
      const upgrade = HOUSE_UPGRADES[id];
      expect(upgrade.id).toBe(id);
      expect(upgrade.needs.length).toBeGreaterThanOrEqual(2);
      const keys = upgrade.needs.map(needKey);
      expect(new Set(keys).size).toBe(keys.length);
      for (const need of upgrade.needs) if (need.kind === "item") expect(isItemId(need.itemId)).toBe(true);
      expect(upgrade.cheer).toContain("{owner}");
      expect(upgrade.after).toBe("lighthouse");
    }
    expect(HOUSE_UPGRADES.porch.needs).toEqual([
      { kind: "item", itemId: "driftwood", count: 12 },
      { kind: "item", itemId: "branch", count: 8 },
      { kind: "coins", count: 2000 },
    ]);
    expect(LATER_UPGRADES.map((u) => u.name)).toEqual(["A garden", "A bedroom", "A kitchen", "A loft"]);
    for (const later of LATER_UPGRADES) expect(isItemId(later.icon)).toBe(true);
    expect(ownerWords("That's everything for {owner}'s porch!", "Pip")).toBe("That's everything for Pip's porch!");
  });
});

describe("the Your home tab", () => {
  it("has nothing up until the lighthouse is lit", () => {
    expect(openUpgrades(village(false))).toEqual([]);
    expect(isOpen(village(false), "house1:porch")).toBe(false);
  });

  it("puts up a porch for every cottage someone lives in, your own first", () => {
    const world = village();
    expect(openUpgrades(world).map((p) => p.id)).toEqual(["house1:porch", "house2:porch"]);
    expect(openUpgrades(world, JUNO).map((p) => p.id)).toEqual(["house2:porch", "house1:porch"]);
    // Nobody lives in a cottage: no porch for it.
    expect(openUpgrades({ ...world, houses: { house2: world.houses.house2 } }).map((p) => p.id)).toEqual(["house2:porch"]);
    // The village's own project stays one at a time, and comes first.
    expect(openProjects(world)).toEqual([]);
    expect(everythingOpen(world, PIP).map((p) => p.id)).toEqual(["house1:porch", "house2:porch"]);
    const shopUp = village(true, newInventory(), newInventory(), false);
    expect(openProjects(shopUp).map((p) => p.id)).toEqual(["gardenShop"]);
    expect(everythingOpen(shopUp, PIP).map((p) => p.id)).toEqual(["gardenShop", "house1:porch", "house2:porch"]);
  });

  it("takes gifts from anyone, to either house", () => {
    const world = village(true, bagOf(["driftwood", 20]), bagOf(["branch", 3]));
    const fromPip = giveToProject(world, PIP, "house2:porch", "driftwood", 0);
    if (!fromPip.ok) throw new Error(fromPip.hint.reason);
    expect(fromPip.count).toBe(12);
    const fromJuno = giveEverything(fromPip.world, JUNO, "house2:porch");
    if (!fromJuno.ok) throw new Error(fromJuno.hint.reason);
    const coins = giveToProject(fromJuno.world, JUNO, "house2:porch", "coins");
    if (!coins.ok) throw new Error(coins.hint.reason);
    const porch = progressOf(coins.world.village, "house2:porch");
    expect(porch.given).toEqual({ driftwood: 12, branch: 3, coins: 2000 });
    expect(porch.helpers).toEqual([PIP, JUNO]);
    expect(coins.world.coins).toBe(3000);
  });

  it("won't take anything before the lighthouse, or for a cottage nobody lives in", () => {
    expect(giveToProject(village(false, bagOf(["driftwood", 5])), PIP, "house1:porch", "driftwood", 0)).toEqual({ ok: false, hint: { reason: "not-open" } });
    const empty = { ...village(true, bagOf(["driftwood", 5])), houses: { house1: { owner: PIP, furniture: [] } } };
    expect(giveToProject(empty, PIP, "house2:porch", "driftwood", 0)).toEqual({ ok: false, hint: { reason: "not-open" } });
  });

  it("cheers when the last thing goes in, and builds it overnight", () => {
    const world = village(true, bagOf(["driftwood", 12], ["branch", 8]));
    let next = world;
    for (const need of ["driftwood", "branch"]) {
      const result = giveToProject(next, PIP, "house1:porch", need);
      if (!result.ok) throw new Error(result.hint.reason);
      next = result.world;
    }
    const last = giveToProject(next, JUNO, "house1:porch", "coins");
    if (!last.ok) throw new Error(last.hint.reason);
    expect(last.events.at(-1)).toEqual({ type: "gathered", project: "house1:porch", step: 0 });
    // Nothing more goes in until it's built tonight.
    expect(isOpen(last.world, "house1:porch")).toBe(true);
    expect(giveToProject(last.world, JUNO, "house1:porch", "coins")).toEqual({ ok: false, hint: { reason: "step-waiting" } });
    const night = buildOvernight({ ...last.world, clock: { day: 21, minute: 360 } });
    expect(night.built).toEqual([{ project: "house1:porch", step: 0 }]);
    expect(progressOf(night.world.village, "house1:porch")).toMatchObject({ built: 1, doneDay: 21 });
    expect(builtThings(night.world).has("house1:porch")).toBe(true);
    expect(builtThings(night.world).has("house2:porch")).toBe(false);
    expect(openUpgrades(night.world).map((p) => p.id)).toEqual(["house2:porch"]);
  });

  it("says a porch wants something you're holding, after the village's own project, your own cottage first", () => {
    const world = village(true, bagOf(["driftwood", 3]));
    expect(wantedFor(world, "driftwood", JUNO)?.project.id).toBe("house2:porch");
    expect(wantedFor(world, "driftwood", PIP)?.project.id).toBe("house1:porch");
    // Without the houses (the board before Milestone 7), only the village's.
    expect(wantedFor({ village: world.village, clock: world.clock }, "driftwood")).toBeNull();
  });

  it("can be filled by the dev command, the village's first, else your own porch", () => {
    const result = fillStep(village(), JUNO);
    expect(result.ok && result.events).toEqual([{ type: "gathered", project: "house2:porch", step: 0 }]);
    const village8 = fillStep(village(true, newInventory(), newInventory(), false), JUNO);
    expect(village8.ok && village8.events).toEqual([{ type: "gathered", project: "gardenShop", step: 0 }]);
    const named = fillStep(village(), JUNO, "house1:porch");
    expect(named.ok && named.events).toEqual([{ type: "gathered", project: "house1:porch", step: 0 }]);
  });

  it("takes only as many from a held stack as are wanted", () => {
    const world = village(true, bagOf(["driftwood", 40]));
    const given = giveToProject(world, PIP, "house1:porch", "driftwood", 0);
    expect(given.ok && countOf(given.world.farmers[PIP].bag, "driftwood")).toBe(28);
  });
});
