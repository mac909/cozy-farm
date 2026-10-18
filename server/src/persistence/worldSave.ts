import { CROPS, isCropId } from "../../../shared/content/crops";
import { ITEMS, isItemId, type ItemId } from "../../../shared/content/items";
import type { SaleLine } from "../../../shared/economy/shop";
import { ripeStage, type FarmTile } from "../../../shared/farming/farming";
import { INVENTORY_SLOTS, type Slot } from "../../../shared/inventory/inventory";
import { lookFrom } from "../../../shared/player";
import { DAY_END_MINUTE, DAY_START_MINUTE } from "../../../shared/time/clock";
import {
  isFarmerId,
  newWorld,
  parseTileKey,
  tileKey,
  type Farmer,
  type MorningReport,
  type TileKey,
  type World,
} from "../../../shared/world/world";
import { type Migration, type SaveFormat, type SaveJson, currentVersion } from "./saveFormat";

/** Id of the one shared world's save. */
export const WORLD_ID = "farm";

/** One dug farm tile in a save: where it is, and its state. */
export type SavedFarmTile = { col: number; row: number } & Exclude<FarmTile, { kind: "untilled" }>;

/**
 * Everything about the shared world that survives a restart: the World (shared/world/world.ts) as
 * JSON. Version 1.
 *
 * To change this shape once it has reached the real farm: add a migration below that turns the
 * previous version into the new one, then update this type, `validate` and the converters.
 * Renaming or removing a crop or item id is a migration too.
 */
export interface WorldSave {
  version: number;
  clock: { day: number; minute: number };
  coins: number;
  crate: { itemId: ItemId; count: number }[];
  /** Dug tiles only, sorted by row then column. */
  farm: SavedFarmTile[];
  farmers: Record<string, { name: string; character: string; bag: Slot[] }>;
  lastMorning: MorningReport | null;
}

/** Upgrades for old world saves, oldest first: the first turns version 1 into 2. */
const migrations: Migration[] = [
  // For example, version 1 → 2 adding beach finds:
  // (save) => ({ ...save, beach: [] }),
];

/** Biggest farm tile column or row a save may hold. The map is far smaller; this just catches nonsense. */
const MAX_TILE = 9999;

export const WORLD_SAVE: SaveFormat<WorldSave> = {
  migrations,
  validate(save) {
    const clock = object(save.clock, "clock");
    const farmers = object(save.farmers, "farmers");
    const seenTiles = new Set<string>();
    const seenCrate = new Set<string>();
    return {
      version: save.version as number,
      clock: {
        day: whole(clock.day, "clock.day", 1),
        minute: number(clock.minute, "clock.minute", DAY_START_MINUTE, DAY_END_MINUTE),
      },
      coins: whole(save.coins, "coins", 0),
      crate: array(save.crate, "crate").map((entry, i) => {
        const stack = crateEntry(entry, `crate[${i}]`);
        if (seenCrate.has(stack.itemId)) throw new Error(`crate has ${stack.itemId} twice`);
        seenCrate.add(stack.itemId);
        return stack;
      }),
      farm: array(save.farm, "farm").map((tile, i) => {
        const checked = farmTile(tile, `farm[${i}]`);
        const key = tileKey(checked.col, checked.row);
        if (seenTiles.has(key)) throw new Error(`farm has tile ${key} twice`);
        seenTiles.add(key);
        return checked;
      }),
      farmers: Object.fromEntries(
        Object.entries(farmers).map(([id, farmer]) => {
          if (!isFarmerId(id)) throw new Error(`farmers has an id that isn't one: ${JSON.stringify(id)}`);
          return [id, savedFarmer(farmer, `farmers.${id}`)];
        }),
      ),
      lastMorning: save.lastMorning === null ? null : morningReport(save.lastMorning, "lastMorning"),
    };
  },
};

/** The save for a brand-new world. */
export function newWorldSave(): WorldSave {
  return worldToSave(newWorld());
}

/** The world as a save. */
export function worldToSave(world: World): WorldSave {
  const farm = (Object.entries(world.farm) as [TileKey, FarmTile][])
    .flatMap(([key, tile]): SavedFarmTile[] => {
      const at = parseTileKey(key);
      return at && tile.kind !== "untilled" ? [{ ...at, ...tile }] : [];
    })
    .sort((a, b) => a.row - b.row || a.col - b.col);
  return {
    version: currentVersion(WORLD_SAVE),
    clock: { day: world.clock.day, minute: world.clock.minute },
    coins: world.coins,
    crate: world.crate.map(({ itemId, count }) => ({ itemId, count })),
    farm,
    farmers: Object.fromEntries(
      Object.entries(world.farmers).map(([id, farmer]) => [
        id,
        { name: farmer.name, character: farmer.character, bag: farmer.bag.map((slot) => slot && { ...slot }) },
      ]),
    ),
    lastMorning: world.lastMorning,
  };
}

