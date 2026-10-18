/** How rare a fish or beach find is. The collection book can show it. */
export type Rarity = "common" | "uncommon" | "rare";

/**
 * How often each rarity turns up, compared with the others. Each fish or find
 * gets its rarity's weight, so with one of each, a rare one turns up 10 times
 * in 100. First guesses, meant to be tuned by playing.
 */
export const RARITY_WEIGHTS: Readonly<Record<Rarity, number>> = {
  common: 60,
  uncommon: 30,
  rare: 10,
};
