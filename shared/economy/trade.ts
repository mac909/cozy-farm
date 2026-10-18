import { SEED_STAND_STOCK } from "../content/seedStand";
import type { Hint, HintReason } from "../farming/actions";
import { farmerOf, setFarmerBag, type FarmerId, type World } from "../world/world";
import { buy, settleCrate, shipItems, takeFromCrate, type Crate } from "./shop";

/**
 * The shipping crate and the seed stand, against the whole world: one farmer's own bag and the
 * shared crate and wallet. All or nothing: a refusal leaves the world as it was and says why,
 * as a hint the player sees over their head.
 */

export type TradeResult = { ok: true; world: World; hint?: Hint } | { ok: false; hint: Hint };

const refuse = (reason: HintReason): TradeResult => ({ ok: false, hint: { reason } });

/** The most of one thing anyone buys in one go at the seed stand. */
export const MAX_BUY = 99;

/** What everything in the crate sells for tonight, at today's prices. */
export function crateValue(crate: Crate): number {
  return settleCrate(crate, 0).sale.total;
}

/** Puts `count` from one of a farmer's bag slots into the shared crate. Tools can't go in. */
export function shipToCrate(world: World, farmerId: FarmerId, slot: number, count: number): TradeResult {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return refuse("gone");
  const result = shipItems(farmer.bag, world.crate, slot, count);
  if (!result.ok) return refuse(result.reason === "not-sellable" ? "not-sellable" : "gone");
  return { ok: true, world: { ...setFarmerBag(world, farmerId, result.inventory), crate: result.crate } };
}

/**
 * Takes `count` of an item back out of the crate into a farmer's bag. If only some fits, that
 * much comes out and the rest stays in the crate (and the hint says so).
 */
export function takeBackFromCrate(world: World, farmerId: FarmerId, itemId: string, count: number): TradeResult {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return refuse("gone");
  const result = takeFromCrate(farmer.bag, world.crate, itemId, count);
  if (!result.ok) return refuse(result.reason === "no-space" ? "bag-full" : "gone");
  const next = { ...setFarmerBag(world, farmerId, result.inventory), crate: result.crate };
  return result.leftover > 0 ? { ok: true, world: next, hint: { reason: "crate-bag-full" } } : { ok: true, world: next };
}

/** Buys `count` seeds at the seed stand, from the shared wallet into a farmer's bag. Seeds only. */
export function buyAtStand(world: World, farmerId: FarmerId, itemId: string, count: number): TradeResult {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return refuse("gone");
  if (!(SEED_STAND_STOCK as readonly string[]).includes(itemId)) return refuse("not-for-sale");
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_BUY) return refuse("gone");
  const result = buy(farmer.bag, world.coins, itemId, count);
  if (!result.ok) {
    if (result.reason === "not-enough-coins") return refuse("not-enough-coins");
    if (result.reason === "no-space") return refuse("bag-full");
    return refuse("not-for-sale");
  }
  return { ok: true, world: { ...setFarmerBag(world, farmerId, result.inventory), coins: result.coins } };
}