/** The world from a save that has passed `validate`. */
export function worldFromSave(save: WorldSave): World {
  const farm: Record<TileKey, FarmTile> = {};
  for (const { col, row, ...tile } of save.farm) farm[tileKey(col, row)] = tile as FarmTile;
  const farmers: Record<string, Farmer> = {};
  for (const [id, farmer] of Object.entries(save.farmers)) {
    farmers[id] = { ...lookFrom(farmer), bag: farmer.bag };
  }
  return {
    clock: { ...save.clock },
    coins: save.coins,
    crate: save.crate,
    farm,
    farmers,
    lastMorning: save.lastMorning,
  };
}

// ---------- checking each part ----------

function object(value: unknown, path: string): SaveJson {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${path} should be an object`);
  return value as SaveJson;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} should be a list`);
  return value;
}

function whole(value: unknown, path: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`${path} should be a whole number from ${min}${max < Number.MAX_SAFE_INTEGER ? ` to ${max}` : " up"}, not ${JSON.stringify(value)}`);
  }
  return value as number;
}

function number(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${path} should be a number from ${min} to ${max}, not ${JSON.stringify(value)}`);
  }
  return value;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${path} should be true or false, not ${JSON.stringify(value)}`);
  return value;
}

function itemId(value: unknown, path: string): ItemId {
  if (!isItemId(value)) throw new Error(`${path} isn't an item the game knows: ${JSON.stringify(value)}`);
  return value;
}

/** A stack in the crate: any whole number of a sellable or unsellable item (the crate has no stack limit). */
function crateEntry(value: unknown, path: string): { itemId: ItemId; count: number } {
  const entry = object(value, path);
  return { itemId: itemId(entry.itemId, `${path}.itemId`), count: whole(entry.count, `${path}.count`, 1) };
}

/** A stack in a bag: 1 up to the item's stack size. */
function bagStack(value: unknown, path: string): Slot {
  if (value === null) return null;
  const entry = object(value, path);
  const id = itemId(entry.itemId, `${path}.itemId`);
  return { itemId: id, count: whole(entry.count, `${path}.count`, 1, ITEMS[id].maxStack) };
}

/**
 * A dug tile. A crop's stage and days are kept within its crop's numbers rather than refused, so
 * tuning growth times in crops.ts never stops a save from loading.
 */
function farmTile(value: unknown, path: string): SavedFarmTile {
  const tile = object(value, path);
  const col = whole(tile.col, `${path}.col`, 0, MAX_TILE);
  const row = whole(tile.row, `${path}.row`, 0, MAX_TILE);
  const watered = boolean(tile.watered, `${path}.watered`);
  if (tile.kind === "tilled") return { col, row, kind: "tilled", watered };
  if (tile.kind !== "planted") throw new Error(`${path}.kind should be "tilled" or "planted", not ${JSON.stringify(tile.kind)}`);
  if (!isCropId(tile.cropId)) throw new Error(`${path}.cropId isn't a crop the game knows: ${JSON.stringify(tile.cropId)}`);
  const crop = CROPS[tile.cropId];
  const stage = Math.min(whole(tile.stage, `${path}.stage`, 0), ripeStage(crop));
  const daysInStage = Math.min(whole(tile.daysInStage, `${path}.daysInStage`, 0), crop.daysPerStage - 1);
  return { col, row, kind: "planted", watered, cropId: tile.cropId, stage, daysInStage };
}

function savedFarmer(value: unknown, path: string): WorldSave["farmers"][string] {
  const farmer = object(value, path);
  const bag = array(farmer.bag, `${path}.bag`);
  if (bag.length !== INVENTORY_SLOTS) throw new Error(`${path}.bag should have ${INVENTORY_SLOTS} slots, not ${bag.length}`);
  // An odd name or character never blocks the farm: they're tidied up like any other look.
  const look = lookFrom(farmer);
  return { name: look.name, character: look.character, bag: bag.map((slot, i) => bagStack(slot, `${path}.bag[${i}]`)) };
}

function morningReport(value: unknown, path: string): MorningReport {
  const report = object(value, path);
  const sale = object(report.sale, `${path}.sale`);
  return {
    day: whole(report.day, `${path}.day`, 1),
    grew: whole(report.grew, `${path}.grew`, 0),
    ready: whole(report.ready, `${path}.ready`, 0),
    coins: whole(report.coins, `${path}.coins`, 0),
    sale: {
      lines: array(sale.lines, `${path}.sale.lines`).map((line, i): SaleLine => {
        const at = `${path}.sale.lines[${i}]`;
        const entry = object(line, at);
        return {
          itemId: itemId(entry.itemId, `${at}.itemId`),
          count: whole(entry.count, `${at}.count`, 1),
          priceEach: whole(entry.priceEach, `${at}.priceEach`, 0),
          total: whole(entry.total, `${at}.total`, 0),
        };
      }),
      total: whole(sale.total, `${path}.sale.total`, 0),
    },
  };
}
