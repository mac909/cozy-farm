import { describe, expect, it } from "vitest";
import { BADGE_IDS, BADGES } from "../content/badges";
import { FURNITURE, isGift } from "../content/furniture";
import { ITEMS, isItemId } from "../content/items";
import { LEVEL_XP, MAX_LEVEL, PERKS, SKILL_IDS, SKILLS, XP } from "../content/skills";
import { countOf, INVENTORY_SLOTS } from "../inventory/inventory";
import { addFarmer, newWorld, setFarmerBag, setFarmerProgress, type World } from "../world/world";
import { EMPTY_PROGRESS, hasPerk, levelBar, levelFor, levelOf, nextPerk, perksOf, titleOf, xpToday, type FarmerProgress } from "./farmerProgress";
import { addXp, giftsOwed, grantXp, handOverGifts, recordDeed, xpFor } from "./progress";

const PIP = "pip";
const JUNO = "juno";

function twoFarmers(): World {
  const world = addFarmer(addFarmer(newWorld(3), PIP, { name: "Pip", character: "woman" }), JUNO, { name: "Juno", character: "boy" });
  return { ...world, clock: { day: 6, minute: 600 } };
}

const withXp = (xp: Partial<FarmerProgress["xp"]>): FarmerProgress => ({ ...EMPTY_PROGRESS, xp: { ...EMPTY_PROGRESS.xp, ...xp } });
const fullBag = () => Array.from({ length: INVENTORY_SLOTS }, () => ({ itemId: "radish" as const, count: 99 }));

describe("the skills' data", () => {
  it("has a curve that only goes up, from level 1 at nothing to level 10", () => {
    expect(LEVEL_XP).toHaveLength(MAX_LEVEL);
    expect(LEVEL_XP[0]).toBe(0);
    for (let i = 1; i < LEVEL_XP.length; i++) expect(LEVEL_XP[i]).toBeGreaterThan(LEVEL_XP[i - 1]);
    // The plan's numbers: level 2 on the first evening, level 10 after a month or so.
    expect(LEVEL_XP.slice(1)).toEqual([30, 90, 190, 340, 550, 830, 1190, 1640, 2190]);
  });

  it("gives each skill a perk at every level from 2 to 10", () => {
    for (const skill of SKILL_IDS) {
      expect(SKILLS[skill].id).toBe(skill);
      expect(SKILLS[skill].perks.map((p) => p.level)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(isItemId(SKILLS[skill].icon)).toBe(true);
    }
    const ids = PERKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has titles at 4 and 8, gifts at 4 and 6 that the store never sells, and a badge at 10", () => {
    for (const skill of SKILL_IDS) {
      const at = (level: number) => SKILLS[skill].perks.find((p) => p.level === level)!;
      expect(at(4).title).toBeTruthy();
      expect(at(8).title).toBeTruthy();
      for (const level of [4, 6]) {
        const gift = at(level).gift!;
        expect(FURNITURE[gift].gift).toBe(true);
        expect(isGift(gift)).toBe(true);
        expect(ITEMS[gift].buyPrice).toBeUndefined();
      }
      expect(BADGE_IDS).toContain(at(10).badge);
    }
  });
});

describe("levels", () => {
  it("come at the curve's totals", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(29)).toBe(1);
    expect(levelFor(30)).toBe(2);
    expect(levelFor(89)).toBe(2);
    expect(levelFor(90)).toBe(3);
    expect(levelFor(2189)).toBe(9);
    expect(levelFor(2190)).toBe(10);
    expect(levelFor(99_999)).toBe(10);
  });

  it("fill a bar towards the next, full at the top", () => {
    expect(levelBar(60)).toEqual({ level: 2, fraction: 0.5, toNext: 30 });
    expect(levelBar(5000)).toEqual({ level: 10, fraction: 1, toNext: null });
  });

  it("bring their perks, the next one to look forward to, and a title", () => {
    const keen = withXp({ fishing: 200, farming: 40 });
    expect(levelOf(keen, "fishing")).toBe(4);
    expect(hasPerk(keen, "steadyHands")).toBe(true);
    expect(hasPerk(keen, "bigOnes")).toBe(false);
    expect(hasPerk(keen, "plantAndWater")).toBe(true);
    expect(hasPerk(undefined, "plantAndWater")).toBe(false);
    expect(perksOf(keen).map((p) => p.id)).toEqual(["plantAndWater", "steadyHands", "quickBites", "keenAngler"]);
    expect(nextPerk(keen, "fishing")?.id).toBe("bigOnes");
    expect(nextPerk(withXp({ fishing: 9999 }), "fishing")).toBeNull();
    expect(titleOf(EMPTY_PROGRESS)).toBeNull();
    expect(titleOf(keen)).toBe("Keen Angler");
    // A top title beats a keen one; between equals, the skill done most.
    expect(titleOf(withXp({ fishing: 200, foraging: 1200 }))).toBe("Beachcomber");
    expect(titleOf(withXp({ fishing: 200, farming: 250 }))).toBe("Keen Gardener");
  });
});

