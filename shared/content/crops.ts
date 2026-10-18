/**
 * Starter crops. Every number here is a first guess, meant to be tuned by playing.
 *
 * Growth: a crop moves through `stages` stages, from 0 (just planted) to
 * `stages - 1` (ripe), spending `daysPerStage` watered days in each. So it
 * ripens after (stages - 1) × daysPerStage watered days.
 */
export interface CropDef {
  /** Same as its key in CROPS. */
  id: string;
  /** Shown to players. */
  name: string;
  /** Stages from just planted to ripe, counting both (one sprite frame each). At least 2. */
  stages: number;
  /** Watered days the crop spends in each stage before moving to the next. */
  daysPerStage: number;
  /** Coins for one seed at the store. One seed plants one tile. */
  seedPrice: number;
  /** Coins for one harvested crop in the shipping crate. */
  sellPrice: number;
  /** How many crops one harvest gives. */
  harvestAmount: number;
  /** The plant stays after harvest, drops back one stage, and ripens again after `daysPerStage` watered days. */
  regrows?: boolean;
}

const cropData = {
  radish: {
    id: "radish",
    name: "Radish",
    stages: 4,
    daysPerStage: 1,
    seedPrice: 20,
    sellPrice: 35,
    harvestAmount: 1,
  },
  carrot: {
    id: "carrot",
    name: "Carrot",
    stages: 5,
    daysPerStage: 1,
    seedPrice: 30,
    sellPrice: 60,
    harvestAmount: 1,
  },
  samphire: {
    id: "samphire",
    name: "Sea Samphire",
    stages: 3,
    daysPerStage: 2,
    seedPrice: 50,
    sellPrice: 25,
    harvestAmount: 1,
    regrows: true,
  },
  potato: {
    id: "potato",
    name: "Potato",
    stages: 4,
    daysPerStage: 2,
    seedPrice: 50,
    sellPrice: 120,
    harvestAmount: 1,
  },
  strawberry: {
    id: "strawberry",
    name: "Strawberry",
    stages: 4,
    daysPerStage: 2,
    seedPrice: 80,
    sellPrice: 45,
    harvestAmount: 1,
    regrows: true,
  },
  pumpkin: {
    id: "pumpkin",
    name: "Pumpkin",
    stages: 5,
    daysPerStage: 2,
    seedPrice: 120,
    sellPrice: 260,
    harvestAmount: 1,
  },
} satisfies Record<string, CropDef>;

export type CropId = keyof typeof cropData;

export const CROPS: Readonly<Record<CropId, CropDef>> = cropData;

/** True if `id` names a crop in CROPS. Use it to check crop ids that arrive in client messages. */
export function isCropId(id: unknown): id is CropId {
  return typeof id === "string" && Object.hasOwn(CROPS, id);
}
