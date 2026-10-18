import { PROJECTS, PROJECT_IDS, houseProjectOf, projectDef, stepName } from "../content/projects";
import type { World } from "../world/world";
import { isFinished, keeperHere, progressOf } from "./projects";

/**
 * What's built, as names the map understands (Milestone 6). Tiled layers show `shownFrom` or
 * `shownUntil` one of these, and objects can say they `needs` one (see "Editing the map" in
 * CLAUDE.md). Worked out from the world, never stored, so there's one truth.
 *
 * - "keeper": Marlow has arrived (the Village Board stands from then).
 * - "lighthouse/path", "lighthouse/stairs", …: a project's step, from the morning it's built.
 * - "lighthouse": a whole project, from the morning its last step is built, or for one that opens
 *   at a set time (the lamp is lit at dusk), from then.
 * - "house1:porch": a house upgrade (Milestone 7), from the morning it's built.
 */

/** Built when Marlow is here. */
export const KEEPER_BUILT = "keeper";

/** Everything built as of the world's clock. */
export function builtThings(world: Pick<World, "village" | "clock">): Set<string> {
  const built = new Set<string>();
  if (keeperHere(world)) built.add(KEEPER_BUILT);
  for (const id of PROJECT_IDS) {
    const project = PROJECTS[id];
    const progress = progressOf(world.village, id);
    const steps = Math.min(progress.built, project.steps.length);
    for (let step = 0; step < steps; step++) built.add(stepName(project, step));
    if (isFinished(project, progress) && opened(project.opensAtMinute, progress.doneDay, world.clock)) built.add(id);
  }
  // House upgrades: only the ones anyone has given to are in the village's projects.
  for (const [id, progress] of Object.entries(world.village.projects)) {
    if (!houseProjectOf(id)) continue;
    const project = projectDef(id)!;
    const steps = Math.min(progress.built, project.steps.length);
    for (let step = 0; step < steps; step++) built.add(stepName(project, step));
    if (isFinished(project, progress)) built.add(id);
  }
  return built;
}

/** Whether a finished project has opened: straight away, or on its day from its minute. */
function opened(atMinute: number | undefined, doneDay: number | null, clock: World["clock"]): boolean {
  if (atMinute === undefined || doneDay === null) return true;
  return clock.day > doneDay || clock.minute >= atMinute;
}

/** The same built things always give the same key, to remember work done for them. */
export function builtKey(built: ReadonlySet<string>): string {
  return [...built].sort().join("|");
}
