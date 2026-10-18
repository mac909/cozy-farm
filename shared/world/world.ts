import type { Beach } from "../beachcombing/beachcombing";
import { EMPTY_BOOK, type CollectionBook } from "../collection/collection";
import type { BeachFindId } from "../content/beachFinds";
import type { CharacterId } from "../content/characters";
import type { PlacedPiece } from "../decor/pieces";
import { EMPTY_CRATE, type Crate, type CrateSale } from "../economy/shop";
import { STARTING_COINS } from "../economy/wallet";
import { UNTILLED, type FarmTile } from "../farming/farming";
import { FISHING_ROD } from "../content/items";
import { addItems, countOf, starterInventory, type Inventory } from "../inventory/inventory";
import type { Look } from "../player";
import { newClock, type GameClock } from "../time/clock";
import type { ForageId } from "../content/forage";
import type { Forage } from "../foraging/forage";
import { EMPTY_VILLAGE, type BuiltStep, type Village } from "../village/village";
import { EMPTY_PROGRESS, type FarmerProgress } from "../progress/farmerProgress";

/**
 * The whole shared world, as plain data. The server keeps one of these as the source of truth: the
 * rules change it (always returning a new one), the room copies it into the network state, and the
 * save is written from it. It has the same shape as the save (server/src/persistence/worldSave.ts).
 */
export interface World {
  readonly clock: GameClock;
  /** The shared wallet. */
  readonly coins: number;
  /** The shipping crate on the dock. */
  readonly crate: Crate;
  /** Dug tiles only, keyed by tileKey(). A tile that isn't here is untouched grass. */
  readonly farm: Readonly<Record<TileKey, FarmTile>>;
  /** Everyone who has ever played, by id. */
  readonly farmers: Readonly<Record<FarmerId, Farmer>>;
  /** What happened on the last night, for whoever wasn't there to see it. */
  readonly lastMorning: MorningReport | null;
  /** The cottages someone has moved into, by house id ("house1"), with what's inside. */
  readonly houses: Readonly<Record<HouseId, House>>;
  /** Decorations on the shared farm, in map tiles. */
  readonly decorations: readonly PlacedPiece[];
  /** The world's own random number, picked once: what washes up on the beach and which bugs come out follow from it. */
  readonly worldSeed: number;
  /** What's lying on the sand, and the day the tide last brought something. */
  readonly beach: BeachState;
  /** The shared collection book: every fish, beach find and bug found so far. */
  readonly book: CollectionBook;
  /** Marlow and the village's projects (Milestone 6). */
  readonly village: Village;
  /** Driftwood and branches lying about, and the day the morning last brought some (Milestone 6). */
  readonly forage: ForageState;
}

/** The beach: finds lying on the sand, in the order they washed up, and the day of the last tide (0: never). */
export interface BeachState {
  readonly day: number;
  readonly finds: Beach;
}

/** Materials on the ground, in the order they turned up, and the day the morning last brought some (0: never). */
export interface ForageState {
  readonly day: number;
  readonly items: Forage;
}

/** A cottage's name in the map ("house1"). */
export type HouseId = string;

/** A cottage someone lives in: theirs to arrange, anyone's to visit. */
export interface House {
  readonly owner: FarmerId;
  /** In tiles from the room's top-left floor tile. Later pieces draw over earlier ones. */
  readonly furniture: readonly PlacedPiece[];
}

/** A person who plays: their look, their own bag, and their own skills and badges. Bags belong to farmers, not devices. */
export interface Farmer {
  readonly name: string;
  readonly character: CharacterId;
  readonly bag: Inventory;
  /** Skills, the counts badges go by, and badges earned (Milestone 7). */
  readonly progress: FarmerProgress;
}

/** Made by the server (never the client), kept on the device, and sent when joining. */
export type FarmerId = string;

/** A farm tile's key: "col,row". */
export type TileKey = `${number},${number}`;

/** What the night did, for the morning card. */
export interface MorningReport {
  /** The day that's starting. */
  readonly day: number;
  /** Crops that grew a day overnight (watered and not yet ripe). */
  readonly grew: number;
  /** Crops ripe on the farm this morning. */
  readonly ready: number;
  /** What the shipping crate sold. */
  readonly sale: CrateSale;
  /** Coins in the wallet after the sale. */
  readonly coins: number;
  /** What washed up on the beach this morning, in order. */
  readonly washedUp: readonly BeachFindId[];
  /** The driftwood and branches that turned up this morning, in order (Milestone 6). */
  readonly foraged: readonly ForageId[];
  /** What was built overnight, for the card's "In the village" (Milestone 6). */
  readonly built: readonly BuiltStep[];
}

