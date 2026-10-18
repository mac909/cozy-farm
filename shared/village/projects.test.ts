import { describe, expect, it } from "vitest";
import { PROJECTS } from "../content/projects";
import { addItems, countOf, newInventory, type Inventory } from "../inventory/inventory";
import { addFarmer, newWorld, setFarmerBag, type World } from "../world/world";
import { builtThings } from "./built";
import {
  buildOvernight,
  canGive,
  fillStep,
  giveEverything,
  giveToProject,
  givingStep,
  needsOf,
  openProjects,
  progressOf,
  wantedFinds,
  wantedFor,
} from "./projects";

const PIP = "pip-1";
const JUNO = "juno-2";
const lighthouse = PROJECTS.lighthouse;

function bagOf(...stacks: [string, number][]): Inventory {
  let bag = newInventory();
  for (const [itemId, count] of stacks) {
    const added = addItems(bag, itemId, count);
    if (!added.ok) throw new Error(`can't add ${itemId}`);
    bag = added.inventory;
  }
  return bag;
}

/** Day 3, Marlow arrived on day 2, two farmers with whatever's given, 2,000 coins. */
function village(pip: Inventory = newInventory(), juno: Inventory = newInventory()): World {
  let world = addFarmer(newWorld(5), PIP, { name: "Pip", character: "woman" });
  world = addFarmer(world, JUNO, { name: "Juno", character: "boy" });
  world = setFarmerBag(setFarmerBag(world, PIP, pip), JUNO, juno);
  return { ...world, clock: { day: 3, minute: 600 }, coins: 2000, village: { keeperDay: 2, projects: {} } };
}

const progress = (world: World) => progressOf(world.village, "lighthouse");

describe("the board", () => {
  it("has nothing up until Marlow arrives, then the lighthouse", () => {
    expect(openProjects({ ...village(), village: { keeperDay: 0, projects: {} } })).toEqual([]);
    expect(openProjects({ ...village(), village: { keeperDay: 4, projects: {} } })).toEqual([]);
    expect(openProjects(village())).toEqual([lighthouse]);
  });

  it("takes the lighthouse down once it's finished", () => {
    const done = { gathered: 3, built: 3, given: {}, helpers: [PIP], doneDay: 3 };
    expect(openProjects({ ...village(), village: { keeperDay: 2, projects: { lighthouse: done } } })).toEqual([]);
  });

  it("says what the first step needs", () => {
    const needs = needsOf(lighthouse, progress(village()), 0);
    expect(needs.map((n) => [n.key, n.given, n.left])).toEqual([
      ["driftwood", 0, 10],
      ["branch", 0, 6],
      ["coins", 0, 300],
    ]);
  });
});

