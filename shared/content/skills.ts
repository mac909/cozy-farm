import type { BadgeId } from "./badges";
import type { FurnitureId } from "./furniture";
import type { ItemId } from "./items";
import type { Rarity } from "./rarity";

/**
 * Skills (Milestone 7): farming, fishing and foraging, each levelling up from 1 to 10 as you do
 * it, with a small perk at every level. Personal: each farmer has their own, and they're never
 * compared. Every number here is a first guess, meant to be tuned by playing
 * (docs/plans/progression.md, section 2.10).
 *
 * Saves hold each skill's total experience by skill id, so renaming a skill needs a save migration.
 * Changing the curve or the perks doesn't: levels are worked out from the experience.
 */

export type SkillId = "farming" | "fishing" | "foraging";

export const SKILL_IDS: readonly SkillId[] = ["farming", "fishing", "foraging"];

export function isSkillId(id: unknown): id is SkillId {
  return typeof id === "string" && (SKILL_IDS as readonly string[]).includes(id);
}

export const MAX_LEVEL = 10;

/**
 * The total experience it takes to reach each level: LEVEL_XP[level - 1]. Level 2 comes on the
 * first evening, then a level every session or two, slowing near the top.
 */
export const LEVEL_XP: readonly number[] = [0, 30, 90, 190, 340, 550, 830, 1190, 1640, 2190];

/** Experience for doing things. Farming: a pick gives its crop's watered days to ripen (radish 3 … pumpkin 8). */
export const XP = {
  /** A crop that regrew (strawberries, samphire) picked again. */
  regrownPick: 2,
  /** Landing a fish, by how rare it is. */
  fish: { common: 4, uncommon: 7, rare: 12 } satisfies Record<Rarity, number>,
  /** On top, for a bigger fish than ever (the book's record). */
  record: 3,
  /** One that got away after it was hooked: you learn from those too. */
  gotAway: 1,
  /** Picking up a beach find, by how rare it is. */
  find: { common: 3, uncommon: 5, rare: 10 } satisfies Record<Rarity, number>,
  /** Catching a bug, by how rare it is. */
  bug: { common: 3, uncommon: 5, rare: 10 } satisfies Record<Rarity, number>,
  /** Picking up driftwood or a branch. */
  material: 1,
} as const;

/** Every perk, by what it does. The rules check for these by id; the numbers are in PERK. */
export type PerkId =
  | "plantAndWater"
  | "littleExtra"
  | "keenGardener"
  | "seedSaver"
  | "goldenCan"
  | "bumperCrop"
  | "masterGardener"
  | "earlyRiser"
  | "goldenCrops"
  | "steadyHands"
  | "quickBites"
  | "keenAngler"
  | "bigOnes"
  | "lobsterPot"
  | "luckyLine"
  | "oldSalt"
  | "gentleReel"
  | "doubleCatch"
  | "brightEyes"
  | "lightStep"
  | "keenForager"
  | "extraTide"
  | "butterflyJar"
  | "armful"
  | "beachcomber"
  | "rockPoolLuck"
  | "bottles";

/** What each level brings. */
export interface PerkDef {
  readonly id: PerkId;
  readonly level: number;
  /** "Plant and water". */
  readonly name: string;
  /** What it does, as a sentence: "Planting waters the tile too." */
  readonly text: string;
  /** A title for the You card ("Keen Gardener"). */
  readonly title?: string;
  /** A decoration that comes to your bag (a straw hat). */
  readonly gift?: FurnitureId;
  /** A badge that comes with it (the top level's). */
  readonly badge?: BadgeId;
  /** Not in the game yet: it starts working when this does ("once the cove is open"). */
  readonly later?: string;
}

export interface SkillDef {
  readonly id: SkillId;
  /** "Farming". */
  readonly name: string;
  /** Its picture on the You card and the level-up card: an item's icon. */
  readonly icon: ItemId;
  /** The perk at each level from 2 to 10, in order. */
  readonly perks: readonly PerkDef[];
}

/** The numbers behind the perks. */
export const PERK = {
  /** A little extra: one more crop on this share of picks. */
  littleExtra: 1 / 10,
  /** Bumper crop: the same, more often (instead of A little extra). */
  bumperCrop: 1 / 6,
  /** Seed saver: a seed back on this share of picks. */
  seedSaver: 1 / 6,
  /** Golden crops: this share of picks is golden. */
  goldenCrops: 1 / 20,
  /** A golden crop sells for this many times its crop. */
  goldenPrice: 3,
  /** Steady hands: this much longer to hook a bite, in ms. */
  steadyHandsMs: 200,
  /** Quick bites: the wait for a bite is this much of what it was. */
  quickBites: 0.85,
  /** Big ones: fish come this much of their size range bigger (never past their biggest). */
  bigOnes: 0.12,
  /** Lucky line: rare fish bite this many times as often. */
  luckyLine: 1.5,
  /** Gentle reel: holding through a tug loses ground this much more slowly. */
  gentleReel: 1.5,
  /** Double catch: this share of catches is two fish. */
  doubleCatch: 1 / 8,
  /** Bright eyes: finds glint this many times as often. */
  brightEyes: 2,
  /** Light step: catch bugs from this many more tiles away. */
  lightStepTiles: 1,
  /** Extra tide: this many more finds wash up each morning while anyone has the perk. */
  extraTide: 1,
  /** Armful: this share of driftwood and branches picked up comes as two. */
  armful: 1 / 4,
} as const;

