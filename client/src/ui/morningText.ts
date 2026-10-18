import { ITEMS } from "../../../shared/content/items";
import type { MorningReport } from "../../../shared/world/world";

/** The words on the morning card. */
export interface MorningWords {
  title: string;
  /** What grew and what's ripe, or null after a quiet night. */
  growth: string | null;
  /** "Something washed up on the beach!", or null if nothing did. */
  beach: string | null;
  /** One line per thing the crate sold: "Radish 4 × 35" and its total. */
  sales: { text: string; total: string }[];
  /** "+260 coins" and the wallet after it, or null if the crate was empty. */
  earned: { text: string; coins: string } | null;
}

const crops = (n: number) => `${n} crop${n === 1 ? "" : "s"}`;

/** "6 crops grew overnight. 3 are ready to pick." */
export function growthLine(grew: number, ready: number): string | null {
  const ripe = ready === 1 ? "1 is ready to pick." : `${ready} are ready to pick.`;
  if (grew > 0 && ready > 0) return `${crops(grew)} grew overnight. ${ripe}`;
  if (grew > 0) return `${crops(grew)} grew overnight.`;
  if (ready > 0) return `${crops(ready)} ${ready === 1 ? "is" : "are"} ready to pick.`;
  return null;
}

export function morningWords(report: MorningReport): MorningWords {
  const sales = report.sale.lines.map((line) => ({
    text: `${ITEMS[line.itemId]?.name ?? line.itemId} ${line.count} × ${line.priceEach}`,
    total: String(line.total),
  }));
  return {
    title: `Good morning! Day ${report.day}`,
    growth: growthLine(report.grew, report.ready),
    beach: (report.washedUp?.length ?? 0) > 0 ? "Something washed up on the beach!" : null,
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
