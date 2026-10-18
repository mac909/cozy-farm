/**
 * The garden shop on the boardwalk (Milestone 8): Mrs Penhallow's old shop. The pack's little shop
 * with the sign (TilesetHouse.png) given a green roof and our own sign (a pot with a seedling),
 * and a potting bench beside it, in four states: boarded up and weathered; patched (the boards off
 * the windows, the door shut); open (the door open, flower boxes under the windows, pots and seed
 * trays on the bench); and its opening day, with bunting. Drawn in code like the lighthouse.
 */
import { C } from "./palette";
import { Img, recolor } from "./lib/image";

/** 4 × 3 tiles: the shop (3 wide) and its potting bench (1). It stands on the bottom of the frame. */
export const GARDEN_SHOP_SIZE = { w: 64, h: 48 } as const;

export const GARDEN_SHOP_FRAMES = ["boarded", "patched", "open", "opening"] as const;
export type GardenShopFrame = (typeof GARDEN_SHOP_FRAMES)[number];

/** Where the pack's shop is on TilesetHouse.png. */
export const PACK_SHOP = { file: "Backgrounds/Tilesets/TilesetHouse.png", x: 256, y: 0, w: 48, h: 48 } as const;

/** The pack shop's roof (teal) as our garden green, and as weathered moss for the boarded-up shop. */
const ROOF = { "#759892": C.leaf, "#4a5270": C.leafDeep, "#548789": C.leafDark } as const;
const OLD_ROOF = { "#759892": "#9aa38a", "#4a5270": "#5f6a66", "#548789": "#77816f" } as const;
/** And its warm wood, faded, while it's boarded up. */
const OLD_WOOD = { "#ffad5d": "#d9b48d", "#e66a3a": "#b98a6a", "#a3754e": "#94806b", "#eecf9b": "#e0d2b6", "#e0394c": "#b07a6e" } as const;

/** Driftwood boards (the same sun-bleached wood as the material). */
const BOARD = { light: "#ece4d4", mid: "#cbbfa8", dark: "#a09079" };
const WOOD = { light: C.woodMid, mid: "#a3754e", dark: "#965340" };

/** The windows and the door, in the pack shop's pixels. */
const WINDOWS = [
  { x: 5, y: 32, w: 11, h: 13 },
  { x: 32, y: 32, w: 11, h: 13 },
] as const;
const DOOR = { x: 17, y: 32, w: 14, h: 13 } as const;
/** The sign board inside its frame. */
const SIGN = { x: 10, y: 7, w: 28, h: 14 } as const;

function plank(img: Img, x: number, y: number, w: number) {
  img.rect(x, y - 1, w, 1, C.outline);
  img.rect(x, y, w, 2, BOARD.light);
  img.rect(x, y + 2, w, 1, BOARD.mid);
  img.rect(x, y + 3, w, 1, C.outline);
  // Nails.
  img.set(x + 1, y + 1, BOARD.dark);
  img.set(x + w - 2, y + 1, BOARD.dark);
}

/** Our sign: a cream board with a clay pot and a seedling in it, faded and cracked while it's shut up. */
function sign(img: Img, old: boolean) {
  const { x, y, w, h } = SIGN;
  img.rect(x, y, w, h, old ? "#e0d2b6" : C.cream);
  img.rect(x, y + h - 2, w, 2, old ? "#cdbb9c" : C.sand);
  const cx = x + Math.floor(w / 2);
  if (old) {
    // A crack across it, and the picture long gone.
    for (let i = 0; i < 9; i++) img.set(x + 6 + i, y + 4 + Math.floor(i / 3), "#a99a80");
    return;
  }
  // The pot.
  img.rect(cx - 4, y + 8, 8, 1, C.outline);
  img.rect(cx - 4, y + 9, 8, 1, C.orangeDark);
  img.rect(cx - 3, y + 10, 6, 3, C.pumpkin);
  img.rect(cx + 1, y + 10, 2, 3, C.orangeDark);
  img.rect(cx - 3, y + 13 - 1, 6, 1, C.orangeDark);
  // The seedling: a stem and two leaves.
  img.rect(cx, y + 4, 1, 4, C.leafDark);
  img.rect(cx - 3, y + 3, 3, 2, C.leaf);
  img.set(cx - 3, y + 3, C.leafLight);
  img.rect(cx + 1, y + 2, 3, 2, C.leaf);
  img.set(cx + 3, y + 2, C.leafLight);
  // Little seed dots either side, like lettering.
  for (const dx of [-11, -8, 7, 10]) {
    img.rect(cx + dx, y + 6, 2, 2, C.tanDark);
    img.set(cx + dx, y + 6, C.tan);
  }
}

/** A shut wooden door with a brass knob. */
function shutDoor(img: Img) {
  const { x, y, w, h } = DOOR;
  for (let i = 0; i < w; i++) img.rect(x + i, y, 1, h, i % 4 === 3 ? WOOD.dark : i % 4 === 0 ? WOOD.light : WOOD.mid);
  img.rect(x, y, w, 1, C.outline);
  img.rect(x + w - 4, y + 6, 2, 2, C.gold);
  img.set(x + w - 4, y + 6, C.yellow);
}