const farming: SkillDef = {
  id: "farming",
  name: "Farming",
  icon: "carrot",
  perks: [
    { id: "plantAndWater", level: 2, name: "Plant and water", text: "Planting waters the tile too." },
    { id: "littleExtra", level: 3, name: "A little extra", text: "1 in 10 picks gives one more." },
    { id: "keenGardener", level: 4, name: "Keen Gardener", text: "A title, and a straw hat for your house or farm.", title: "Keen Gardener", gift: "straw_hat" },
    { id: "seedSaver", level: 5, name: "Seed saver", text: "1 in 6 picks gives a seed back." },
    { id: "goldenCan", level: 6, name: "A golden can", text: "A golden watering-can planter for your house or farm.", gift: "golden_can" },
    { id: "bumperCrop", level: 7, name: "Bumper crop", text: "1 in 6 picks gives one more, instead of 1 in 10." },
    { id: "masterGardener", level: 8, name: "Master Gardener", text: "A title for the best gardener on the coast.", title: "Master Gardener" },
    { id: "earlyRiser", level: 9, name: "Early riser", text: "Crops you plant sprout a day sooner." },
    { id: "goldenCrops", level: 10, name: "Golden crops", text: "1 in 20 picks is golden, and sells for three times as much. And a badge.", badge: "top_of_the_crop" },
  ],
};

const fishing: SkillDef = {
  id: "fishing",
  name: "Fishing",
  icon: "fishing_rod",
  perks: [
    { id: "steadyHands", level: 2, name: "Steady hands", text: "A fifth of a second longer to hook a bite." },
    { id: "quickBites", level: 3, name: "Quick bites", text: "Bites come 15% sooner." },
    { id: "keenAngler", level: 4, name: "Keen Angler", text: "A title, and a mounted fish for your wall.", title: "Keen Angler", gift: "mounted_fish" },
    { id: "bigOnes", level: 5, name: "Big ones", text: "Fish come a little bigger." },
    { id: "lobsterPot", level: 6, name: "A lobster pot", text: "A lobster pot for your house or farm.", gift: "lobster_pot" },
    { id: "luckyLine", level: 7, name: "Lucky line", text: "Rare fish bite a bit more often." },
    { id: "oldSalt", level: 8, name: "Old Salt", text: "A title for someone the sea knows well.", title: "Old Salt" },
    { id: "gentleReel", level: 9, name: "Gentle reel", text: "Tugs pull back less." },
    { id: "doubleCatch", level: 10, name: "Double catch", text: "1 in 8 catches is two fish. And a badge.", badge: "sea_legend" },
  ],
};

const foraging: SkillDef = {
  id: "foraging",
  name: "Foraging",
  icon: "scallop_shell",
  perks: [
    { id: "brightEyes", level: 2, name: "Bright eyes", text: "Finds on the beach glint more often." },
    { id: "lightStep", level: 3, name: "Light step", text: "Catch bugs from a step further away." },
    { id: "keenForager", level: 4, name: "Keen Forager", text: "A title, and a shell wreath for your house or farm.", title: "Keen Forager", gift: "shell_wreath" },
    { id: "extraTide", level: 5, name: "Extra tide", text: "One more find washes up each morning, for both of you." },
    { id: "butterflyJar", level: 6, name: "A butterfly jar", text: "A butterfly jar for your house or farm.", gift: "butterfly_jar" },
    { id: "armful", level: 7, name: "Armful", text: "1 in 4 driftwood or branches comes as two." },
    { id: "beachcomber", level: 8, name: "Beachcomber", text: "A title for someone who knows every inch of the shore.", title: "Beachcomber" },
    {
      id: "rockPoolLuck",
      level: 9,
      name: "Rock-pool luck",
      text: "The rock pools' rarer creatures turn up more.",
      later: "once the cove is open",
    },
    {
      id: "bottles",
      level: 10,
      name: "Messages in bottles",
      text: "Now and then a message in a bottle washes up for you, with an old letter from the village. And a badge.",
      badge: "treasure_hunter",
      later: "once Marlow's workbench is open",
    },
  ],
};

export const SKILLS: Readonly<Record<SkillId, SkillDef>> = { farming, fishing, foraging };

/** Every perk, with its skill. */
export const PERKS: readonly (PerkDef & { readonly skill: SkillId })[] = SKILL_IDS.flatMap((skill) =>
  SKILLS[skill].perks.map((perk) => ({ ...perk, skill })),
);

/** A perk by id, with its skill. */
export function perkDef(id: PerkId): PerkDef & { readonly skill: SkillId } {
  const perk = PERKS.find((p) => p.id === id);
  if (!perk) throw new Error(`No perk ${id}`);
  return perk;
}
