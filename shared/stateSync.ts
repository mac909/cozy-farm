import type { ArraySchema, MapSchema } from "@colyseus/schema";
import { isCropId } from "./content/crops";
import { isItemId } from "./content/items";
import type { FarmTile } from "./farming/farming";
import type { Inventory, Slot } from "./inventory/inventory";
import { BagSlot, type Clock, FarmPlot } from "./schema";
import type { TileKey } from "./world/world";
import { HUD_MINUTE_STEP, type GameClock } from "./time/clock";

/**
 * Copying between the rules' plain data and the network state in schema.ts. The server writes
 * after every change; each write only touches fields whose value actually changed, so Colyseus
 * only sends what's new. Clients read the network state back into plain data with the read*
 * functions. This file is the only bridge: the rules never import Colyseus.
 */

/** The clock as the HUD shows it: the minute rounded down to the 10-minute step. */
export function steppedMinute(minute: number): number {
  return Math.floor(minute / HUD_MINUTE_STEP) * HUD_MINUTE_STEP;
}

/** Copies the clock in, rounded to the HUD's step. Returns whether anything changed. */
export function writeClock(target: Clock, clock: GameClock): boolean {
  const minute = steppedMinute(clock.minute);
  if (target.day === clock.day && target.minute === minute) return false;
  target.day = clock.day;
  target.minute = minute;
  return true;
}

export function readClock(source: Clock): GameClock {
  return { day: source.day, minute: source.minute };
}

/** Copies a bag in, slot by slot, writing only the slots that changed. */
export function writeBag(target: ArraySchema<BagSlot>, bag: Inventory): void {
  while (target.length > bag.length) target.pop();
  bag.forEach((slot, i) => {
    let cell = target[i];
    if (!cell) {
      cell = new BagSlot();
      target.push(cell);
    }
    const itemId = slot?.itemId ?? "";
    const count = slot?.count ?? 0;
    if (cell.itemId !== itemId) cell.itemId = itemId;
    if (cell.count !== count) cell.count = count;
  });
}

/** A bag as the rules see it. Slots that don't make sense (an unknown item, no count) read as empty. */
export function readBag(source: Iterable<BagSlot>): Inventory {
  return Array.from(source, (cell): Slot => (isItemId(cell.itemId) && cell.count > 0 ? { itemId: cell.itemId, count: cell.count } : null));
}

/** Copies the farm in: adds newly dug tiles, updates changed ones field by field, drops any that went. */
export function writeFarm(target: MapSchema<FarmPlot>, farm: Readonly<Record<TileKey, FarmTile>>): void {
  for (const key of [...target.keys()]) {
    if (!Object.hasOwn(farm, key)) target.delete(key);
  }
  for (const [key, tile] of Object.entries(farm) as [TileKey, FarmTile][]) {
    if (tile.kind === "untilled") continue;
    let plot = target.get(key);
    if (!plot) {
      plot = new FarmPlot();
      writePlot(plot, tile);
      target.set(key, plot);
    } else {
      writePlot(plot, tile);
    }
  }
}

function writePlot(plot: FarmPlot, tile: Exclude<FarmTile, { kind: "untilled" }>) {
  const planted = tile.kind === "planted";
  const cropId = planted ? tile.cropId : "";
  const stage = planted ? tile.stage : 0;
  const daysInStage = planted ? tile.daysInStage : 0;
  if (plot.kind !== tile.kind) plot.kind = tile.kind;
  if (plot.watered !== tile.watered) plot.watered = tile.watered;
  if (plot.cropId !== cropId) plot.cropId = cropId;
  if (plot.stage !== stage) plot.stage = stage;
  if (plot.daysInStage !== daysInStage) plot.daysInStage = daysInStage;
}

/** A farm tile as the rules see it. A plot that doesn't make sense reads as bare soil. */
export function readPlot(plot: FarmPlot): FarmTile {
  if (plot.kind === "planted" && isCropId(plot.cropId)) {
    return { kind: "planted", watered: plot.watered, cropId: plot.cropId, stage: plot.stage, daysInStage: plot.daysInStage };
  }
  return { kind: "tilled", watered: plot.watered };
}

/** The whole farm as the rules see it. */
export function readFarm(source: MapSchema<FarmPlot>): Record<TileKey, FarmTile> {
  const farm: Record<TileKey, FarmTile> = {};
  source.forEach((plot, key) => {
    farm[key as TileKey] = readPlot(plot);
  });
  return farm;
}
