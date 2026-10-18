import { CROPS } from "../../../shared/content/crops";
import { FURNITURE, type FurnitureDef } from "../../../shared/content/furniture";
import { STORE_SHELVES } from "../../../shared/content/generalStore";
import { ITEMS, type FurnitureItemDef, type ItemId, type SeedItemId } from "../../../shared/content/items";
import { SEED_STAND_STOCK } from "../../../shared/content/seedStand";
import { MAX_BUY } from "../../../shared/economy/trade";
import { daysToRipe } from "../../../shared/farming/farming";

/** One line of a shop's card. */
export interface ShopLine {
  itemId: ItemId;
  name: string;
  detail: string;
  price: number;
}

/** A shop's card: its title, its shelves (each with an optional heading), and the two quick-count buttons. */
export interface ShopCatalog {
  title: string;
  shelves: { title?: string; lines: ShopLine[] }[];
  /** The quick buttons next to − and +; the first is also the count a line opens with, if the coins cover it. */
  quick: [number, number];
}

/** One line of the seed stand: the crop's name, how long it takes and what it sells for, and the packet's price. */
export function seedLine(itemId: SeedItemId): ShopLine {
  const item = ITEMS[itemId];
  if (item.category !== "seed") throw new Error(`${itemId} isn't seeds`);
  const crop = CROPS[item.cropId];
  const days = daysToRipe(crop);
  const ripe = `Ripe in ${days} day${days === 1 ? "" : "s"}${crop.regrows ? ", then regrows" : ""}`;
  return { itemId, name: crop.name, detail: `${ripe} · sells for ${crop.sellPrice}`, price: item.buyPrice ?? 0 };
}

/** What a piece of furniture is like, in a few words: where it goes, its size, and anything special. */
export function furnitureDetail(piece: FurnitureDef): string {
  const where = piece.where.length > 1 ? "House or farm" : piece.where[0] === "house" ? "For your house" : "For the farm";
  const { width, height } = piece.turns[0];
  const size = width === 1 && height === 1 ? "1 tile" : `${width} × ${height}`;
  const extras = [
    piece.bed ? "sleep in it" : null,
    piece.flat ? "walk over it" : null,
    piece.walkable ? "walk through it" : null,
    piece.turns.length > 1 ? "turns" : null,
  ].filter((extra) => extra !== null);
  return [where, size, ...extras].join(" · ");
}

/** One line of the general store. */
export function furnitureLine(itemId: ItemId): ShopLine {
  const item = ITEMS[itemId];
  if (item.category !== "furniture") throw new Error(`${itemId} isn't furniture`);
  const piece = FURNITURE[(item as FurnitureItemDef).furnitureId];
  return { itemId, name: item.name, detail: furnitureDetail(piece), price: item.buyPrice ?? 0 };
}

/** The seed stand's card. */
export function seedStandCatalog(): ShopCatalog {
  return { title: "Seed stand", shelves: [{ lines: SEED_STAND_STOCK.map(seedLine) }], quick: [5, 10] };
}

/** The general store's card: a shelf for the house and one for the farm. */
export function generalStoreCatalog(): ShopCatalog {
  return {
    title: "General store",
    shelves: STORE_SHELVES.map((shelf) => ({ title: shelf.title, lines: shelf.stock.map(furnitureLine) })),
    quick: [1, 10],
  };
}

/** How many to start with when a line is opened: `usual`, or as many as the coins cover (at least 1). */
export function startingCount(price: number, coins: number, usual = 5): number {
  if (price <= 0) return usual;
  return Math.max(1, Math.min(usual, Math.floor(coins / price)));
}

/** Keeps a count between 1 and MAX_BUY. */
export function clampCount(count: number): number {
  return Math.max(1, Math.min(MAX_BUY, Math.round(count)));
}

/** What the Buy button says, and whether it works: "Buy 5 for 100", "Need 20 more coins", "Your bag is full". */
export function buyLabel(count: number, price: number, coins: number, room: number): { text: string; enabled: boolean } {
  const cost = count * price;
  if (room === 0) return { text: "Your bag is full", enabled: false };
  if (room < count) return { text: `Room for only ${room}`, enabled: false };
  if (cost > coins) return { text: `Need ${cost - coins} more coins`, enabled: false };
  return { text: `Buy ${count} for ${cost}`, enabled: true };
}
