/**
 * The seed stand at the top of the beach path: 32×32 (two tiles wide), a little market stall
 * with a striped awning, three sacks of seeds on the counter and a sprout sign on its front.
 * Drawn with rectangles, in the shipping crate's woods; the render script adds the outer outline.
 */
import { C } from "./palette";
import { Img } from "./lib/image";

const W = 32;

/** A small tied sack of seeds standing on the counter, with a coloured label, against the dark back of the stall. */
function sack(img: Img, x: number, label: string): void {
  img.set(x + 2, 10, C.sand); // the tuft above the tie
  img.rect(x + 1, 11, 3, 1, C.stem); // the tie
  img.rect(x, 12, 5, 4, C.sand); // the body
  img.rect(x + 4, 12, 1, 4, C.tan);
  img.rect(x, 15, 5, 1, C.tan);
  img.rect(x + 1, 13, 2, 2, label);
}

export function seedStand(): Img {
  const img = new Img(W, W);

  // Posts holding up the awning, and the dark back of the stall between them.
  for (const x of [4, 26]) {
    img.rect(x, 8, 2, 21, C.woodMid);
    img.rect(x + 1, 8, 1, 21, C.woodShade);
  }
  img.rect(6, 8, 20, 8, C.woodDark);
  for (const x of [10, 15, 20]) img.rect(x, 9, 1, 7, C.stemDark);

  // The awning: red and cream stripes with a scalloped edge.
  img.rect(3, 2, 26, 1, C.woodDark);
  for (let i = 0; i < 7; i++) {
    const x = 2 + i * 4;
    const red = i % 2 === 0;
    img.rect(x, 3, 4, 5, red ? C.red : C.cream);
    img.rect(x, 7, 4, 1, red ? C.plum : C.sand);
    img.rect(x + 1, 8, 2, 1, red ? C.plum : C.sand);
  }

  // Seeds for sale on the counter.
  sack(img, 7, C.berry);
  sack(img, 13, C.carrot);
  sack(img, 19, C.leaf);

  // The counter: its top, then the planked front.
  img.rect(2, 16, 28, 3, C.woodLight);
  img.rect(2, 16, 28, 1, C.yellow);
  img.rect(2, 18, 28, 1, C.woodShade);
  img.rect(3, 19, 26, 11, C.woodMid);
  for (const y of [23, 27]) img.rect(3, y, 26, 1, C.woodShade);
  img.rect(3, 29, 26, 1, C.woodDark);

  // A sign with a sprout, so it reads as "seeds".
  img.rect(11, 20, 10, 8, C.tan);
  img.rect(12, 21, 8, 6, C.cream);
  img.rect(15, 23, 2, 3, C.leafDark);
  img.rect(13, 22, 2, 1, C.leaf);
  img.rect(17, 22, 2, 1, C.leaf);
  img.set(14, 21, C.leafLight);
  img.set(17, 21, C.leafLight);
  return img;
}
