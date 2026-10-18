/**
 * Gifts for reaching a skill level (Milestone 7): a straw hat on its stand and a golden
 * watering-can planter (farming), a mounted fish and a lobster pot (fishing), a shell wreath and a
 * butterfly jar (foraging). Each sits on the bottom of a 32×32 frame (see REWARD_FRAMES), like the
 * seaside pieces; client/src/art/furnitureArt.ts cuts them out by rectangle. Colours from
 * palette.ts; the render script adds the outer outline.
 */
import { C } from "./palette";
import { Img, fromGrid } from "./lib/image";

export const FRAME = 32;

/** Where each piece's picture is inside its 32×32 frame (the frame's index is its order here). */
export const REWARD_FRAMES = {
  straw_hat: { x: 7, y: 14, w: 18, h: 18 },
  mounted_fish: { x: 7, y: 12, w: 18, h: 20 },
  shell_wreath: { x: 7, y: 8, w: 18, h: 24 },
  golden_can: { x: 7, y: 16, w: 18, h: 16 },
  lobster_pot: { x: 7, y: 16, w: 18, h: 16 },
  butterfly_jar: { x: 7, y: 16, w: 18, h: 16 },
} as const;

/** A sprite drawn from a grid, standing on the bottom of its frame. */
function standing(rows: readonly string[], legend: Readonly<Record<string, string>>): Img {
  const img = new Img(FRAME, FRAME);
  img.blit(fromGrid(rows, legend), 8, FRAME - rows.length - 1);
  return img;
}

/** A wide-brimmed straw hat with a red ribbon, on a little wooden stand. */
const STRAW_HAT = [
  ".....hhhhhh.....",
  "....hHHHHHHh....",
  "....hHsHHsHh....",
  "....rrrrrrrR....",
  "....HHHHHHHs....",
  ".hhhhhhhhhhhhhh.",
  "hHHsHHHHsHHHHsHs",
  ".SSSSSSSSSSSSSS.",
  ".......wd.......",
  ".......wd.......",
  ".......wd.......",
  ".......wd.......",
  ".......wd.......",
  ".......wd.......",
  ".....wwwwdd.....",
  "....DDDDDDDD....",
];

/** A fish on a wooden plaque, on a short post: a keen angler's trophy. */
const MOUNTED_FISH = [
  "..mmmmmmmmmmmm..",
  ".mLLLLLLLLLLLLd.",
  ".mLccccccccccLd.",
  ".mLccbbbbcccbLd.",
  ".mLcbBBBBbcbbLd.",
  ".mLbBeBBBBbbcLd.",
  ".mLbBBBBBBbbcLd.",
  ".mLcbWWWWbcbbLd.",
  ".mLccbbbbcccbLd.",
  ".mLccccccccccLd.",
  ".mLLLLLLLLLLLLd.",
  "..dddddddddddd..",
  ".......wd.......",
  ".......wd.......",
  ".......wd.......",
  ".......wd.......",
  ".....wwwwdd.....",
  "....DDDDDDDD....",
];

/** A wreath of shells and sea glass with a red bow, propped on a little easel. */
function shellWreath(): Img {
  const img = new Img(FRAME, FRAME);
  // The easel: two legs splayed out under the wreath, with a bar across.
  for (let y = 0; y < 14; y++) {
    img.set(13 - Math.floor(y / 4), 17 + y, C.woodMid);
    img.set(18 + Math.floor(y / 4), 17 + y, C.woodShade);
  }
  img.rect(11, 26, 10, 1, C.woodShade);
  // The ring of shells, round its middle.
  const cx = 15.5;
  const cy = 16;
  const colours = [C.cream, C.pink, C.aqua, C.cream, C.orangeLight, C.pink, C.aquaLight, C.cream];
  for (let y = 9; y <= 23; y++)
    for (let x = 8; x <= 23; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > 7 || d < 3.4) continue;
      const segment = Math.floor(((Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI)) * 8) % 8;
      const shade = d > 6 || y > cy + 3;
      img.set(x, y, shade ? C.tan : colours[segment]);
    }
  // Little leaves between the shells.
  for (const [x, y] of [[9, 14], [22, 13], [12, 10], [19, 10], [10, 19], [21, 19]] as const) img.set(x, y, C.leaf);
  // A red bow at the bottom.
  for (const [x, y] of [[13, 22], [14, 23], [15, 22], [16, 22], [17, 23], [18, 22], [15, 23], [16, 23], [14, 24], [17, 24]] as const) img.set(x, y, C.berry);
  img.set(15, 22, C.red);
  img.set(16, 22, C.red);
  return img;
}

