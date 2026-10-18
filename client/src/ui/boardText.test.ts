import { describe, expect, it } from "vitest";
import { addItems, newInventory, type Inventory } from "../../../shared/inventory/inventory";
import type { ProjectProgress, Village } from "../../../shared/village/village";
import { boardWords, keeperNotes, needCount, needName, projectCard, type BoardState } from "./boardText";

const pip = { farmerId: "pip", name: "Pip", character: "woman" as const };
const juno = { farmerId: "juno", name: "Juno", character: "boy" as const };

function state(lighthouse: ProjectProgress | null, clock = { day: 6, minute: 600 }): BoardState {
  const village: Village = { keeperDay: 2, projects: lighthouse ? { lighthouse } : {} };
  return { village, helpers: lighthouse ? { lighthouse: [pip, juno] } : {}, clock };
}

function bag(...stacks: [string, number][]): Inventory {
  let inventory = newInventory();
  for (const [itemId, count] of stacks) {
    const added = addItems(inventory, itemId, count);
    if (added.ok) inventory = added.inventory;
  }
  return inventory;
}

describe("the board's words", () => {
  it("shows the open step, how much is in and who's helping (faces, never counts)", () => {
    const words = boardWords(state({ gathered: 0, built: 0, given: { driftwood: 5, branch: 3, coins: 150 }, helpers: ["pip", "juno"], doneDay: null }));
    expect(words.line).toMatch(/The light first/);
    expect(words.now).toEqual([
      { id: "lighthouse", name: "Light the lighthouse", step: "Step 1 of 3 · Clear the path to the point", progress: 0.5, waiting: null, faces: [pip, juno] },
    ]);
    expect(words.finished).toEqual([]);
  });

  it("says when everything's in and Marlow sees to it tonight", () => {
    const words = boardWords(state({ gathered: 1, built: 0, given: {}, helpers: ["pip"], doneDay: null }));
    expect(words.now[0]).toMatchObject({ step: "Step 1 of 3 · Clear the path to the point", progress: 1, waiting: expect.stringMatching(/tonight/) });
  });

  it("keeps the lighthouse up until it's lit at dusk, then lists it as finished", () => {
    const done = { gathered: 3, built: 3, given: {}, helpers: ["pip"], doneDay: 6 };
    const morning = boardWords(state(done, { day: 6, minute: 600 }));
    expect(morning.now[0].waiting).toMatch(/at dusk/);
    expect(morning.finished).toEqual([]);
    const evening = boardWords(state(done, { day: 6, minute: 18 * 60 }));
    expect(evening.now).toEqual([]);
    expect(evening.finished).toEqual([{ id: "lighthouse", name: "Light the lighthouse", when: "Lit on day 6" }]);
    expect(evening.line).toMatch(/next plan/);
  });
});

describe("a project's card", () => {
  it("says what you have, gives as many as you have up to what's left, and where to find the rest", () => {
    const card = projectCard("lighthouse", state({ gathered: 0, built: 0, given: { driftwood: 7 }, helpers: ["pip"], doneDay: null }), bag(["driftwood", 9]), 1240)!;
    expect(card.needs.map((n) => [n.name, n.given, n.count, n.sub, n.give])).toEqual([
      ["Driftwood", 7, 10, "You have 9", 3],
      ["Branches", 0, 6, "Falls under the meadow's trees each morning", 0],
      ["Coins", 0, 300, "Wallet 1,240", 300],
    ]);
    expect(card.canGiveAll).toBe(true);
    expect(card.next).toEqual({ name: "Mend the stairs", needs: "12 Driftwood, 8 Branches, 5 fish, 600 coins" });
  });

  it("gives the cheapest of a kind first, and says so", () => {
    const card = projectCard("lighthouse", state({ gathered: 1, built: 1, given: {}, helpers: [], doneDay: null }), bag(["sardine", 3], ["moonfish", 1]), 0)!;
    const fish = card.needs.find((n) => n.key === "any:fish")!;
    expect(fish).toMatchObject({ name: "Any fish", sub: "You have 4 · cheapest first", give: 4 });
  });
});

describe("Marlow's notes", () => {
  it("has his first note once he's here, then one for each step built and the lighthouse lit", () => {
    expect(keeperNotes({ keeperDay: 0, projects: {} }, { day: 1, minute: 400 })).toEqual([]);
    const lit = { gathered: 3, built: 3, given: {}, helpers: [], doneDay: 6 };
    const notes = keeperNotes({ keeperDay: 2, projects: { lighthouse: lit } }, { day: 7, minute: 400 });
    expect(notes.map((n) => n.id)).toEqual(["first", "lighthouse/path", "lighthouse/stairs", "lighthouse/lamp", "lighthouse"]);
    expect(notes[0].paragraphs[0]).toMatch(/I'm Marlow/);
  });

  it("names needs the way the card does", () => {
    expect(needName({ kind: "item", itemId: "branch", count: 6 })).toBe("Branches");
    expect(needName({ kind: "any", category: "beach", count: 4 })).toBe("Any beach find");
    expect(needCount({ kind: "item", itemId: "sea_glass", count: 2 })).toBe("2 Sea Glass");
    expect(needCount({ kind: "coins", count: 1500 })).toBe("1,500 coins");
  });
});
