import { CROPS, type CropId } from "./crops";

/**
 * Everything a player can carry. Every number here is a first guess, meant to be tuned by playing.
 *
 * Seeds and harvested crops are built from CROPS, so their prices live there.
 * An item's `buyPrice` is what the general store charges (no `buyPrice`: the
 * store doesn't sell it); its `sellPrice` is what the shipping crate pays
 * (no `sellPrice`: it can't be sold).
 */
export type ItemCategory = "seed" | "crop" | "tool" | "beach" | "furniture";

/** The floor tiles a piece of furniture covers, before it's rotated. */
export interface Footprint {
  width: number;
  height: number;
}

interface BaseItemDef {
  /** Same as its key in ITEMS. Saves hold these, so renaming one needs a save migration. */
  id: string;
  /** Shown to players. */
  name: string;
  /** Most of this item one inventory slot holds. 1 means it doesn't stack. */
  maxStack: number;
  /** Coins for one at the general store. Missing if the store doesn't sell it. */
  buyPrice?: number;
  /** Coins for one in the shipping crate. Missing if it can't be sold. */
  sellPrice?: number;
}

export interface SeedItemDef extends BaseItemDef {
  category: "seed";
  /** The crop one seed plants. */
  cropId: CropId;
}

export interface CropItemDef extends BaseItemDef {
  category: "crop";
  /** The crop this was harvested from. */
  cropId: CropId;
}

export interface ToolItemDef extends BaseItemDef {
  category: "tool";
}

export interface BeachItemDef extends BaseItemDef {
  category: "beach";
}

export interface FurnitureItemDef extends BaseItemDef {
  category: "furniture";
  footprint: Footprint;
}

export type ItemDef = SeedItemDef | CropItemDef | ToolItemDef | BeachItemDef | FurnitureItemDef;

/** How many of a stackable item fit in one inventory slot. */
const STACK = 99;

/** Seeds ship back for this share of their store price, rounded down, so a mistaken buy isn't a total loss. */
export const SEED_SELL_FRACTION = 0.5;

export type SeedItemId = `${CropId}_seeds`;

/** The seed item that plants `cropId`. */
export function seedItemId(cropId: CropId): SeedItemId {
  return `${cropId}_seeds`;
}

/** The item a harvest of `cropId` gives. Harvested crops share their crop's id. */
export function cropItemId(cropId: CropId): CropId {
  return cropId;
}

const CROP_IDS = Object.keys(CROPS) as CropId[];

const seedItems = Object.fromEntries(
  CROP_IDS.map((cropId): [SeedItemId, SeedItemDef] => {
    const crop = CROPS[cropId];
    return [
      seedItemId(cropId),
      {
        id: seedItemId(cropId),
        name: `${crop.name} Seeds`,
        category: "seed",
        cropId,
        maxStack: STACK,
        buyPrice: crop.seedPrice,
        sellPrice: Math.floor(crop.seedPrice * SEED_SELL_FRACTION),
      },
    ];
  }),
) as Record<SeedItemId, SeedItemDef>;

const cropItems = Object.fromEntries(
  CROP_IDS.map((cropId): [CropId, CropItemDef] => {
    const crop = CROPS[cropId];
    return [
      cropItemId(cropId),
      {
        id: cropItemId(cropId),
        name: crop.name,
        category: "crop",
        cropId,
        maxStack: STACK,
        sellPrice: crop.sellPrice,
      },
    ];
  }),
) as Record<CropId, CropItemDef>;

const toolData = {
  hoe: { id: "hoe", name: "Hoe", category: "tool", maxStack: 1, buyPrice: 100 },
  watering_can: {
    id: "watering_can",
    name: "Watering Can",
    category: "tool",
    maxStack: 1,
    buyPrice: 100,
  },
} satisfies Record<string, ToolItemDef>;

/** Washed up on the sand. Found, never bought. */
const beachData = {
  scallop_shell: {
    id: "scallop_shell",
    name: "Scallop Shell",
    category: "beach",
    maxStack: STACK,
    sellPrice: 15,
  },
  cowrie_shell: {
    id: "cowrie_shell",
    name: "Cowrie Shell",
    category: "beach",
    maxStack: STACK,
    sellPrice: 25,
  },
  conch_shell: {
    id: "conch_shell",
    name: "Conch Shell",
    category: "beach",
    maxStack: STACK,
    sellPrice: 50,
  },
  sea_glass: { id: "sea_glass", name: "Sea Glass", category: "beach", maxStack: STACK, sellPrice: 30 },
  starfish: { id: "starfish", name: "Starfish", category: "beach", maxStack: STACK, sellPrice: 60 },
} satisfies Record<string, BeachItemDef>;

/** Starter furniture for decorating. Each ships back for about half its price. */
const furnitureData = {
  wooden_chair: {
    id: "wooden_chair",
    name: "Wooden Chair",
    category: "furniture",
    footprint: { width: 1, height: 1 },
    maxStack: STACK,
    buyPrice: 80,
    sellPrice: 40,
  },
  wooden_table: {
    id: "wooden_table",
    name: "Wooden Table",
    category: "furniture",
    footprint: { width: 2, height: 1 },
    maxStack: STACK,
    buyPrice: 150,
    sellPrice: 75,
  },
  striped_rug: {
    id: "striped_rug",
    name: "Striped Rug",
    category: "furniture",
    footprint: { width: 3, height: 2 },
    maxStack: STACK,
    buyPrice: 120,
    sellPrice: 60,
  },
  floor_lamp: {
    id: "floor_lamp",
    name: "Floor Lamp",
    category: "furniture",
    footprint: { width: 1, height: 1 },
    maxStack: STACK,
    buyPrice: 100,
    sellPrice: 50,
  },
  potted_fern: {
    id: "potted_fern",
    name: "Potted Fern",
    category: "furniture",
    footprint: { width: 1, height: 1 },
    maxStack: STACK,
    buyPrice: 60,
    sellPrice: 30,
  },
  bookshelf: {
    id: "bookshelf",
    name: "Bookshelf",
    category: "furniture",
    footprint: { width: 2, height: 1 },
    maxStack: STACK,
    buyPrice: 200,
    sellPrice: 100,
  },
} satisfies Record<string, FurnitureItemDef>;

export type ItemId =
  | SeedItemId
  | CropId
  | keyof typeof toolData
  | keyof typeof beachData
  | keyof typeof furnitureData;

/** Every item, grouped seeds, crops, tools, beach finds, furniture. Shop and bag listings follow this order. */
export const ITEMS: Readonly<Record<ItemId, ItemDef>> = {
  ...seedItems,
  ...cropItems,
  ...toolData,
  ...beachData,
  ...furnitureData,
};

/** True if `id` names an item in ITEMS. Use it to check item ids that arrive in client messages. */
export function isItemId(id: unknown): id is ItemId {
  return typeof id === "string" && Object.hasOwn(ITEMS, id);
}

/** What each player's bag starts with. The wallet's starting coins are in economy/wallet.ts. */
export const STARTER_ITEMS: readonly { itemId: ItemId; count: number }[] = [
  { itemId: "hoe", count: 1 },
  { itemId: "watering_can", count: 1 },
  { itemId: seedItemId("radish"), count: 10 },
];
