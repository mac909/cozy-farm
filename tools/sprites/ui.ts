/**
 * Small HUD icons the pack doesn't have, 16×16, light on the HUD's dark buttons.
 * Order in ui-icons.png: music on, music off, arrange (a hammer), turn, done (a tick), book, stop.
 */
import { C } from "./palette";
import { Img, fromGrid, outline } from "./lib/image";

const LEGEND = { w: C.white, s: C.ice, r: C.berry, h: C.woodLight, d: C.woodMid, g: C.leafLight };

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

/** A hammer, for arranging furniture. */
const HAMMER = [
  "................",
  "................",
  "....wwwwww......",
  "...wwwwwwws.....",
  "...wwwwwwws.....",
  "....wwwwhh......",
  "........hd......",
  ".........hd.....",
  "..........hd....",
  "...........hd...",
  "............hd..",
  ".............hd.",
  "..............h.",
  "................",
  "................",
  "................",
];

/** Two arrows chasing each other round: turn. */
const TURN = [
  "................",
  "................",
  ".....wwwww......",
  "...www...www.w..",
  "..ww.......www..",
  "..w.......wwww..",
  ".ww.............",
  ".w..............",
  ".w............w.",
  ".............ww.",
  "..wwww.......w..",
  "..www.......ww..",
  "..w.www...www...",
  "......wwwww.....",
  "................",
  "................",
];

/** A tick: done. */
const TICK = [
  "................",
  "................",
  "................",
  ".............gg.",
  "............ggg.",
  "...........ggg..",
  "..........ggg...",
  ".gg......ggg....",
  ".ggg....ggg.....",
  "..ggg..ggg......",
  "...ggggggg......",
  "....ggggg.......",
  ".....ggg........",
  "................",
  "................",
  "................",
];

/** An open book: the collection book. */
const BOOK = [
  "................",
  "................",
  "................",
  "..wwwww..wwwww..",
  ".wwsssww.wwsssw.",
  ".wwwwwww.wwwwww.",
  ".wwsssww.wwsssw.",
  ".wwwwwww.wwwwww.",
  ".wwssssw.wsssww.",
  ".wwwwwwwwwwwwww.",
  ".hhhhhhh.hhhhhh.",
  "..hhhhhhdhhhhh..",
  "........d.......",
  "................",
  "................",
  "................",
];

/** A reel turning back: stop fishing. */
const STOP = [
  "................",
  "................",
  "................",
  ".....wwwwww.....",
  "....w......w....",
  "...w...ww...w...",
  "...w..wwww..w...",
  "...w..wsww..w...",
  "...w...ww...w...",
  "....w......w....",
  ".....wwwwww.....",
  "............r...",
  "...........rrr..",
  "............r...",
  "................",
  "................",
];

export const UI_ICONS = {
  musicOn: () => outline(fromGrid(NOTES, LEGEND)),
  musicOff: () => outline(new Img(16, 16).blit(fromGrid(NOTES, LEGEND)).blit(fromGrid(SLASH, LEGEND))),
  arrange: () => outline(fromGrid(HAMMER, LEGEND)),
  turn: () => outline(fromGrid(TURN, LEGEND)),
  done: () => outline(fromGrid(TICK, LEGEND)),
  book: () => outline(fromGrid(BOOK, LEGEND)),
  stop: () => outline(fromGrid(STOP, LEGEND)),
} as const;
