import { DAY_END_MINUTE, DAY_START_MINUTE } from "../time/clock";
import type { Rarity } from "./rarity";

/**
 * Seaside fish. Every number here is a first guess, meant to be tuned by playing.
 *
 * Times are game minutes after midnight, like the game clock (shared/time/clock.ts):
 * a window bites from `from` up to, but not including, `to`. The day runs
 * DAY_START_MINUTE (6:00 am) to DAY_END_MINUTE (midnight).
 */

/**
 * Where a line can go in: off the sides of the dock, from the beach, or into
 * the deep water off the dock's end.
 */
export type FishingSpot = "dock" | "shore" | "deep";

export const FISHING_SPOTS: readonly FishingSpot[] = ["dock", "shore", "deep"];

/** Part of the day when a fish bites, in game minutes. */
export interface BiteWindow {
  from: number;
  to: number;
}

export interface FishDef {
  /** Same as its key in FISH, and as its item's id. Saves hold these, so renaming one needs a save migration. */
  id: string;
  /** Shown to players. */
  name: string;
  /** Where it bites. */
  spots: readonly FishingSpot[];
  /** When it bites. */
  windows: readonly BiteWindow[];
  /** How often it bites compared with the other fish around (see RARITY_WEIGHTS), and how lively it is on the line. */
  rarity: Rarity;
  /** Coins for one in the shipping crate. */
  sellPrice: number;
  /** Lengths it comes in, in whole centimetres. Just for fun and the collection book's records. */
  sizeCm: { min: number; max: number };
}

const ALL_DAY: BiteWindow = { from: DAY_START_MINUTE, to: DAY_END_MINUTE };

const fishData = {
  sardine: {
    id: "sardine",
    name: "Sardine",
    spots: ["dock", "shore"],
    windows: [ALL_DAY],
    rarity: "common",
    sellPrice: 20,
    sizeCm: { min: 10, max: 20 },
  },
  mackerel: {
    id: "mackerel",
    name: "Mackerel",
    spots: ["dock", "deep"],
    windows: [ALL_DAY],
    rarity: "common",
    sellPrice: 35,
    sizeCm: { min: 25, max: 40 },
  },
  flounder: {
    id: "flounder",
    name: "Flounder",
    spots: ["shore"],
    windows: [ALL_DAY],
    rarity: "common",
    sellPrice: 30,
    sizeCm: { min: 20, max: 45 },
  },
  sea_bream: {
    id: "sea_bream",
    name: "Sea Bream",
    spots: ["dock"],
    windows: [{ from: 9 * 60, to: 18 * 60 }],
    rarity: "uncommon",
    sellPrice: 60,
    sizeCm: { min: 25, max: 45 },
  },
  pufferfish: {
    id: "pufferfish",
    name: "Pufferfish",
    spots: ["dock", "shore"],
    windows: [{ from: 11 * 60, to: 16 * 60 }],
    rarity: "uncommon",
    sellPrice: 80,
    sizeCm: { min: 12, max: 30 },
  },
  red_snapper: {
    id: "red_snapper",
    name: "Red Snapper",
    spots: ["deep"],
    windows: [{ from: 10 * 60, to: 17 * 60 }],
    rarity: "uncommon",
    sellPrice: 90,
    sizeCm: { min: 40, max: 70 },
  },
  sea_bass: {
    id: "sea_bass",
    name: "Sea Bass",
    spots: ["shore", "deep"],
    windows: [
      { from: DAY_START_MINUTE, to: 9 * 60 },
      { from: 17 * 60, to: DAY_END_MINUTE },
    ],
    rarity: "uncommon",
    sellPrice: 75,
    sizeCm: { min: 35, max: 70 },
  },
  squid: {
    id: "squid",
    name: "Squid",
    spots: ["dock", "deep"],
    windows: [{ from: 19 * 60, to: DAY_END_MINUTE }],
    rarity: "uncommon",
    sellPrice: 70,
    sizeCm: { min: 20, max: 45 },
  },
  moray_eel: {
    id: "moray_eel",
    name: "Moray Eel",
    spots: ["dock"],
    windows: [{ from: 16 * 60, to: 22 * 60 }],
    rarity: "rare",
    sellPrice: 180,
    sizeCm: { min: 60, max: 120 },
  },
  seahorse: {
    id: "seahorse",
    name: "Seahorse",
    spots: ["shore"],
    windows: [{ from: 10 * 60, to: 15 * 60 }],
    rarity: "rare",
    sellPrice: 150,
    sizeCm: { min: 8, max: 18 },
  },
  tuna: {
    id: "tuna",
    name: "Bluefin Tuna",
    spots: ["deep"],
    windows: [{ from: DAY_START_MINUTE, to: 10 * 60 }],
    rarity: "rare",
    sellPrice: 220,
    sizeCm: { min: 90, max: 160 },
  },
  moonfish: {
    id: "moonfish",
    name: "Moonfish",
    spots: ["deep"],
    windows: [{ from: 21 * 60, to: DAY_END_MINUTE }],
    rarity: "rare",
    sellPrice: 260,
    sizeCm: { min: 60, max: 110 },
  },
} satisfies Record<string, FishDef>;

export type FishId = keyof typeof fishData;

/** Every fish, in collection book order. */
export const FISH: Readonly<Record<FishId, FishDef>> = fishData;

export const FISH_IDS = Object.keys(FISH) as FishId[];

/** True if `id` names a fish in FISH. */
export function isFishId(id: unknown): id is FishId {
  return typeof id === "string" && Object.hasOwn(FISH, id);
}

/** True if `spot` is a fishing spot. Use it to check spots that arrive in client messages. */
export function isFishingSpot(spot: unknown): spot is FishingSpot {
  return FISHING_SPOTS.includes(spot as FishingSpot);
}

/** True if `fish` bites at `minute` (game minutes after midnight). */
export function bitesAt(fish: FishDef, minute: number): boolean {
  return fish.windows.some((w) => minute >= w.from && minute < w.to);
}
