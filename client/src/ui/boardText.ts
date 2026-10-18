import { FORAGE, isForageId } from "../../../shared/content/forage";
import { ITEMS, pluralName, type ItemId } from "../../../shared/content/items";
import { FIRST_NOTE, KEEPER_NAME, NEXT_PLAN_LINE, keeperWords } from "../../../shared/content/keeper";
import { PROJECTS, PROJECT_IDS, stepName, type AnyKind, type Need, type ProjectDef } from "../../../shared/content/projects";
import type { Inventory } from "../../../shared/inventory/inventory";
import type { HelperView } from "../../../shared/stateSync";
import type { GameClock } from "../../../shared/time/clock";
import { builtThings } from "../../../shared/village/built";
import { canGive, finishedProjects, givingStep, isFinished, needsOf, openProjects, progressOf } from "../../../shared/village/projects";
import type { Village } from "../../../shared/village/village";

/**
 * The words on the Village Board's cards (Milestone 6): the board (what's up now, what's finished,
 * Marlow's notes) and a project's card (the step being gathered, each need, who's helping, what's
 * next). Faces only for who helped, never counts. Also Marlow's notes, to read again.
 */

/** Everything the board's words are made from. */
export interface BoardState {
  village: Village;
  helpers: Readonly<Record<string, readonly HelperView[]>>;
  clock: GameClock;
}

/** A project on the board's "Now" list. */
export interface ProjectRow {
  id: string;
  name: string;
  /** "Step 2 of 3 · Mend the stairs". */
  step: string;
  /** How much of the step is in, 0 to 1. */
  progress: number;
  /** All in, waiting for the night: "Marlow's seeing to it tonight." Null otherwise. */
  waiting: string | null;
  faces: readonly HelperView[];
}

export interface BoardWords {
  /** Marlow's line at the top. */
  line: string;
  now: ProjectRow[];
  /** Finished projects: "Light the lighthouse", "Lit on day 16". */
  finished: { id: string; name: string; when: string }[];
  /** How many notes he's written. */
  notes: number;
}

/** How much of a step is in, counting coins as one need like the rest. */
function stepProgress(project: ProjectDef, village: Village, step: number): number {
  const views = needsOf(project, progressOf(village, project.id), step);
  return views.reduce((sum, v) => sum + v.given / v.need.count, 0) / views.length;
}

export function boardWords({ village, helpers, clock }: BoardState): BoardWords {
  const open = openProjects({ village, clock });
  const built = builtThings({ village, clock });
  // Built, but waiting for its moment (the lamp is lit at dusk): still "now", not finished yet.
  const opening = finishedProjects(village).filter((project) => !built.has(project.id));
  const now = [...open, ...opening].map((project): ProjectRow => {
    const progress = progressOf(village, project.id);
    const giving = givingStep(project, progress);
    const step = giving ?? Math.min(progress.gathered, project.steps.length) - 1;
    const waiting = opening.includes(project) ? project.steps[step].builtLine : giving === null ? "All in! Marlow's seeing to it tonight." : null;
    return {
      id: project.id,
      name: project.name,
      step: `Step ${step + 1} of ${project.steps.length} · ${project.steps[step].name}`,
      progress: giving === null ? 1 : stepProgress(project, village, giving),
      waiting,
      faces: helpers[project.id] ?? [],
    };
  });
  const finished = finishedProjects(village)
    .filter((project) => built.has(project.id))
    .map((project) => {
      const day = progressOf(village, project.id).doneDay;
      return { id: project.id, name: project.name, when: day ? `${project.finishedWord} on day ${day}` : project.finishedWord };
    });
  const line = open[0]?.boardLine ?? (opening.length > 0 ? opening[0].steps.at(-1)!.note : NEXT_PLAN_LINE);
  return { line: keeperWords(line), now, finished, notes: keeperNotes(village, clock).length };
}

/** A need's name: "Driftwood", "Branches", "Any fish", "Coins". */
export function needName(need: Need): string {
  if (need.kind === "item") return pluralName(need.itemId);
  if (need.kind === "coins") return "Coins";
  return ANY_NAME[need.category];
}

const ANY_NAME: Readonly<Record<AnyKind, string>> = { fish: "Any fish", crop: "Any crop", beach: "Any beach find", bug: "Any bug" };
/** "6 crops", "4 beach finds" for the next step's line. */
const ANY_COUNTED: Readonly<Record<AnyKind, [string, string]>> = {
  fish: ["fish", "fish"],
  crop: ["crop", "crops"],
  beach: ["beach find", "beach finds"],
  bug: ["bug", "bugs"],
};
/** The picture for "any of a kind". */
const ANY_ICON: Readonly<Record<AnyKind, ItemId>> = { fish: "sardine", crop: "radish", beach: "scallop_shell", bug: "cabbage_white" };
const ANY_HINT: Readonly<Record<AnyKind, string>> = {
  fish: "Bites off the dock, the shore and the end of the dock",
  crop: "Grows in the farm field",
  beach: "Washes up on the beach each morning",
  bug: "Flutters about the meadow",
};

