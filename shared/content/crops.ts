import type { SeasonId } from "./seasons";

/**
 * The crops: the six starter crops from the seed stand, and ten more from the garden shop
 * (Milestone 8), most of them only planted in their season. Every number here is a first guess,
 * meant to be tuned by playing (docs/plans/progression.md, section 2.3).
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
  /** Its seed packet's name, where that isn't the crop's name and "Seeds" ("Pea Seeds"). */
  seedName?: string;
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
  /** Where its seeds are sold: the seed stand by the beach path, or the garden shop on the boardwalk (Milestone 8). */
  sold: "seedStand" | "gardenShop";
  /** The seasons its seeds can be planted outdoors in (Milestone 8). Missing: all year. A crop in the ground always finishes. */
  seasons?: readonly SeasonId[];
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
    sold: "seedStand",
  },
  carrot: {
    id: "carrot",
    name: "Carrot",
    stages: 5,
    daysPerStage: 1,
    seedPrice: 30,
    sellPrice: 60,
    harvestAmount: 1,
    sold: "seedStand",
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
    sold: "seedStand",
  },
  potato: {
    id: "potato",
    name: "Potato",
    stages: 4,
    daysPerStage: 2,
    seedPrice: 50,
    sellPrice: 120,
    harvestAmount: 1,
    sold: "seedStand",
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
    sold: "seedStand",
  },
  pumpkin: {
    id: "pumpkin",
    name: "Pumpkin",
    stages: 5,
    daysPerStage: 2,
    seedPrice: 120,
    sellPrice: 260,
    harvestAmount: 1,
    sold: "seedStand",
  },
  // ---------- From the garden shop (Milestone 8): a few each season, and two all year ----------
  peas: {
    id: "peas",
    name: "Peas",
    seedName: "Pea Seeds",
    stages: 3,
    daysPerStage: 2,
    seedPrice: 40,
    sellPrice: 30,
    harvestAmount: 1,
    regrows: true,
    sold: "gardenShop",
    seasons: ["spring"],
  },
  cauliflower: {
    id: "cauliflower",
    name: "Cauliflower",
    stages: 5,
    daysPerStage: 2,
    seedPrice: 90,
    sellPrice: 230,
    harvestAmount: 1,
    sold: "gardenShop",
    seasons: ["spring"],
  },
  tomato: {
    id: "tomato",
    name: "Tomato",
    stages: 3,
    daysPerStage: 3,
    seedPrice: 60,
    sellPrice: 50,
    harvestAmount: 1,
    regrows: true,
    sold: "gardenShop",
    seasons: ["summer"],
  },
  melon: {
    id: "melon",
    name: "Melon",
    stages: 6,
    daysPerStage: 2,
    seedPrice: 150,
    sellPrice: 400,
    harvestAmount: 1,
    sold: "gardenShop",
    seasons: ["summer"],
  },
  beetroot: {
    id: "beetroot",
    name: "Beetroot",
    stages: 5,
    daysPerStage: 1,
    seedPrice: 30,
    sellPrice: 70,
    harvestAmount: 1,
    sold: "gardenShop",
    seasons: ["autumn"],
  },
  cranberries: {
    id: "cranberries",
    name: "Cranberries",
    seedName: "Cranberry Seeds",
    stages: 4,
    daysPerStage: 2,
    seedPrice: 120,
    sellPrice: 40,
    harvestAmount: 1,
    regrows: true,
    sold: "gardenShop",
    seasons: ["autumn"],
  },
  kale: {
    id: "kale",
    name: "Kale",
    stages: 3,
    daysPerStage: 2,
    seedPrice: 35,
    sellPrice: 75,
    harvestAmount: 1,
    sold: "gardenShop",
    seasons: ["winter"],
  },
  leek: {
    id: "leek",
    name: "Leek",
    stages: 6,
    daysPerStage: 1,
    seedPrice: 45,
    sellPrice: 95,
    harvestAmount: 1,
    sold: "gardenShop",
    seasons: ["winter"],
  },
  wheat: {
    id: "wheat",
    name: "Wheat",
    stages: 5,
    daysPerStage: 1,
    seedPrice: 15,
    sellPrice: 30,
    harvestAmount: 1,
    sold: "gardenShop",
  },
  cotton: {
    id: "cotton",
    name: "Cotton",
    stages: 4,
    daysPerStage: 2,
    seedPrice: 40,
    sellPrice: 75,
    harvestAmount: 1,
    sold: "gardenShop",
  },
} satisfies Record<string, CropDef>;

export type CropId = keyof typeof cropData;

export const CROPS: Readonly<Record<CropId, CropDef>> = cropData;

/** Every crop, in CROPS order (the seed stand's six, then the garden shop's ten). */
export const CROP_IDS = Object.keys(CROPS) as CropId[];

/** The most growth stages a crop may have: its row in our crops.png has room for this many. */
export const MAX_STAGES = 6;

/** True if `id` names a crop in CROPS. Use it to check crop ids that arrive in client messages. */
export function isCropId(id: unknown): id is CropId {
  return typeof id === "string" && Object.hasOwn(CROPS, id);
}
