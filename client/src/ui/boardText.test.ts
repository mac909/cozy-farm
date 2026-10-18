import { describe, expect, it } from "vitest";
import { addItems, newInventory, type Inventory } from "../../../shared/inventory/inventory";
import type { ProjectProgress, Village } from "../../../shared/village/village";
import { boardWords, homeWords, keeperNotes, needCount, needName, projectCard, type BoardState } from "./boardText";

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
    expect(words.later.map((later) => later.id)).toEqual(["gardenShop"]);
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
    // The garden shop (Milestone 8) is still to come: a silhouette until it goes up next morning.
    expect(evening.later).toEqual([{ id: "gardenShop", title: "Something on the boardwalk", hint: "Mrs Penhallow's old shop…" }]);
  });

  it("puts the garden shop up the morning after the lighthouse is lit (Milestone 8), and nothing after it yet", () => {
    const done = { gathered: 3, built: 3, given: {}, helpers: ["pip"], doneDay: 6 };
    const words = boardWords(state(done, { day: 7, minute: 600 }));
    expect(words.now.map((row) => [row.id, row.step])).toEqual([["gardenShop", "Step 1 of 3 · Mend the boardwalk"]]);
    expect(words.line).toMatch(/Mrs Penhallow/);
    expect(words.later).toEqual([]);
    const shop = { gathered: 3, built: 3, given: {}, helpers: ["pip"], doneDay: 9 };
    const after = boardWords({ ...state(done, { day: 10, minute: 600 }), village: { keeperDay: 2, projects: { lighthouse: done, gardenShop: shop } } });
    expect(after.now).toEqual([]);
    expect(after.finished.map((f) => f.when)).toEqual(["Lit on day 6", "Opened on day 9"]);
    expect(after.line).toMatch(/next plan/);
  });

  it("shows nothing still to come before Marlow arrives", () => {
    expect(boardWords({ ...state(null), village: { keeperDay: 0, projects: {} } }).later).toEqual([]);
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

describe("the Your home tab (Milestone 7)", () => {
  const lit: ProjectProgress = { gathered: 3, built: 3, given: {}, helpers: ["pip"], doneDay: 5 };
  const houses = { house1: { owner: "pip", ownerName: "Pip" }, house2: { owner: "juno", ownerName: "Juno" } };
  const home = (projects: Village["projects"], me: string | null = "juno"): BoardState => ({
    village: { keeperDay: 2, projects },
    helpers: {},
    clock: { day: 8, minute: 600 },
    houses,
    me,
  });

  it("waits for the lighthouse, with what's to come under your own cottage", () => {
    const words = homeWords(home({}));
    expect(words.line).toMatch(/The light first/);
    expect(words.cottages.map((c) => [c.title, c.mine])).toEqual([
      ["Juno's cottage", true],
      ["Pip's cottage", false],
    ]);
    expect(words.cottages[0].rows.map((r) => [r.name, r.state, r.sub])).toEqual([
      ["A porch", "later", "After the lighthouse"],
      ["A garden", "later", "Marlow's still drawing it up"],
      ["A bedroom", "later", "After the bridge"],
      ["A kitchen", "later", "After the café"],
      ["A loft", "later", "After the tailor's"],
    ]);
    expect(words.cottages[1].rows.map((r) => r.name)).toEqual(["A porch"]);
    expect(words.note).toBeNull();
  });

  it("puts a porch up for each cottage once the lighthouse is lit, with what it needs and how much is in", () => {
    const words = homeWords(home({ lighthouse: lit, "house1:porch": { gathered: 0, built: 0, given: { driftwood: 12, coins: 1000 }, helpers: ["juno"], doneDay: null } }));
    expect(words.line).toMatch(/porch/);
    const pips = words.cottages[1].rows[0];
    expect(pips).toMatchObject({ id: "house1:porch", state: "open", sub: null });
    expect(pips.needs).toEqual([
      { icon: "driftwood", text: "12" },
      { icon: "branch", text: "8" },
      { icon: null, text: "2,000 coins" },
    ]);
    expect(pips.progress).toBeCloseTo((1 + 0 + 0.5) / 3);
  });

  it("says when it's all in, and when it's built", () => {
    const words = homeWords(
      home({
        lighthouse: lit,
        "house1:porch": { gathered: 1, built: 0, given: {}, helpers: ["juno"], doneDay: null },
        "house2:porch": { gathered: 1, built: 1, given: {}, helpers: ["pip"], doneDay: 7 },
      }),
    );
    expect(words.cottages[0].rows[0]).toMatchObject({ state: "built", sub: "Built on day 7" });
    expect(words.cottages[1].rows[0]).toMatchObject({ state: "waiting", sub: expect.stringMatching(/tonight/) });
  });

  it("asks someone without a cottage to move in first", () => {
    expect(homeWords(home({ lighthouse: lit }, "stranger")).note).toMatch(/Move into a cottage/);
    expect(homeWords({ ...home({}), houses: {} }).note).toMatch(/Nobody/);
  });

  it("names a porch's card by whose it is, with one step and a way back home", () => {
    const card = projectCard("house1:porch", home({ lighthouse: lit }), bag(["driftwood", 5]), 3000)!;
    expect(card).toMatchObject({ name: "Pip's porch", home: true, steps: 1, step: 0, stepName: "Build the porch" });
    expect(card.needs.map((n) => [n.name, n.give])).toEqual([
      ["Driftwood", 5],
      ["Branches", 0],
      ["Coins", 2000],
    ]);
  });

  it("keeps Marlow's note for each porch built, by whose it is", () => {
    const notes = keeperNotes(
      { keeperDay: 2, projects: { lighthouse: lit, "house2:porch": { gathered: 1, built: 1, given: {}, helpers: [], doneDay: 7 } } },
      { day: 8, minute: 400 },
      houses,
    );
    expect(notes.at(-1)).toEqual({ id: "house2:porch", title: "Juno's porch", paragraphs: ["A porch! Somewhere to sit and watch the boats come in."] });
  });
});
