import type { ArraySchema, MapSchema } from "@colyseus/schema";
import type { Beach } from "./beachcombing/beachcombing";
import type { MeadowBug } from "./bugs/meadow";
import { BOOK_SECTIONS, EMPTY_BOOK, type BookSection, type CollectionBook } from "./collection/collection";
import { isBeachFindId } from "./content/beachFinds";
import { isBugId } from "./content/bugs";
import { isFishId } from "./content/fish";
import { isCropId } from "./content/crops";
import { isFurnitureId } from "./content/furniture";
import { isItemId } from "./content/items";
import type { PlacedPiece } from "./decor/pieces";
import type { FarmTile } from "./farming/farming";
import type { Inventory, Slot } from "./inventory/inventory";
import type { Crate } from "./economy/shop";
import { BagSlot, BeachFindState, BookEntryState, BugState, type Clock, CrateEntry, FarmPlot, HouseState, PieceState } from "./schema";
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

/** Copies the beach in, find by find, writing only what changed. */
export function writeBeach(target: ArraySchema<BeachFindState>, beach: Beach): void {
  while (target.length > beach.length) target.pop();
  beach.forEach((find, i) => {
    let cell = target[i];
    if (!cell) {
      cell = new BeachFindState();
      target.push(cell);
    }
    if (cell.findId !== find.findId) cell.findId = find.findId;
    if (cell.col !== find.col) cell.col = find.col;
    if (cell.row !== find.row) cell.row = find.row;
  });
}

/** The beach as the rules see it. Finds that don't make sense are left out. */
export function readBeach(source: Iterable<BeachFindState>): Beach {
  return Array.from(source).flatMap((cell) => (isBeachFindId(cell.findId) ? [{ findId: cell.findId, col: cell.col, row: cell.row }] : []));
}

/** Copies the bugs out now in: adds new ones, drops caught or gone ones. A bug never changes once it's out. */
export function writeBugs(target: MapSchema<BugState>, bugs: readonly MeadowBug[]): void {
  const ids = new Set(bugs.map((bug) => bug.id));
  for (const id of [...target.keys()]) if (!ids.has(id)) target.delete(id);
  for (const bug of bugs) {
    if (target.has(bug.id)) continue;
    const cell = new BugState();
    cell.bugId = bug.bugId;
    cell.col = bug.col;
    cell.row = bug.row;
    target.set(bug.id, cell);
  }
}

/** The bugs as the rules see them. Bugs that don't make sense are left out. */
export function readBugs(source: MapSchema<BugState>): MeadowBug[] {
  const bugs: MeadowBug[] = [];
  source.forEach((cell, id) => {
    if (isBugId(cell.bugId)) bugs.push({ id, bugId: cell.bugId, col: cell.col, row: cell.row });
  });
  return bugs;
}

/** A book entry's key in the network state: "fish:sardine". */
export const bookKey = (section: BookSection, id: string) => `${section}:${id}`;

/** Copies the collection book in, entry by entry, writing only what changed. Entries never go away. */
export function writeBook(target: MapSchema<BookEntryState>, book: CollectionBook): void {
  for (const section of BOOK_SECTIONS) {
    for (const [id, entry] of Object.entries(book[section])) {
      if (!entry) continue;
      const key = bookKey(section, id);
      let cell = target.get(key);
      const isNew = !cell;
      if (!cell) cell = new BookEntryState();
      const count = "found" in entry ? entry.found : entry.caught;
      const biggestCm = "biggestCm" in entry ? entry.biggestCm : 0;
      const biggestBy = "biggestBy" in entry ? entry.biggestBy : "";
      if (cell.section !== section) cell.section = section;
      if (cell.id !== id) cell.id = id;
      if (cell.count !== count) cell.count = count;
      if (cell.firstDay !== entry.firstDay) cell.firstDay = entry.firstDay;
      if (cell.firstBy !== entry.firstBy) cell.firstBy = entry.firstBy;
      if (cell.biggestCm !== biggestCm) cell.biggestCm = biggestCm;
      if (cell.biggestBy !== biggestBy) cell.biggestBy = biggestBy;
      if (isNew) target.set(key, cell);
    }
  }
}

/** The collection book as the rules see it. Entries that don't make sense are left out. */
export function readBook(source: MapSchema<BookEntryState>): CollectionBook {
  const fish: Record<string, unknown> = {};
  const finds: Record<string, unknown> = {};
  const bugs: Record<string, unknown> = {};
  source.forEach((cell) => {
    const first = { firstDay: cell.firstDay, firstBy: cell.firstBy };
    if (cell.section === "fish" && isFishId(cell.id)) {
      fish[cell.id] = { caught: cell.count, ...first, biggestCm: cell.biggestCm, biggestBy: cell.biggestBy };
    } else if (cell.section === "finds" && isBeachFindId(cell.id)) {
      finds[cell.id] = { found: cell.count, ...first };
    } else if (cell.section === "bugs" && isBugId(cell.id)) {
      bugs[cell.id] = { caught: cell.count, ...first };
    }
  });
  return { ...EMPTY_BOOK, fish, finds, bugs } as CollectionBook;
}
