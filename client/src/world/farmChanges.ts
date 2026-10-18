import { isRipe, type FarmTile } from "../../../shared/farming/farming";

/** What happened to a farm tile, for the puff, splash or pop that shows it. */
export type FarmChange = "dug" | "planted" | "watered" | "picked";

export interface TileChange {
  col: number;
  row: number;
  change: FarmChange;
}

/** The soil frame for a tile: which neighbours are dug too (N 1, E 2, S 4, W 8), plus 16 when watered. */
export function soilFrame(isDug: (col: number, row: number) => boolean, col: number, row: number, watered: boolean): number {
  const mask =
    (isDug(col, row - 1) ? 1 : 0) | (isDug(col + 1, row) ? 2 : 0) | (isDug(col, row + 1) ? 4 : 0) | (isDug(col - 1, row) ? 8 : 0);
  return mask + (watered ? 16 : 0);
}

/** What changed between two states of one tile that's worth a puff, splash or pop. Overnight changes aren't. */
export function changeBetween(before: FarmTile, after: FarmTile): FarmChange | null {
  if (before.kind === "untilled" && after.kind !== "untilled") return "dug";
  if (before.kind === "planted" && isRipe(before) && !(after.kind === "planted" && isRipe(after))) return "picked";
  if (before.kind === "tilled" && after.kind === "planted") return "planted";
  if (before.kind !== "untilled" && after.kind !== "untilled" && !before.watered && after.watered) return "watered";
  return null;
}

/** Whether two states of a tile look and behave the same. */
export function sameTile(a: FarmTile, b: FarmTile): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "untilled" || b.kind === "untilled") return true;
  if (a.watered !== b.watered) return false;
  if (a.kind === "planted" && b.kind === "planted") {
    return a.cropId === b.cropId && a.stage === b.stage && a.daysInStage === b.daysInStage;
  }
  return true;
}
