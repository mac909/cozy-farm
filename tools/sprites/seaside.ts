/**
 * Seaside furniture and decorations the pack doesn't have, for the general store: a life ring on
 * a post, an anchor, a striped beach umbrella, a ship in a bottle and a fish tank. Each sits on the bottom of a
 * 32×32 frame (see SEASIDE_FRAMES); client/src/art/furnitureArt.ts cuts them out by rectangle.
 * Colours from palette.ts; the render script adds the outer outline.
 */
import { C } from "./palette";
import { Img, fromGrid } from "./lib/image";

export const FRAME = 32;

/** Where each piece's picture is inside its 32×32 frame (the frame's index is its order here). */
export const SEASIDE_FRAMES = {
  life_ring: { x: 8, y: 0, w: 16, h: 32 },
  anchor: { x: 8, y: 0, w: 16, h: 32 },
  beach_umbrella: { x: 0, y: 0, w: 32, h: 32 },
  ship_in_bottle: { x: 8, y: 16, w: 16, h: 16 },
  fish_tank: { x: 0, y: 5, w: 32, h: 27 },
} as const;

/** A wooden post with a red and white life ring hung on it. */
function lifeRing(): Img {
  const img = new Img(FRAME, FRAME);
  // The post, the full height, a little lighter on its left.
  img.rect(15, 9, 2, 22, C.woodMid);
  img.rect(15, 9, 1, 22, C.woodLight);
  img.rect(14, 29, 4, 2, C.woodShade);
  img.rect(14, 9, 4, 2, C.woodDark); // its cap
  // The ring, centred on the post, in eight red and white segments.
  const cx = 15.5;
  const cy = 18.5;
  for (let y = 11; y <= 26; y++)
    for (let x = 8; x <= 23; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > 7.2 || d < 3.6) continue;
      const segment = Math.floor(((Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI)) * 8 + 0.5) % 8;
      const lower = y > cy + 2;
      const red = segment % 2 === 0;
      img.set(x, y, red ? (lower ? C.red : C.berry) : lower ? C.offWhite : C.white);
    }
  // A highlight on the top left of the ring.
  img.set(11, 14, C.white);
  img.set(12, 13, C.white);
  return img;
}

/** An iron anchor standing on its crown. */
const ANCHOR = [
  "......dddd......",
  ".....d....d.....",
  ".....d....d.....",
  "......dlld......",
  ".......li.......",
  "...llllliiiii...",
  "...iiiiiiiiidd..",
  ".......li.......",
  ".......li.......",
  ".......li.......",
  ".......li.......",
  ".......li.......",
  ".......li.......",
  ".l.....li.....i.",
  ".li....li....id.",
  ".lii...li...iid.",
  "..lii..li..iid..",
  "...liiilliiid...",
  "....liiiiiid....",
  "......lid.......",
];

function anchor(): Img {
  const img = new Img(FRAME, FRAME);
  img.blit(fromGrid(ANCHOR, { i: C.stone, l: C.stoneLight, d: C.seaDeep }), 8, FRAME - ANCHOR.length - 1);
  return img;
}

/** A striped beach umbrella on a wooden pole: the canopy spreads over the tiles beside it. */
function beachUmbrella(): Img {
  const img = new Img(FRAME, FRAME);
  // The pole.
  img.rect(15, 11, 2, 20, C.woodLight);
  img.rect(16, 11, 1, 20, C.woodShade);
  // The canopy: a dome, striped in wedges from the top, scalloped along its bottom edge.
  const cx = 15.5;
  for (let y = 2; y <= 13; y++) {
    const half = 14 * Math.sqrt(Math.max(0, 1 - ((13 - y) / 11.5) ** 2));
    for (let x = Math.ceil(cx - half); x <= Math.floor(cx + half); x++) {
      if (y === 13 && Math.abs(x - cx) % 6 > 3.5) continue;
      const stripe = Math.floor((x - cx) / ((y + 4) / 3.2) + 20) % 2 === 0;
      const shade = y >= 11;
      img.set(x, y, stripe ? (shade ? C.red : C.berry) : shade ? C.cream : C.white);
    }
  }
  img.rect(15, 1, 2, 2, C.woodMid); // the tip
  return img;
}

