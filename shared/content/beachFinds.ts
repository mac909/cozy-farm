import type { ItemId } from "./items";
import type { Rarity } from "./rarity";

/**
 * What washes up on the sand each morning. Each find is a beach item in
 * items.ts (where its price lives); this says how rare it is. Rarer finds wash
 * up less often (see RARITY_WEIGHTS). A first guess, meant to be tuned by playing.
 */
export interface BeachFindDef {
  /** Same as its key in BEACH_FINDS: the beach item it gives. */
  itemId: ItemId;
  rarity: Rarity;
}

const findData = {
  scallop_shell: { itemId: "scallop_shell", rarity: "common" },
  cowrie_shell: { itemId: "cowrie_shell", rarity: "common" },
  sea_glass: { itemId: "sea_glass", rarity: "uncommon" },
  conch_shell: { itemId: "conch_shell", rarity: "uncommon" },
  starfish: { itemId: "starfish", rarity: "rare" },
} satisfies Partial<Record<ItemId, BeachFindDef>>;

export type BeachFindId = keyof typeof findData;

/** Every beach find, in collection book order. */
export const BEACH_FINDS: Readonly<Record<BeachFindId, BeachFindDef>> = findData;

export const BEACH_FIND_IDS = Object.keys(BEACH_FINDS) as BeachFindId[];

/** True if `id` names a beach find. */
export function isBeachFindId(id: unknown): id is BeachFindId {
  return typeof id === "string" && Object.hasOwn(BEACH_FINDS, id);
}
