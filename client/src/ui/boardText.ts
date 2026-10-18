import { FORAGE, isForageId } from "../../../shared/content/forage";
import { ITEMS, pluralName, type ItemId } from "../../../shared/content/items";
import { FIRST_NOTE, KEEPER_NAME, NEXT_PLAN_LINE, keeperWords } from "../../../shared/content/keeper";
import { PROJECTS, PROJECT_IDS, houseProjectId, houseProjectOf, projectDef, stepName, type AnyKind, type Need, type ProjectDef } from "../../../shared/content/projects";
import { HOME_LINES, HOUSE_UPGRADES, HOUSE_UPGRADE_IDS, LATER_UPGRADES, ownerWords } from "../../../shared/content/houseUpgrades";
import type { Inventory } from "../../../shared/inventory/inventory";
import type { HelperView } from "../../../shared/stateSync";
import type { GameClock } from "../../../shared/time/clock";
import { builtThings } from "../../../shared/village/built";
import { canGive, finishedProjects, givingStep, isFinished, needsOf, openProjects, openUpgrades, progressOf } from "../../../shared/village/projects";
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
  /** Who lives in each cottage, and their name (for the Your home tab, Milestone 7). Missing: nobody. */
  houses?: Readonly<Record<string, { readonly owner: string; readonly ownerName: string }>>;
  /** The farmer on this device, so their own cottage comes first. */
  me?: string | null;
}

/** A project's name on its card and in lines: a house upgrade's says whose ("Pip's porch"). */
export function projectName(project: ProjectDef, state: Pick<BoardState, "houses">): string {
  if (!project.house) return project.name;
  return `${ownerOf(state, project.house.houseId)}'s ${HOUSE_UPGRADES[project.house.upgrade].noun}`;
}