/** A golden watering can with flowers growing out of it. */
const GOLDEN_CAN = [
  "...p.....q......",
  "..pPp...qQq.....",
  "...pl.l..qll....",
  "....l..l.l......",
  "...lLl.lLl......",
  "..gggggggggg....",
  ".gGGGGGGGGGgg.g.",
  ".gGyGGGGGGGgSgg.",
  ".gGyGGGGGGGgSSg.",
  ".gGGGGGGGGGgS...",
  ".gGGGGGGGGGg....",
  ".gSSSSSSSSSg....",
  "..ssssssssss....",
];

/** A wicker lobster pot: a round-topped trap of slats and net, with a rope. */
const LOBSTER_POT = [
  ".....wwwwww.....",
  "...wwnWnWnWww...",
  "..wnWnWnWnWnWw..",
  ".wWnWnWnWnWnWnw.",
  ".wWnWnkkkkWnWnw.",
  "wWWnWkkkkkkWnWWw",
  "wWWnWkkkkkkWnWWd",
  "dddddddddddddddd",
  "wWnWnWnWnWnWnWWd",
  "wWnWnWnWnWnWnWWd",
  "dddddddddddddddd",
  "..r..........r..",
];

/** A glass jar with a cork, and a little blue butterfly inside. */
const BUTTERFLY_JAR = [
  "....mmmmmmmm....",
  "....MMMMMMMM....",
  "...gaaaaaaaag...",
  "..gaWaaaaaaaag..",
  "..gaWabbkbbaag..",
  "..gaWbBbkbBbag..",
  "..gaaabBkBbaag..",
  "..gaaaabkbaaag..",
  "..gaaaaaaaaaag..",
  "..gaaaaaaaaaag..",
  "..gaaaaaaaaaag..",
  "..gAAAAAAAAAAg..",
  "...gggggggggg...",
];

function strawHat(): Img {
  return standing(STRAW_HAT, {
    h: C.yellow,
    H: C.gold,
    s: C.petalShade,
    S: C.woodShade,
    r: C.red,
    R: C.plum,
    w: C.woodMid,
    d: C.woodShade,
    D: C.woodDark,
  });
}

function mountedFish(): Img {
  return standing(MOUNTED_FISH, {
    m: C.woodLight,
    L: C.woodMid,
    c: C.cream,
    d: C.woodShade,
    b: C.seaDeep,
    B: C.sea,
    W: C.ice,
    e: C.outline,
    w: C.woodMid,
    D: C.woodDark,
  });
}

function goldenCan(): Img {
  return standing(GOLDEN_CAN, {
    p: C.berry,
    P: C.yellow,
    q: C.pink,
    Q: C.yellow,
    l: C.leaf,
    L: C.leafDark,
    g: C.petalShade,
    G: C.petal,
    y: C.white,
    S: C.gold,
    s: C.woodShade,
  });
}

function lobsterPot(): Img {
  return standing(LOBSTER_POT, {
    w: C.woodMid,
    W: C.woodLight,
    n: C.woodShade,
    k: C.wetSoilDark,
    d: C.woodDark,
    r: C.stemDark,
  });
}

function butterflyJar(): Img {
  return standing(BUTTERFLY_JAR, {
    m: C.woodLight,
    M: C.woodMid,
    g: C.sea,
    a: C.ice,
    A: C.stoneLight,
    W: C.white,
    b: C.carrot,
    B: C.yellow,
    k: C.plumDark,
  });
}

/** Every gift, in frame order. */
export const REWARDS: Readonly<Record<keyof typeof REWARD_FRAMES, () => Img>> = {
  straw_hat: strawHat,
  mounted_fish: mountedFish,
  shell_wreath: shellWreath,
  golden_can: goldenCan,
  lobster_pot: lobsterPot,
  butterfly_jar: butterflyJar,
};
