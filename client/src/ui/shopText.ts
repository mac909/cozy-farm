import { CROPS } from "../../../shared/content/crops";
import { ITEMS, type SeedItemId } from "../../../shared/content/items";
import { MAX_BUY } from "../../../shared/economy/trade";
import { daysToRipe } from "../../../shared/farming/farming";

/** One line of the seed stand: the crop's name, how long it takes and what it sells for, and the packet's price. */
export function seedLine(itemId: SeedItemId): { name: string; detail: string; price: number } {
  const item = ITEMS[itemId];
  if (item.category !== "seed") throw new Error(`${itemId} isn't seeds`);
  const crop = CROPS[item.cropId];
  const days = daysToRipe(crop);
  const ripe = `Ripe in ${days} day${days === 1 ? "" : "s"}${crop.regrows ? ", then regrows" : ""}`;
  return { name: crop.name, detail: `${ripe} · sells for ${crop.sellPrice}`, price: item.buyPrice ?? 0 };
}

/** How many to start with when a seed is opened: 5, or as many as the coins cover (at least 1). */
export function startingCount(price: number, coins: number): number {
  if (price <= 0) return 5;
  return Math.max(1, Math.min(5, Math.floor(coins / price)));
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