/** Whose a cottage is, by name ("Someone" if nobody's, or the name isn't known). */
export function ownerOf(state: Pick<BoardState, "houses">, houseId: string): string {
  return state.houses?.[houseId]?.ownerName || "Someone";
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
  /** The projects still to come after the one up now, as silhouettes with a hint (Milestone 8). */
  later: { id: string; title: string; hint: string }[];
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
  // Still to come, once Marlow is here: every project after the furthest one up, opening or
  // finished (the next one goes up the morning after the last one opens), that has a teaser.
  const reached = PROJECT_IDS.filter((id) => open.some((p) => p.id === id) || isFinished(PROJECTS[id], progressOf(village, id)));
  const from = !built.has("keeper") ? PROJECT_IDS.length : reached.length > 0 ? Math.max(...reached.map((id) => PROJECT_IDS.indexOf(id))) + 1 : 0;
  const later = PROJECT_IDS.slice(from).flatMap((id) => {
    const teaser = PROJECTS[id].teaser;
    return teaser && progressOf(village, id).gathered === 0 ? [{ id, title: teaser.title, hint: keeperWords(teaser.hint) }] : [];
  });
  return { line: keeperWords(line), now, finished, later, notes: keeperNotes(village, clock).length };
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
  /** A house upgrade: its card goes back to the Your home tab. */
  home: boolean;
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

/** A project's card (the village's, or a house upgrade's), for someone with `bag` and the shared `coins`. */
export function projectCard(projectId: string, state: BoardState, bag: Inventory | null, coins: number | null): ProjectCard | null {
  const project = projectDef(projectId);
  if (!project) return null;
  const owner = project.house ? ownerOf(state, project.house.houseId) : "";
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
    name: projectName(project, state),
    home: project.house !== undefined,
    step,
    steps: project.steps.length,
    stepName: project.steps[shown].name,
    blurb: ownerWords(keeperWords(project.steps[shown].blurb), owner),
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

/**
 * Every note Marlow has written so far, oldest first: his first, one per step built, one per
 * project opened, then one per house upgrade built (`houses` for whose).
 */
export function keeperNotes(village: Village, clock: GameClock, houses?: BoardState["houses"]): KeeperNote[] {
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
  // House upgrades, in the order they were built.
  const upgrades = Object.entries(village.projects)
    .filter(([id]) => houseProjectOf(id) && built.has(id))
    .sort(([a, x], [b, y]) => (x.doneDay ?? 0) - (y.doneDay ?? 0) || a.localeCompare(b));
  for (const [id] of upgrades) {
    const project = projectDef(id)!;
    notes.push({ id, title: projectName(project, { houses }), paragraphs: [keeperWords(project.steps[0].note)] });
  }
  return notes;
}

/** One upgrade on the Your home tab (Milestone 7). */
export interface HomeRow {
  /** Its project id ("house1:porch"), or null for one still to come in a later milestone. */
  id: string | null;
  name: string;
  /** "later": not yet (after the lighthouse, after the garden shop); "open": taking gifts; "waiting": all in, built tonight; "built". */
  state: "later" | "open" | "waiting" | "built";
  /** "After the lighthouse", "Built on day 15", "All in! Marlow's building it tonight." Null while it's open (its needs show instead). */
  sub: string | null;
  /** While it's open: each need, short ("12" of driftwood), with its picture; null for coins. */
  needs: { icon: ItemId | null; text: string }[];
  /** How much is in, 0 to 1, while it's open. */
  progress: number;
  /** Its picture: the porch, or a later one's stand-in item. */
  icon: ItemId | "porch";
}

export interface HomeWords {
  /** Marlow's line at the top. */
  line: string;
  /** Each cottage someone lives in, this device's first. */
  cottages: { houseId: string; title: string; mine: boolean; rows: HomeRow[] }[];
  /** For someone who hasn't moved in yet. */
  note: string | null;
}

/** The board's Your home tab (Milestone 7): every cottage's upgrades, built, up, or still to come. */
export function homeWords(state: BoardState): HomeWords {
  const houses = state.houses ?? {};
  const me = state.me ?? null;
  const built = builtThings({ village: state.village, clock: state.clock });
  const open = openUpgrades({ village: state.village, clock: state.clock, houses }, me ?? undefined);
  const ids = Object.keys(houses).sort((a, b) => Number(houses[b].owner === me) - Number(houses[a].owner === me) || a.localeCompare(b, undefined, { numeric: true }));
  const cottages = ids.map((houseId, index) => {
    const rows: HomeRow[] = HOUSE_UPGRADE_IDS.map((upgrade) => {
      const def = HOUSE_UPGRADES[upgrade];
      const id = houseProjectId(houseId, upgrade);
      const progress = progressOf(state.village, id);
      if (built.has(id)) return { id, name: def.name, state: "built", sub: progress.doneDay ? `Built on day ${progress.doneDay}` : "Built", needs: [], progress: 1, icon: "porch" };
      if (!built.has(def.after)) return { id: null, name: def.name, state: "later", sub: def.afterHint, needs: [], progress: 0, icon: "porch" };
      const project = projectDef(id)!;
      const giving = givingStep(project, progress);
      if (giving === null) return { id, name: def.name, state: "waiting", sub: "All in! Marlow's building it tonight.", needs: [], progress: 1, icon: "porch" };
      const views = needsOf(project, progress, giving);
      return {
        id,
        name: def.name,
        state: "open",
        sub: null,
        needs: views.map((v) => ({ icon: needIcon(v.need), text: v.need.kind === "coins" ? `${v.need.count.toLocaleString("en-GB")} coins` : String(v.need.count) })),
        progress: views.reduce((sum, v) => sum + v.given / v.need.count, 0) / views.length,
        icon: "porch",
      };
    });
    // What's still to come, under the first cottage listed (yours, if you have one).
    if (index === 0) for (const later of LATER_UPGRADES) rows.push({ id: null, name: later.name, state: "later", sub: later.afterHint, needs: [], progress: 0, icon: later.icon });
    return { houseId, title: `${houses[houseId].ownerName || "Someone"}'s cottage`, mine: houses[houseId].owner === me, rows };
  });
  // Every upgrade there is so far built on every cottage (the ones still to come don't count).
  const allBuilt = cottages.length > 0 && cottages.every((c) => c.rows.slice(0, HOUSE_UPGRADE_IDS.length).every((r) => r.state === "built"));
  const line = open.length > 0 ? open[0].boardLine : allBuilt ? HOME_LINES.allBuilt : HOME_LINES.before;
  const mine = me !== null && Object.values(houses).some((house) => house.owner === me);
  const note = cottages.length === 0 ? HOME_LINES.nobodyHome : mine ? null : HOME_LINES.moveIn;
  return { line: keeperWords(line), cottages, note };
}
