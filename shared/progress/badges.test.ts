import { describe, expect, it } from "vitest";
import { BADGE_COUNTS, BADGE_IDS } from "../content/badges";
import { BEACH_FIND_IDS } from "../content/beachFinds";
import { BUG_IDS } from "../content/bugs";
import { FISH_IDS } from "../content/fish";
import { CROPS } from "../content/crops";
import type { CollectionBook } from "../collection/collection";
import { addFarmer, newWorld, setFarmerProgress, type World } from "../world/world";
import { awardBadges, awardEveryone, badgeCount, badgeProgress, badgesDue, BADGE_RULE_IDS } from "./badges";
import { EMPTY_PROGRESS, type FarmerProgress } from "./farmerProgress";

const PIP = "pip";
const JUNO = "juno";

function twoFarmers(): World {
  const world = addFarmer(addFarmer(newWorld(3), PIP, { name: "Pip", character: "woman" }), JUNO, { name: "Juno", character: "boy" });
  return { ...world, clock: { day: 9, minute: 600 } };
}

const progress = (part: Partial<FarmerProgress>): FarmerProgress => ({ ...EMPTY_PROGRESS, ...part });

/** The lighthouse lit (finished on day 8, so lit from 6 pm that day). */
const LIT = { keeperDay: 2, projects: { lighthouse: { gathered: 3, built: 3, given: {}, helpers: [PIP], doneDay: 8 } } };

describe("badges", () => {
  it("each have a rule", () => {
    expect([...BADGE_RULE_IDS].sort()).toEqual([...BADGE_IDS].sort());
  });

  it("start with none, and none due, for someone who's done nothing", () => {
    expect(badgesDue(twoFarmers(), PIP)).toEqual([]);
    expect(badgeCount(EMPTY_PROGRESS)).toEqual({ earned: 0, total: BADGE_IDS.length });
  });

  it("come from the counts, at the counts the data says", () => {
    const world = setFarmerProgress(twoFarmers(), PIP, progress({ stats: { fish: BADGE_COUNTS.angler, crops: 1, given: 24, materials: 50 } }));
    const due = badgesDue(world, PIP);
    expect(due).toContain("first_catch");
    expect(due).toContain("angler");
    expect(due).not.toContain("old_salt");
    expect(due).toContain("first_harvest");
    expect(due).not.toContain("helping_hand");
    expect(due).toContain("kindling");
  });

  it("want one of every crop, beach find or bug for the 'every' ones", () => {
    const allButOne = progress({ kinds: [...Object.keys(CROPS), ...BEACH_FIND_IDS.slice(1), ...BUG_IDS] as FarmerProgress["kinds"] });
    const due = badgesDue(setFarmerProgress(twoFarmers(), PIP, allButOne), PIP);
    expect(due).toContain("every_crop");
    expect(due).toContain("butterfly_friend");
    expect(due).not.toContain("shell_seeker");
    expect(badgeProgress(allButOne, "shell_seeker")).toEqual({ have: BEACH_FIND_IDS.length - 1, need: BEACH_FIND_IDS.length });
  });

  it("follow from the world: a cottage of your own, the lighthouse lit, a porch built", () => {
    let world: World = { ...twoFarmers(), houses: { house1: { owner: PIP, furniture: [] } }, village: LIT };
    expect(badgesDue(world, PIP)).toEqual(["lamplighter", "moved_in"]);
    // The lighthouse is everyone's; Juno has no cottage yet.
    expect(badgesDue(world, JUNO)).toEqual(["lamplighter"]);
    world = { ...world, village: { ...LIT, projects: { ...LIT.projects, "house1:porch": { gathered: 1, built: 1, given: {}, helpers: [JUNO], doneDay: 9 } } } };
    // Built by Juno too, but the badge is for whoever lives there.
    expect(badgesDue(world, PIP)).toContain("porch_sitter");
    expect(badgesDue(world, JUNO)).not.toContain("porch_sitter");
  });

  it("aren't given for the lighthouse before the lamp is lit at dusk", () => {
    const world: World = { ...twoFarmers(), clock: { day: 8, minute: 17 * 60 }, village: LIT };
    expect(badgesDue(world, PIP)).toEqual([]);
    expect(badgesDue({ ...world, clock: { day: 8, minute: 18 * 60 } }, PIP)).toEqual(["lamplighter"]);
  });

  it("give Full Book to everyone when the shared book is full", () => {
    const entry = { firstDay: 1, firstBy: "Pip" };
    const book: CollectionBook = {
      fish: Object.fromEntries(FISH_IDS.map((id) => [id, { caught: 1, ...entry, biggestCm: 10, biggestBy: "Pip" }])),
      finds: Object.fromEntries(BEACH_FIND_IDS.map((id) => [id, { found: 1, ...entry }])),
      bugs: Object.fromEntries(BUG_IDS.map((id) => [id, { caught: 1, ...entry }])),
    };
    const world = { ...twoFarmers(), book };
    expect(badgesDue(world, PIP)).toContain("full_book");
    expect(badgesDue(world, JUNO)).toContain("full_book");
  });

  it("are given with the day, once, and never taken away", () => {
    const world: World = { ...twoFarmers(), houses: { house2: { owner: JUNO, furniture: [] } } };
    const first = awardBadges(world, JUNO);
    expect(first.badges).toEqual(["moved_in"]);
    expect(first.world.farmers[JUNO].progress.badges).toEqual({ moved_in: 9 });
    expect(awardBadges(first.world, JUNO)).toEqual({ world: first.world, badges: [] });
    // Even if the reason went away (it can't today), the badge stays.
    const moved = awardBadges({ ...first.world, houses: {} }, JUNO);
    expect(moved.world.farmers[JUNO].progress.badges.moved_in).toBe(9);
  });

  it("go to everyone at once when the village earns them", () => {
    const world: World = { ...twoFarmers(), village: LIT };
    const { world: after, awarded } = awardEveryone(world);
    expect(awarded).toEqual({ [PIP]: ["lamplighter"], [JUNO]: ["lamplighter"] });
    expect(after.farmers[JUNO].progress.badges.lamplighter).toBe(9);
    expect(awardEveryone(after).awarded).toEqual({});
  });

  it("show how far along the counted ones are", () => {
    const some = progress({ stats: { fish: 32, nightsTogether: 12 } });
    expect(badgeProgress(some, "angler")).toEqual({ have: 32, need: 50 });
    expect(badgeProgress(some, "side_by_side")).toEqual({ have: 10, need: 10 });
    expect(badgeProgress(some, "lamplighter")).toBeNull();
    expect(badgeCount(progress({ badges: { angler: 3, moved_in: 2 } }))).toEqual({ earned: 2, total: BADGE_IDS.length });
  });
});
