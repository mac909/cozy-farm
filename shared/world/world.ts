import type { CharacterId } from "../content/characters";
import type { PlacedPiece } from "../decor/pieces";
import { EMPTY_CRATE, type Crate, type CrateSale } from "../economy/shop";
import { STARTING_COINS } from "../economy/wallet";
import { UNTILLED, type FarmTile } from "../farming/farming";
import { starterInventory, type Inventory } from "../inventory/inventory";
import type { Look } from "../player";
import { newClock, type GameClock } from "../time/clock";

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
}

/** A cottage's name in the map ("house1"). */
export type HouseId = string;

/** A cottage someone lives in: theirs to arrange, anyone's to visit. */
export interface House {
  readonly owner: FarmerId;
  /** In tiles from the room's top-left floor tile. Later pieces draw over earlier ones. */
  readonly furniture: readonly PlacedPiece[];
}

/** A person who plays: their look and their own bag. Bags belong to farmers, not devices. */
export interface Farmer {
  readonly name: string;
  readonly character: CharacterId;
  readonly bag: Inventory;
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
}

/** Day 1, 6 am, the starting coins, an empty farm and crate, nobody yet, and every cottage empty. */
export function newWorld(): World {
  return {
    clock: newClock(),
    coins: STARTING_COINS,
    crate: EMPTY_CRATE,
    farm: {},
    farmers: {},
    lastMorning: null,
    houses: {},
    decorations: [],
  };
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

/** A new farmer with the starter bag. A farmer who already exists is left as they are. */
export function addFarmer(world: World, id: FarmerId, look: Look): World {
  if (farmerOf(world, id)) return world;
  const farmer: Farmer = { name: look.name, character: look.character, bag: starterInventory() };
  return { ...world, farmers: { ...world.farmers, [id]: farmer } };
}

/** Changes a farmer's name and character. Their bag stays. */
export function setFarmerLook(world: World, id: FarmerId, look: Look): World {
  const farmer = farmerOf(world, id);
  if (!farmer || (farmer.name === look.name && farmer.character === look.character)) return world;
  return { ...world, farmers: { ...world.farmers, [id]: { ...farmer, name: look.name, character: look.character } } };
}

/** Replaces a farmer's bag. */
export function setFarmerBag(world: World, id: FarmerId, bag: Inventory): World {
  const farmer = farmerOf(world, id);
  if (!farmer) return world;
  return { ...world, farmers: { ...world.farmers, [id]: { ...farmer, bag } } };
}

/** Everyone who has played, in the order they first joined: for the Who's playing screen. */
export function listFarmers(world: World): { id: FarmerId; name: string; character: CharacterId }[] {
  return Object.entries(world.farmers).map(([id, { name, character }]) => ({ id, name, character }));
}
