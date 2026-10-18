import type { BugEntry, CollectionBook, FindEntry, FishEntry } from "../../../shared/collection/collection";
import { isBeachFindId, type BeachFindId } from "../../../shared/content/beachFinds";
import { isBugId } from "../../../shared/content/bugs";
import { CROPS, isCropId } from "../../../shared/content/crops";
import { isFishId } from "../../../shared/content/fish";
import { isForageId, type ForageId } from "../../../shared/content/forage";
import { isProjectId, needKey, projectDef, type ProjectDef } from "../../../shared/content/projects";
import { isBadgeId } from "../../../shared/content/badges";
import { SKILL_IDS } from "../../../shared/content/skills";
import { isStatId, type FarmerProgress } from "../../../shared/progress/farmerProgress";
import type { BuiltStep } from "../../../shared/village/village";
import { FURNITURE, isFurnitureId } from "../../../shared/content/furniture";
import type { PlacedPiece } from "../../../shared/decor/pieces";
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
  type House,
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
 * JSON. Version 2: version 1 (Milestone 2) plus the houses and the farm's decorations (Milestone 4).
 * Version 3: plus the world seed, the beach and the collection book (Milestone 5).
 * Version 4: plus the village (Marlow and the projects) and the driftwood and branches lying about (Milestone 6).
 * Version 5: plus each farmer's progress (skills, the counts badges go by, badges and gifts), house
 * upgrades among the projects ("house1:porch"), and regrown crops marked on the farm (Milestone 7).
 * Version 6: plus the day spring first came (`yearStart`, Milestone 8). The garden shop is a project
 * like the lighthouse, and its seeds and tool upgrades are new items, so nothing else changes shape.
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
  farmers: Record<string, { name: string; character: string; bag: Slot[]; progress: FarmerProgress }>;
  lastMorning: MorningReport | null;
  /** The cottages someone has moved into, by house id: who lives there and their furniture (in floor tiles). Since version 2. */
  houses: Record<string, { owner: string; furniture: SavedPiece[] }>;
  /** Decorations on the farm, in map tiles. Since version 2. */
  decorations: SavedPiece[];
  /** The world's own random number (beach finds and bugs follow from it). Since version 3. */
  worldSeed: number;
  /** What's lying on the sand, and the day of the last tide (0: never). Since version 3. */
  beach: { day: number; finds: { findId: BeachFindId; col: number; row: number }[] };
  /** The shared collection book. Since version 3. */
  book: CollectionBook;
  /** When Marlow arrived (0: not yet) and how far each project has got. Since version 4. */
  village: { keeperDay: number; projects: Record<string, SavedProject> };
  /** Driftwood and branches lying about, and the day the morning last brought some (0: never). Since version 4. */
  forage: { day: number; items: { itemId: ForageId; col: number; row: number }[] };
  /** The day spring first came, when the garden shop opened (0: not yet). Since version 6. */
  yearStart: number;
}

/** A project's progress in a save (see shared/village/village.ts). */
export type SavedProject = { gathered: number; built: number; given: Record<string, number>; helpers: string[]; doneDay: number | null };

/** A piece of furniture or a decoration in a save. */
export type SavedPiece = { itemId: string; col: number; row: number; turn: number };

/**
 * Upgrades for old world saves, oldest first: the first turns version 1 into 2. Never edit one
 * that has shipped; add another. Each has its fixture in fixtures/ (oldSaves.test.ts).
 */
