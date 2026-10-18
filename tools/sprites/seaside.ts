/**
 * Seaside furniture and decorations the pack doesn't have, for the general store: a life ring on
 * a post, an anchor, a striped beach umbrella and a ship in a bottle. Each sits on the bottom of a
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

/** Every piece, in frame order. */
export const SEASIDE: Readonly<Record<keyof typeof SEASIDE_FRAMES, () => Img>> = {
  life_ring: lifeRing,
  anchor,
  beach_umbrella: beachUmbrella,
  ship_in_bottle: shipInBottle,
};
