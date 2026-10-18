import { ITEMS } from "../../../shared/content/items";
import { keeperWords } from "../../../shared/content/keeper";
import { projectDef } from "../../../shared/content/projects";
import { ownerWords } from "../../../shared/content/houseUpgrades";
import type { BuiltStep } from "../../../shared/village/village";
import type { MorningReport } from "../../../shared/world/world";

/** The words on the morning card. */
export interface MorningWords {
  title: string;
  /** What grew and what's ripe, or null after a quiet night. */
  growth: string | null;
  /** The morning Marlow arrives: the boat at the dock and last night's storm. Null otherwise. */
  storm: string | null;
  /** What was built overnight: the line and Marlow's note for each. */
  village: { built: BuiltStep; line: string; note: string }[];
  /** "Something washed up on the beach!", or null if nothing did. */
  beach: string | null;
  /** One line per thing the crate sold: "Radish 4 × 35" and its total. */
  sales: { text: string; total: string }[];
  /** "+260 coins" and the wallet after it, or null if the crate was empty. */
  earned: { text: string; coins: string } | null;
}

/** The morning Marlow arrives. */
export const STORM_LINE = "A little boat is tied up at the dock, and last night's storm has washed driftwood all over the beach.";

const crops = (n: number) => `${n} crop${n === 1 ? "" : "s"}`;

/** "6 crops grew overnight. 3 are ready to pick." */
export function growthLine(grew: number, ready: number): string | null {
  const ripe = ready === 1 ? "1 is ready to pick." : `${ready} are ready to pick.`;
  if (grew > 0 && ready > 0) return `${crops(grew)} grew overnight. ${ripe}`;
  if (grew > 0) return `${crops(grew)} grew overnight.`;
  if (ready > 0) return `${crops(ready)} ${ready === 1 ? "is" : "are"} ready to pick.`;
  return null;
}

/**
 * The morning card's words. `keeperArrived`: Marlow came this morning (his first). `owner`: whose a
 * cottage is, for a house upgrade's line (Milestone 7).
 */
export function morningWords(report: MorningReport, keeperArrived = false, owner: (houseId: string) => string = () => "Someone"): MorningWords {
  const sales = report.sale.lines.map((line) => ({
    text: `${ITEMS[line.itemId]?.name ?? line.itemId} ${line.count} × ${line.priceEach}`,
    total: String(line.total),
  }));
  return {
    title: `Good morning! Day ${report.day}`,
    growth: growthLine(report.grew, report.ready),
    storm: keeperArrived ? STORM_LINE : null,
    village: (report.built ?? []).flatMap((built) => {
      const project = projectDef(built.project);
      const step = project?.steps[built.step];
      if (!project || !step) return [];
      const who = project.house ? owner(project.house.houseId) : "";
      return [{ built, line: ownerWords(step.builtLine, who), note: keeperWords(step.note) }];
    }),
    beach: (report.washedUp?.length ?? 0) + (report.foraged?.length ?? 0) > 0 ? "Something washed up on the beach!" : null,
    sales,
    earned: sales.length > 0 ? { text: `+${report.sale.total} coins`, coins: String(report.coins) } : null,
  };
}

const SHOWN_KEY = "cozy-farm.morningShown";

/** The last day whose morning card this device showed (0 if none). Storage can be unavailable; then it's 0. */
export function loadMorningShown(): number {
  try {
    const day = Number(localStorage.getItem(SHOWN_KEY));
    return Number.isInteger(day) && day > 0 ? day : 0;
  } catch {
    return 0;
  }
}

export function saveMorningShown(day: number): void {
  try {
    localStorage.setItem(SHOWN_KEY, String(day));
  } catch {
    // Not remembered: the card may show again next time.
  }
}