const migrations: Migration[] = [
  // 1 → 2 (Milestone 4): houses and decorations. Every cottage starts empty, ready for whoever
  // moves in, and the farm has no decorations yet. Nothing else changes.
  (save) => ({ ...save, houses: {}, decorations: [] }),
  // 2 → 3 (Milestone 5): the world seed, an empty beach (the first tide comes when the server
  // starts), an empty collection book, an empty "washed up" on the last morning, and a fishing rod
  // in every farmer's first empty bag slot (a full bag gets one when its farmer next joins).
  (save) => ({
    ...save,
    worldSeed: seedFromFarmers(save.farmers),
    beach: { day: 0, finds: [] },
    book: { fish: {}, finds: {}, bugs: {} },
    lastMorning: isJsonObject(save.lastMorning) ? { ...save.lastMorning, washedUp: [] } : save.lastMorning,
    farmers: isJsonObject(save.farmers)
      ? Object.fromEntries(Object.entries(save.farmers).map(([id, farmer]) => [id, withRod(farmer)]))
      : save.farmers,
  }),
  // 3 → 4 (Milestone 6): an empty village (Marlow hasn't arrived, nothing started), nothing lying
  // about, and empty "foraged" and "built" lists on the last morning. Only empty things: Marlow and
  // the storm come when the server first starts (shared/world/night.ts), not here.
  (save) => ({
    ...save,
    village: { keeperDay: 0, projects: {} },
    forage: { day: 0, items: [] },
    lastMorning: isJsonObject(save.lastMorning) ? { ...save.lastMorning, foraged: [], built: [] } : save.lastMorning,
  }),
  // 4 → 5 (Milestone 7): every farmer starts at level 1 in every skill, with nothing counted, no
  // badges and no gifts: nobody gets experience for play before skills existed. Badges that follow
  // from the world as it is (a cottage of your own, the lighthouse lit) come on first joining, not
  // here. Everything else comes through untouched.
  (save) => ({
    ...save,
    farmers: isJsonObject(save.farmers)
      ? Object.fromEntries(
          Object.entries(save.farmers).map(([id, farmer]) => [
            id,
            isJsonObject(farmer)
              ? {
                  ...farmer,
                  progress: {
                    xp: { farming: 0, fishing: 0, foraging: 0 },
                    today: { day: 0, xp: { farming: 0, fishing: 0, foraging: 0 } },
                    stats: {},
                    kinds: [],
                    badges: {},
                    gifts: [],
                  },
                }
              : farmer,
          ]),
        )
      : save.farmers,
  }),
  // 5 → 6 (Milestone 8): no seasons yet: they begin the morning the garden shop opens, and the
  // garden shop is a new project, so nobody's world has it started. Old tools stay as they are
  // (an upgraded tool is a new item), and everything else comes through untouched.
  (save) => ({ ...save, yearStart: 0 }),
];

