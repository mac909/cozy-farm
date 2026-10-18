/**
 * Tool upgrades from the garden shop (Milestone 8), one 16×16 icon each, in TOOL_ART order (the
 * frame names in manifest.json are the item ids). The upgrades of the pack's own tools are those
 * tools in better metal, so they read as "the same, but better": a copper watering can, a hoe
 * with a brass blade, a rod in dark red with a gold reel. The bug net and the shell basket are
 * ours, drawn as grids (fill colours only; the render adds the outline).
 */
import { C } from "./palette";
import { Img, fromGrid, outline, recolor } from "./lib/image";

export const PACK_WATERING_CAN = "Items/Tool/WateringCan.png";
export const PACK_HOE = "Items/Tool/Hoe.png";
export const PACK_ROD = "Items/Weapons/Fishing Rod/Sprite.png";

/** The pack's grey steel, as copper (the can) and brass (the hoe's blade). */
const COPPER = { "#abc2bc": C.orange, "#8d977f": C.orangeDark, "#5f7160": C.woodDark } as const;
const BRASS = { "#abc2bc": C.yellow, "#8d977f": C.petalShade } as const;
/** The rod's plain wood as dark red lacquer, its reel in gold. */
const LACQUER = { "#a3754e": C.plum, "#965340": C.plumDark, "#abc2bc": C.petalShade, "#f2eaf1": C.yellow, "#eecf9b": C.gold } as const;

const LEGEND = {
  k: C.outline,
  r: C.woodLight,
  R: C.woodMid,
  b: C.stem,
  B: C.stemDark,
  w: C.white,
  i: C.ice,
  t: C.woodLight,
  P: C.tanDark,
  p: C.tan,
  h: C.cream,
  e: C.pink,
  E: C.rose,
};

const E = "................";

const BUG_NET = [
  E,
  "........rrrrr...",
  ".......rwiwiwr..",
  "......rwiwiwiwr.",
  "......riwiwiwir.",
  "......rwiwiwiwr.",
  "......riwiwiwir.",
  ".......rwiwiwr..",
  ".......brrrrr...",
  "......bB........",
  ".....bB.........",
  "....bB..........",
  "...bB...........",
  "..bB............",
  "..B.............",
  E,
];

const SHELL_BASKET = [
  E,
  E,
  "......RRRR......",
  ".....R....R.....",
  "....R......R....",
  "....R.eeh..R....",
  "....R.eEhh.R....",
  "...tttttttttt...",
  "...tPtPtPtPtP...",
  "...PtPtPtPtPt...",
  "....tPtPtPtP....",
  "....PtPtPtPt....",
  ".....PPPPPP.....",
  E,
  E,
  E,
];

/** Centres a smaller pack picture on a 16×16 frame. */
function onFrame(img: Img): Img {
  return new Img(16, 16).blit(img, Math.floor((16 - img.w) / 2), Math.floor((16 - img.h) / 2));
}

/** Every tool icon, by item id, in sheet order. `read` loads a pack image. */
export function toolIcons(read: (file: string) => Img): Record<"big_watering_can" | "wide_hoe" | "good_rod" | "bug_net" | "shell_basket", Img> {
  return {
    big_watering_can: recolor(read(PACK_WATERING_CAN), COPPER),
    wide_hoe: recolor(read(PACK_HOE), BRASS),
    good_rod: onFrame(recolor(read(PACK_ROD), LACQUER)),
    bug_net: outline(fromGrid(BUG_NET, LEGEND)),
    shell_basket: outline(fromGrid(SHELL_BASKET, LEGEND)),
  };
}
