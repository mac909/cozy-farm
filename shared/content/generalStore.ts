import type { FurnitureId } from "./furniture";

/**
 * What the general store by the village path sells: furniture for your house and decorations for
 * the farm, two shelves in this order. Prices are in furniture.ts. Seeds stay at the seed stand.
 */
export const STORE_SHELVES: readonly { title: string; stock: readonly FurnitureId[] }[] = [
  {
    title: "For your house",
    stock: [
      "red_bed",
      "blue_bed",
      "green_bed",
      "yellow_bed",
      "big_bed",
      "sofa",
      "wooden_chair",
      "stool",
      "wooden_table",
      "tablecloth_table",
      "long_table",
      "bookshelf",
      "small_bookshelf",
      "wide_shelf",
      "drawers",
      "dresser",
      "floor_lamp",
      "potted_fern",
      "clay_pot",
      "straw_rug",
      "cream_rug",
      "yellow_mat",
    ],
  },
  {
    title: "For the farm",
    stock: [
      "fence",
      "stepping_stone",
      "sunflower",
      "poppy",
      "blue_flower_tub",
      "red_flower_tub",
      "herb_tub",
      "round_bush",
      "barrel",
      "crates",
      "wheat_sheaf",
      "scarecrow",
      "washing_line",
      "fishing_net",
      "red_banner",
      "green_banner",
    ],
  },
];

/** Everything the store sells, shelf by shelf. */
export const GENERAL_STORE_STOCK: readonly FurnitureId[] = STORE_SHELVES.flatMap((shelf) => shelf.stock);
