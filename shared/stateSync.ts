import type { ArraySchema, MapSchema } from "@colyseus/schema";
import { isCropId } from "./content/crops";
import { isFurnitureId } from "./content/furniture";
import { isItemId } from "./content/items";
import type { PlacedPiece } from "./decor/pieces";
import type { FarmTile } from "./farming/farming";
import type { Inventory, Slot } from "./inventory/inventory";
import type { Crate } from "./economy/shop";
import { BagSlot, type Clock, CrateEntry, FarmPlot, HouseState, PieceState } from "./schema";
import type { Farmer, FarmerId, House, TileKey } from "./world/world";
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

/** Copies the crate in, line by line, writing only what changed. */
export function writeCrate(target: ArraySchema<CrateEntry>, crate: Crate): void {
  while (target.length > crate.length) target.pop();
  crate.forEach((stack, i) => {
    let entry = target[i];
    if (!entry) {
      entry = new CrateEntry();
      target.push(entry);
    }
    if (entry.itemId !== stack.itemId) entry.itemId = stack.itemId;
    if (entry.count !== stack.count) entry.count = stack.count;
  });
}

/** The crate as the rules see it. Lines that don't make sense are left out. */
export function readCrate(source: Iterable<CrateEntry>): Crate {
  return Array.from(source).flatMap((entry) => (isItemId(entry.itemId) && entry.count > 0 ? [{ itemId: entry.itemId, count: entry.count }] : []));
}

/** The whole farm as the rules see it. */
export function readFarm(source: MapSchema<FarmPlot>): Record<TileKey, FarmTile> {
  const farm: Record<TileKey, FarmTile> = {};
  source.forEach((plot, key) => {
    farm[key as TileKey] = readPlot(plot);
  });
  return farm;
}

/** Copies a list of pieces in, piece by piece, writing only what changed. */
export function writePieces(target: ArraySchema<PieceState>, pieces: readonly PlacedPiece[]): void {
  while (target.length > pieces.length) target.pop();
  pieces.forEach((piece, i) => {
    let cell = target[i];
    if (!cell) {
      cell = new PieceState();
      target.push(cell);
    }
    if (cell.itemId !== piece.itemId) cell.itemId = piece.itemId;
    if (cell.col !== piece.col) cell.col = piece.col;
    if (cell.row !== piece.row) cell.row = piece.row;
    if (cell.turn !== piece.turn) cell.turn = piece.turn;
  });
}

/** Pieces as the rules see them. Pieces that don't make sense are left out. */
export function readPieces(source: Iterable<PieceState>): PlacedPiece[] {
  return Array.from(source).flatMap((cell) => (isFurnitureId(cell.itemId) ? [{ itemId: cell.itemId, col: cell.col, row: cell.row, turn: cell.turn }] : []));
}

/** Copies the houses in, with each owner's name for the sign over the door. */
export function writeHouses(
  target: MapSchema<HouseState>,
  houses: Readonly<Record<string, House>>,
  farmers: Readonly<Record<FarmerId, Farmer>>,
): void {
  for (const id of [...target.keys()]) {
    if (!Object.hasOwn(houses, id)) target.delete(id);
  }
  for (const [id, house] of Object.entries(houses)) {
    let cell = target.get(id);
    const isNew = !cell;
    if (!cell) cell = new HouseState();
    const ownerName = Object.hasOwn(farmers, house.owner) ? farmers[house.owner].name : "";
    if (cell.owner !== house.owner) cell.owner = house.owner;
    if (cell.ownerName !== ownerName) cell.ownerName = ownerName;
    writePieces(cell.furniture, house.furniture);
    if (isNew) target.set(id, cell);
  }
}

/** A house as the client sees it: who lives there (and their name) and what's inside. */
export interface HouseView extends House {
  readonly ownerName: string;
}

/** The houses as the rules see them. */
export function readHouses(source: MapSchema<HouseState>): Record<string, HouseView> {
  const houses: Record<string, HouseView> = {};
  source.forEach((cell, id) => {
    houses[id] = { owner: cell.owner, ownerName: cell.ownerName, furniture: readPieces(cell.furniture) };
  });
  return houses;
}