describe("experience", () => {
  it("is a crop's days to ripen, less for one that grew back, and nothing flying about", () => {
    expect(xpFor({ kind: "harvest", cropId: "radish", regrown: false })).toEqual({ skill: "farming", amount: 3 });
    expect(xpFor({ kind: "harvest", cropId: "pumpkin", regrown: false })).toEqual({ skill: "farming", amount: 8 });
    expect(xpFor({ kind: "harvest", cropId: "strawberry", regrown: true })).toEqual({ skill: "farming", amount: XP.regrownPick });
  });

  it("goes by how rare a fish, find or bug is, with a little for a record and one that got away", () => {
    expect(xpFor({ kind: "fish", fishId: "sardine", count: 1, record: false, minute: 600 })).toEqual({ skill: "fishing", amount: 4 });
    expect(xpFor({ kind: "fish", fishId: "moonfish", count: 1, record: true, minute: 600 })).toEqual({ skill: "fishing", amount: 12 + 3 });
    expect(xpFor({ kind: "gotAway" })).toEqual({ skill: "fishing", amount: 1 });
    expect(xpFor({ kind: "find", findId: "starfish" })).toEqual({ skill: "foraging", amount: 10 });
    expect(xpFor({ kind: "bug", bugId: "cabbage_white" })).toEqual({ skill: "foraging", amount: 3 });
    expect(xpFor({ kind: "material", itemId: "driftwood", count: 2 })).toEqual({ skill: "foraging", amount: 2 });
    expect(xpFor({ kind: "give", count: 10 })).toBeNull();
  });

  it("adds up, counts today's separately, and says which levels it reached", () => {
    const once = addXp(EMPTY_PROGRESS, "fishing", 25, 6);
    expect(once.levels).toEqual([]);
    const twice = addXp(once.progress, "fishing", 70, 6);
    expect(twice.levels).toEqual([2, 3]);
    expect(twice.progress.xp.fishing).toBe(95);
    expect(xpToday(twice.progress, 6)).toEqual({ farming: 0, fishing: 95, foraging: 0 });
    const tomorrow = addXp(twice.progress, "farming", 3, 7);
    expect(xpToday(tomorrow.progress, 7)).toEqual({ farming: 3, fishing: 0, foraging: 0 });
    expect(xpToday(tomorrow.progress, 8)).toEqual({ farming: 0, fishing: 0, foraging: 0 });
  });
});

