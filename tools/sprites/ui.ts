/**
 * Small HUD icons the pack doesn't have, 16×16, light on the HUD's dark buttons.
 * Order in ui-icons.png: music on, music off.
 */
import { C } from "./palette";
import { Img, fromGrid, outline } from "./lib/image";

const LEGEND = { w: C.white, s: C.ice, r: C.berry };

/** Two beamed notes (♫). */
const NOTES = [
  "................",
  "................",
  "................",
  ".....wwwwwwww...",
  ".....wwwwwwww...",
  ".....w......w...",
  ".....w......w...",
  ".....w......w...",
  ".....w......w...",
  ".....w......w...",
  "...www....www...",
  "..wwww...wwww...",
  "..wsww...wsww...",
  "...ww.....ww....",
  "................",
  "................",
];

/** The same notes, struck through. */
const SLASH = [
  "................",
  "..............r.",
  ".............rr.",
  "............rr..",
  "...........rr...",
  "..........rr....",
  ".........rr.....",
  "........rr......",
  ".......rr.......",
  "......rr........",
  ".....rr.........",
  "....rr..........",
  "...rr...........",
  "..rr............",
  ".rr.............",
  "................",
];

export const UI_ICONS = {
  musicOn: () => outline(fromGrid(NOTES, LEGEND)),
  musicOff: () => outline(new Img(16, 16).blit(fromGrid(NOTES, LEGEND)).blit(fromGrid(SLASH, LEGEND))),
} as const;
