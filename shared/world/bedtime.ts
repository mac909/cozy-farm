import { shouldEndDay, type GameClock } from "../time/clock";
import type { FarmerId } from "./world";

/**
 * Bedtime with two players: the night starts when everyone online is in bed, or at midnight.
 * A phone that locks or drops while its player is still up isn't online any more, so the night
 * waits a little in case they come back, then starts without them.
 */

/** How long the night waits for someone whose connection dropped while they were still up. */
export const DROP_WAIT_MS = 30_000;

/** Someone who dropped while still up, and when (in ms, on the server's clock). */
export interface Dropped {
  readonly farmerId: FarmerId;
  readonly at: number;
}

/** The drops still worth waiting for at `now`. */
export function recentDrops(drops: readonly Dropped[], now: number, waitMs = DROP_WAIT_MS): Dropped[] {
  return drops.filter((drop) => now - drop.at < waitMs);
}

/**
 * Whether the night starts now. `online` has one entry per player online: true if they're in
 * bed. Each recent drop counts as someone still up. Midnight starts it whoever's up; nobody
 * online never does.
 */
export function nightStarts(clock: GameClock, online: readonly boolean[], drops: readonly Dropped[], now: number): boolean {
  const waiting = recentDrops(drops, now).map(() => false);
  return shouldEndDay(clock, [...online, ...waiting]);
}

/** The names joined for a sentence: "Pip", "Pip and Juno", "Pip, Juno and Kai". */
export function nameList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** The chip on the clock card when others are asleep: "Pip is asleep", "Pip and Juno are asleep". Null if nobody is. */
export function sleepersText(names: readonly string[]): string | null {
  if (names.length === 0) return null;
  return `${nameList(names)} ${names.length === 1 ? "is" : "are"} asleep`;
}

/** The second line of the "Sleeping…" banner: who the night is waiting for. */
export function waitingText(awake: readonly string[]): string {
  if (awake.length === 0) return "The night starts in a moment…";
  return `Waiting for ${nameList(awake)} to go to bed`;
}
