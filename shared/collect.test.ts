import { ArraySchema, MapSchema } from "@colyseus/schema";
import { describe, expect, it } from "vitest";
import { collectBug, collectFind, collectFish, lyingAround } from "./collection/collect";
import { FISH } from "./content/fish";
import { countOf, INVENTORY_SLOTS } from "./inventory/inventory";
import { BeachFindState, BookEntryState, BugState } from "./schema";
import { readBeach, readBook, readBugs, writeBeach, writeBook, writeBugs } from "./stateSync";
import { addFarmer, giveFishingRod, newWorld, setFarmerBag, type World } from "./world/world";

const PIP = "pip";
const JUNO = "juno";

function twoFarmers(): World {
  return addFarmer(addFarmer(newWorld(5), PIP, { name: "Pip", character: "woman" }), JUNO, { name: "Juno", character: "boy" });
}

function withBeach(world: World): World {
  return {
    ...world,
    clock: { day: 4, minute: 600 },
    beach: {
      day: 4,
      finds: [
        { findId: "starfish", col: 20, row: 23 },
        { findId: "sea_glass", col: 21, row: 23 },
      ],
    },
  };
}

const fullBag = () => Array.from({ length: INVENTORY_SLOTS }, () => ({ itemId: "radish" as const, count: 99 }));

describe("picking up a beach find", () => {
  it("takes it off the sand, into the bag and the book", () => {
    const result = collectFind(withBeach(twoFarmers()), PIP, 20, 23);
    if (!result.ok) throw new Error(result.hint.reason);
    expect(result.itemId).toBe("starfish");
    expect(result.world.beach.finds).toEqual([{ findId: "sea_glass", col: 21, row: 23 }]);
    expect(countOf(result.world.farmers[PIP].bag, "starfish")).toBe(1);
    expect(result.world.book.finds.starfish).toEqual({ found: 1, firstDay: 4, firstBy: "Pip" });
    expect(result.events).toEqual([{ type: "discovered", section: "finds", id: "starfish" }]);
  });

  it("only celebrates the first", () => {
    const first = collectFind(withBeach(twoFarmers()), PIP, 20, 23);
    if (!first.ok) throw new Error(first.hint.reason);
    const world = { ...first.world, beach: { day: 5, finds: [{ findId: "starfish" as const, col: 1, row: 1 }] } };
    const second = collectFind(world, JUNO, 1, 1);
    expect(second.ok && second.events).toEqual([]);
    expect(second.ok && second.world.book.finds.starfish?.found).toBe(2);
  });

  it("says when someone got there first", () => {
    expect(collectFind(withBeach(twoFarmers()), PIP, 5, 5)).toEqual({ ok: false, hint: { reason: "gone" } });
  });

  it("leaves it on the sand when the bag is full", () => {
    const world = setFarmerBag(withBeach(twoFarmers()), PIP, fullBag());
    expect(collectFind(world, PIP, 20, 23)).toEqual({ ok: false, hint: { reason: "bag-full" } });
  });
});

describe("landing a fish", () => {
  it("goes into the bag and the book, with its size", () => {
    const result = collectFish(twoFarmers(), JUNO, "sea_bream", 33);
    if (!result.ok) throw new Error(result.hint.reason);
    expect(countOf(result.world.farmers[JUNO].bag, "sea_bream")).toBe(1);
    expect(result.world.book.fish.sea_bream).toMatchObject({ caught: 1, biggestCm: 33, biggestBy: "Juno" });
  });

  it("keeps a size within the fish's own", () => {
    const result = collectFish(twoFarmers(), JUNO, "sardine", 500);
    expect(result.ok && result.world.book.fish.sardine?.biggestCm).toBe(FISH.sardine.sizeCm.max);
  });

  it("celebrates a record", () => {
    const first = collectFish(twoFarmers(), JUNO, "sardine", 12);
    if (!first.ok) throw new Error(first.hint.reason);
    const second = collectFish(first.world, PIP, "sardine", 18);
    expect(second.ok && second.events).toEqual([{ type: "new-record", fishId: "sardine", sizeCm: 18, previousCm: 12 }]);
  });

  it("needs room in the bag", () => {
    const world = setFarmerBag(twoFarmers(), PIP, fullBag());
    expect(collectFish(world, PIP, "sardine", 12)).toEqual({ ok: false, hint: { reason: "bag-full" } });
  });
});

