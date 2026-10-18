import { CROP_IDS, CROPS } from "./crops";
import { seedItemId, type SeedItemId } from "./items";

/**
 * What the seed stand by the beach path sells, in shelf order: one packet of seeds per starter
 * crop, at the seed price in crops.ts. The garden shop's seeds (Milestone 8) are sold there, by
 * season (shared/content/gardenShop.ts).
 */
export const SEED_STAND_STOCK: readonly SeedItemId[] = CROP_IDS.filter((id) => CROPS[id].sold === "seedStand").map(seedItemId);