function isJsonObject(value: unknown): value is SaveJson {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A world seed for a save made before seeds existed: a hash (FNV-1a) of the farmers' ids, so
 * upgrading the same save always gives the same beach. Written out here so it never changes.
 */
function seedFromFarmers(farmers: unknown): number {
  const text = isJsonObject(farmers) ? Object.keys(farmers).sort().join(",") : "";
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return hash >>> 0;
}

/** A saved farmer with a fishing rod in the first empty slot of their bag, unless they have one or it's full. */
function withRod(farmer: unknown): unknown {
  if (!isJsonObject(farmer) || !Array.isArray(farmer.bag)) return farmer;
  const bag = farmer.bag as unknown[];
  if (bag.some((slot) => isJsonObject(slot) && slot.itemId === "fishing_rod")) return farmer;
  const empty = bag.indexOf(null);
  if (empty < 0) return farmer;
  return { ...farmer, bag: bag.map((slot, i) => (i === empty ? { itemId: "fishing_rod", count: 1 } : slot)) };
}

/** Biggest farm tile column or row a save may hold. The map is far smaller; this just catches nonsense. */
const MAX_TILE = 9999;

export const WORLD_SAVE: SaveFormat<WorldSave> = {
  migrations,
  validate(save) {
    const clock = object(save.clock, "clock");
    const farmers = object(save.farmers, "farmers");
    const seenTiles = new Set<string>();
    const seenCrate = new Set<string>();
    const owners = new Set<string>();
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
      houses: Object.fromEntries(
        Object.entries(object(save.houses, "houses")).map(([id, house]) => {
          if (!/^[A-Za-z0-9_-]{1,32}$/.test(id)) throw new Error(`houses has an id that isn't one: ${JSON.stringify(id)}`);
          const checked = savedHouse(house, `houses.${id}`, farmers);
          if (owners.has(checked.owner)) throw new Error(`houses.${id}: ${checked.owner} already has another house`);
          owners.add(checked.owner);
          return [id, checked];
        }),
      ),
      decorations: array(save.decorations, "decorations").map((piece, i) => savedPiece(piece, `decorations[${i}]`)),
      worldSeed: whole(save.worldSeed, "worldSeed", 0, 0xffffffff),
      beach: savedBeach(save.beach, "beach"),
      book: savedBook(save.book, "book"),
      village: savedVillage(save.village, "village", farmers),
      forage: savedForage(save.forage, "forage"),
      yearStart: whole(save.yearStart, "yearStart", 0),
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
        { name: farmer.name, character: farmer.character, bag: farmer.bag.map((slot) => slot && { ...slot }), progress: progressToSave(farmer.progress) },
      ]),
    ),
    lastMorning: world.lastMorning,
    houses: Object.fromEntries(
      Object.entries(world.houses).map(([id, house]) => [id, { owner: house.owner, furniture: house.furniture.map(pieceToSave) }]),
    ),
    decorations: world.decorations.map(pieceToSave),
    worldSeed: world.worldSeed,
    beach: { day: world.beach.day, finds: world.beach.finds.map(({ findId, col, row }) => ({ findId, col, row })) },
    book: world.book,
    village: {
      keeperDay: world.village.keeperDay,
      projects: Object.fromEntries(
        Object.entries(world.village.projects).map(([id, p]): [string, SavedProject] => [
          id,
          { gathered: p.gathered, built: p.built, given: { ...p.given }, helpers: [...p.helpers], doneDay: p.doneDay },
        ]),
      ),
    },
    forage: { day: world.forage.day, items: world.forage.items.map(({ itemId, col, row }) => ({ itemId, col, row })) },
    yearStart: world.yearStart,
  };
}

const pieceToSave = ({ itemId, col, row, turn }: PlacedPiece): SavedPiece => ({ itemId, col, row, turn });

/** A farmer's progress as plain JSON (copies, so the save never shares objects with the world). */
function progressToSave(progress: FarmerProgress): FarmerProgress {
  return {
    xp: { ...progress.xp },
    today: { day: progress.today.day, xp: { ...progress.today.xp } },
    stats: { ...progress.stats },
    kinds: [...progress.kinds],
    badges: { ...progress.badges },
    gifts: [...progress.gifts],
  };
}

/** A saved piece as the rules see it (it has passed `validate`, so its item is furniture). */
const pieceFromSave = (piece: SavedPiece): PlacedPiece => piece as PlacedPiece;

