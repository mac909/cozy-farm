/**
 * The shared wallet: one pile of coins both players earn into and spend from.
 * It's just a number of coins, always a whole number and never below zero.
 */

/** Coins in the wallet when a new world starts. */
export const STARTING_COINS = 500;

export type SpendResult =
  | { ok: true; coins: number }
  | { ok: false; reason: "bad-amount" | "not-enough-coins" };

/** A whole number of coins, 0 or more. */
export function isCoinAmount(n: unknown): n is number {
  return Number.isSafeInteger(n) && (n as number) >= 0;
}

export function canAfford(coins: number, amount: number): boolean {
  return isCoinAmount(amount) && amount <= coins;
}

/** Earn coins. Anything but a whole number of 0 or more adds nothing, so this can't take coins away. */
export function addCoins(coins: number, amount: number): number {
  return isCoinAmount(amount) ? coins + amount : coins;
}

/** Spend coins, or fail without changing anything if there aren't enough. */
export function spendCoins(coins: number, amount: number): SpendResult {
  if (!isCoinAmount(amount)) return { ok: false, reason: "bad-amount" };
  if (amount > coins) return { ok: false, reason: "not-enough-coins" };
  return { ok: true, coins: coins - amount };
}
