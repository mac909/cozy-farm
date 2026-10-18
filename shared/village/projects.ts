import type { BeachFindId } from "../content/beachFinds";
import { isBeachFindId } from "../content/beachFinds";
import { ITEMS, type ItemId } from "../content/items";
import { HOUSE_UPGRADE_IDS, HOUSE_UPGRADES } from "../content/houseUpgrades";
import { PROJECTS, PROJECT_IDS, houseProject, isProjectId, needKey, projectDef, type Need, type NeedKey, type ProjectDef } from "../content/projects";
import type { Hint, HintReason } from "../farming/actions";
import { isSlotIndex, removeFromSlot, removeItems, type Inventory } from "../inventory/inventory";
import { farmerOf, setFarmerBag, type FarmerId, type House, type World } from "../world/world";
import { builtThings } from "./built";
import { NOT_STARTED, type BuiltStep, type ProjectProgress, type Village } from "./village";

/**
 * The village's projects (Milestone 6): which are up on the board, what the step being gathered
 * still needs, giving things to it (from a bag slot, from the whole bag, or coins from the shared
 * wallet), and building overnight. Gifts stay given; anyone can give to anything; only the current
 * step takes gifts. The project data is in shared/content/projects.ts.
 */

/** A need on a project card: what it asks for, how much is in, and how much is still wanted. */
export interface NeedView {
  readonly need: Need;
  readonly key: NeedKey;
  readonly given: number;
  readonly left: number;
}

/** Something to cheer or show: a gift (it floats up from the board), or a step's last thing going in. */
export type VillageEvent =
  | { readonly type: "gift"; readonly project: string; readonly need: NeedKey; readonly count: number; readonly itemId: ItemId | null }
  | { readonly type: "gathered"; readonly project: string; readonly step: number };

export type GiveResult = { ok: true; world: World; count: number; events: VillageEvent[] } | { ok: false; hint: Hint };

const refuse = (reason: HintReason): GiveResult => ({ ok: false, hint: { reason } });

/** How far a project has got (not started if nobody has given to it). */
export function progressOf(village: Village, projectId: string): ProjectProgress {
  return Object.hasOwn(village.projects, projectId) ? village.projects[projectId] : NOT_STARTED;
}

/** Marlow has arrived: from the morning of his day. */
export function keeperHere(world: Pick<World, "village" | "clock">): boolean {
  return world.village.keeperDay > 0 && world.clock.day >= world.village.keeperDay;
}

/** Every step is built. */
export function isFinished(project: ProjectDef, progress: ProjectProgress): boolean {
  return progress.built >= project.steps.length;
}

/**
 * The projects up on the board now, in order: once Marlow is here, each project goes up the morning
 * after the one before it opened, and stays until it's finished. One at a time.
 */
export function openProjects(world: Pick<World, "village" | "clock">): ProjectDef[] {
  if (!keeperHere(world)) return [];
  const open: ProjectDef[] = [];
  for (const id of PROJECT_IDS) {
    const project = PROJECTS[id];
    const progress = progressOf(world.village, id);
    if (!isFinished(project, progress)) {
      open.push(project);
      break;
    }
    // Finished: the next goes up the morning after this one opened.
    if (progress.doneDay === null || world.clock.day <= progress.doneDay) break;
  }
  return open;
}

/** Who lives where, enough to know which cottages can have upgrades. */
type Owners = Readonly<Record<string, Pick<House, "owner">>>;

/**
 * The house upgrades up on the board's Your home tab now (Milestone 7): for every cottage someone
 * lives in, each upgrade whose village project is built ("after the lighthouse") and that isn't
 * built yet. `first`: that farmer's own cottage comes first. Several can be up at once.
 */
export function openUpgrades(world: Pick<World, "village" | "clock"> & { houses: Owners }, first?: FarmerId): ProjectDef[] {
  if (!keeperHere(world)) return [];
  const built = builtThings(world);
  const houses = Object.keys(world.houses).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (first !== undefined) houses.sort((a, b) => Number(world.houses[b].owner === first) - Number(world.houses[a].owner === first));
  const open: ProjectDef[] = [];
  for (const houseId of houses) {
    for (const upgrade of HOUSE_UPGRADE_IDS) {
      if (!built.has(HOUSE_UPGRADES[upgrade].after)) continue;
      const project = houseProject(houseId, upgrade);
      if (!isFinished(project, progressOf(world.village, project.id))) open.push(project);
    }
  }
  return open;
}