/** The world from a save that has passed `validate`. */
export function worldFromSave(save: WorldSave): World {
  const farm: Record<TileKey, FarmTile> = {};
  for (const { col, row, ...tile } of save.farm) farm[tileKey(col, row)] = tile as FarmTile;
  const farmers: Record<string, Farmer> = {};
  for (const [id, farmer] of Object.entries(save.farmers)) {
    farmers[id] = { ...lookFrom(farmer), bag: farmer.bag, progress: farmer.progress };
  }
  return {
    clock: { ...save.clock },
    coins: save.coins,
    crate: save.crate,
    farm,
    farmers,
    lastMorning: save.lastMorning,
    houses: Object.fromEntries(
      Object.entries(save.houses).map(([id, house]): [string, House] => [id, { owner: house.owner, furniture: house.furniture.map(pieceFromSave) }]),
    ),
    decorations: save.decorations.map(pieceFromSave),
    worldSeed: save.worldSeed,
    beach: { day: save.beach.day, finds: save.beach.finds },
    book: save.book,
    village: save.village,
    forage: save.forage,
    yearStart: save.yearStart,
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
  const regrown = tile.regrown === undefined ? false : boolean(tile.regrown, `${path}.regrown`);
  if (tile.kind !== "planted") throw new Error(`${path}.kind should be "tilled" or "planted", not ${JSON.stringify(tile.kind)}`);
  if (!isCropId(tile.cropId)) throw new Error(`${path}.cropId isn't a crop the game knows: ${JSON.stringify(tile.cropId)}`);
  const crop = CROPS[tile.cropId];
  const stage = Math.min(whole(tile.stage, `${path}.stage`, 0), ripeStage(crop));
  const daysInStage = Math.min(whole(tile.daysInStage, `${path}.daysInStage`, 0), crop.daysPerStage - 1);
  return { col, row, kind: "planted", watered, cropId: tile.cropId, stage, daysInStage, ...(regrown ? { regrown: true as const } : {}) };
}

function savedFarmer(value: unknown, path: string): WorldSave["farmers"][string] {
  const farmer = object(value, path);
  const bag = array(farmer.bag, `${path}.bag`);
  if (bag.length !== INVENTORY_SLOTS) throw new Error(`${path}.bag should have ${INVENTORY_SLOTS} slots, not ${bag.length}`);
  // An odd name or character never blocks the farm: they're tidied up like any other look.
  const look = lookFrom(farmer);
  return {
    name: look.name,
    character: look.character,
    bag: bag.map((slot, i) => bagStack(slot, `${path}.bag[${i}]`)),
    progress: savedProgress(farmer.progress, `${path}.progress`),
  };
}

/**
 * A farmer's progress (since version 5). Unknown skills, counts, badges and items stop the load,
 * like an unknown item in a bag: renaming one is a migration.
 */
function savedProgress(value: unknown, path: string): FarmerProgress {
  const progress = object(value, path);
  const skills = (raw: unknown, at: string) => {
    const xp = object(raw, at);
    for (const key of Object.keys(xp)) if (!(SKILL_IDS as readonly string[]).includes(key)) throw new Error(`${at} has a skill the game doesn't know: ${JSON.stringify(key)}`);
    return { farming: whole(xp.farming, `${at}.farming`, 0), fishing: whole(xp.fishing, `${at}.fishing`, 0), foraging: whole(xp.foraging, `${at}.foraging`, 0) };
  };
  const today = object(progress.today, `${path}.today`);
  const stats: Record<string, number> = {};
  for (const [key, count] of Object.entries(object(progress.stats, `${path}.stats`))) {
    if (!isStatId(key)) throw new Error(`${path}.stats has a count the game doesn't know: ${JSON.stringify(key)}`);
    stats[key] = whole(count, `${path}.stats.${key}`, 0);
  }
  const badges: Record<string, number> = {};
  for (const [key, day] of Object.entries(object(progress.badges, `${path}.badges`))) {
    if (!isBadgeId(key)) throw new Error(`${path}.badges has a badge the game doesn't know: ${JSON.stringify(key)}`);
    badges[key] = whole(day, `${path}.badges.${key}`, 1);
  }
  const items = (raw: unknown, at: string) => [...new Set(array(raw, at).map((id, i) => itemId(id, `${at}[${i}]`)))];
  return {
    xp: skills(progress.xp, `${path}.xp`),
    today: { day: whole(today.day, `${path}.today.day`, 0), xp: skills(today.xp, `${path}.today.xp`) },
    stats,
    kinds: items(progress.kinds, `${path}.kinds`),
    badges,
    gifts: items(progress.gifts, `${path}.gifts`),
  };
}

/**
 * A piece of furniture or a decoration. A turn the piece no longer has (its art was changed in
 * furniture.ts) goes back to its first, rather than stopping the save from loading.
 */
function savedPiece(value: unknown, path: string): SavedPiece {
  const piece = object(value, path);
  if (!isFurnitureId(piece.itemId)) throw new Error(`${path}.itemId isn't furniture the game knows: ${JSON.stringify(piece.itemId)}`);
  const turn = whole(piece.turn, `${path}.turn`, 0);
  return {
    itemId: piece.itemId,
    col: whole(piece.col, `${path}.col`, 0, MAX_TILE),
    row: whole(piece.row, `${path}.row`, 0, MAX_TILE),
    turn: turn < FURNITURE[piece.itemId].turns.length ? turn : 0,
  };
}

/** A house: whose it is (a farmer in this save) and what's in it. */
function savedHouse(value: unknown, path: string, farmers: SaveJson): WorldSave["houses"][string] {
  const house = object(value, path);
  if (!isFarmerId(house.owner) || !Object.hasOwn(farmers, house.owner)) {
    throw new Error(`${path}.owner isn't a farmer in this save: ${JSON.stringify(house.owner)}`);
  }
  return { owner: house.owner, furniture: array(house.furniture, `${path}.furniture`).map((piece, i) => savedPiece(piece, `${path}.furniture[${i}]`)) };
}

/** What's on the beach: each find on its own tile. */
function savedBeach(value: unknown, path: string): WorldSave["beach"] {
  const beach = object(value, path);
  const seen = new Set<string>();
  return {
    day: whole(beach.day, `${path}.day`, 0),
    finds: array(beach.finds, `${path}.finds`).map((entry, i) => {
      const at = `${path}.finds[${i}]`;
      const find = object(entry, at);
      if (!isBeachFindId(find.findId)) throw new Error(`${at}.findId isn't a beach find the game knows: ${JSON.stringify(find.findId)}`);
      const col = whole(find.col, `${at}.col`, 0, MAX_TILE);
      const row = whole(find.row, `${at}.row`, 0, MAX_TILE);
      const key = tileKey(col, row);
      if (seen.has(key)) throw new Error(`${path}.finds has two things on tile ${key}`);
      seen.add(key);
      return { findId: find.findId, col, row };
    }),
  };
}

/** A name in the book (the finder's name at the time). */
function finderName(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length > 64) throw new Error(`${path} should be a name, not ${JSON.stringify(value)}`);
  return value;
}

