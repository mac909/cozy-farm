/**
 * Tilled soil, dry and watered, as a 16-tile autotile set.
 *
 * Each tile is picked by which of its four neighbours are also tilled
 * (bit 1 = north, 2 = east, 4 = south, 8 = west). Sides with no tilled
 * neighbour get a dark rim and a transparent 1px border, so the grass
 * underneath shows around a patch. Corners are rounded where two open sides meet.
 */
import { C } from "./palette";
import { Img } from "./lib/image";

export const NORTH = 1;
export const EAST = 2;
export const SOUTH = 4;
export const WEST = 8;

/**
 * "a" clod highlight, "b" soil, "c" shadow: two broken furrows per tile plus a few
 * clods. Tiles seamlessly in both directions.
 */
const TEXTURE = [
  "bbbbbbbbbbbbbbbb",
  "bbaabbbbbbbbabbb",
  "bbbcbbbbbbbbcbbb",
  "bbbbbbbaabbbbbbb",
  "ccbbcccbcccbbccc",
  "bbbbbbbbbbbbbbbb",
  "bbbbbabbbbbbbbbb",
  "abbbbcbbbbbabbba",
  "cbbbbbbbbbbcbbbc",
  "bbbbbbbbbbbbbbbb",
  "bbbbbbbbaabbbbbb",
  "bbabbbbbbcbbbbbb",
  "cccccbbcccccbbcc",
  "bbbbbbbbbbbbbbbb",
  "bbbbbbbbbbbbbabb",
  "bbbbbbbbbbbbbbbb",
];

const DRY = { a: C.soilLight, b: C.soil, c: C.soilDark, rim: C.soilRim };
const WET = { a: C.wetSoilLight, b: C.wetSoil, c: C.wetSoilDark, rim: C.wetSoilRim };

export function soilTile(mask: number, wet: boolean): Img {
  const pal = wet ? WET : DRY;
  const open = { n: !(mask & NORTH), e: !(mask & EAST), s: !(mask & SOUTH), w: !(mask & WEST) };
  const img = new Img(16, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      // Outer border: transparent on open sides.
      if ((open.n && y === 0) || (open.s && y === 15) || (open.w && x === 0) || (open.e && x === 15)) continue;
      // Rounded corners where two open sides meet.
      const cornerX = (open.w && x === 1) || (open.e && x === 14);
      const cornerY = (open.n && y === 1) || (open.s && y === 14);
      if (cornerX && cornerY) continue;
      const rim = (open.n && y === 1) || (open.s && y === 14) || (open.w && x === 1) || (open.e && x === 14);
      let colour: string;
      if (rim) colour = pal.rim;
      else if (open.n && y === 2) colour = pal.c; // shadow under the top edge
      else if (open.s && y === 13) colour = pal.a; // lit lip along the bottom edge
      else colour = pal[TEXTURE[y][x] as "a" | "b" | "c"];
      img.set(x, y, colour);
    }
  return img;
}
