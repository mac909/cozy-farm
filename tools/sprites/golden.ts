/**
 * Golden crops (Milestone 7, Farming level 10's perk): each crop's harvested item, recoloured in
 * gold by how light each pixel is, with a glint. The outline stays as it is.
 */
import { C, OUTLINE } from "./palette";
import { Img, rgba, toHex } from "./lib/image";

/** Dark to light. */
const GOLD = [C.woodDark, C.orangeDark, C.petalShade, C.gold, C.petal, C.yellow].map((hex) => rgba(hex));

export function golden(item: Img): Img {
  const out = item.clone();
  const outline = toHex(rgba(OUTLINE));
  let lightest = 0;
  let darkest = 1;
  const light = (x: number, y: number) => {
    const [r, g, b] = item.get(x, y);
    return (0.3 * r + 0.59 * g + 0.11 * b) / 255;
  };
  for (let y = 0; y < item.h; y++)
    for (let x = 0; x < item.w; x++) {
      if (!item.opaque(x, y) || toHex(item.get(x, y)) === outline) continue;
      lightest = Math.max(lightest, light(x, y));
      darkest = Math.min(darkest, light(x, y));
    }
  const span = Math.max(0.01, lightest - darkest);
  for (let y = 0; y < item.h; y++)
    for (let x = 0; x < item.w; x++) {
      if (!item.opaque(x, y) || toHex(item.get(x, y)) === outline) continue;
      const t = (light(x, y) - darkest) / span;
      const step = Math.min(GOLD.length - 1, 1 + Math.floor(t * (GOLD.length - 1)));
      out.set(x, y, GOLD[step]);
    }
  // A glint: the topmost lit pixel of the left half turns white.
  for (let y = 0; y < item.h; y++) {
    const x = [...Array(item.w / 2).keys()].find((xx) => out.opaque(xx, y) && toHex(out.get(xx, y)) !== outline);
    if (x !== undefined) {
      out.set(x + 1, y + 1, C.white);
      break;
    }
  }
  return out;
}
