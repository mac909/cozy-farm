/**
 * Beach sand, made by recolouring Ninja Adventure's own autotiles so the edges
 * match the pack exactly. Each output keeps the source block's tile layout,
 * so autotile rules written for the pack's tiles work for these too.
 *
 * - sand-grass: TilesetFloor's "dirt in grass" block, dirt recoloured to sand.
 * - sand-water: TilesetWater's "water in orange ground" block, ground recoloured to sand.
 *
 * Both map the pack's plain ground colour to the same sand colour, so the two
 * sheets can be layered (sand-grass underneath, sand-water on top).
 */
import { C } from "./palette";
import { Img, colours, recolor, toHex, rgba } from "./lib/image";

export interface Recolour {
  /** Source sheet, relative to client/public/assets/ninja-adventure/. */
  source: string;
  /** Block to copy, in pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Pack colour → our colour. */
  map: Readonly<Record<string, string>>;
  /** Pack colours we deliberately keep (grass, water, foam, decorations). */
  keep: readonly string[];
}

export const SAND_GRASS: Recolour = {
  source: "Backgrounds/Tilesets/TilesetFloor.png",
  x: 0,
  y: 112,
  w: 176,
  h: 112,
  map: {
    "#d3865f": C.sand, // dirt → sand
    "#bd7959": C.sandRipple, // dirt furrows → soft ripples in the sand
    "#e6a578": C.cream, // pebble highlight
    "#ad704b": C.tanDark, // stick on the ground
  },
  keep: ["#adbc3a", "#a8a129", "#74a334", "#56864c", "#ffad5d", "#ef914f"],
};

export const SAND_WATER: Recolour = {
  source: "Backgrounds/Tilesets/TilesetWater.png",
  x: 0,
  y: 0,
  w: 176,
  h: 96,
  map: {
    "#ffcb8d": C.sand, // plain ground → dry sand
    "#ffad5d": C.tan, // damp sand near the water
    "#d78b4a": C.tanDark, // wetter
    "#965340": C.wetSand, // the wet edge under the foam
  },
  keep: ["#71ddee", "#79b8ce", "#ffffff"],
};

export function recolourBlock(sheet: Img, r: Recolour): Img {
  const block = sheet.crop(r.x, r.y, r.w, r.h);
  const known = new Set([...Object.keys(r.map), ...r.keep].map((c) => toHex(rgba(c))));
  const unknown = [...colours(block)].filter((c) => !known.has(c));
  if (unknown.length) console.warn(`  ! ${r.source}: colours not mapped or kept: ${unknown.join(" ")}`);
  return recolor(block, r.map);
}
