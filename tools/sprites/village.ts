/**
 * The village's new pieces (Milestone 6): the lighthouse on the point in its four states, the
 * Village Board with its pinned notes, and the brambles across the old path. Drawn in code (they're
 * too big for text grids), in the pack's style: flat fills, a darker shade to the bottom right, the
 * pack's near-black outline.
 */
import { Img, fromGrid, outline } from "./lib/image";
import { C } from "./palette";

/** The lighthouse is 3 × 6 tiles. */
export const LIGHTHOUSE_SIZE = { w: 48, h: 96 } as const;

/**
 * How the lighthouse looks: weathered and boarded up; with scaffolding round the top while the
 * stairs are mended (the door open); mended, the lamp not lit yet; and lit.
 */
export const LIGHTHOUSE_FRAMES = ["dark", "scaffold", "ready", "lit"] as const;
export type LighthouseFrame = (typeof LIGHTHOUSE_FRAMES)[number];

/** Ours: the lighthouse's stripes, a little warmer than the pack's reds, and their weathered versions. */
const STRIPE = {
  red: "#d0503f",
  redShade: "#8e3a2f",
  white: "#f4efe2",
  whiteShade: "#c9c2b0",
  oldRed: "#9c5a4a",
  oldRedShade: "#6e4038",
  oldWhite: "#cfc4b2",
  oldWhiteShade: "#a39a8a",
};

/** Ours: the lamp's glass, dark and lit. */
const GLASS = { dark: "#33485a", darkShine: "#4d6577", lit: "#ffe48a", litCore: "#fffbe0", litShade: "#f2b84b" };

const STONE = { light: C.stoneLight, mid: "#9aa0a0", dark: "#6b7272" };
const WOOD = { light: C.woodMid, mid: C.woodShade, dark: C.woodDark };

/** The tower's half-width at height y (pixels from the top of the frame): it narrows towards the top. */
function towerHalf(y: number): number {
  // 16 wide each side at the base (y 84), 10 at the gallery (y 30).
  const t = Math.min(1, Math.max(0, (y - 30) / (84 - 30)));
  return Math.round(10 + t * 6);
}

export function lighthouse(frame: LighthouseFrame): Img {
  const { w, h } = LIGHTHOUSE_SIZE;
  const img = new Img(w, h);
  const cx = w / 2;
  const old = frame === "dark";
  const red = old ? STRIPE.oldRed : STRIPE.red;
  const redShade = old ? STRIPE.oldRedShade : STRIPE.redShade;
  const white = old ? STRIPE.oldWhite : STRIPE.white;
  const whiteShade = old ? STRIPE.oldWhiteShade : STRIPE.whiteShade;

  // The stone plinth it stands on.
  img.rect(5, 86, 38, 9, STONE.mid);
  img.rect(5, 86, 38, 2, STONE.light);
  img.rect(38, 88, 5, 7, STONE.dark);
  for (const x of [12, 21, 30]) img.rect(x, 89, 1, 6, STONE.dark);

  // The tower: red and white bands, shaded on the right.
  for (let y = 31; y < 86; y++) {
    const half = towerHalf(y);
    const band = Math.floor((y - 31) / 11) % 2 === 0;
    const fill = band ? white : red;
    const shade = band ? whiteShade : redShade;
    img.rect(cx - half, y, half * 2, 1, fill);
    img.rect(cx + half - 4, y, 4, 1, shade);
  }
  // Little windows up the stairs.
  for (const y of [42, 58]) {
    img.rect(cx - 2, y, 4, 6, C.outline);
    img.rect(cx - 1, y + 1, 2, 4, old ? GLASS.dark : "#4d6577");
  }

  // The door: an arch at the bottom, boarded up while it's dark, open (dark inside) once the stairs are mended.
  const doorX = cx - 5;
  img.rect(doorX, 72, 10, 14, C.outline);
  img.rect(doorX + 1, 74, 8, 12, frame === "dark" ? WOOD.mid : "#1d2226");
  img.rect(doorX + 2, 73, 6, 1, C.outline);
  if (frame === "dark") {
    img.rect(doorX + 1, 76, 8, 2, WOOD.light);
    img.rect(doorX + 1, 81, 8, 2, WOOD.light);
    img.rect(doorX + 1, 78, 8, 1, WOOD.dark);
    img.rect(doorX + 1, 83, 8, 1, WOOD.dark);
  } else {
    // Steps going up inside.
    img.rect(doorX + 2, 82, 6, 1, WOOD.dark);
    img.rect(doorX + 3, 79, 5, 1, WOOD.dark);
  }

  // The gallery round the lamp room: a dark iron rail.
  img.rect(cx - 15, 27, 30, 4, "#3b3f45");
  img.rect(cx - 15, 27, 30, 1, "#5a5f66");
  for (let x = cx - 14; x < cx + 14; x += 4) img.rect(x, 23, 1, 4, "#3b3f45");
  img.rect(cx - 15, 22, 30, 1, "#3b3f45");

  // The lamp room's glass, between dark frames.
  const lit = frame === "lit";
  img.rect(cx - 9, 12, 18, 11, "#2a2e33");
  for (let x = cx - 8; x < cx + 8; x += 4) {
    img.rect(x, 13, 3, 9, lit ? GLASS.lit : GLASS.dark);
    img.rect(x, 13, 1, 9, lit ? GLASS.litCore : GLASS.darkShine);
  }
  if (lit) img.rect(cx - 2, 15, 4, 5, GLASS.litCore);
  if (frame === "dark") {
    // A cracked pane.
    img.set(cx - 3, 15, C.outline);
    img.set(cx - 2, 16, C.outline);
    img.set(cx - 3, 17, C.outline);
  }

  // The cap and its ball.
  for (let y = 4; y < 12; y++) {
    const half = Math.round(3 + ((y - 4) / 7) * 8);
    img.rect(cx - half, y, half * 2, 1, red);
    img.rect(cx + half - 2, y, 2, 1, redShade);
  }
  img.rect(cx - 2, 1, 4, 3, "#3b3f45");

  if (frame === "scaffold") scaffolding(img);
  return outline(img);
}