describe("giving", () => {
  it("gives a held stack, only as many as are still wanted, and keeps the rest", () => {
    const world = village(bagOf(["driftwood", 14]));
    const result = giveToProject(world, PIP, "lighthouse", "driftwood", 0);
    if (!result.ok) throw new Error(result.hint.reason);
    expect(result.count).toBe(10);
    expect(countOf(result.world.farmers[PIP].bag, "driftwood")).toBe(4);
    expect(progress(result.world).given).toEqual({ driftwood: 10 });
    expect(progress(result.world).helpers).toEqual([PIP]);
    expect(result.events).toEqual([{ type: "gift", project: "lighthouse", need: "driftwood", count: 10, itemId: "driftwood" }]);
  });

  it("won't take something the step doesn't want from a slot", () => {
    const world = village(bagOf(["radish", 3]));
    const result = giveToProject(world, PIP, "lighthouse", "driftwood", 0);
    expect(result.ok).toBe(false);
  });

  it("takes coins from the shared wallet, up to what's left", () => {
    const result = giveToProject(village(), JUNO, "lighthouse", "coins");
    if (!result.ok) throw new Error(result.hint.reason);
    expect(result.world.coins).toBe(1700);
    expect(progress(result.world).given.coins).toBe(300);
    const empty = giveToProject({ ...village(), coins: 0 }, JUNO, "lighthouse", "coins");
    expect(empty).toEqual({ ok: false, hint: { reason: "no-coins" } });
  });

  it("puts everyone who helped on the card, once each, in the order they first did", () => {
    let world = village(bagOf(["driftwood", 3]), bagOf(["branch", 2], ["driftwood", 2]));
    for (const [who, key] of [
      [JUNO, "branch"],
      [PIP, "driftwood"],
      [JUNO, "driftwood"],
    ] as const) {
      const result = giveToProject(world, who, "lighthouse", key);
      if (!result.ok) throw new Error(result.hint.reason);
      world = result.world;
    }
    expect(progress(world).helpers).toEqual([JUNO, PIP]);
    expect(progress(world).given).toEqual({ branch: 2, driftwood: 5 });
  });

  it("gathers the step when its last thing goes in, and takes nothing more until it's built", () => {
    let world = village(bagOf(["driftwood", 10], ["branch", 6]));
    for (const key of ["driftwood", "branch"]) {
      const result = giveToProject(world, PIP, "lighthouse", key);
      if (!result.ok) throw new Error(result.hint.reason);
      world = result.world;
    }
    const last = giveToProject(world, JUNO, "lighthouse", "coins");
    if (!last.ok) throw new Error(last.hint.reason);
    expect(last.events.at(-1)).toEqual({ type: "gathered", project: "lighthouse", step: 0 });
    expect(progress(last.world)).toMatchObject({ gathered: 1, built: 0, given: {} });
    expect(givingStep(lighthouse, progress(last.world))).toBeNull();
    expect(giveToProject(last.world, JUNO, "lighthouse", "coins")).toEqual({ ok: false, hint: { reason: "step-waiting" } });
  });

  it("gives the cheapest of a kind first, so a rare catch never goes by accident", () => {
    const stairs = { gathered: 1, built: 1, given: {}, helpers: [], doneDay: null };
    const world = { ...village(bagOf(["moonfish", 1], ["sardine", 2], ["mackerel", 4])), village: { keeperDay: 2, projects: { lighthouse: stairs } } };
    const result = giveToProject(world, PIP, "lighthouse", "any:fish");
    if (!result.ok) throw new Error(result.hint.reason);
    expect(result.count).toBe(5);
    const bag = result.world.farmers[PIP].bag;
    expect([countOf(bag, "sardine"), countOf(bag, "mackerel"), countOf(bag, "moonfish")]).toEqual([0, 1, 1]);
  });

  it("gives a held fish to \"any fish\" when you choose it yourself", () => {
    const stairs = { gathered: 1, built: 1, given: {}, helpers: [], doneDay: null };
    const world = { ...village(bagOf(["moonfish", 1], ["sardine", 2])), village: { keeperDay: 2, projects: { lighthouse: stairs } } };
    const result = giveToProject(world, PIP, "lighthouse", "any:fish", 0);
    if (!result.ok) throw new Error(result.hint.reason);
    expect(countOf(result.world.farmers[PIP].bag, "moonfish")).toBe(0);
    expect(countOf(result.world.farmers[PIP].bag, "sardine")).toBe(2);
  });

  it("gives everything it can (never coins), particular items before any of a kind", () => {
    const lamp = { gathered: 2, built: 2, given: {}, helpers: [], doneDay: null };
    const world = {
      ...village(bagOf(["sea_glass", 3], ["scallop_shell", 2], ["radish", 7])),
      village: { keeperDay: 2, projects: { lighthouse: lamp } },
    };
    const result = giveEverything(world, PIP, "lighthouse");
    if (!result.ok) throw new Error(result.hint.reason);
    expect(progress(result.world).given).toEqual({ sea_glass: 2, "any:beach": 3, "any:crop": 6 });
    expect(result.world.coins).toBe(2000);
    expect(countOf(result.world.farmers[PIP].bag, "radish")).toBe(1);
    expect(giveEverything(village(), PIP, "lighthouse")).toEqual({ ok: false, hint: { reason: "nothing-to-give" } });
  });

  it("says how many the Action button would give for what you're holding", () => {
    const world = village();
    expect(wantedFor(world, "driftwood")).toMatchObject({ key: "driftwood", left: 10 });
    expect(wantedFor(world, "radish")).toBeNull();
    const view = needsOf(lighthouse, progress(world), 0)[0];
    expect(canGive(view, bagOf(["driftwood", 7]), 0)).toBe(7);
  });

  it("asks the tide for sea glass while the lamp still needs it", () => {
    expect(wantedFinds(village())).toEqual([]);
    const lamp = { gathered: 2, built: 2, given: { sea_glass: 1 }, helpers: [], doneDay: null };
    expect(wantedFinds({ ...village(), village: { keeperDay: 2, projects: { lighthouse: lamp } } })).toEqual(["sea_glass"]);
    const lampDone = { ...lamp, given: { sea_glass: 2 } };
    expect(wantedFinds({ ...village(), village: { keeperDay: 2, projects: { lighthouse: lampDone } } })).toEqual([]);
  });
});

describe("building overnight", () => {
  it("builds what was gathered, and finishes the project with its last step", () => {
    let world = village();
    const steps = [];
    for (let step = 0; step < 3; step++) {
      const filled = fillStep(world, PIP);
      if (!filled.ok) throw new Error(filled.hint.reason);
      world = { ...filled.world, clock: { day: world.clock.day + 1, minute: 360 } };
      const night = buildOvernight(world);
      steps.push(...night.built);
      world = night.world;
    }
    expect(steps).toEqual([0, 1, 2].map((step) => ({ project: "lighthouse", step })));
    expect(progress(world)).toMatchObject({ gathered: 3, built: 3, doneDay: 6 });
    expect(buildOvernight(world).built).toEqual([]);
  });
});

describe("what's built", () => {
  it("names Marlow, each built step, and the lighthouse from dusk on the day it's finished", () => {
    const pathBuilt = { gathered: 1, built: 1, given: {}, helpers: [], doneDay: null };
    expect([...builtThings({ ...village(), village: { keeperDay: 2, projects: { lighthouse: pathBuilt } } })]).toEqual(["keeper", "lighthouse/path"]);
    const done = { gathered: 3, built: 3, given: {}, helpers: [], doneDay: 5 };
    const at = (day: number, minute: number) => builtThings({ village: { keeperDay: 2, projects: { lighthouse: done } }, clock: { day, minute } });
    expect(at(5, 17 * 60 + 59).has("lighthouse")).toBe(false);
    expect(at(5, 17 * 60 + 59).has("lighthouse/lamp")).toBe(true);
    expect(at(5, 18 * 60).has("lighthouse")).toBe(true);
    expect(at(6, 6 * 60).has("lighthouse")).toBe(true);
    expect(builtThings(newWorld()).size).toBe(0);
  });
});
