/**
 * Furniture and decorations: everything you can put down, in your house or on the farm. Each is
 * also an item (items.ts builds them from this list), bought at the general store and carried in
 * the bag. Prices are first guesses, meant to be tuned by playing. The pictures are in
 * client/src/art/furnitureArt.ts, one per turn, in the same order.
 *
 * Ids are kept in saves (in bags, houses and on the farm), so renaming or removing one needs a
 * save migration.
 */

/** The floor tiles a piece covers, from its top-left tile. */
export interface Footprint {
  width: number;
  height: number;
}

/** Where a piece can go: inside your own house, or outdoors on the shared farm. */
export type PlaceKind = "house" | "farm";

export interface FurnitureDef {
  /** Same as its key in FURNITURE, and its item id. */
  id: string;
  /** Shown to players. */
  name: string;
  /** Coins at the general store. It sells back in the crate for half. */
  price: number;
  /** Where it can be put down. */
  where: readonly PlaceKind[];
  /**
   * The ways it can face, each with the tiles it covers. Turn goes through them in order; a piece
   * the art only draws one way has one.
   */
  turns: readonly Footprint[];
  /**
   * Lies flat on the ground (rugs, mats, stepping stones): you walk over it, and other pieces can
   * stand on it. Two flat pieces can't overlap.
   */
  flat?: boolean;
  /** Small enough to walk through (flowers), but nothing else can stand on it. */
  walkable?: boolean;
  /** You can sleep in it, like the tent. */
  bed?: boolean;
}

const ONE: Footprint = { width: 1, height: 1 };
const WIDE: Footprint = { width: 2, height: 1 };
const TALL: Footprint = { width: 1, height: 2 };
const HOUSE: readonly PlaceKind[] = ["house"];
const FARM: readonly PlaceKind[] = ["farm"];
const ANYWHERE: readonly PlaceKind[] = ["house", "farm"];

/** A single bed: upright, or on its side either way round. */
const BED_TURNS = [TALL, WIDE, WIDE];