/** A little ship in a glass bottle on a wooden stand. */
const BOTTLE = [
  "................",
  "................",
  "................",
  "....ggggggg.....",
  "...gwaaaaaagg...",
  "..gaaaasaaaaagcc",
  "..gaaassaaaaagcC",
  "..gaahhhhaaaagcC",
  "..gaaahhaaaaagcc",
  "...gaaaaaaaagg..",
  "....ggggggg.....",
  "....w.....w.....",
  "...mmmmmmmmmm...",
  "...MMMMMMMMMM...",
];

function shipInBottle(): Img {
  const img = new Img(FRAME, FRAME);
  const legend = {
    g: C.sea,
    a: C.ice,
    w: C.woodLight,
    s: C.white,
    h: C.woodDark,
    c: C.woodLight,
    C: C.woodShade,
    m: C.woodMid,
    M: C.woodShade,
  };
  img.blit(fromGrid(BOTTLE, legend), 8, FRAME - BOTTLE.length - 1);
  return img;
}

/** A fish tank on a wooden stand: two little fish, weed swaying in it, bubbles going up. Two tiles wide. */
function fishTank(): Img {
  const img = new Img(FRAME, FRAME);
  // The stand: a board, and two legs.
  img.rect(2, 24, 28, 3, C.woodMid);
  img.rect(2, 24, 28, 1, C.woodLight);
  img.rect(2, 26, 28, 1, C.woodShade);
  img.rect(4, 27, 3, 4, C.woodShade);
  img.rect(25, 27, 3, 4, C.woodShade);
  // The glass, the lid, and the water: lighter at the surface, deeper at the bottom.
  img.rect(2, 6, 28, 18, C.stoneLight);
  img.rect(2, 5, 28, 1, C.woodShade);
  img.rect(3, 7, 26, 16, C.aqua);
  img.rect(3, 7, 26, 2, C.aquaLight);
  img.rect(3, 18, 26, 3, C.sea);
  // Sand and pebbles on the bottom.
  img.rect(3, 21, 26, 2, C.sand);
  for (const x of [5, 9, 14, 20, 26]) img.set(x, 21, C.tan);
  for (const x of [7, 17, 23]) img.set(x, 22, C.tanDark);
  // Weed, swaying.
  for (const [x, y] of [[7, 20], [7, 19], [6, 18], [6, 17], [7, 16], [7, 15], [6, 14], [8, 20], [8, 18], [9, 17]] as const) img.set(x, y, C.leaf);
  for (const [x, y] of [[23, 20], [23, 19], [24, 18], [24, 17], [23, 16], [22, 20], [22, 18]] as const) img.set(x, y, C.leafDark);
  // An orange fish facing right, and a yellow one facing left.
  img.rect(12, 11, 4, 2, C.carrot);
  img.set(11, 10, C.orangeDark);
  img.set(11, 13, C.orangeDark);
  img.set(11, 11, C.orangeDark);
  img.set(11, 12, C.orangeDark);
  img.set(15, 11, C.outline);
  img.rect(17, 15, 3, 2, C.petal);
  img.set(20, 14, C.petalShade);
  img.set(20, 15, C.petalShade);
  img.set(20, 16, C.petalShade);
  img.set(20, 17, C.petalShade);
  img.set(17, 15, C.outline);
  // Bubbles, and a glint on the glass.
  for (const [x, y] of [[16, 9], [17, 7], [25, 11], [24, 9]] as const) img.set(x, y, C.white);
  for (const y of [9, 10, 11]) img.set(4, y, C.white);
  return img;
}

/** Every piece, in frame order. */
export const SEASIDE: Readonly<Record<keyof typeof SEASIDE_FRAMES, () => Img>> = {
  life_ring: lifeRing,
  anchor,
  beach_umbrella: beachUmbrella,
  ship_in_bottle: shipInBottle,
  fish_tank: fishTank,
};
