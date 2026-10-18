/**
 * The seasons' looks (Milestone 8). The pack has blossom and snowy versions of its round trees,
 * but no autumn ones in the small sizes, so we recolour the two green round trees into autumn
 * gold and red (seasonal-trees.png, a tileset in the map). The grass gets a recolour of our
 * beach terrain for autumn (golden) and winter (frosty); spring and summer keep it as it is.
 * client/src/art/seasonArt.ts says which tiles become which in each season.
 */
import { C } from "./palette";
import { Img, recolor } from "./lib/image";

/** The pack's round trees' greens (light, mid, dark), and the second tree's olive underside. */
const LEAVES_TO_AUTUMN = {
  "#adbc3a": C.gold,
  "#74a334": C.orange,
  "#4a7f4b": C.red,
  "#7a7a3e": C.orangeDark,
  "#546626": C.woodDark,
} as const;

/** Where the two green round trees are on TilesetNature.png (2 × 2 tiles each). */
export const ROUND_TREES = [
  { x: 0, y: 0 },
  { x: 256, y: 0 },
] as const;

/** seasonal-trees.png: the two round trees in autumn, side by side (4 × 2 tiles). */
export function autumnTrees(nature: Img): Img {
  const sheet = new Img(64, 32);
  ROUND_TREES.forEach(({ x, y }, i) => sheet.blit(recolor(nature.crop(x, y, 32, 32), LEAVES_TO_AUTUMN), i * 32, 0));
  return sheet;
}

/** The grass in our beach terrain (and its tufts and edges), per season. Sand and sea stay as they are. */
const GRASS = {
  autumn: { "#adbc3a": "#c9b553", "#a8a129": "#b39a3c", "#74a334": "#a48d3c", "#56864c": "#7f6e38" },
  winter: { "#adbc3a": "#e9f1ee", "#a8a129": "#d2dfe0", "#74a334": "#b5c9cc", "#56864c": "#8ea6ab" },
} as const;

export type TerrainSeason = keyof typeof GRASS;
export const TERRAIN_SEASONS = Object.keys(GRASS) as TerrainSeason[];

/** beach-terrain-<season>.png: the same tiles with the season's grass. */
export function seasonalTerrain(terrain: Img, season: TerrainSeason): Img {
  return recolor(terrain, GRASS[season]);
}
