/**
 * The shipping crate on the dock: 32×32 (two tiles wide), closed and open.
 * Drawn with rectangles because it is mostly planks; colours follow the pack's
 * camp crates and barrels. The render script adds the outer outline.
 */
import { C } from "./palette";
import { Img } from "./lib/image";

const W = 32;
const LEFT = 2;
const RIGHT = 29; // inclusive
const WIDTH = RIGHT - LEFT + 1;
const LID_TOP = 10;
const FRONT_TOP = 17;
const BOTTOM = 30; // inclusive

function front(img: Img): void {
  img.rect(LEFT, FRONT_TOP, WIDTH, BOTTOM - FRONT_TOP + 1, C.woodMid);
  img.rect(LEFT, FRONT_TOP, WIDTH, 1, C.woodDark); // shadow under the lid
  for (const y of [21, 25]) img.rect(LEFT, y, WIDTH, 1, C.woodShade); // gaps between planks
  img.rect(LEFT, BOTTOM, WIDTH, 1, C.woodDark);
  // Corner posts
  for (const x of [LEFT, RIGHT - 2]) {
    img.rect(x, FRONT_TOP + 1, 3, BOTTOM - FRONT_TOP - 1, C.woodLight);
    img.rect(x === LEFT ? x + 3 : x - 1, FRONT_TOP + 1, 1, BOTTOM - FRONT_TOP - 1, C.woodShade);
    img.set(x + 1, FRONT_TOP + 2, C.woodDark); // nails
    img.set(x + 1, BOTTOM - 2, C.woodDark);
  }
  // Label with a coin, so it reads as "things go in here to be sold"
  img.rect(12, 20, 8, 7, C.tan);
  img.rect(13, 21, 6, 5, C.cream);
  img.rect(15, 22, 2, 3, C.gold);
  img.set(14, 23, C.gold);
  img.set(17, 23, C.woodMid);
  img.set(16, 24, C.woodMid);
  img.set(15, 22, C.yellow);
}

export function crateClosed(): Img {
  const img = new Img(W, W);
  img.rect(LEFT, LID_TOP, WIDTH, FRONT_TOP - LID_TOP, C.woodMid);
  img.rect(LEFT + 1, LID_TOP + 1, WIDTH - 2, FRONT_TOP - LID_TOP - 2, C.woodLight);
  img.rect(LEFT + 1, LID_TOP + 1, WIDTH - 2, 1, C.yellow); // light catching the back edge
  img.rect(LEFT + 1, LID_TOP + 3, WIDTH - 2, 1, C.woodMid); // gap between lid planks
  img.rect(LEFT, FRONT_TOP - 1, WIDTH, 1, C.woodShade); // lid's front lip
  for (const x of [LEFT + 2, RIGHT - 2]) {
    img.set(x, LID_TOP + 2, C.woodShade);
    img.set(x, LID_TOP + 4, C.woodShade);
  }
  front(img);
  return img;
}

export function crateOpen(): Img {
  const img = new Img(W, W);
  // The lid, swung up and standing behind the box: we see its underside.
  img.rect(LEFT, 2, WIDTH, 7, C.woodMid);
  img.rect(LEFT + 1, 3, WIDTH - 2, 5, C.woodShade);
  for (const x of [8, 15, 22]) img.rect(x, 3, 1, 5, C.woodMid);
  img.rect(LEFT, 9, WIDTH, 1, C.outline); // hinge line between lid and box
  // The open top: rim, then the dark inside.
  img.rect(LEFT, LID_TOP, WIDTH, FRONT_TOP - LID_TOP, C.woodLight);
  img.rect(LEFT + 2, LID_TOP + 1, WIDTH - 4, 5, C.woodDark);
  img.rect(LEFT + 2, LID_TOP + 1, WIDTH - 4, 2, C.stemDark);
  img.rect(LEFT, FRONT_TOP - 1, WIDTH, 1, C.woodShade);
  front(img);
  return img;
}