describe("doing things", () => {
  it("counts them for the badges, and remembers each kind found", () => {
    let world = twoFarmers();
    world = recordDeed(world, PIP, { kind: "fish", fishId: "sardine", count: 2, record: false, minute: 23 * 60 }).world;
    world = recordDeed(world, PIP, { kind: "fish", fishId: "sardine", count: 1, record: true, minute: 600 }).world;
    world = recordDeed(world, PIP, { kind: "give", count: 7 }).world;
    world = recordDeed(world, PIP, { kind: "night", together: true, sleepover: false }).world;
    const progress = world.farmers[PIP].progress;
    expect(progress.stats).toEqual({ fish: 3, nightFish: 2, records: 1, given: 7, nightsTogether: 1 });
    expect(progress.kinds).toEqual(["sardine"]);
    expect(progress.xp.fishing).toBe(4 + 4 + 3);
    // Only Pip's: the other farmer's never change.
    expect(world.farmers[JUNO].progress).toEqual(EMPTY_PROGRESS);
  });

  it("tells the farmer about a level, then any badge it brought", () => {
    let world = setFarmerProgress(twoFarmers(), PIP, withXp({ farming: 27 }));
    const { world: after, events } = recordDeed(world, PIP, { kind: "harvest", cropId: "radish", regrown: false });
    expect(events).toEqual([
      { type: "levelUp", skill: "farming", level: 2 },
      { type: "badge", badge: "first_harvest" },
    ]);
    expect(after.farmers[PIP].progress.badges.first_harvest).toBe(6);
    world = after;
    // The badge comes once.
    expect(recordDeed(world, PIP, { kind: "harvest", cropId: "radish", regrown: false }).events).toEqual([]);
  });

  it("does nothing for someone who isn't a farmer", () => {
    const world = twoFarmers();
    expect(recordDeed(world, "nobody", { kind: "placed" })).toEqual({ world, events: [] });
  });
});

describe("a level's gift", () => {
  it("goes into the bag when the level comes", () => {
    const world = setFarmerProgress(twoFarmers(), PIP, withXp({ fishing: 189 }));
    const { world: after, events } = recordDeed(world, PIP, { kind: "fish", fishId: "sardine", count: 1, record: false, minute: 600 });
    expect(events).toContainEqual({ type: "levelUp", skill: "fishing", level: 4 });
    expect(events).toContainEqual({ type: "gift", itemId: "mounted_fish" });
    expect(countOf(after.farmers[PIP].bag, "mounted_fish")).toBe(1);
    expect(after.farmers[PIP].progress.gifts).toEqual(["mounted_fish"]);
    expect(giftsOwed(after.farmers[PIP].progress)).toEqual([]);
  });

  it("waits for room in a full bag, says so once, and comes as soon as there's room", () => {
    const world = setFarmerBag(setFarmerProgress(twoFarmers(), PIP, withXp({ fishing: 189 })), PIP, fullBag());
    const first = recordDeed(world, PIP, { kind: "gotAway" });
    expect(first.events).toEqual([
      { type: "levelUp", skill: "fishing", level: 4 },
      { type: "giftWaiting", itemId: "mounted_fish" },
    ]);
    expect(giftsOwed(first.world.farmers[PIP].progress)).toEqual(["mounted_fish"]);
    // Still full: nothing more said.
    expect(recordDeed(first.world, PIP, { kind: "gotAway" }).events).toEqual([]);
    // Room now: it comes with the next thing done, or when they join.
    const roomy = setFarmerBag(first.world, PIP, fullBag().map((slot, i) => (i === 3 ? null : slot)));
    const handed = handOverGifts(roomy, PIP);
    expect(handed.given).toEqual(["mounted_fish"]);
    expect(handed.world.farmers[PIP].bag[3]).toEqual({ itemId: "mounted_fish", count: 1 });
    expect(handOverGifts(handed.world, PIP).given).toEqual([]);
  });

  it("comes for every level passed at once (the dev command), with its badge at the top", () => {
    const { world, events } = grantXp(twoFarmers(), JUNO, "foraging", 5000);
    expect(events.filter((e) => e.type === "levelUp").map((e) => e.type === "levelUp" && e.level)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(events).toContainEqual({ type: "gift", itemId: "shell_wreath" });
    expect(events).toContainEqual({ type: "gift", itemId: "butterfly_jar" });
    expect(events).toContainEqual({ type: "badge", badge: "treasure_hunter" });
    expect(world.farmers[JUNO].progress.badges.treasure_hunter).toBe(6);
  });
});

describe("badge data", () => {
  it("names every badge, with a hint for its silhouette and a picture", () => {
    for (const id of BADGE_IDS) {
      const badge = BADGES[id];
      expect(badge.id).toBe(id);
      expect(badge.name).not.toBe("");
      expect(badge.hint).not.toBe("");
      if ("item" in badge.icon) expect(isItemId(badge.icon.item), `${id}: ${badge.icon.item}`).toBe(true);
    }
  });
});
