/** The shirt colors a player can pick. The first one is the default. */
export const SHIRT_COLORS = [
  { id: "coral", label: "Coral", hex: "#ef7d6d" },
  { id: "sunflower", label: "Sunflower", hex: "#f2c14e" },
  { id: "mint", label: "Mint", hex: "#6cc79a" },
  { id: "sky", label: "Sky", hex: "#62a8e5" },
  { id: "lilac", label: "Lilac", hex: "#a88be0" },
  { id: "pink", label: "Pink", hex: "#f39cc3" },
] as const;

export type ShirtColorId = (typeof SHIRT_COLORS)[number]["id"];

export const DEFAULT_SHIRT_COLOR: ShirtColorId = SHIRT_COLORS[0].id;