/** A need's picture: an item, or null for coins. */
export function needIcon(need: Need): ItemId | null {
  if (need.kind === "item") return need.itemId;
  if (need.kind === "any") return ANY_ICON[need.category];
  return null;
}

/** Where to find a need, for when you have none. */
export function needHint(need: Need): string {
  if (need.kind === "coins") return "From the shared wallet";
  if (need.kind === "any") return ANY_HINT[need.category];
  const item = ITEMS[need.itemId];
  if (isForageId(need.itemId)) return FORAGE[need.itemId].hint;
  if (item.category === "beach") return "Washes up on the beach some mornings";
  if (item.category === "fish") return "Bites somewhere off the shore";
  if (item.category === "crop") return "Grows in the farm field";
  return "";
}

/** "10 Driftwood", "5 fish", "900 coins". */
export function needCount(need: Need): string {
  if (need.kind === "coins") return `${need.count.toLocaleString("en-GB")} coins`;
  if (need.kind === "any") return `${need.count} ${ANY_COUNTED[need.category][need.count === 1 ? 0 : 1]}`;
  return `${need.count} ${need.count === 1 ? ITEMS[need.itemId].name : pluralName(need.itemId)}`;
}

/** One need on a project card. */
export interface NeedRow {
  key: string;
  name: string;
  icon: ItemId | null;
  coins: boolean;
  given: number;
  count: number;
  done: boolean;
  /** "You have 6", "Wallet 1,240", "All in", or where to find it. */
  sub: string;
  /** How many the Give button gives (0: no button). */
  give: number;
}

export interface ProjectCard {
  id: string;
  name: string;
  /** Step being gathered (or just gathered), counted from 0; null once the project is finished. */
  step: number | null;
  steps: number;
  stepName: string;
  blurb: string;
  needs: NeedRow[];
  /** All in, waiting for the night. */
  waiting: string | null;
  /** Any item need the bag could give to ("Give everything I can"). */
  canGiveAll: boolean;
  faces: readonly HelperView[];
  next: { name: string; needs: string } | null;
  opens: readonly string[];
}

/** A project's card, for someone with `bag` and the shared `coins`. */
export function projectCard(projectId: string, state: BoardState, bag: Inventory | null, coins: number | null): ProjectCard | null {
  const project = PROJECTS[projectId];
  if (!project) return null;
  const progress = progressOf(state.village, projectId);
  const giving = givingStep(project, progress);
  const finished = isFinished(project, progress);
  const step = finished ? null : (giving ?? progress.gathered - 1);
  const shown = step ?? project.steps.length - 1;
  const needs = needsOf(project, progress, shown).map((view): NeedRow => {
    const coinsNeed = view.need.kind === "coins";
    const done = finished || step !== giving || view.left <= 0;
    const give = !done && bag ? canGive(view, bag, coins ?? 0) : 0;
    let sub: string;
    if (done) sub = "All in";
    else if (coinsNeed) sub = `Wallet ${(coins ?? 0).toLocaleString("en-GB")}`;
    else {
      const have = bag ? canGive({ ...view, left: Number.MAX_SAFE_INTEGER }, bag, 0) : 0;
      sub = have > 0 ? `You have ${have}${view.need.kind === "any" ? " · cheapest first" : ""}` : needHint(view.need);
    }
    return {
      key: view.key,
      name: needName(view.need),
      icon: needIcon(view.need),
      coins: coinsNeed,
      given: done ? view.need.count : view.given,
      count: view.need.count,
      done,
      sub,
      give,
    };
  });
  const nextIndex = shown + 1;
  const next = !finished && nextIndex < project.steps.length ? project.steps[nextIndex] : null;
  return {
    id: projectId,
    name: project.name,
    step,
    steps: project.steps.length,
    stepName: project.steps[shown].name,
    blurb: keeperWords(project.steps[shown].blurb),
    needs,
    waiting: finished ? null : giving === null ? `${project.steps[shown].tonight}` : null,
    canGiveAll: needs.some((n) => !n.coins && n.give > 0),
    faces: state.helpers[projectId] ?? [],
    next: next ? { name: next.name, needs: next.needs.map(needCount).join(", ") } : null,
    opens: project.opens,
  };
}

/** One of Marlow's notes. */
export interface KeeperNote {
  /** Its key, to remember which have been read: "first", "lighthouse/path", "lighthouse". */
  id: string;
  title: string;
  paragraphs: readonly string[];
}

/** Every note Marlow has written so far, oldest first: his first, one per step built, one per project opened. */
export function keeperNotes(village: Village, clock: GameClock): KeeperNote[] {
  const built = builtThings({ village, clock });
  if (!built.has("keeper")) return [];
  const notes: KeeperNote[] = [{ id: "first", title: `${KEEPER_NAME} says hello`, paragraphs: FIRST_NOTE.map(keeperWords) }];
  for (const id of PROJECT_IDS) {
    const project = PROJECTS[id];
    project.steps.forEach((step, i) => {
      const name = stepName(project, i);
      if (built.has(name)) notes.push({ id: name, title: step.name, paragraphs: [keeperWords(step.note)] });
    });
    if (built.has(id)) notes.push({ id, title: project.opening.title, paragraphs: [keeperWords(project.opening.note)] });
  }
  return notes;
}
