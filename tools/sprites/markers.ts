/**
 * Marker tiles for the map's hidden layers, so they're easy to see while painting
 * in Tiled. The game never draws them.
 *
 * - blocked: red, on the Collision layer (nobody can walk there)
 * - farmland: green, on the Farmland layer (farming is allowed there)
 */
import { C } from "./palette";
import { Img, rgba } from "./lib/image";

const T = 16;

/** A see-through square with a solid 1px border and a cross, so overlapping layers stay readable. */
function marker(colour: string, cross: boolean): Img {
  const [r, g, b] = rgba(colour);
  const img = new Img(T, T);
  img.rect(0, 0, T, T, [r, g, b, 110]);
  for (let i = 0; i < T; i++) {
    for (const [x, y] of [
      [i, 0],
      [i, T - 1],
      [0, i],
      [T - 1, i],
    ])
      img.set(x, y, [r, g, b, 230]);
    if (cross) {
      img.set(i, i, [r, g, b, 230]);
      img.set(T - 1 - i, i, [r, g, b, 230]);
    }
  }
  return img;
}

export const MARKERS = {
  blocked: () => marker(C.berry, true),
  farmland: () => marker(C.leaf, false),
} as const;