const furnitureData = {
  // ---------- For the house ----------
  red_bed: { id: "red_bed", name: "Red Bed", price: 180, where: HOUSE, turns: BED_TURNS, bed: true },
  blue_bed: { id: "blue_bed", name: "Blue Bed", price: 180, where: HOUSE, turns: BED_TURNS, bed: true },
  green_bed: { id: "green_bed", name: "Green Bed", price: 180, where: HOUSE, turns: [TALL], bed: true },
  yellow_bed: { id: "yellow_bed", name: "Straw Bed", price: 150, where: HOUSE, turns: BED_TURNS, bed: true },
  big_bed: { id: "big_bed", name: "Big Bed", price: 360, where: HOUSE, turns: [{ width: 2, height: 3 }], bed: true },
  sofa: { id: "sofa", name: "Sofa", price: 220, where: HOUSE, turns: [WIDE] },
  wooden_chair: { id: "wooden_chair", name: "Wooden Chair", price: 60, where: ANYWHERE, turns: [ONE, ONE] },
  stool: { id: "stool", name: "Stool", price: 40, where: ANYWHERE, turns: [ONE] },
  wooden_table: { id: "wooden_table", name: "Little Table", price: 90, where: ANYWHERE, turns: [ONE] },
  tablecloth_table: { id: "tablecloth_table", name: "Tablecloth Table", price: 110, where: HOUSE, turns: [ONE] },
  long_table: { id: "long_table", name: "Long Table", price: 160, where: ANYWHERE, turns: [{ width: 3, height: 1 }] },
  bookshelf: { id: "bookshelf", name: "Bookshelf", price: 200, where: HOUSE, turns: [WIDE] },
  small_bookshelf: { id: "small_bookshelf", name: "Little Bookshelf", price: 120, where: HOUSE, turns: [ONE] },
  wide_shelf: { id: "wide_shelf", name: "Wide Shelf", price: 160, where: HOUSE, turns: [WIDE] },
  drawers: { id: "drawers", name: "Drawers", price: 110, where: HOUSE, turns: [ONE] },
  dresser: { id: "dresser", name: "Dresser", price: 180, where: HOUSE, turns: [WIDE] },
  floor_lamp: { id: "floor_lamp", name: "Floor Lamp", price: 100, where: ANYWHERE, turns: [ONE] },
  potted_fern: { id: "potted_fern", name: "Potted Fern", price: 60, where: ANYWHERE, turns: [ONE] },
  clay_pot: { id: "clay_pot", name: "Clay Pot", price: 40, where: ANYWHERE, turns: [ONE] },
  straw_rug: { id: "straw_rug", name: "Straw Rug", price: 120, where: HOUSE, turns: [{ width: 3, height: 3 }], flat: true },
  cream_rug: {
    id: "cream_rug",
    name: "Cream Rug",
    price: 140,
    where: HOUSE,
    turns: [
      { width: 3, height: 2 },
      { width: 2, height: 3 },
    ],
    flat: true,
  },
  yellow_mat: { id: "yellow_mat", name: "Yellow Mat", price: 50, where: HOUSE, turns: [WIDE, TALL], flat: true },

  // ---------- For the farm ----------
  /** Straight either way, or one of the four corners, so a fence can go all the way round. */
  fence: { id: "fence", name: "Fence", price: 15, where: FARM, turns: [ONE, ONE, ONE, ONE, ONE, ONE] },
  stepping_stone: { id: "stepping_stone", name: "Stepping Stone", price: 10, where: FARM, turns: [ONE], flat: true },
  sunflower: { id: "sunflower", name: "Sunflower", price: 15, where: FARM, turns: [ONE], walkable: true },
  poppy: { id: "poppy", name: "Poppy", price: 15, where: FARM, turns: [ONE], walkable: true },
  blue_flower_tub: { id: "blue_flower_tub", name: "Blue Flower Tub", price: 40, where: ANYWHERE, turns: [ONE] },
  red_flower_tub: { id: "red_flower_tub", name: "Red Flower Tub", price: 40, where: ANYWHERE, turns: [ONE] },
  herb_tub: { id: "herb_tub", name: "Herb Tub", price: 40, where: ANYWHERE, turns: [ONE] },
  round_bush: { id: "round_bush", name: "Round Bush", price: 30, where: FARM, turns: [ONE] },
  barrel: { id: "barrel", name: "Barrel", price: 50, where: ANYWHERE, turns: [ONE] },
  crates: { id: "crates", name: "Crates", price: 40, where: ANYWHERE, turns: [ONE] },
  wheat_sheaf: { id: "wheat_sheaf", name: "Wheat Sheaf", price: 30, where: FARM, turns: [ONE] },
  scarecrow: { id: "scarecrow", name: "Scarecrow", price: 80, where: FARM, turns: [ONE] },
  washing_line: { id: "washing_line", name: "Washing Line", price: 120, where: FARM, turns: [{ width: 3, height: 1 }] },
  fishing_net: { id: "fishing_net", name: "Fishing Net", price: 80, where: ANYWHERE, turns: [{ width: 2, height: 2 }], flat: true },
  red_banner: { id: "red_banner", name: "Red Banner", price: 60, where: FARM, turns: [ONE] },
  green_banner: { id: "green_banner", name: "Green Banner", price: 60, where: FARM, turns: [ONE] },

  // ---------- Seaside pieces of our own (tools/sprites/seaside.ts) ----------
  ship_in_bottle: { id: "ship_in_bottle", name: "Ship in a Bottle", price: 160, where: HOUSE, turns: [ONE] },
  life_ring: { id: "life_ring", name: "Life Ring", price: 70, where: ANYWHERE, turns: [ONE] },
  anchor: { id: "anchor", name: "Anchor", price: 90, where: ANYWHERE, turns: [ONE] },
  beach_umbrella: { id: "beach_umbrella", name: "Beach Umbrella", price: 150, where: FARM, turns: [ONE] },
} satisfies Record<string, FurnitureDef>;

export type FurnitureId = keyof typeof furnitureData;

/** Every piece, in the general store's shelf order: the house first, then the farm. */
export const FURNITURE: Readonly<Record<FurnitureId, FurnitureDef>> = furnitureData;

export const FURNITURE_IDS = Object.keys(FURNITURE) as FurnitureId[];

/** True if `id` names a piece in FURNITURE. */
export function isFurnitureId(id: unknown): id is FurnitureId {
  return typeof id === "string" && Object.hasOwn(FURNITURE, id);
}

/** Furniture sells back in the crate for this share of its price, rounded down. */
export const FURNITURE_SELL_FRACTION = 0.5;

/** The tiles a piece covers when turned `turn` times (wrapping round). */
export function footprintOf(id: FurnitureId, turn: number): Footprint {
  const { turns } = FURNITURE[id];
  return turns[((turn % turns.length) + turns.length) % turns.length];
}

/** The next way round, back to the first after the last. */
export function nextTurn(id: FurnitureId, turn: number): number {
  return (turn + 1) % FURNITURE[id].turns.length;
}

/** Whether a piece can go in `kind` of place. */
export function goesIn(id: FurnitureId, kind: PlaceKind): boolean {
  return FURNITURE[id].where.includes(kind);
}

/** Whether a piece stops people walking through it. */
export function blocksWalking(id: FurnitureId): boolean {
  const piece: FurnitureDef = FURNITURE[id];
  return !piece.flat && !piece.walkable;
}