/** The collection book: entries only for things the game knows. */
function savedBook(value: unknown, path: string): CollectionBook {
  const book = object(value, path);
  const section = <T>(name: string, known: (id: unknown) => boolean, entry: (value: SaveJson, at: string) => T): Record<string, T> =>
    Object.fromEntries(
      Object.entries(object(book[name], `${path}.${name}`)).map(([id, value]) => {
        const at = `${path}.${name}.${id}`;
        if (!known(id)) throw new Error(`${path}.${name} has something the game doesn't know: ${JSON.stringify(id)}`);
        return [id, entry(object(value, at), at)];
      }),
    );
  return {
    fish: section(
      "fish",
      isFishId,
      (e, at): FishEntry => ({
        caught: whole(e.caught, `${at}.caught`, 1),
        firstDay: whole(e.firstDay, `${at}.firstDay`, 1),
        firstBy: finderName(e.firstBy, `${at}.firstBy`),
        biggestCm: whole(e.biggestCm, `${at}.biggestCm`, 1),
        biggestBy: finderName(e.biggestBy, `${at}.biggestBy`),
      }),
    ),
    finds: section(
      "finds",
      isBeachFindId,
      (e, at): FindEntry => ({
        found: whole(e.found, `${at}.found`, 1),
        firstDay: whole(e.firstDay, `${at}.firstDay`, 1),
        firstBy: finderName(e.firstBy, `${at}.firstBy`),
      }),
    ),
    bugs: section(
      "bugs",
      isBugId,
      (e, at): BugEntry => ({
        caught: whole(e.caught, `${at}.caught`, 1),
        firstDay: whole(e.firstDay, `${at}.firstDay`, 1),
        firstBy: finderName(e.firstBy, `${at}.firstBy`),
      }),
    ),
  };
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
    washedUp: array(report.washedUp, `${path}.washedUp`).map((id, i) => {
      if (!isBeachFindId(id)) throw new Error(`${path}.washedUp[${i}] isn't a beach find the game knows: ${JSON.stringify(id)}`);
      return id;
    }),
    foraged: array(report.foraged, `${path}.foraged`).map((id, i) => {
      if (!isForageId(id)) throw new Error(`${path}.foraged[${i}] isn't something that turns up on the ground: ${JSON.stringify(id)}`);
      return id;
    }),
    built: array(report.built, `${path}.built`).map((entry, i): BuiltStep => {
      const at = `${path}.built[${i}]`;
      const built = object(entry, at);
      if (!isProjectId(built.project)) throw new Error(`${at}.project isn't a project the game knows: ${JSON.stringify(built.project)}`);
      return { project: built.project, step: whole(built.step, `${at}.step`, 0, projectDef(built.project)!.steps.length - 1) };
    }),
  };
}