/** Whether a project takes gifts now: the village's one up on the board, or a house upgrade that's up. */
export function isOpen(world: Pick<World, "village" | "clock"> & { houses?: Owners }, projectId: string): boolean {
  if (openProjects(world).some((p) => p.id === projectId)) return true;
  return world.houses !== undefined && openUpgrades({ ...world, houses: world.houses }).some((p) => p.id === projectId);
}

/** Everything taking gifts at the board: the village's project, then the house upgrades (`first`'s own cottage first). */
export function everythingOpen(world: Pick<World, "village" | "clock"> & { houses?: Owners }, first?: FarmerId): ProjectDef[] {
  return [...openProjects(world), ...(world.houses ? openUpgrades({ ...world, houses: world.houses }, first) : [])];
}

/**
 * The village's project that opened this morning, if any (Milestone 8): Marlow spends the day by
 * it, under the bunting. Not one that opens later in the day (the lighthouse, lit at dusk).
 */
export function openedToday(world: Pick<World, "village" | "clock">): string | null {
  for (const id of PROJECT_IDS) {
    const project = PROJECTS[id];
    if (project.opensAtMinute !== undefined) continue;
    const progress = progressOf(world.village, id);
    if (isFinished(project, progress) && progress.doneDay === world.clock.day) return id;
  }
  return null;
}

/** Projects with every step built, in order. */
export function finishedProjects(village: Village): ProjectDef[] {
  return PROJECT_IDS.map((id) => PROJECTS[id]).filter((project) => isFinished(project, progressOf(village, project.id)));
}

/**
 * The step taking gifts (counted from 0), or null: none while the last gathered step waits to be
 * built tonight, or once everything is built.
 */
export function givingStep(project: ProjectDef, progress: ProjectProgress): number | null {
  if (progress.gathered !== progress.built || progress.gathered >= project.steps.length) return null;
  return progress.gathered;
}

/** Each need of a step: how much is in and how much is still wanted. Only the step being gathered has anything in. */
export function needsOf(project: ProjectDef, progress: ProjectProgress, step: number): NeedView[] {
  const current = progress.gathered === step && progress.built === step;
  const done = step < progress.gathered;
  return project.steps[step].needs.map((need) => {
    const key = needKey(need);
    const given = done ? need.count : current ? Math.min(need.count, progress.given[key] ?? 0) : 0;
    return { need, key, given, left: need.count - given };
  });
}

/** Whether an item counts for a need. */
export function fitsNeed(need: Need, itemId: ItemId): boolean {
  if (need.kind === "item") return need.itemId === itemId;
  if (need.kind === "any") return ITEMS[itemId].category === need.category;
  return false;
}

/** How many of a need a bag (and the wallet, for coins) could give right now, up to what's left. */
export function canGive(view: NeedView, bag: Inventory, coins: number): number {
  if (view.left <= 0) return 0;
  if (view.need.kind === "coins") return Math.min(view.left, coins);
  let have = 0;
  for (const slot of bag) if (slot && fitsNeed(view.need, slot.itemId)) have += slot.count;
  return Math.min(view.left, have);
}

/**
 * The open project and need that want an item, and how many more of it they'd take, or null. The
 * village's project first, then the house upgrades (with `houses`), `farmerId`'s own cottage first.
 */
export function wantedFor(
  world: Pick<World, "village" | "clock"> & { houses?: Owners },
  itemId: ItemId,
  farmerId?: FarmerId,
): { project: ProjectDef; key: NeedKey; left: number } | null {
  for (const project of everythingOpen(world, farmerId)) {
    const progress = progressOf(world.village, project.id);
    const step = givingStep(project, progress);
    if (step === null) continue;
    // A particular item before "any of a kind", so sea glass goes to the sea glass first.
    const views = needsOf(project, progress, step).filter((v) => v.left > 0 && fitsNeed(v.need, itemId));
    views.sort((a, b) => (a.need.kind === "item" ? 0 : 1) - (b.need.kind === "item" ? 0 : 1));
    if (views[0]) return { project, key: views[0].key, left: views[0].left };
  }
  return null;
}

