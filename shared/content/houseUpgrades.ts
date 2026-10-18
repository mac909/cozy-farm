import type { ItemId } from "./items";
import type { Need } from "./projects";

/**
 * House upgrades (Milestone 7 on): things built onto each cottage, given to at the Village Board's
 * "Your home" tab and built overnight, by the same rules as the village's projects. Anyone can give
 * to either house: helping build your partner's porch is the point. Each is a one-step project
 * per cottage, its id "<house>:<upgrade>" ("house1:porch"), and each waits for something in the
 * village to be built first. Every number here is a first guess, meant to be tuned by playing
 * (docs/plans/progression.md, section 2.8).
 *
 * Saves hold upgrade ids as part of project ids, so renaming one needs a save migration. Lines say
 * `{owner}` where the cottage's owner's name goes ("Pip's porch").
 */
export interface HouseUpgradeDef {
  readonly id: string;
  /** "A porch", on the Your home tab. */
  readonly name: string;
  /** For a sentence: "Pip's porch", "The porch needs 3 more". */
  readonly noun: string;
  /** The built name it waits for ("lighthouse"): it goes up on the board once that's built. */
  readonly after: string;
  /** Under its silhouette until then: "After the lighthouse". */
  readonly afterHint: string;
  /** Marlow's line at the top of the Your home tab while it's up. */
  readonly boardLine: string;
  /** Marlow's line on its card, which explains the asks. */
  readonly blurb: string;
  readonly needs: readonly Need[];
  /** The cheer on both screens when its last thing goes in: "That's everything for Pip's porch!" */
  readonly cheer: string;
  /** "Marlow will build it tonight." */
  readonly tonight: string;
  /** The morning card's "In the village" line: "Pip's cottage has a porch now." */
  readonly builtLine: string;
  /** Marlow's note once it's built, kept with his others. */
  readonly note: string;
  /** What it brings, for the card's "When it's done". */
  readonly opens: readonly string[];
}

const porch: HouseUpgradeDef = {
  id: "porch",
  name: "A porch",
  noun: "porch",
  after: "lighthouse",
  afterHint: "After the lighthouse",
  boardLine: "A cottage isn't a home without a porch. Shall we build you one each?",
  blurb: "Good planks for the boards, branches for the bench, and the coins for a proper lantern.",
  needs: [
    { kind: "item", itemId: "driftwood", count: 12 },
    { kind: "item", itemId: "branch", count: 8 },
    { kind: "coins", count: 2000 },
  ],
  cheer: "That's everything for {owner}'s porch!",
  tonight: "Marlow will build it tonight.",
  builtLine: "{owner}'s cottage has a porch now.",
  note: "A porch! Somewhere to sit and watch the boats come in.",
  opens: ["A wooden porch before the door", "A bench to sit on", "A lantern that lights at dusk"],
};

/** Every upgrade there is so far, in the order the Your home tab lists them. */
export const HOUSE_UPGRADES: Readonly<Record<string, HouseUpgradeDef>> = { porch };

export const HOUSE_UPGRADE_IDS: readonly string[] = Object.keys(HOUSE_UPGRADES);

/**
 * The upgrades still to come in later milestones, shown faded on the Your home tab with when
 * they'll come, so there's something to look forward to. Each moves into HOUSE_UPGRADES (with its
 * needs) in its milestone.
 */
export const LATER_UPGRADES: readonly { readonly name: string; readonly afterHint: string; readonly icon: ItemId }[] = [
  { name: "A garden", afterHint: "After the garden shop", icon: "sunflower" },
  { name: "A bedroom", afterHint: "After the bridge", icon: "red_bed" },
  { name: "A kitchen", afterHint: "After the café", icon: "clay_pot" },
  { name: "A loft", afterHint: "After the tailor's", icon: "wide_shelf" },
];

/** A line about a cottage, with its owner's name in it. */
export function ownerWords(line: string, owner: string): string {
  return line.replaceAll("{owner}", owner || "Someone");
}
