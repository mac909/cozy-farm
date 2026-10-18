import type { ItemCategory, ItemId } from "./items";

/**
 * The village's projects: big shared goals in three steps, given to at the Village Board and built
 * overnight (docs/plans/progression.md). Each step asks for two to four things ("needs"): a
 * particular item, any item of a kind, or coins. Never anything seasonal, or a crop slower than 6
 * days (projects.test.ts checks). Every number here is a first guess, meant to be tuned by playing.
 *
 * Saves hold project ids and how much of each need has been given (by need key, see needKey), so
 * renaming a project or a step's item needs a save migration. Changing amounts doesn't: saves are
 * kept within today's numbers when they load.
 */

/** The kinds of thing a need can take "any of": crops, fish, beach finds or bugs. */
export type AnyKind = Extract<ItemCategory, "crop" | "fish" | "beach" | "bug">;

/** One thing a step asks for, and how many. */
export type Need =
  | { readonly kind: "item"; readonly itemId: ItemId; readonly count: number }
  | { readonly kind: "any"; readonly category: AnyKind; readonly count: number }
  | { readonly kind: "coins"; readonly count: number };

/** A need's key in a save and in messages: the item id, "any:fish", or "coins". */
export type NeedKey = string;

export function needKey(need: Need): NeedKey {
  switch (need.kind) {
    case "item":
      return need.itemId;
    case "any":
      return `any:${need.category}`;
    case "coins":
      return "coins";
  }
}

export interface StepDef {
  /** Its part of the built name: "path" makes "lighthouse/path" (layers and objects in Tiled use these). */
  readonly id: string;
  /** "Clear the path to the point". */
  readonly name: string;
  /** Marlow's line on the project card, which explains the odd asks. */
  readonly blurb: string;
  readonly needs: readonly Need[];
  /** The cheer when its last thing goes in: "That's everything for the path!" */
  readonly cheer: string;
  /** And who sees to it: "Marlow will clear it tonight." */
  readonly tonight: string;
  /** The morning card's "In the village" line once it's built. */
  readonly builtLine: string;
  /** Marlow's note once it's built: kept with his others on the board. */
  readonly note: string;
}

export interface ProjectDef {
  readonly id: string;
  /** "Light the lighthouse". */
  readonly name: string;
  /** What it's for, to start a sentence: "The lighthouse needs 3 more". */
  readonly shortName: string;
  /** Marlow's line at the top of the board while it's open. */
  readonly boardLine: string;
  readonly steps: readonly StepDef[];
  /** What finishing it brings, for the card's "When it's done". */
  readonly opens: readonly string[];
  /** The opening card. */
  readonly opening: { readonly title: string; readonly note: string };
  /** "Lit on day 16" on the board's Finished list. */
  readonly finishedWord: string;
  /**
   * Built overnight like the rest, but it opens at this minute of the day it's finished (the lamp is
   * lit at dusk), not in the morning. Missing: it opens with the morning.
   */
  readonly opensAtMinute?: number;
}

const lighthouse: ProjectDef = {
  id: "lighthouse",
  name: "Light the lighthouse",
  shortName: "The lighthouse",
  boardLine: "The light first, I think. Boats like to know where home is.",
  steps: [
    {
      id: "path",
      name: "Clear the path to the point",
      blurb: "Brambles have grown right over the old path. Wood for some new steps, and a few coins for a good pair of shears.",
      needs: [
        { kind: "item", itemId: "driftwood", count: 10 },
        { kind: "item", itemId: "branch", count: 6 },
        { kind: "coins", count: 300 },
      ],
      cheer: "That's everything for the path!",
      tonight: "Marlow will clear it tonight.",
      builtLine: "The brambles are gone: the path to the point is open.",
      note: "There's the old path. My knees thank you both.",
    },
    {
      id: "stairs",
      name: "Mend the stairs",
      blurb: "Ninety-two steps, and half of them rotten. Bring me some fish and I'll work all day.",
      needs: [
        { kind: "item", itemId: "driftwood", count: 12 },
        { kind: "item", itemId: "branch", count: 8 },
        { kind: "any", category: "fish", count: 5 },
        { kind: "coins", count: 600 },
      ],
      cheer: "That's everything for the stairs!",
      tonight: "Marlow will see to them tonight.",
      builtLine: "The lighthouse stairs are mended.",
      note: "Ninety-two steps and not a creak in them. And thank you for the fish. I haven't eaten that well in years.",
    },
    {
      id: "lamp",
      name: "Light the lamp",
      blurb: "Sea glass to patch the lens. The trader up the coast swaps lamp oil for good vegetables.",
      needs: [
        { kind: "item", itemId: "sea_glass", count: 2 },
        { kind: "any", category: "beach", count: 4 },
        { kind: "any", category: "crop", count: 6 },
        { kind: "coins", count: 900 },
      ],
      cheer: "That's everything for the lamp!",
      tonight: "Marlow will get it ready tonight.",
      builtLine: "The lens is patched and the oil's in. Marlow will light the lamp at dusk.",
      note: "She's ready. I'll light her at dusk, and I'd like you both there.",
    },
  ],
  opens: ["The light shines every night", "Fish bite at the point after dark", "Climb up for the view"],
  opening: { title: "The lighthouse is lit!", note: "There she is. Every boat from here to the horizon can see we're home." },
  finishedWord: "Lit",
  opensAtMinute: 18 * 60,
};

/** Every project, in the order they go up on the board: one at a time, the next the morning after the last one opens. */
export const PROJECTS: Readonly<Record<string, ProjectDef>> = { lighthouse };

export const PROJECT_IDS: readonly string[] = Object.keys(PROJECTS);

/** True if `id` names a project. Use it to check ids from saves and client messages. */
export function isProjectId(id: unknown): id is string {
  return typeof id === "string" && Object.hasOwn(PROJECTS, id);
}

/** A step's built name, as Tiled layers and objects use it: "lighthouse/path". */
export function stepName(project: ProjectDef, step: number): string {
  return `${project.id}/${project.steps[step].id}`;
}
