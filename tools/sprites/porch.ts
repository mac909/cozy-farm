/**
 * The porch (Milestone 7): wooden decking the width of a cottage, a bench, and a lantern on a post
 * that lights at dusk. Drawn in code at each cottage's front once its porch is built
 * (client/src/world/Porches.ts), like the lighthouse. One sheet, cut out by PORCH_FRAMES; the
 * render script adds the outer outline to each piece.
 */
import { C } from "./palette";
import { Img } from "./lib/image";

/** Where each piece is on porch.png. */
export const PORCH_FRAMES = {
  deck: { x: 0, y: 0, w: 64, h: 16 },
  bench: { x: 0, y: 16, w: 32, h: 32 },
  lanternOff: { x: 32, y: 16, w: 16, h: 32 },
  lanternOn: { x: 48, y: 16, w: 16, h: 32 },
} as const;

/** Planks across, seams staggered, a raised front edge with posts. Fills its whole 64×16 (the outline goes outside). */
export function deck(): Img {
  const img = new Img(64, 16);
  const boards = [
    { y: 0, seams: [21, 43] },
    { y: 4, seams: [10, 32, 54] },
    { y: 8, seams: [21, 43] },
  ];
  for (const { y, seams } of boards) {
    img.rect(0, y, 64, 3, C.woodLight);
    img.rect(0, y + 2, 64, 1, C.gold);
    img.rect(0, y + 3, 64, 1, C.woodShade);
    for (const x of seams) img.rect(x, y, 1, 3, C.woodShade);
    // A knot or two of grain.
    for (const x of [6 + y, 29 + y, 50 - y]) img.set(x, y + 1, C.woodMid);
  }
  // The front edge: the side of the boards, and posts at the ends and the middle.
  img.rect(0, 12, 64, 3, C.woodMid);
  img.rect(0, 14, 64, 1, C.woodShade);
  img.rect(0, 15, 64, 1, C.woodDark);
  for (const x of [0, 31, 62]) img.rect(x, 12, 2, 4, C.woodDark);
  return img;
}

/** A wooden bench with a slatted back, two tiles wide, standing on the bottom of its 32×32 frame. */
export function bench(): Img {
  const img = new Img(32, 32);
  // The back posts and two slats across.
  for (const x of [3, 27]) img.rect(x, 14, 2, 11, C.woodShade);
  for (const y of [15, 19]) {
    img.rect(2, y, 28, 2, C.woodMid);
    img.rect(2, y, 28, 1, C.woodLight);
  }
  // The seat.
  img.rect(1, 23, 30, 1, C.woodLight);
  img.rect(1, 24, 30, 1, C.woodMid);
  img.rect(1, 25, 30, 1, C.woodShade);
  // The legs.
  for (const x of [3, 27]) img.rect(x, 26, 2, 6, C.woodShade);
  for (const x of [4, 28]) img.rect(x, 26, 1, 6, C.woodDark);
  return img;
}

/** A lantern on a wooden post, dark by day and lit at dusk. */
export function lantern(lit: boolean): Img {
  const img = new Img(16, 32);
  // The post and its foot.
  img.rect(7, 10, 2, 20, C.woodMid);
  img.rect(8, 10, 1, 20, C.woodShade);
  img.rect(5, 30, 6, 2, C.woodDark);
  // The cap and the iron frame.
  img.rect(6, 0, 4, 1, C.plumDark);
  img.rect(5, 1, 6, 2, C.plumDark);
  img.rect(5, 3, 1, 7, C.plumDark);
  img.rect(10, 3, 1, 7, C.plumDark);
  img.rect(5, 9, 6, 1, C.plumDark);
  // The glass: dark, or the flame.
  if (lit) {
    img.rect(6, 3, 4, 6, C.petal);
    img.rect(7, 4, 2, 4, C.yellow);
    img.rect(7, 5, 2, 2, C.white);
    img.rect(6, 8, 4, 1, C.petalShade);
  } else {
    img.rect(6, 3, 4, 6, C.teal);
    img.rect(6, 3, 1, 3, C.seaDeep);
    img.set(8, 4, C.ice);
  }
  return img;
}
