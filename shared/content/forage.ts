import type { MaterialId } from "./items";

/**
 * Building materials lying about for anyone to pick up (Milestone 6): driftwood washes up on the
 * beach and branches fall under the meadow's trees each morning. Picked up with the Action button,
 * whatever you're holding: no axe, no chopping. Every number here is a first guess, meant to be
 * tuned by playing.
 */

/**
 * Where a material turns up: "beach" is the beach's open sand, the same tiles shells wash up on
 * (shared/world/terrain.ts); "woods" is open grass inside the map's `woods` rectangles, drawn round
 * the meadow's trees in Tiled.
 */
export type ForageGround = "beach" | "woods";

export interface ForageDef {
  /** The material it gives. */
  itemId: MaterialId;
  ground: ForageGround;
  /** How many turn up each morning, picked at random in this range. */
  perMorning: { min: number; max: number };
  /** Most of it lying about at once: the morning brings no more once there are this many. */
  most: number;
  /** What the storm brings the morning Marlow arrives (instead of that morning's usual), so the first step can be done on the first evening. */
  storm: number;
  /** Where to look, for the board's "where to find it" (the book's hints say the same kind of thing). */
  hint: string;
}

const forageData = {
  driftwood: {
    itemId: "driftwood",
    ground: "beach",
    perMorning: { min: 3, max: 5 },
    most: 8,
    storm: 10,
    hint: "Washes up on the beach most mornings",
  },
  branch: {
    itemId: "branch",
    ground: "woods",
    perMorning: { min: 3, max: 5 },
    most: 8,
    storm: 6,
    hint: "Falls under the meadow's trees each morning",
  },
} satisfies Record<MaterialId, ForageDef>;

export type ForageId = keyof typeof forageData;

/** Every material that turns up by itself, in the order the morning brings them. */
export const FORAGE: Readonly<Record<ForageId, ForageDef>> = forageData;

export const FORAGE_IDS = Object.keys(FORAGE) as ForageId[];

/** True if `id` names something that turns up on the ground. */
export function isForageId(id: unknown): id is ForageId {
  return typeof id === "string" && Object.hasOwn(FORAGE, id);
}
