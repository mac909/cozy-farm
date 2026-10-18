/**
 * Bugs for the meadow: the pack's two butterflies, three recolours of them, and a firefly of our
 * own. bugs.png has one row per bug in BUGS order (shared/content/bugs.ts): four frames of
 * fluttering, then its icon for the bag and the collection book.
 */
import type { BugId } from "../../shared/content/bugs";
import { C } from "./palette";
import { Img, fromGrid, outline, recolor } from "./lib/image";

/** The pack's butterfly sheets: 4 × 4 frames of 16×16, columns facing down, up, left, right; rows flap. */
const PACK_BUTTERFLY = "Actor/Monster/Butterfly/SpriteSheet.png";
const PACK_BLUE_BUTTERFLY = "Actor/Monster/ButterflyBlue/SpriteSheet.png";

/** The pack butterfly's colours: dark wing, light wing, body. */
const WING = "#e0394c";
const WING_LIGHT = "#ffad5d";
const BODY = "#fce2ca";

/** Where a butterfly comes from: a pack sheet, recoloured or not. */
type ButterflyArt = { sheet: string; recolour?: Readonly<Record<string, string>> };

const BUTTERFLIES: Readonly<Partial<Record<BugId, ButterflyArt>>> = {
  red_admiral: { sheet: PACK_BUTTERFLY },
  cabbage_white: { sheet: PACK_BUTTERFLY, recolour: { [WING]: C.stoneLight, [WING_LIGHT]: C.offWhite, [BODY]: C.stone } },
  common_blue: { sheet: PACK_BLUE_BUTTERFLY },
  brimstone: { sheet: PACK_BUTTERFLY, recolour: { [WING]: C.petalShade, [WING_LIGHT]: C.petal } },
  // Ours: a pale moth green, the sea glass's.
  luna_moth: { sheet: PACK_BUTTERFLY, recolour: { [WING]: C.leafLight, [WING_LIGHT]: "#dcf2d2", [BODY]: C.offWhite } },
};

const FIREFLY_LEGEND = { b: C.plumDark, w: C.ice, y: C.petal, Y: C.yellow, o: C.petalShade };
const E = "................";

/** A firefly: a little dark beetle with a glowing tail, wings up or down, tail bright or dim. */
function firefly(wingsUp: boolean, bright: boolean): Img {
  const wings = wingsUp ? [".....ww..ww.....", "......wbbw......"] : [E, ".....wwbbww....."];
  const tail = bright ? ["......yYYy......", ".......yy......."] : ["......oyyo......", "................"];
  return outline(
    fromGrid(
      [E, E, E, E, E, wings[0], wings[1], ".......bb.......", "......bbbb......", ".......bb.......", tail[0], tail[1], E, E, E, E],
      FIREFLY_LEGEND,
    ),
  );
}

/** One row of bugs.png: four flutter frames and the icon. `read` loads a pack sheet. */
export function bugFrames(id: BugId, read: (file: string) => Img): Img[] {
  const art = BUTTERFLIES[id];
  if (!art) return [firefly(true, true), firefly(false, true), firefly(true, false), firefly(false, false), firefly(true, true)];
  const sheet = art.recolour ? recolor(read(art.sheet), art.recolour) : read(art.sheet);
  const frame = (col: number, row: number) => sheet.crop(col * 16, row * 16, 16, 16);
  // Facing down, flapping; the icon is its widest spread.
  return [frame(0, 0), frame(0, 1), frame(0, 2), frame(0, 3), frame(1, 0)];
}

/** Columns in bugs.png. */
export const BUG_SHEET = { flutterFrames: 4, iconColumn: 4 } as const;
