/** When each day starts, in game minutes after midnight (6:00 am). */
export const DAY_START_MINUTE = 6 * 60;

/** Midnight at the end of the day, in game minutes. The clock stops here until the day ends. */
export const DAY_END_MINUTE = 24 * 60;

/** Real time a whole day (DAY_START_MINUTE → DAY_END_MINUTE) takes while someone is playing. */
export const REAL_MS_PER_DAY = 15 * 60 * 1000;

/** The HUD clock moves in steps this many game minutes long, so it ticks rather than races. */
export const HUD_MINUTE_STEP = 10;

/** Game minutes that pass per real millisecond. */
export const GAME_MINUTES_PER_MS = (DAY_END_MINUTE - DAY_START_MINUTE) / REAL_MS_PER_DAY;

export interface GameClock {
  /** Day number, starting at 1. */
  readonly day: number;
  /** Game minutes after midnight, from DAY_START_MINUTE to DAY_END_MINUTE. Usually fractional. */
  readonly minute: number;
}

/** Day 1, 6:00 am. */
export function newClock(): GameClock {
  return { day: 1, minute: DAY_START_MINUTE };
}

/**
 * Moves the clock forward by `realMs` of real time. Time only passes when the
 * server calls this (while someone is online). It stops at midnight.
 */
export function tickClock(clock: GameClock, realMs: number): GameClock {
  if (!(realMs > 0) || isMidnight(clock)) return clock;
  const minute = Math.min(clock.minute + realMs * GAME_MINUTES_PER_MS, DAY_END_MINUTE);
  return { ...clock, minute };
}

export function isMidnight(clock: GameClock): boolean {
  return clock.minute >= DAY_END_MINUTE;
}

/**
 * Whether the day is over: everyone online is in bed, or it's midnight.
 * `inBed` has one entry per player online. Nobody online doesn't end the day.
 */
export function shouldEndDay(clock: GameClock, inBed: readonly boolean[]): boolean {
  if (isMidnight(clock)) return true;
  return inBed.length > 0 && inBed.every(Boolean);
}

/** The next morning. */
export function nextDay(clock: GameClock): GameClock {
  return { day: clock.day + 1, minute: DAY_START_MINUTE };
}

/** A time of day for the HUD, like "6:00 am" or "12:30 pm", rounded down to HUD_MINUTE_STEP. */
export function formatTime(minute: number): string {
  const stepped = Math.floor(minute / HUD_MINUTE_STEP) * HUD_MINUTE_STEP;
  const hour = Math.floor(stepped / 60) % 24;
  const mins = String(stepped % 60).padStart(2, "0");
  return `${hour % 12 || 12}:${mins} ${hour < 12 ? "am" : "pm"}`;
}
