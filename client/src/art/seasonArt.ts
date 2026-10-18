import type { SeasonId } from "../../../shared/content/seasons";

/**
 * How the village looks in each season (Milestone 8): which trees on the map become which, which
 * picture the grass uses, and what drifts down the screen. Before the seasons begin the village
 * looks as it's painted in Tiled. Trees are blocks of tiles on a tileset: "TilesetNature" is the
 * pack's, "seasonal-trees" our autumn recolour (tools/sprites/seasons.ts).
 */

/** A tree's top-left tile on a tileset, and its size in tiles. */
export interface TreeBlock {
  readonly tileset: string;
  readonly col: number;
  readonly row: number;
}

export interface TreeSwap {
  readonly from: TreeBlock;
  readonly to: TreeBlock;
  readonly width: number;
  readonly height: number;
}

const nature = (col: number, row: number): TreeBlock => ({ tileset: "TilesetNature", col, row });
const ours = (col: number, row: number): TreeBlock => ({ tileset: "seasonal-trees", col, row });

/** The round trees (2 × 2): green, the second green, blossom, snow; and the big ones (3 × 3). */
const ROUND = nature(0, 0);
const ROUND_B = nature(16, 0);
const BLOSSOM = nature(14, 0);
const SNOW_ROUND = nature(12, 0);
const PINE = nature(2, 0);
const SNOW_PINE = nature(8, 0);
const BIG_BLOSSOM = nature(0, 18);
const BIG_GREEN = nature(3, 18);
const BIG_SNOW = nature(6, 18);
const BIG_AUTUMN = nature(9, 18);

const round = (from: TreeBlock, to: TreeBlock): TreeSwap => ({ from, to, width: 2, height: 2 });
const big = (from: TreeBlock, to: TreeBlock): TreeSwap => ({ from, to, width: 3, height: 3 });

/** Each season's swaps, from the map as painted (spring and summer's green and blossom). */
export const SEASON_TREES: Readonly<Record<SeasonId, readonly TreeSwap[]>> = {
  // Blossom on the round trees; the second kind stays green, for a mix.
  spring: [round(ROUND, BLOSSOM), big(BIG_GREEN, BIG_BLOSSOM)],
  // Everything in leaf.
  summer: [round(BLOSSOM, ROUND), big(BIG_BLOSSOM, BIG_GREEN)],
  // Gold and red; the pines stay green.
  autumn: [round(ROUND, ours(0, 0)), round(BLOSSOM, ours(0, 0)), round(ROUND_B, ours(2, 0)), big(BIG_GREEN, BIG_AUTUMN), big(BIG_BLOSSOM, BIG_AUTUMN)],
  // Snow on everything.
  winter: [
    round(ROUND, SNOW_ROUND),
    round(BLOSSOM, SNOW_ROUND),
    round(ROUND_B, SNOW_ROUND),
    round(PINE, SNOW_PINE),
    big(BIG_GREEN, BIG_SNOW),
    big(BIG_BLOSSOM, BIG_SNOW),
  ],
};

/** The grass's picture in each season: our recoloured beach terrain, or null for the painted one. */
export const SEASON_TERRAIN: Readonly<Record<SeasonId, string | null>> = {
  spring: null,
  summer: null,
  autumn: "beach-terrain-autumn",
  winter: "beach-terrain-winter",
};

/** The tileset the grass is on in the map. */
export const TERRAIN_TILESET = "beach-terrain";

/** What drifts down the screen outdoors: a few leaves in autumn, snowflakes in winter. */
export const SEASON_DRIFT: Readonly<Record<SeasonId, { colours: readonly number[]; everyMs: number; size: number } | null>> = {
  spring: { colours: [0xffcba9, 0xef9597], everyMs: 900, size: 2 },
  summer: null,
  autumn: { colours: [0xffad5d, 0xe46d3a, 0xf1c471], everyMs: 500, size: 3 },
  winter: { colours: [0xffffff, 0xe9f1ee], everyMs: 260, size: 2 },
};