/**
 * The village. An unknown project stops the load, like an unknown item (renaming one is a
 * migration); house upgrades ("house1:porch", since version 5) are projects too. Its numbers are kept within today's project data rather than refused, so tuning a
 * step never stops a save loading: steps past the end are dropped, gifts to needs a step no longer
 * has are dropped, and a step whose needs are now all in counts as gathered (to be built tonight).
 * Helpers who aren't farmers in this save are left out.
 */
function savedVillage(value: unknown, path: string, farmers: SaveJson): WorldSave["village"] {
  const village = object(value, path);
  return {
    keeperDay: whole(village.keeperDay, `${path}.keeperDay`, 0),
    projects: Object.fromEntries(
      Object.entries(object(village.projects, `${path}.projects`)).map(([id, entry]) => {
        const at = `${path}.projects.${id}`;
        if (!isProjectId(id)) throw new Error(`${path}.projects has a project the game doesn't know: ${JSON.stringify(id)}`);
        return [id, savedProject(projectDef(id)!, object(entry, at), at, farmers)];
      }),
    ),
  };
}

function savedProject(project: ProjectDef, entry: SaveJson, path: string, farmers: SaveJson): SavedProject {
  const steps = project.steps.length;
  let gathered = Math.min(whole(entry.gathered, `${path}.gathered`, 0), steps);
  const built = Math.min(whole(entry.built, `${path}.built`, 0), gathered);
  const given: Record<string, number> = {};
  const rawGiven = object(entry.given, `${path}.given`);
  const giving = gathered === built && gathered < steps ? project.steps[gathered] : null;
  for (const [key, count] of Object.entries(rawGiven)) {
    const n = whole(count, `${path}.given.${key}`, 0);
    const need = giving?.needs.find((nd) => needKey(nd) === key);
    if (need && n > 0) given[key] = Math.min(n, need.count);
  }
  let keptGiven = given;
  if (giving && giving.needs.every((need) => (given[needKey(need)] ?? 0) >= need.count)) {
    gathered += 1;
    keptGiven = {};
  }
  const helpers = [...new Set(array(entry.helpers, `${path}.helpers`).filter((id): id is string => isFarmerId(id) && Object.hasOwn(farmers, id)))];
  const doneDay = entry.doneDay === null || entry.doneDay === undefined ? null : whole(entry.doneDay, `${path}.doneDay`, 1);
  return { gathered, built, given: keptGiven, helpers, doneDay: built >= steps ? doneDay : null };
}

/** What's lying about: each driftwood or branch on its own tile. */
function savedForage(value: unknown, path: string): WorldSave["forage"] {
  const forage = object(value, path);
  const seen = new Set<string>();
  return {
    day: whole(forage.day, `${path}.day`, 0),
    items: array(forage.items, `${path}.items`).map((entry, i) => {
      const at = `${path}.items[${i}]`;
      const item = object(entry, at);
      if (!isForageId(item.itemId)) throw new Error(`${at}.itemId isn't something that turns up on the ground: ${JSON.stringify(item.itemId)}`);
      const col = whole(item.col, `${at}.col`, 0, MAX_TILE);
      const row = whole(item.row, `${at}.row`, 0, MAX_TILE);
      const key = tileKey(col, row);
      if (seen.has(key)) throw new Error(`${path}.items has two things on tile ${key}`);
      seen.add(key);
      return { itemId: item.itemId, col, row };
    }),
  };
}
