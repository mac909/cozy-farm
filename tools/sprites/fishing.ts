/**
 * Fishing bits: the pack's fishing rod on a 16×16 frame (so it lines up with the other items),
 * and our red and white bobber, floating and dipped under. One row in fishing.png: rod, bobber, dip.
 */
import { C } from "./palette";
import { Img, fromGrid, outline } from "./lib/image";

export const PACK_ROD = "Items/Weapons/Fishing Rod/Sprite.png";

const LEGEND = { s: C.stemDark, r: C.berry, R: C.red, w: C.white, i: C.ice };
const E = "................";

const BOBBER = [E, E, E, E, E, ".......s........", "......rrr.......", ".....rrRrr......", ".....wwwww......", "......www.......", E, E, E, E, E, E];
const DIPPED = [E, E, E, E, E, E, E, ".......s........", "......rrr.......", ".....rrRrr......", E, E, E, E, E, E];

/** The frames of fishing.png, in order. `read` loads a pack image. */
export function fishingFrames(read: (file: string) => Img): Img[] {
  const rod = read(PACK_ROD);
  const centred = new Img(16, 16).blit(rod, Math.floor((16 - rod.w) / 2), Math.floor((16 - rod.h) / 2));
  return [centred, outline(fromGrid(BOBBER, LEGEND)), outline(fromGrid(DIPPED, LEGEND))];
}

export const FISHING_FRAMES = { rod: 0, bobber: 1, dipped: 2 } as const;
