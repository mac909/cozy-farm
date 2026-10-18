import { CROPS, type CropId } from "../content/crops";
import { ITEMS, type ItemId } from "../content/items";
import { SEASON_DAYS, SEASON_IDS, YEAR_DAYS, type SeasonId } from "../content/seasons";

/**
 * Which season it is (Milestone 8). The world keeps the day spring first came (`yearStart`, 0
 * until the garden shop opens); everything else is worked out from the day, so both screens, the
 * server and a save always agree, and nothing about a season is ever stored.
 */

/** A day as the seasons count it: "Spring 3", in the first year. */
export interface SeasonDate {
  readonly season: SeasonId;
  /** 1 to SEASON_DAYS. */
  readonly day: number;
  /** 1 for the first year. */
  readonly year: number;
}

/** `n` counted round from 0 to `size` - 1, for days before `yearStart` too (only the dev command makes those). */
const round = (n: number, size: number) => ((n % size) + size) % size;

/** The season on `day`, or null before the seasons have begun (`yearStart` 0). */
export function seasonOn(day: number, yearStart: number): SeasonDate | null {
  if (!Number.isFinite(day) || !Number.isFinite(yearStart) || yearStart < 1) return null;
  const since = Math.floor(day - yearStart);
  return {
    season: SEASON_IDS[round(Math.floor(since / SEASON_DAYS), SEASON_IDS.length)],
    day: round(since, SEASON_DAYS) + 1,
    year: Math.max(1, Math.floor(since / YEAR_DAYS) + 1),
  };
}

/** Whether `day` is the first of a season (the morning card says so). */
export function seasonBegins(day: number, yearStart: number): boolean {
  return seasonOn(day, yearStart)?.day === 1;
}

/** "Spring 3". */
export function seasonLabel(date: SeasonDate): string {
  return `${date.season[0].toUpperCase()}${date.season.slice(1)} ${date.day}`;
}

/** Whether a crop grows all year (the six starter crops, wheat and cotton). */
export function allYear(cropId: CropId): boolean {
  const seasons = CROPS[cropId].seasons;
  return seasons === undefined || seasons.length === 0;
}

/**
 * Whether an item belongs to a season: a crop (or its seeds) that only grows in some. The
 * village's projects never ask for one, so nothing waits on the calendar (projects.test.ts).
 */
export function isSeasonal(itemId: ItemId): boolean {
  const item = ITEMS[itemId];
  return (item.category === "crop" || item.category === "seed") && !allYear(item.cropId);
}

/**
 * Whether a crop's seeds can go in outdoors on a day of `date`: always before the seasons begin,
 * always for a crop that grows all year, otherwise only in its seasons. Seeds keep in the bag
 * for next time.
 */
export function inSeason(cropId: CropId, date: SeasonDate | null): boolean {
  if (date === null || allYear(cropId)) return true;
  return CROPS[cropId].seasons!.includes(date.season);
}

/**
 * A `yearStart` that makes `day` the first day of `season` (the dev command), from 1 up: it may
 * come after `day` early in a world, which seasonOn copes with.
 */
export function yearStartFor(day: number, season: SeasonId): number {
  const start = day - SEASON_IDS.indexOf(season) * SEASON_DAYS;
  return start >= 1 ? start : start + YEAR_DAYS * Math.ceil((1 - start) / YEAR_DAYS);
}