/** Wooden poles and planks round the top while the stairs are mended. */
function scaffolding(img: Img) {
  for (const x of [3, 43]) {
    img.rect(x, 18, 2, 50, WOOD.mid);
    img.rect(x + 1, 18, 1, 50, WOOD.dark);
  }
  for (const y of [24, 40, 56]) {
    img.rect(3, y, 42, 2, WOOD.light);
    img.rect(3, y + 1, 42, 1, WOOD.mid);
  }
  // Cross braces.
  for (let i = 0; i < 14; i++) {
    img.set(5 + i, 42 + i, WOOD.dark);
    img.set(42 - i, 42 + i, WOOD.dark);
  }
}

/** The Village Board: 2 × 2 tiles, a cork board on two posts, with a paper note pinned on for each open project. */
export const BOARD_FRAMES = 3;

export function board(notes: number): Img {
  const img = new Img(32, 32);
  // Posts.
  img.rect(6, 18, 3, 14, WOOD.mid);
  img.rect(8, 18, 1, 14, WOOD.dark);
  img.rect(23, 18, 3, 14, WOOD.mid);
  img.rect(25, 18, 1, 14, WOOD.dark);
  // The board and its frame.
  img.rect(1, 5, 30, 17, WOOD.dark);
  img.rect(2, 6, 28, 15, WOOD.mid);
  img.rect(3, 7, 26, 13, "#d9a066");
  img.rect(3, 18, 26, 2, "#c58b52");
  // A little roof.
  img.rect(0, 2, 32, 3, "#7a4b2a");
  img.rect(0, 2, 32, 1, WOOD.light);
  const spots = [
    [5, 9],
    [13, 10],
    [21, 8],
  ];
  for (let i = 0; i < Math.min(notes, spots.length); i++) {
    const [x, y] = spots[i];
    img.rect(x, y, 6, 8, C.cream);
    img.rect(x + 1, y + 2, 4, 1, C.tan);
    img.rect(x + 1, y + 4, 3, 1, C.tan);
    img.rect(x + 1, y + 6, 4, 1, C.tan);
    img.set(x + 3, y, C.red);
  }
  return outline(img);
}

/** Brambles: a thorny tangle with a few blackberries. Two tiles that sit side by side in any order. */
export const BRAMBLE_TILES = 2;

const BRAMBLE_LEGEND: Readonly<Record<string, string>> = {
  b: C.plum,
  t: C.rose,
  l: C.leaf,
  L: C.leafDark,
  D: C.leafDeep,
  k: C.plumDark,
  m: C.mauve,
};

const BRAMBLES: readonly (readonly string[])[] = [
  [
    "................",
    "....b......b....",
    "...btb....btb...",
    "..b..b....b..b..",
    "..b.LLLLLLLL.b..",
    ".bLLlLLLLlLLLb..",
    ".LLlllLLLlllLLb.",
    "LLLllLkmLLllLLLL",
    "LLLLLLkkLLLLlLLL",
    "LDLLbLLLLLkmLLDL",
    "DLLbtbLLLLkkLLLD",
    "DDLLbLLDLLLLLLDD",
    "DDDLLLDDDLLLDDDD",
    "DDDDDDDDDDDDDDDD",
    "D.DDDD.DDD.DDD.D",
    "................",
  ],
  [
    "................",
    "........b.......",
    ".b.....btb......",
    "btb...b...b..b..",
    "..bLLLLLL.b.btb.",
    "..LLLlLLLLLLLb..",
    ".LLlllLLkmLlLL..",
    "LLLLlLLLkkLllLLL",
    "LLkmLLLLLLLLlLLL",
    "LLkkLLbLLLLLLLDL",
    "DLLLLbtbLLLkmLLD",
    "DDLLLLbLLDLkkLDD",
    "DDDLLDDDLLLLLDDD",
    "DDDDDDDDDDDDDDDD",
    "DD.DDD.DDDD.DD.D",
    "................",
  ],
];

export function bramble(variant: number): Img {
  return outline(fromGrid(BRAMBLES[variant % BRAMBLES.length], BRAMBLE_LEGEND));
}
