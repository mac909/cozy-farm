/**
 * Gentle seasons (Milestone 8): four of 14 days each, starting with spring on the morning the
 * garden shop opens. They only change gentle things: which of the garden shop's seeds can be
 * planted outdoors (the six starter crops grow all year, and a crop already in the ground always
 * finishes), which seeds the shop has out, and the look of the trees and the grass. Every number
 * here is a first guess, meant to be tuned by playing (docs/plans/progression.md, section 2.3).
 *
 * Saves hold the day spring first came (`yearStart`), never a season's id, so renaming one is fine.
 */

export type SeasonId = "spring" | "summer" | "autumn" | "winter";

/** In the order they come round. */
export const SEASON_IDS: readonly SeasonId[] = ["spring", "summer", "autumn", "winter"];

/** How many days each season lasts. */
export const SEASON_DAYS = 14;

/** A whole year: every season once. */
export const YEAR_DAYS = SEASON_DAYS * SEASON_IDS.length;

export interface SeasonDef {
  readonly id: SeasonId;
  /** "Spring". */
  readonly name: string;
  /** The morning card on its first day: "Spring has come to {village}!" */
  readonly arrives: string;
  /** And what that means, under it. */
  readonly news: string;
}

export const SEASONS: Readonly<Record<SeasonId, SeasonDef>> = {
  spring: {
    id: "spring",
    name: "Spring",
    arrives: "Spring has come to {village}!",
    news: "Blossom on the trees, and peas and cauliflower at the garden shop.",
  },
  summer: {
    id: "summer",
    name: "Summer",
    arrives: "Summer's here!",
    news: "Tomatoes and melons at the garden shop. Crops already planted carry on as they were.",
  },
  autumn: {
    id: "autumn",
    name: "Autumn",
    arrives: "Autumn has come.",
    news: "Beetroot and cranberries at the garden shop. Crops already planted carry on as they were.",
  },
  winter: {
    id: "winter",
    name: "Winter",
    arrives: "Winter has come to {village}.",
    news: "Kale and leeks at the garden shop. Crops already planted carry on as they were.",
  },
};

export function isSeasonId(id: unknown): id is SeasonId {
  return typeof id === "string" && (SEASON_IDS as readonly string[]).includes(id);
}
