/**
 * Colours for our own sprites. Almost all are sampled from Ninja Adventure's
 * Palette.png or its sprites, so our art sits next to the pack without clashing.
 * The few extra shades are marked "ours".
 */

/** Ninja Adventure's outline colour: a near-black with a little green-blue in it. */
export const OUTLINE = "#141b1b";

export const C = {
  outline: OUTLINE,
  white: "#ffffff",
  offWhite: "#f2eaf1",

  // Leaves (the pack's small plants and bushes)
  leafLight: "#adbc3a",
  leaf: "#74a334",
  leafDark: "#4a7f4b",
  leafDeep: "#345a52",

  // Stems, roots, wood
  stem: "#985c40",
  stemDark: "#7d3e24",
  woodLight: "#f1c471",
  woodMid: "#d78b4a",
  woodShade: "#a3754e",
  woodDark: "#91522c",

  // Reds and pinks
  red: "#d14b34",
  plum: "#8f3e56",
  berry: "#e0394c",
  pink: "#ef9597",
  rose: "#cf736d",

  // Oranges and yellows
  orangeLight: "#ffcb8d",
  orange: "#ffad5d",
  carrot: "#ff9554",
  pumpkin: "#ff814a",
  orangeDark: "#e46d3a",
  pumpkinStem: "#945d44",
  yellow: "#ffe18d",
  petal: "#ffe166",
  petalShade: "#f1ae41",
  gold: "#f1c471",

  // Sand, cream, tan (also the beach recolour)
  cream: "#fce2ca",
  sand: "#eecf9b",
  sandRipple: "#e0c08b", // ours: halfway between sand and tan, for ripples
  tan: "#d2b37d",
  tanDark: "#c8966b",
  wetSand: "#b3957f",
  potatoEye: "#816855",

  // Water and sea glass
  aquaLight: "#8feff1",
  aqua: "#71ddee",
  sea: "#79b8ce",
  seaDeep: "#548789",
  ice: "#b8dce5",
  teal: "#2d697b",

  // Purples
  lilac: "#d3a2c0",
  mauve: "#a5608b",
  plumDark: "#543c52",

  // Greys
  stoneLight: "#abc2bc",
  stone: "#8d977f",

  // Soil (ours: the pack has dirt paths but no tilled farm soil)
  soilLight: "#bd7959",
  soil: "#9c6546",
  soilDark: "#80503c",
  soilRim: "#613a30",
  wetSoilLight: "#81523f",
  wetSoil: "#6a4136",
  wetSoilDark: "#56332e",
  wetSoilRim: "#3f2628",
} as const;

export type ColourName = keyof typeof C;
