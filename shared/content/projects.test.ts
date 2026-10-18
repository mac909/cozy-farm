import { describe, expect, it } from "vitest";
import { BEACH_FIND_IDS, BEACH_FINDS } from "./beachFinds";
import { CROPS } from "./crops";
import { FISH_IDS } from "./fish";
import { FORAGE, FORAGE_IDS } from "./forage";
import { ITEMS, isItemId, type ItemId } from "./items";
import { PROJECTS, PROJECT_IDS, needKey, type Need } from "./projects";
import { RARITY_WEIGHTS } from "./rarity";
import { SEED_STAND_STOCK } from "./seedStand";
import { BEACHCOMBING, MARLOWS_LUCK } from "../beachcombing/beachcombing";

const allSteps = PROJECT_IDS.flatMap((id) => PROJECTS[id].steps.map((step, i) => ({ project: id, i, step })));
const allNeeds = allSteps.flatMap(({ project, i, step }) => step.needs.map((need) => ({ where: `${project} step ${i + 1}`, need })));

/** Where an item comes from in the game today, or null if nowhere. */
function sourceOf(itemId: ItemId): string | null {
  const item = ITEMS[itemId];
  if (item.category === "crop") return (SEED_STAND_STOCK as readonly ItemId[]).includes(`${item.cropId}_seeds` as ItemId) ? "the seed stand" : null;
  if (item.category === "fish") return "fishing";
  if (item.category === "bug") return "the meadow";
  if (item.category === "beach") return "the tide";
  if (item.category === "material") return FORAGE_IDS.includes(itemId as (typeof FORAGE_IDS)[number]) ? "the ground" : null;
  if (item.buyPrice !== undefined) return "the store";
  return null;
}

describe("the projects", () => {
  it("each have three steps of two to four needs, with keys that don't repeat in a step", () => {
    for (const id of PROJECT_IDS) {
      expect(PROJECTS[id].id).toBe(id);
      expect(PROJECTS[id].steps).toHaveLength(3);
      for (const step of PROJECTS[id].steps) {
        expect(step.needs.length).toBeGreaterThanOrEqual(2);
        expect(step.needs.length).toBeLessThanOrEqual(4);
        const keys = step.needs.map(needKey);
        expect(new Set(keys).size).toBe(keys.length);
        expect(new Set(PROJECTS[id].steps.map((s) => s.id)).size).toBe(3);
      }
    }
  });

  it("only ask for things that exist and have somewhere to come from", () => {
    for (const { where, need } of allNeeds) {
      expect(need.count, where).toBeGreaterThan(0);
      if (need.kind !== "item") continue;
      expect(isItemId(need.itemId), `${where}: ${need.itemId}`).toBe(true);
      expect(sourceOf(need.itemId), `${where}: where does ${need.itemId} come from?`).not.toBeNull();
    }
  });

  it("never ask for anything seasonal, or a crop that takes more than 6 days", () => {
    for (const { where, need } of allNeeds) {
      if (need.kind !== "item") continue;
      const item = ITEMS[need.itemId];
      // Nothing in the game has a season yet; once something does, a step can't ask for it.
      expect("season" in item, `${where}: ${need.itemId} is seasonal`).toBe(false);
      if (item.category === "crop") {
        const crop = CROPS[item.cropId];
        expect((crop.stages - 1) * crop.daysPerStage, `${where}: ${crop.name} takes too long`).toBeLessThanOrEqual(6);
      }
    }
    // "Any crop" is fine as long as one quick crop is sold.
    const quick = Object.values(CROPS).some((crop) => (crop.stages - 1) * crop.daysPerStage <= 6);
    expect(quick).toBe(true);
  });

  it("ask for no more than two sea glass in a step before the cove", () => {
    for (const { where, need } of allNeeds) {
      if (need.kind === "item" && need.itemId === "sea_glass") expect(need.count, where).toBeLessThanOrEqual(2);
    }
  });
});

/**
 * Pacing (docs/plans/progression.md, section 3): each step's scarcest need takes about one session
 * (two of you, about 3 game days) of the steady supply. A test so later tuning can't make a step
 * grindy by accident.
 */
describe("pacing", () => {
  const DAYS_PER_SESSION = 3;
  const average = ({ min, max }: { min: number; max: number }) => (min + max) / 2;
  const findsPerSession = average(BEACHCOMBING.perMorning) * DAYS_PER_SESSION;
  const weights = BEACH_FIND_IDS.map((id) => RARITY_WEIGHTS[BEACH_FINDS[id].rarity]);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  /** About how many of a need turn up in a session. */
  function supply(need: Need): number {
    if (need.kind === "coins") return 1500;
    if (need.kind === "any") return { crop: 20, fish: 25, beach: findsPerSession, bug: 12 }[need.category];
    const item = ITEMS[need.itemId];
    if (item.category === "material") {
      const def = FORAGE[need.itemId as keyof typeof FORAGE];
      return average(def.perMorning) * DAYS_PER_SESSION;
    }
    if (item.category === "beach") {
      const weight = RARITY_WEIGHTS[BEACH_FINDS[need.itemId as keyof typeof BEACH_FINDS].rarity] * MARLOWS_LUCK;
      return findsPerSession * (weight / (totalWeight + weight / MARLOWS_LUCK));
    }
    if (item.category === "fish") return 25 / FISH_IDS.length;
    if (item.category === "crop") return 20;
    return 10;
  }

  it.each(allSteps.map(({ project, i, step }) => [`${project} step ${i + 1}`, step] as const))("%s fits in about a session or two", (_where, step) => {
    for (const need of step.needs) {
      expect(need.count / supply(need), `${needKey(need)}: ${need.count} needed`).toBeLessThanOrEqual(1.5);
    }
  });

  it("gives the first step enough on the morning Marlow arrives, from the storm", () => {
    const first = PROJECTS[PROJECT_IDS[0]].steps[0];
    for (const need of first.needs) {
      if (need.kind !== "item" || ITEMS[need.itemId].category !== "material") continue;
      expect(FORAGE[need.itemId as keyof typeof FORAGE].storm).toBeGreaterThanOrEqual(need.count);
    }
  });

});
