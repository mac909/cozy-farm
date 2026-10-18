import type { NeedKey } from "../content/projects";

/**
 * The village's shared progress, as plain data (Milestone 6): when Marlow arrived, and how far each
 * project has got. Unlocks aren't stored: what's built is worked out from this (built.ts), so
 * there's one truth and nothing to get out of step. The rules are in projects.ts.
 */

/** Who has given to a project: a farmer id (shared/world/world.ts). */
type FarmerId = string;

/** How far one project has got. */
export interface ProjectProgress {
  /** Steps whose needs are all in, 0 to the project's step count. */
  readonly gathered: number;
  /** Steps built. The night brings it up to `gathered`. */
  readonly built: number;
  /** What's been given towards the step being gathered, by need key ("driftwood", "any:fish", "coins"). */
  readonly given: Readonly<Record<NeedKey, number>>;
  /** Everyone who has given something, in the order they first did: the faces on its card. Never counts. */
  readonly helpers: readonly FarmerId[];
  /** The day it was finished (all steps built), or null. */
  readonly doneDay: number | null;
}

export interface Village {
  /** The day Marlow arrived; 0 before he has. */
  readonly keeperDay: number;
  /** Every project anyone has given to, by id. Missing: not started. */
  readonly projects: Readonly<Record<string, ProjectProgress>>;
}

/** A step built overnight: which project, and which step (counted from 0). */
export interface BuiltStep {
  readonly project: string;
  readonly step: number;
}

/** Before Marlow arrives: nothing started. */
export const EMPTY_VILLAGE: Village = { keeperDay: 0, projects: {} };

/** A project nobody has given to yet. */
export const NOT_STARTED: ProjectProgress = { gathered: 0, built: 0, given: {}, helpers: [], doneDay: null };