/** Beach finds a step being gathered still asks for by name: they wash up more often (Marlow's luck). */
export function wantedFinds(world: Pick<World, "village" | "clock"> & { houses?: Owners }): BeachFindId[] {
  const finds: BeachFindId[] = [];
  for (const project of everythingOpen(world)) {
    const progress = progressOf(world.village, project.id);
    const step = givingStep(project, progress);
    if (step === null) continue;
    for (const view of needsOf(project, progress, step)) {
      if (view.left > 0 && view.need.kind === "item" && isBeachFindId(view.need.itemId)) finds.push(view.need.itemId);
    }
  }
  return finds;
}

/**
 * Takes up to `count` things that fit `need` out of a bag: from `slot` if given (it must hold one),
 * otherwise from anywhere, cheapest first for "any of a kind" so a rare catch never goes by accident.
 */
function takeFromBag(bag: Inventory, need: Need, count: number, slot: number | undefined): { bag: Inventory; taken: number; itemId: ItemId | null } {
  if (slot !== undefined) {
    if (!isSlotIndex(bag, slot)) return { bag, taken: 0, itemId: null };
    const stack = bag[slot];
    if (!stack || !fitsNeed(need, stack.itemId)) return { bag, taken: 0, itemId: null };
    const take = Math.min(count, stack.count);
    const removed = removeFromSlot(bag, slot, take);
    return removed.ok ? { bag: removed.inventory, taken: take, itemId: stack.itemId } : { bag, taken: 0, itemId: null };
  }
  const kinds = [...new Set(bag.flatMap((s) => (s && fitsNeed(need, s.itemId) ? [s.itemId] : [])))];
  kinds.sort((a, b) => (ITEMS[a].sellPrice ?? 0) - (ITEMS[b].sellPrice ?? 0));
  let left = count;
  let next = bag;
  let first: ItemId | null = null;
  for (const itemId of kinds) {
    if (left <= 0) break;
    const have = next.reduce((n, s) => n + (s?.itemId === itemId ? s.count : 0), 0);
    const take = Math.min(left, have);
    const removed = removeItems(next, itemId, take);
    if (!removed.ok) continue;
    next = removed.inventory;
    left -= take;
    first ??= itemId;
  }
  return { bag: next, taken: count - left, itemId: first };
}

/**
 * Gives to the step being gathered: as many as `farmerId` can of the need `key`, up to what's left.
 * Items come from bag slot `slot` if given, otherwise from the whole bag; coins come from the shared
 * wallet. The giver joins the helpers. When the step's last need is filled, it's gathered: it'll be
 * built tonight, and nothing more is taken until then.
 */
export function giveToProject(world: World, farmerId: FarmerId, projectId: string, key: NeedKey, slot?: number): GiveResult {
  const farmer = farmerOf(world, farmerId);
  const project = isProjectId(projectId) ? projectDef(projectId) : undefined;
  if (!farmer || !project) return refuse("gone");
  if (!isOpen(world, projectId)) return refuse("not-open");
  const progress = progressOf(world.village, projectId);
  const step = givingStep(project, progress);
  if (step === null) return refuse("step-waiting");
  const view = needsOf(project, progress, step).find((v) => v.key === key);
  if (!view) return refuse("not-needed");
  if (view.left <= 0) return refuse("need-done");

  let next = world;
  let count: number;
  let itemId: ItemId | null = null;
  if (view.need.kind === "coins") {
    count = Math.min(view.left, world.coins);
    if (count <= 0) return refuse("no-coins");
    next = { ...world, coins: world.coins - count };
  } else {
    const taken = takeFromBag(farmer.bag, view.need, view.left, slot);
    if (taken.taken <= 0) return refuse(slot === undefined ? "nothing-to-give" : "not-needed");
    count = taken.taken;
    itemId = taken.itemId;
    next = setFarmerBag(world, farmerId, taken.bag);
  }

  const given = { ...progress.given, [key]: view.given + count };
  const helpers = progress.helpers.includes(farmerId) ? progress.helpers : [...progress.helpers, farmerId];
  const complete = project.steps[step].needs.every((need) => (given[needKey(need)] ?? 0) >= need.count);
  const after: ProjectProgress = complete ? { ...progress, gathered: step + 1, given: {}, helpers } : { ...progress, given, helpers };
  const events: VillageEvent[] = [{ type: "gift", project: projectId, need: key, count, itemId }];
  if (complete) events.push({ type: "gathered", project: projectId, step });
  next = { ...next, village: { ...next.village, projects: { ...next.village.projects, [projectId]: after } } };
  return { ok: true, world: next, count, events };
}

