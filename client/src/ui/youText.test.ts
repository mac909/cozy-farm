import { describe, expect, it } from "vitest";
import { BADGE_IDS } from "../../../shared/content/badges";
import { EMPTY_PROGRESS, type FarmerProgress } from "../../../shared/progress/farmerProgress";
import { badgeCells, perkLines, progressCards, seenNow, skillRows, somethingNew, youSubtitle } from "./youText";

const progress = (part: Partial<FarmerProgress>): FarmerProgress => ({ ...EMPTY_PROGRESS, ...part });

describe("the You card's skills", () => {
  it("starts everyone at level 1, with the first perk to look forward to", () => {
    const rows = skillRows(EMPTY_PROGRESS, 3);
    expect(rows.map((r) => [r.name, r.level, r.today])).toEqual([
      ["Farming", 1, null],
      ["Fishing", 1, null],
      ["Foraging", 1, null],
    ]);
    expect(rows[0].next).toEqual({ name: "Plant and water", text: "planting waters the tile too." });
    expect(perkLines(EMPTY_PROGRESS)).toEqual([]);
    expect(youSubtitle(EMPTY_PROGRESS, "skills")).toBe("Level 1 in everything, to begin with");
    expect(youSubtitle(EMPTY_PROGRESS, "badges")).toBe(`0 of ${BADGE_IDS.length} badges`);
  });

  it("shows each bar, today's experience, the title and what's next", () => {
    const keen = progress({ xp: { farming: 60, fishing: 200, foraging: 0 }, today: { day: 5, xp: { farming: 0, fishing: 48, foraging: 0 } } });
    const [farming, fishing] = skillRows(keen, 5);
    expect(farming).toMatchObject({ level: 2, fraction: 0.5, today: null });
    expect(fishing).toMatchObject({ level: 4, today: "+48 today", title: "Keen Angler", next: { name: "Big ones" } });
    // Tomorrow, nothing today yet.
    expect(skillRows(keen, 6)[1].today).toBeNull();
    expect(youSubtitle(keen, "skills")).toBe("Keen Angler");
    expect(youSubtitle(progress({ xp: { farming: 95, fishing: 0, foraging: 0 } }), "skills")).toBe("Your first title comes at level 4");
    expect(skillRows(progress({ xp: { farming: 0, fishing: 95, foraging: 0 } }), 5)[1].next?.text).toBe("a title, and a mounted fish for your wall.");
    expect(perkLines(keen).map((p) => p.name)).toEqual(["Plant and water", "Steady hands", "Quick bites"]);
  });

  it("says when a perk only starts later", () => {
    const top = progress({ xp: { farming: 0, fishing: 0, foraging: 9999 } });
    expect(perkLines(top).find((p) => p.name === "Rock-pool luck")?.text).toContain("once the cove is open");
    expect(skillRows(top, 1)[2].next).toBeNull();
  });
});

describe("the You card's badges", () => {
  it("shows earned ones by name with their day, the rest by their hint and how far along", () => {
    const some = progress({ stats: { fish: 32 }, badges: { first_catch: 3 } });
    const cells = badgeCells(some);
    expect(cells).toHaveLength(BADGE_IDS.length);
    expect(cells[0].id).toBe("first_catch");
    expect(cells.slice(1).every((c) => !c.earned)).toBe(true);
    expect(cells.find((c) => c.id === "first_catch")).toMatchObject({ earned: true, label: "First Catch", info: "A fish. Earned on day 3." });
    expect(cells.find((c) => c.id === "angler")).toMatchObject({ earned: false, label: "50 fish", info: "50 fish. 32 of 50 so far." });
    expect(cells.find((c) => c.id === "lamplighter")?.info).toContain("Everyone gets this one together");
  });
});

describe("the small cards on your own screen", () => {
  it("say the level and its perk, folding in a gift", () => {
    expect(
      progressCards([
        { type: "levelUp", skill: "fishing", level: 3 },
        { type: "levelUp", skill: "fishing", level: 4 },
        { type: "gift", itemId: "mounted_fish" },
        { type: "badge", badge: "first_catch" },
      ]).map((c) => [c.title, c.line, c.tab]),
    ).toEqual([
      ["Fishing level 3", "Quick bites. Bites come 15% sooner.", "skills"],
      ["Fishing level 4", "Keen Angler. A title, and a mounted fish for your wall. The mounted fish is in your bag.", "skills"],
      ["New badge: First Catch", "A fish.", "badges"],
    ]);
  });

  it("say a gift is waiting for room, and when it comes later", () => {
    expect(progressCards([{ type: "levelUp", skill: "farming", level: 4 }, { type: "giftWaiting", itemId: "straw_hat" }])[0].line).toContain(
      "Make room in your bag for the straw hat.",
    );
    expect(progressCards([{ type: "gift", itemId: "straw_hat" }])).toMatchObject([{ title: "A straw hat for you", big: false }]);
  });
});

describe("the gold dot", () => {
  it("shows for a level or a badge this device hasn't shown, and goes once it has", () => {
    const now = progress({ xp: { farming: 35, fishing: 0, foraging: 0 }, badges: { moved_in: 2 } });
    expect(somethingNew(now, { levels: {}, badges: [] })).toBe(true);
    expect(somethingNew(now, seenNow(now))).toBe(false);
    expect(somethingNew(progress({ badges: { moved_in: 2, lamplighter: 3 } }), seenNow(now))).toBe(true);
    expect(somethingNew(EMPTY_PROGRESS, { levels: {}, badges: [] })).toBe(false);
  });
});
