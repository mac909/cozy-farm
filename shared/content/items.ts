import { BUGS, BUG_IDS, type BugId } from "./bugs";
import { CROPS, type CropId } from "./crops";
import { FISH, FISH_IDS, type FishId } from "./fish";
import { FURNITURE, FURNITURE_IDS, FURNITURE_SELL_FRACTION, isGift, type FurnitureId } from "./furniture";
import { PERK } from "./skills";

/**
 * Everything a player can carry. Every number here is a first guess, meant to be tuned by playing.
 *
 * Seeds and harvested crops are built from CROPS, fish from FISH, bugs from BUGS, and furniture from
 * FURNITURE, so their prices live there.
 * An item's `buyPrice` is what the general store charges (no `buyPrice`: the
 * store doesn't sell it); its `sellPrice` is what the shipping crate pays
 * (no `sellPrice`: it can't be sold).
 */
export type ItemCategory = "seed" | "crop" | "tool" | "beach" | "material" | "fish" | "bug" | "furniture";

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
  /** Its name when there are several, where that isn't just the name (the board's "Branches"). */
  plural?: string;
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
  /** A golden one (Farming level 10's perk): it sells for more. */
  golden?: boolean;
}

export interface ToolItemDef extends BaseItemDef {
  category: "tool";
}

export interface BeachItemDef extends BaseItemDef {
  category: "beach";
}

/** Building materials for the village's projects, picked up off the ground (Milestone 6). */
export interface MaterialItemDef extends BaseItemDef {
  category: "material";
}

export interface FishItemDef extends BaseItemDef {
  category: "fish";
  /** The fish this is. */
  fishId: FishId;
}

export interface BugItemDef extends BaseItemDef {
  category: "bug";
  /** The bug this is. */
  bugId: BugId;
}

export interface FurnitureItemDef extends BaseItemDef {
  category: "furniture";
  /** The piece this is: where it goes, how it turns, the tiles it covers. */
  furnitureId: FurnitureId;
}

export type ItemDef =
  | SeedItemDef
  | CropItemDef
  | ToolItemDef
  | BeachItemDef
  | MaterialItemDef
  | FishItemDef
  | BugItemDef
  | FurnitureItemDef;

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

export type GoldenCropId = `golden_${CropId}`;

/** The golden crop a pick of `cropId` can give (Farming level 10). */
export function goldenItemId(cropId: CropId): GoldenCropId {
  return `golden_${cropId}`;
}

/** The furniture an item is, or null if it isn't furniture. */
export function furnitureOf(itemId: string | null | undefined): FurnitureId | null {
  if (!isItemId(itemId)) return null;
  const item = ITEMS[itemId];
  return item.category === "furniture" ? item.furnitureId : null;
}

/** The item a caught `fishId` gives. Fish items share their fish's id. */
export function fishItemId(fishId: FishId): FishId {
  return fishId;
}

/** The item a caught `bugId` gives. Bug items share their bug's id. */
export function bugItemId(bugId: BugId): BugId {
  return bugId;
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

/** Golden crops: now and then a pick is golden, for a farmer at Farming level 10. Never bought. */
const goldenItems = Object.fromEntries(
  CROP_IDS.map((cropId): [GoldenCropId, CropItemDef] => {
    const crop = CROPS[cropId];
    return [
      goldenItemId(cropId),
      {
        id: goldenItemId(cropId),
        name: `Golden ${crop.name}`,
        category: "crop",
        cropId,
        golden: true,
        maxStack: STACK,
        sellPrice: crop.sellPrice * PERK.goldenPrice,
      },
    ];
  }),
) as Record<GoldenCropId, CropItemDef>;

const toolData = {
  hoe: { id: "hoe", name: "Hoe", category: "tool", maxStack: 1, buyPrice: 100 },
  watering_can: {
    id: "watering_can",
    name: "Watering Can",
    category: "tool",
    maxStack: 1,
    buyPrice: 100,
  },
  fishing_rod: { id: "fishing_rod", name: "Fishing Rod", category: "tool", maxStack: 1, buyPrice: 100 },
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

/**
 * Lying about: driftwood washes up on the beach and branches fall under the meadow's trees each
 * morning (shared/content/forage.ts). The Village Board wants them, so they sell for very little,
 * but the crate still takes them so nothing's ever stuck.
 */
const materialData = {
  driftwood: { id: "driftwood", name: "Driftwood", category: "material", maxStack: STACK, sellPrice: 5 },
  branch: { id: "branch", name: "Branch", plural: "Branches", category: "material", maxStack: STACK, sellPrice: 5 },
} satisfies Record<string, MaterialItemDef>;

/** Caught, never bought. */
const fishItems = Object.fromEntries(
  FISH_IDS.map((fishId): [FishId, FishItemDef] => {
    const fish = FISH[fishId];
    return [
      fishItemId(fishId),
      {
        id: fishItemId(fishId),
        name: fish.name,
        category: "fish",
        fishId,
        maxStack: STACK,
        sellPrice: fish.sellPrice,
      },
    ];
  }),
) as Record<FishId, FishItemDef>;

/** Caught in the meadow, never bought. */
const bugItems = Object.fromEntries(
  BUG_IDS.map((bugId): [BugId, BugItemDef] => {
    const bug = BUGS[bugId];
    return [
      bugItemId(bugId),
      { id: bugItemId(bugId), name: bug.name, category: "bug", bugId, maxStack: STACK, sellPrice: bug.sellPrice },
    ];
  }),
) as Record<BugId, BugItemDef>;

/**
 * Bought at the general store, put down in your house or on the farm. They ship back for about half.
 * A skill's gifts aren't sold at the store, so they have no buyPrice.
 */
const furnitureItems = Object.fromEntries(
  FURNITURE_IDS.map((furnitureId): [FurnitureId, FurnitureItemDef] => {
    const piece = FURNITURE[furnitureId];
    return [
      furnitureId,
      {
        id: furnitureId,
        name: piece.name,
        category: "furniture",
        furnitureId,
        maxStack: STACK,
        ...(isGift(furnitureId) ? {} : { buyPrice: piece.price }),
        sellPrice: Math.floor(piece.price * FURNITURE_SELL_FRACTION),
      },
    ];
  }),
) as Record<FurnitureId, FurnitureItemDef>;

export type ItemId =
  | SeedItemId
  | CropId
  | GoldenCropId
  | keyof typeof toolData
  | keyof typeof beachData
  | keyof typeof materialData
  | FishId
  | BugId
  | FurnitureId;

/** Every item, grouped seeds, crops (then golden ones), tools, beach finds, materials, fish, bugs, furniture. Shop and bag listings follow this order. */
export const ITEMS: Readonly<Record<ItemId, ItemDef>> = {
  ...seedItems,
  ...cropItems,
  ...goldenItems,
  ...toolData,
  ...beachData,
  ...materialData,
  ...fishItems,
  ...bugItems,
  ...furnitureItems,
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
  { itemId: "fishing_rod", count: 1 },
];

/** The fishing rod: hold it facing the water to fish (shared/fishing/spots.ts). */
export const FISHING_ROD: ItemId = "fishing_rod";

/** A building material: driftwood or a branch. */
export type MaterialId = keyof typeof materialData;

/** An item's name for "several of it": "Branches", "Driftwood", "Sea Glass". */
export function pluralName(itemId: ItemId): string {
  const item = ITEMS[itemId];
  return item.plural ?? item.name;
}
