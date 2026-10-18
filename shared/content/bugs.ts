import { DAY_END_MINUTE, DAY_START_MINUTE } from "../time/clock";
import type { BiteWindow } from "./fish";
import type { Rarity } from "./rarity";

/**
 * Butterflies and other little things that flutter over the meadow. Every number here is a first
 * guess, meant to be tuned by playing.
 *
 * Times are game minutes after midnight, like the game clock (shared/time/clock.ts): a bug is out
 * from `from` up to, but not including, `to`. They're whole two-hour blocks, because a new lot of
 * bugs comes every MEADOW.slotMinutes (shared/bugs/meadow.ts) and each lot is picked from what's
 * out when it arrives.
 */
export interface BugDef {
  /** Same as its key in BUGS, and as its item's id. Saves hold these, so renaming one needs a save migration. */
  id: string;
  /** Shown to players. */
  name: string;
  /** When it's out. */
  windows: readonly BiteWindow[];
  /** How often it turns up compared with the others out at the same time (see RARITY_WEIGHTS). */
  rarity: Rarity;
  /** Coins for one in the shipping crate. */
  sellPrice: number;
  /** Glows in the dark (drawn softly blinking). */
  glows?: boolean;
}

const bugData = {
  red_admiral: {
    id: "red_admiral",
    name: "Red Admiral",
    windows: [{ from: 8 * 60, to: 18 * 60 }],
    rarity: "common",
    sellPrice: 30,
  },
  cabbage_white: {
    id: "cabbage_white",
    name: "Cabbage White",
    windows: [{ from: DAY_START_MINUTE, to: 16 * 60 }],
    rarity: "common",
    sellPrice: 25,
  },
  common_blue: {
    id: "common_blue",
    name: "Common Blue",
    windows: [{ from: 10 * 60, to: 18 * 60 }],
    rarity: "uncommon",
    sellPrice: 55,
  },
  brimstone: {
    id: "brimstone",
    name: "Brimstone",
    windows: [{ from: DAY_START_MINUTE, to: 12 * 60 }],
    rarity: "uncommon",
    sellPrice: 60,
  },
  firefly: {
    id: "firefly",
    name: "Firefly",
    windows: [{ from: 18 * 60, to: DAY_END_MINUTE }],
    rarity: "common",
    sellPrice: 45,
    glows: true,
  },
  luna_moth: {
    id: "luna_moth",
    name: "Luna Moth",
    windows: [{ from: 20 * 60, to: DAY_END_MINUTE }],
    rarity: "rare",
    sellPrice: 140,
  },
} satisfies Record<string, BugDef>;

export type BugId = keyof typeof bugData;

/** Every bug, in collection book order. */
export const BUGS: Readonly<Record<BugId, BugDef>> = bugData;

export const BUG_IDS = Object.keys(BUGS) as BugId[];

/** True if `id` names a bug in BUGS. */
export function isBugId(id: unknown): id is BugId {
  return typeof id === "string" && Object.hasOwn(BUGS, id);
}

/** True if `bug` is out at `minute` (game minutes after midnight). */
export function bugOutAt(bug: BugDef, minute: number): boolean {
  return bug.windows.some((w) => minute >= w.from && minute < w.to);
}

/** Bugs out at `minute`, in BUGS order. */
export function bugsOutAt(minute: number): BugId[] {
  return BUG_IDS.filter((id) => bugOutAt(BUGS[id], minute));
}
