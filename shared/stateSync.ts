import type { Clock } from "./schema";
import { HUD_MINUTE_STEP, type GameClock } from "./time/clock";

/**
 * Copying between the rules' plain data and the network state in schema.ts. The server writes
 * after every change; each write only touches fields whose value actually changed, so Colyseus
 * only sends what's new. Clients read the network state back into plain data with the read*
 * functions. This file is the only bridge: the rules never import Colyseus.
 */

/** The clock as the HUD shows it: the minute rounded down to the 10-minute step. */
export function steppedMinute(minute: number): number {
  return Math.floor(minute / HUD_MINUTE_STEP) * HUD_MINUTE_STEP;
}

/** Copies the clock in, rounded to the HUD's step. Returns whether anything changed. */
export function writeClock(target: Clock, clock: GameClock): boolean {
  const minute = steppedMinute(clock.minute);
  if (target.day === clock.day && target.minute === minute) return false;
  target.day = clock.day;
  target.minute = minute;
  return true;
}

export function readClock(source: Clock): GameClock {
  return { day: source.day, minute: source.minute };
}