/**
 * Day 1, 6 am, the starting coins, an empty farm and crate, nobody yet, every cottage empty, an
 * empty beach (the first tide comes when the room starts), an empty book, no Marlow yet (he comes
 * on the morning of day 2) and nothing lying about. `worldSeed` is any whole number; the server
 * picks a random one for a new world.
 */
export function newWorld(worldSeed = 0): World {
  return {
    clock: newClock(),
    coins: STARTING_COINS,
    crate: EMPTY_CRATE,
    farm: {},
    farmers: {},
    lastMorning: null,
    houses: {},
    decorations: [],
    worldSeed: worldSeed >>> 0,
    beach: { day: 0, finds: [] },
    book: EMPTY_BOOK,
    village: EMPTY_VILLAGE,
    forage: { day: 0, items: [] },
  };
}

/** A fresh world seed, for a new world. */
export function randomWorldSeed(): number {
  return Math.floor(Math.random() * 2 ** 32) >>> 0;
}

export function tileKey(col: number, row: number): TileKey {
  return `${col},${row}`;
}

/** The column and row in a tile key, or null if it isn't one. */
export function parseTileKey(key: string): { col: number; row: number } | null {
  const match = /^(\d{1,5}),(\d{1,5})$/.exec(key);
  return match ? { col: Number(match[1]), row: Number(match[2]) } : null;
}

/** The state of one farm tile; anything never dug is UNTILLED. */
export function farmTileAt(world: World, col: number, row: number): FarmTile {
  const key = tileKey(col, row);
  return Object.hasOwn(world.farm, key) ? world.farm[key] : UNTILLED;
}

/** The world with one farm tile changed. Untilled tiles aren't stored. */
export function setFarmTile(world: World, col: number, row: number, tile: FarmTile): World {
  const key = tileKey(col, row);
  const farm = { ...world.farm };
  if (tile.kind === "untilled") delete farm[key];
  else farm[key] = tile;
  return { ...world, farm };
}

/** A farmer id as the server makes them (letters, digits and dashes), safe to use as an object key. */
export function isFarmerId(value: unknown): value is FarmerId {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/.test(value);
}

export function farmerOf(world: World, id: FarmerId): Farmer | undefined {
  return Object.hasOwn(world.farmers, id) ? world.farmers[id] : undefined;
}

/** A new farmer with the starter bag, at level 1 in everything. A farmer who already exists is left as they are. */
export function addFarmer(world: World, id: FarmerId, look: Look): World {
  if (farmerOf(world, id)) return world;
  const farmer: Farmer = { name: look.name, character: look.character, bag: starterInventory(), progress: EMPTY_PROGRESS };
  return { ...world, farmers: { ...world.farmers, [id]: farmer } };
}

/** Changes a farmer's name and character. Their bag stays. */
export function setFarmerLook(world: World, id: FarmerId, look: Look): World {
  const farmer = farmerOf(world, id);
  if (!farmer || (farmer.name === look.name && farmer.character === look.character)) return world;
  return { ...world, farmers: { ...world.farmers, [id]: { ...farmer, name: look.name, character: look.character } } };
}

/**
 * Gives a farmer a fishing rod if they haven't one and there's room (farmers from before Milestone
 * 5 whose bags were full when the save was upgraded). Everyone else is left as they are.
 */
export function giveFishingRod(world: World, id: FarmerId): World {
  const farmer = farmerOf(world, id);
  if (!farmer || countOf(farmer.bag, FISHING_ROD) > 0) return world;
  const added = addItems(farmer.bag, FISHING_ROD, 1);
  return added.ok ? setFarmerBag(world, id, added.inventory) : world;
}

/** Replaces a farmer's bag. */
export function setFarmerBag(world: World, id: FarmerId, bag: Inventory): World {
  const farmer = farmerOf(world, id);
  if (!farmer) return world;
  return { ...world, farmers: { ...world.farmers, [id]: { ...farmer, bag } } };
}

/** Replaces a farmer's progress (skills, counts, badges). */
export function setFarmerProgress(world: World, id: FarmerId, progress: FarmerProgress): World {
  const farmer = farmerOf(world, id);
  if (!farmer) return world;
  return { ...world, farmers: { ...world.farmers, [id]: { ...farmer, progress } } };
}

/** Everyone who has played, in the order they first joined: for the Who's playing screen. */
export function listFarmers(world: World): { id: FarmerId; name: string; character: CharacterId }[] {
  return Object.entries(world.farmers).map(([id, { name, character }]) => ({ id, name, character }));
}
