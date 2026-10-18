/**
 * Building materials (Milestone 6): a piece of driftwood and a branch. 16×16 each, fill colours
 * only (the render script adds the outline). The same frame is the bag's icon and what lies on
 * the ground. Order in materials.png: MATERIAL_ART's keys, which match the item ids.
 */
import type { MaterialId } from "../../shared/content/items";
import { C } from "./palette";

export const MATERIAL_LEGEND: Readonly<Record<string, string>> = {
  k: C.outline,
  // Driftwood: sun-bleached, pale and silvery (ours: the pack's woods are all warm browns).
  h: "#ece4d4",
  s: "#cbbfa8",
  g: "#a09079",
  T: "#86786a",
  // A fallen branch.
  b: C.stem,
  B: C.stemDark,
  l: C.leafLight,
  L: C.leaf,
};

const E = "................";

export const MATERIAL_ART: Readonly<Record<MaterialId, readonly string[]>> = {
  driftwood: [
    E,
    E,
    E,
    E,
    "............hs..",
    "...........hsT..",
    "........hhhsT...",
    "......hhssgT....",
    "....hhsgsTT.....",
    "..hhsgssT.......",
    ".hsgsTTT........",
    ".hsT.T..........",
    "..T.............",
    E,
    E,
    E,
  ],
  branch: [
    E,
    "..........l.....",
    ".........lLl....",
    "..........b..l..",
    "...........b.lL.",
    "..b.........bL..",
    "..lb.......b....",
    "...bb.....b.....",
    "....bb...b......",
    ".....bbbbB......",
    "......bBB.......",
    ".....bB.........",
    "....bB..........",
    "...bB...........",
    "...B............",
    E,
  ],
};
