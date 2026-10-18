import { CROPS, type CropId } from "./crops";
import { seedItemId, type SeedItemId } from "./items";

/**
 * What the seed stand by the beach path sells, in shelf order: one packet of seeds per crop, at the
 * seed price in crops.ts. Seeds only for now; tools never get lost, and furniture has nowhere to go
 * until the houses arrive.
 */
export const SEED_STAND_STOCK: readonly SeedItemId[] = (Object.keys(CROPS) as CropId[]).map(seedItemId);
