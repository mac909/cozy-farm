/**
 * The characters a player can be, from the Ninja Adventure pack. `folder` is the pack's
 * folder under client/public/assets/ninja-adventure/Actor/Character/. The first one is
 * the default. Labels are read out by screen readers in the picker.
 */
export const CHARACTERS = [
  { id: "villager4", label: "Blond villager", folder: "Villager4" },
  { id: "woman", label: "Woman with a headband", folder: "Woman" },
  { id: "princess", label: "Princess", folder: "Princess" },
  { id: "village6", label: "Girl with a red bow", folder: "Village6" },
  { id: "villager3", label: "Villager in green", folder: "Villager3" },
  { id: "villager5", label: "Villager in a green cap", folder: "Villager5" },
  { id: "boy", label: "Red-haired boy", folder: "Boy" },
  { id: "eggGirl", label: "Egg girl", folder: "EggGirl" },
  { id: "eskimo", label: "Eskimo in a blue parka", folder: "Eskimo" },
  { id: "maskFrog", label: "Frog mask", folder: "MaskFrog" },
  { id: "maskRacoon", label: "Racoon mask", folder: "MaskRacoon" },
  { id: "pig", label: "Pig", folder: "Pig" },
] as const;

export type CharacterId = (typeof CHARACTERS)[number]["id"];

export const DEFAULT_CHARACTER: CharacterId = CHARACTERS[0].id;

/**
 * Before characters, a look was a shirt colour. Saved looks and old tabs may still
 * send one, so each colour maps to a character dressed in something similar.
 */
export const LEGACY_SHIRT_COLORS: Readonly<Record<string, CharacterId>> = {
  coral: "boy",
  sunflower: "villager4",
  mint: "villager3",
  sky: "eskimo",
  lilac: "woman",
  pink: "village6",
};