/** A flower box under a window: a wooden trough with flowers in it. */
function flowerBox(img: Img, win: { x: number; y: number; w: number; h: number }, colours: readonly string[]) {
  const by = win.y + win.h - 3;
  img.rect(win.x - 1, by - 1, win.w + 2, 1, C.outline);
  img.rect(win.x - 1, by, win.w + 2, 3, WOOD.mid);
  img.rect(win.x - 1, by + 2, win.w + 2, 1, WOOD.dark);
  // Leaves and flowers poking up over the edge.
  for (let i = 0; i < win.w; i += 2) {
    img.set(win.x + i, by - 2, C.leaf);
    img.set(win.x + i + 1, by - 1, C.leafDark);
  }
  colours.forEach((colour, i) => {
    const fx = win.x + 1 + i * 3;
    img.set(fx, by - 3, colour);
    img.set(fx + 1, by - 3, colour);
    img.set(fx, by - 4, colour);
    img.set(fx + 1, by - 2, C.yellow);
  });
}

/** The potting bench beside the shop (x 48 to 63): empty, broken, or set out with pots and trays. */
function bench(img: Img, frame: GardenShopFrame) {
  const x = 48;
  if (frame === "boarded") {
    // A tumbledown crate.
    img.rect(x + 3, 38, 10, 8, C.outline);
    img.rect(x + 4, 39, 8, 6, BOARD.mid);
    img.rect(x + 4, 41, 8, 1, BOARD.dark);
    img.rect(x + 4, 44, 8, 1, BOARD.dark);
    img.rect(x + 2, 35, 3, 1, C.outline);
    img.rect(x + 2, 36, 7, 2, BOARD.light);
    img.rect(x + 2, 38, 7, 1, C.outline);
    return;
  }
  // The table top and its legs.
  img.rect(x + 1, 36, 14, 1, C.outline);
  img.rect(x + 1, 37, 14, 2, WOOD.light);
  img.rect(x + 1, 39, 14, 1, C.outline);
  for (const lx of [x + 2, x + 12]) {
    img.rect(lx, 40, 2, 7, C.outline);
    img.rect(lx, 40, 1, 6, WOOD.mid);
  }
  img.rect(x + 3, 43, 10, 1, WOOD.dark);
  if (frame === "patched") return;
  // Pots with seedlings on top, and a sack of seeds underneath.
  for (const [px, tall] of [
    [x + 2, 3],
    [x + 7, 5],
    [x + 11, 2],
  ] as const) {
    img.rect(px, 31, 4, 1, C.outline);
    img.rect(px, 32, 4, 1, C.orangeDark);
    img.rect(px, 33, 4, 3, C.pumpkin);
    img.rect(px + 2, 33, 2, 3, C.orangeDark);
    img.rect(px + 1, 31 - tall, 1, tall, C.leafDark);
    img.rect(px, 31 - tall, 2, 1, C.leaf);
    img.set(px + 2, 32 - tall, C.leafLight);
  }
  img.rect(x + 5, 41, 7, 5, C.outline);
  img.rect(x + 6, 42, 5, 4, C.tan);
  img.rect(x + 6, 41, 5, 1, C.tanDark);
  img.set(x + 8, 43, C.leaf);
}

/** Bunting across the front for the opening day: little flags on a string, dipping in the middle. */
function bunting(img: Img) {
  const colours = [C.berry, C.yellow, "#5b9bd5", C.leafLight];
  for (let x = 1; x < 63; x++) {
    const y = 23 + Math.round(3 * Math.sin((Math.PI * x) / 62));
    img.set(x, y, C.outline);
    if (x % 6 === 2) {
      const colour = colours[Math.floor(x / 6) % colours.length];
      for (let row = 1; row <= 3; row++) for (let dx = row - 2; dx <= 2 - row + 1; dx++) img.set(x + dx + 1, y + row, colour);
      img.set(x + 1, y + 4, C.outline);
    }
  }
}

/** The garden shop as the village has it. `shop` is the pack's shop, cut from TilesetHouse.png. */
export function gardenShop(frame: GardenShopFrame, shop: Img): Img {
  const img = new Img(GARDEN_SHOP_SIZE.w, GARDEN_SHOP_SIZE.h);
  const old = frame === "boarded";
  img.blit(old ? recolor(recolor(shop, OLD_ROOF), OLD_WOOD) : recolor(shop, ROOF), 0, 0);
  sign(img, old);
  if (old) {
    for (const win of WINDOWS) {
      plank(img, win.x - 1, win.y + 2, win.w + 2);
      plank(img, win.x - 1, win.y + 8, win.w + 2);
    }
    shutDoor(img);
    plank(img, DOOR.x - 1, DOOR.y + 3, DOOR.w + 2);
    plank(img, DOOR.x - 1, DOOR.y + 8, DOOR.w + 2);
  } else if (frame === "patched") {
    shutDoor(img);
  } else {
    flowerBox(img, WINDOWS[0], [C.pink, C.petal, C.berry]);
    flowerBox(img, WINDOWS[1], [C.lilac, C.pink, C.petal]);
  }
  bench(img, frame);
  if (frame === "opening") bunting(img);
  return img;
}
