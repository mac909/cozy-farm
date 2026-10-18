import { FURNITURE_IDS, type FurnitureId } from "../../../shared/content/furniture";

/**
 * Where each piece of furniture's picture is, one per way it can turn (in the same order as its
 * `turns` in shared/content/furniture.ts). From the Ninja Adventure pack, plus a few seaside pieces
 * of our own. Data only, no Phaser, so tests and tools can read it.
 *
 * A picture is drawn with its bottom middle on the bottom middle of the tiles the piece covers, so
 * tall things (a lamp, a bookshelf) rise above their footprint, and you can walk behind their tops.
 */

const PACK = "/assets/ninja-adventure/";

/** The sheets furniture comes from. Map tilesets are loaded with the map; the others here. */
export const FURNITURE_SHEETS = {
  element: { url: `${PACK}Backgrounds/Tilesets/TilesetElement.png`, mapTileset: null },
  bed: { url: `${PACK}Backgrounds/Tilesets/tileset_bed.png`, mapTileset: null },
  fishNet: { url: `${PACK}Backgrounds/Vehicles/FishNet.png`, mapTileset: null },
  /** Our own seaside pieces (tools/sprites/seaside.ts), one 32×32 frame each. */
  seaside: { url: "/assets/custom/seaside-furniture.png", mapTileset: null },
  /** Gifts for reaching a skill level (tools/sprites/rewards.ts), one 32×32 frame each. */
  rewards: { url: "/assets/custom/reward-furniture.png", mapTileset: null },
  house: { url: null, mapTileset: "TilesetHouse" },
  nature: { url: null, mapTileset: "TilesetNature" },
  floorDetail: { url: null, mapTileset: "TilesetFloorDetail" },
} as const;

export type SheetId = keyof typeof FURNITURE_SHEETS;

/** One picture: a rectangle on a sheet, maybe mirrored. */
export interface PieceArt {
  sheet: SheetId;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Mirrored left to right (a chair facing the other way). */
  flipX?: boolean;
}

const at = (sheet: SheetId, x: number, y: number, w = 16, h = 16, flipX = false): PieceArt => ({ sheet, x, y, w, h, flipX });
const mirrored = (art: PieceArt): PieceArt => ({ ...art, flipX: true });

/** A single bed upright, then on its side, then on its side the other way round. */
const bed = (upright: PieceArt, sideways: PieceArt) => [upright, sideways, mirrored(sideways)];

export const FURNITURE_ART: Readonly<Record<FurnitureId, readonly PieceArt[]>> = {
  red_bed: bed(at("bed", 80, 48, 16, 32), at("bed", 32, 80, 32, 16)),
  blue_bed: bed(at("bed", 192, 48, 16, 32), at("bed", 144, 80, 32, 16)),
  green_bed: [at("bed", 192, 0, 16, 32)],
  yellow_bed: bed(at("bed", 80, 0, 16, 32), at("bed", 32, 32, 32, 16)),
  big_bed: [at("bed", 112, 48, 32, 48)],
  sofa: [at("element", 64, 48, 32, 32)],
  wooden_chair: [at("element", 0, 144), at("element", 0, 144, 16, 16, true)],
  stool: [at("element", 176, 0)],
  wooden_table: [at("element", 48, 144)],
  tablecloth_table: [at("element", 224, 0)],
  long_table: [at("element", 32, 160, 48, 16)],
  bookshelf: [at("element", 128, 112, 32, 32)],
  small_bookshelf: [at("element", 48, 112, 16, 32)],
  wide_shelf: [at("element", 160, 112, 32, 32)],
  drawers: [at("element", 16, 112, 16, 32)],
  dresser: [at("element", 96, 112, 32, 32)],
  floor_lamp: [at("element", 96, 48, 16, 32)],
  potted_fern: [at("element", 0, 112, 16, 32)],
  clay_pot: [at("element", 32, 144)],
  straw_rug: [at("element", 208, 64, 48, 48)],
  cream_rug: [at("bed", 32, 96, 48, 32), at("bed", 0, 96, 32, 48)],
  yellow_mat: [at("bed", 64, 128, 32, 16), at("bed", 96, 96, 16, 32)],
  // The farm field's own rail fence: straight across, straight up, then the corners clockwise from the top left.
  fence: [at("house", 176, 112), at("house", 176, 96), at("house", 128, 96), at("house", 144, 96), at("house", 144, 112), at("house", 128, 112)],
  stepping_stone: [at("floorDetail", 144, 0)],
  sunflower: [at("nature", 0, 176)],
  poppy: [at("nature", 48, 176)],
  blue_flower_tub: [at("house", 256, 208)],
  red_flower_tub: [at("house", 288, 208)],
  herb_tub: [at("house", 272, 208)],
  round_bush: [at("nature", 16, 160)],
  barrel: [at("house", 288, 224, 16, 32)],
  crates: [at("element", 144, 32)],
  wheat_sheaf: [at("element", 192, 64)],
  scarecrow: [at("element", 240, 0)],
  washing_line: [at("element", 176, 32, 48, 32)],
  fishing_net: [at("fishNet", 0, 0, 33, 25)],
  red_banner: [at("house", 368, 320, 16, 32)],
  green_banner: [at("house", 400, 320, 16, 32)],
  // Inside their 32×32 frames, as in tools/sprites/seaside.ts.
  life_ring: [at("seaside", 8, 0, 16, 32)],
  anchor: [at("seaside", 40, 0, 16, 32)],
  beach_umbrella: [at("seaside", 64, 0, 32, 32)],
  ship_in_bottle: [at("seaside", 104, 16, 16, 16)],
  fish_tank: [at("seaside", 128, 5, 32, 27)],
  // Inside their 32×32 frames, as in tools/sprites/rewards.ts (a pixel of outline either side).
  straw_hat: [at("rewards", 7, 14, 18, 18)],
  mounted_fish: [at("rewards", 39, 12, 18, 20)],
  shell_wreath: [at("rewards", 71, 8, 18, 24)],
  golden_can: [at("rewards", 103, 16, 18, 16)],
  lobster_pot: [at("rewards", 135, 16, 18, 16)],
  butterfly_jar: [at("rewards", 167, 16, 18, 16)],
};

/** The picture for a piece turned `turn` times (wrapping round, like footprintOf). */
export function pieceArt(id: FurnitureId, turn: number): PieceArt {
  const turns = FURNITURE_ART[id];
  return turns[((turn % turns.length) + turns.length) % turns.length];
}

/** The texture frame name for a piece's picture on its sheet. */
export const pieceFrame = (id: FurnitureId, turn: number) => `furniture:${id}:${turn}`;

/** Every piece and turn, for adding the frames once the sheets have loaded. */
export function allPieceArt(): { id: FurnitureId; turn: number; art: PieceArt }[] {
  return FURNITURE_IDS.flatMap((id) => FURNITURE_ART[id].map((art, turn) => ({ id, turn, art })));
}