/**
 * "Give everything I can": every item need the farmer can help with, particular items before "any
 * of a kind" (so the sea glass goes to the sea glass). Never coins: they have their own button.
 */
export function giveEverything(world: World, farmerId: FarmerId, projectId: string): GiveResult {
  const project = isProjectId(projectId) ? projectDef(projectId) : undefined;
  if (!project) return refuse("gone");
  const progress = progressOf(world.village, projectId);
  const step = givingStep(project, progress);
  if (step === null) return giveToProject(world, farmerId, projectId, "coins");
  const keys = needsOf(project, progress, step)
    .filter((v) => v.need.kind !== "coins" && v.left > 0)
    .sort((a, b) => (a.need.kind === "item" ? 0 : 1) - (b.need.kind === "item" ? 0 : 1))
    .map((v) => v.key);
  let next = world;
  let count = 0;
  const events: VillageEvent[] = [];
  let firstRefusal: Hint | null = null;
  for (const key of keys) {
    const result = giveToProject(next, farmerId, projectId, key);
    if (!result.ok) {
      firstRefusal ??= result.hint;
      continue;
    }
    next = result.world;
    count += result.count;
    events.push(...result.events);
  }
  if (count === 0) return { ok: false, hint: firstRefusal?.reason === "nothing-to-give" || !firstRefusal ? { reason: "nothing-to-give" } : firstRefusal };
  return { ok: true, world: next, count, events };
}

/**
 * The night's work: every gathered step is built. A project whose last step is built is finished
 * that morning. Returns the world and what was built, for the morning card.
 */
export function buildOvernight(world: World): { world: World; built: BuiltStep[] } {
  const built: BuiltStep[] = [];
  const projects: Record<string, ProjectProgress> = { ...world.village.projects };
  for (const [id, progress] of Object.entries(world.village.projects)) {
    const project = isProjectId(id) ? projectDef(id) : undefined;
    if (!project || progress.gathered <= progress.built) continue;
    for (let step = progress.built; step < progress.gathered; step++) built.push({ project: id, step });
    const finished = progress.gathered >= project.steps.length;
    projects[id] = { ...progress, built: progress.gathered, doneDay: finished ? world.clock.day : progress.doneDay };
  }
  if (built.length === 0) return { world, built };
  return { world: { ...world, village: { ...world.village, projects } }, built };
}

/**
 * For testing (the dev command, and tests): a project's step gets everything it asks for, from
 * nowhere, given by `farmerId`: `projectId`'s, or the village's open project, or else the farmer's
 * own cottage's upgrade (or anyone's). Real play never calls this.
 */
export function fillStep(world: World, farmerId: FarmerId, projectId?: string): GiveResult {
  const open = everythingOpen(world, farmerId);
  const project = projectId === undefined ? open[0] : open.find((p) => p.id === projectId);
  if (!project) return refuse("not-open");
  const progress = progressOf(world.village, project.id);
  const step = givingStep(project, progress);
  if (step === null) return refuse("step-waiting");
  const helpers = progress.helpers.includes(farmerId) ? progress.helpers : [...progress.helpers, farmerId];
  const after: ProjectProgress = { ...progress, gathered: step + 1, given: {}, helpers };
  const next = { ...world, village: { ...world.village, projects: { ...world.village.projects, [project.id]: after } } };
  return { ok: true, world: next, count: 0, events: [{ type: "gathered", project: project.id, step }] };
}

/** Marlow arrives (if he hasn't yet), today. */
export function keeperArrives(world: World): World {
  if (world.village.keeperDay > 0) return world;
  return { ...world, village: { ...world.village, keeperDay: world.clock.day } };
}