describe("catching a bug", () => {
  it("goes into the bag and the book", () => {
    const result = collectBug(twoFarmers(), PIP, "firefly");
    if (!result.ok) throw new Error(result.hint.reason);
    expect(countOf(result.world.farmers[PIP].bag, "firefly")).toBe(1);
    expect(result.world.book.bugs.firefly).toEqual({ caught: 1, firstDay: 1, firstBy: "Pip" });
    expect(result.events).toEqual([{ type: "discovered", section: "bugs", id: "firefly" }]);
  });

  it("refuses someone who isn't a farmer", () => {
    expect(collectBug(twoFarmers(), "nobody", "firefly")).toEqual({ ok: false, hint: { reason: "gone" } });
  });
});

describe("the fishing rod", () => {
  it("is in a new farmer's bag already", () => {
    expect(countOf(twoFarmers().farmers[PIP].bag, "fishing_rod")).toBe(1);
  });

  it("is given to a farmer without one, once, when there's room", () => {
    const without = setFarmerBag(twoFarmers(), PIP, twoFarmers().farmers[PIP].bag.map((slot) => (slot?.itemId === "fishing_rod" ? null : slot)));
    const given = giveFishingRod(without, PIP);
    expect(countOf(given.farmers[PIP].bag, "fishing_rod")).toBe(1);
    expect(giveFishingRod(given, PIP)).toBe(given);
    const full = setFarmerBag(twoFarmers(), JUNO, fullBag());
    expect(giveFishingRod(full, JUNO)).toBe(full);
  });
});

describe("syncing the beach, the bugs and the book", () => {
  it("sends the beach and reads it back", () => {
    const target = new ArraySchema<BeachFindState>();
    const beach = withBeach(twoFarmers()).beach.finds;
    writeBeach(target, beach);
    expect(readBeach(target)).toEqual(beach);
    writeBeach(target, beach.slice(1));
    expect(readBeach(target)).toEqual(beach.slice(1));
  });

  it("sends the bugs out now, adding and dropping them", () => {
    const target = new MapSchema<BugState>();
    const bugs = [
      { id: "1.0.0", bugId: "brimstone" as const, col: 30, row: 8 },
      { id: "1.0.1", bugId: "red_admiral" as const, col: 32, row: 9 },
    ];
    writeBugs(target, bugs);
    expect(readBugs(target)).toEqual(bugs);
    writeBugs(target, bugs.slice(1));
    expect(readBugs(target)).toEqual(bugs.slice(1));
  });

  it("sends the book, every section, and reads it back the same", () => {
    const steps: ((w: World) => ReturnType<typeof collectFish>)[] = [
      (w) => collectFish(w, PIP, "sea_bream", 30),
      (w) => collectFish(w, PIP, "tuna", 120),
      (w) => collectBug(w, JUNO, "luna_moth"),
      (w) => collectFind(withBeach(w), JUNO, 21, 23),
    ];
    const world = steps.reduce((w, step) => {
      const result = step(w);
      if (!result.ok) throw new Error(result.hint.reason);
      return result.world;
    }, twoFarmers());
    const target = new MapSchema<BookEntryState>();
    writeBook(target, world.book);
    expect(target.get("fish:tuna")?.biggestCm).toBe(120);
    expect(readBook(target)).toEqual(world.book);
  });
});

describe("the shell basket's sweep (Milestone 8)", () => {
  it("finds everything lying within a tile of you, finds and driftwood alike, nearest first", () => {
    const world = {
      beach: { day: 4, finds: [{ findId: "starfish" as const, col: 21, row: 23 }, { findId: "sea_glass" as const, col: 24, row: 23 }] },
      forage: { day: 4, items: [{ itemId: "driftwood" as const, col: 20, row: 22 }, { itemId: "branch" as const, col: 20, row: 23 }] },
    };
    expect(lyingAround(world, { col: 20, row: 23 }, 1)).toEqual([
      { col: 20, row: 23 },
      { col: 20, row: 22 },
      { col: 21, row: 23 },
    ]);
    expect(lyingAround(world, { col: 20, row: 23 }, 0)).toEqual([{ col: 20, row: 23 }]);
  });
});
