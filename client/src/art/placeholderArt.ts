import Phaser from "phaser";
import { TILE_SIZE } from "../../../shared/constants";
import { EMOTES, type EmoteId } from "../../../shared/content/emotes";
import { SHIRT_COLORS, type ShirtColorId } from "../../../shared/content/shirtColors";
import type { Facing } from "../../../shared/movement";
import { TILE_COUNT, Tile, type TileId } from "../../../shared/world/tiles";

export const TILESET_KEY = "tiles";

/** One texture per shirt color, each with a front, back, and side frame. */
export const playerTextureKey = (color: ShirtColorId) => `player-${color}`;
/** The frame to show for each facing. Left is the side frame flipped. */
export const PLAYER_FRAMES: Record<Facing, { frame: number; flipX: boolean }> = {
  down: { frame: 0, flipX: false },
  up: { frame: 1, flipX: false },
  right: { frame: 2, flipX: false },
  left: { frame: 2, flipX: true },
};

/** Just the emote's icon, for buttons. */
export const emoteIconKey = (emote: EmoteId) => `emote-${emote}`;
/** The icon in a speech bubble, shown above a character's head. */
export const emoteBubbleKey = (emote: EmoteId) => `bubble-${emote}`;

const S = TILE_SIZE;
type Ctx = CanvasRenderingContext2D;

/** Draws simple stand-in art, so the game runs before a real art pack is added. */
export function createPlaceholderArt(scene: Phaser.Scene): void {
  const tiles = scene.textures.createCanvas(TILESET_KEY, S * TILE_COUNT, S)!;
  const ctx = tiles.getContext();
  for (let id = 0; id < TILE_COUNT; id++) {
    ctx.save();
    ctx.translate(id * S, 0);
    drawTile(ctx, id as TileId);
    ctx.restore();
  }
  tiles.refresh();

  const playerFrames = [drawPlayerFront, drawPlayerBack, drawPlayerSide];
  for (const { id, hex } of SHIRT_COLORS) {
    const texture = scene.textures.createCanvas(playerTextureKey(id), S * playerFrames.length, S)!;
    const pctx = texture.getContext();
    playerFrames.forEach((draw, frame) => {
      pctx.save();
      pctx.translate(frame * S, 0);
      draw(pctx, hex);
      pctx.restore();
      texture.add(frame, 0, frame * S, 0, S, S);
    });
    texture.refresh();
  }

  for (const { id } of EMOTES) {
    const icon = EMOTE_ICONS[id];
    const iconTexture = scene.textures.createCanvas(emoteIconKey(id), ICON_W, ICON_H)!;
    drawGrid(iconTexture.getContext(), icon, 0, 0);
    iconTexture.refresh();

    const bubbleTexture = scene.textures.createCanvas(emoteBubbleKey(id), BUBBLE_W, BUBBLE_H)!;
    const bctx = bubbleTexture.getContext();
    drawBubble(bctx);
    drawGrid(bctx, icon, 2, 1);
    bubbleTexture.refresh();
  }
}

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** A fixed scatter of single pixels, so tiles look textured but still repeat seamlessly. */
const SPECKS: [number, number][] = [
  [2, 3], [7, 1], [12, 4], [4, 9], [10, 11], [14, 8], [1, 13], [8, 14], [13, 15],
];

function base(ctx: Ctx, fill: string, speck: string) {
  px(ctx, fill, 0, 0, S, S);
  for (const [x, y] of SPECKS) px(ctx, speck, x, y);
}

function drawTile(ctx: Ctx, id: TileId) {
  switch (id) {
    case Tile.Grass:
      base(ctx, "#7cc56f", "#5fa957");
      break;
    case Tile.Flowers:
      base(ctx, "#7cc56f", "#5fa957");
      px(ctx, "#f7a8c8", 3, 4, 2, 2);
      px(ctx, "#fff3a6", 10, 3, 2, 2);
      px(ctx, "#ffffff", 6, 10, 2, 2);
      px(ctx, "#f7a8c8", 12, 11, 2, 2);
      break;
    case Tile.Tree:
      base(ctx, "#7cc56f", "#5fa957");
      px(ctx, "#7a5234", 7, 10, 2, 5); // trunk
      px(ctx, "#3f8f4a", 4, 1, 8, 1); // canopy
      px(ctx, "#3f8f4a", 3, 2, 10, 1);
      px(ctx, "#3f8f4a", 2, 3, 12, 6);
      px(ctx, "#3f8f4a", 3, 9, 10, 1);
      px(ctx, "#5cae5a", 4, 3, 3, 2); // highlight
      break;
    case Tile.Path:
      base(ctx, "#d9b98b", "#c4a272");
      break;
    case Tile.Sand:
      base(ctx, "#f2e0a8", "#e2cb8a");
      break;
    case Tile.Water:
      px(ctx, "#5bb3e6", 0, 0, S, S);
      px(ctx, "#8fd0f2", 2, 4, 4, 1);
      px(ctx, "#8fd0f2", 9, 9, 4, 1);
      px(ctx, "#8fd0f2", 4, 13, 3, 1);
      break;
    case Tile.Dock:
      px(ctx, "#b07a4a", 0, 0, S, S);
      px(ctx, "#8a5a34", 0, 4, S, 1); // gaps between planks
      px(ctx, "#8a5a34", 0, 9, S, 1);
      px(ctx, "#8a5a34", 0, 14, S, 1);
      break;
    case Tile.Soil:
      px(ctx, "#8b5e3c", 0, 0, S, S);
      px(ctx, "#74492c", 0, 3, S, 1); // furrows
      px(ctx, "#74492c", 0, 8, S, 1);
      px(ctx, "#74492c", 0, 13, S, 1);
      break;
  }
}

const SKIN = "#f6d2ae";
const HAIR = "#6b4429";
const EYES = "#2b2b2b";
const PANTS = "#4f6aa3";
const SHOES = "#3b2a20";
const SHADOW = "rgba(0, 0, 0, 0.2)";

function drawPlayerFront(ctx: Ctx, shirt: string) {
  px(ctx, SHADOW, 4, 14, 8, 1);
  px(ctx, HAIR, 4, 1, 8, 4);
  px(ctx, SKIN, 5, 3, 6, 4); // face
  px(ctx, EYES, 6, 5);
  px(ctx, EYES, 9, 5);
  px(ctx, shirt, 4, 7, 8, 4);
  px(ctx, SKIN, 3, 8, 1, 2); // arms
  px(ctx, SKIN, 12, 8, 1, 2);
  px(ctx, PANTS, 5, 11, 6, 2);
  px(ctx, SHOES, 5, 13, 2, 1);
  px(ctx, SHOES, 9, 13, 2, 1);
}

function drawPlayerBack(ctx: Ctx, shirt: string) {
  px(ctx, SHADOW, 4, 14, 8, 1);
  px(ctx, HAIR, 4, 1, 8, 6); // the back of the head is all hair
  px(ctx, shirt, 4, 7, 8, 4);
  px(ctx, SKIN, 3, 8, 1, 2);
  px(ctx, SKIN, 12, 8, 1, 2);
  px(ctx, PANTS, 5, 11, 6, 2);
  px(ctx, SHOES, 5, 13, 2, 1);
  px(ctx, SHOES, 9, 13, 2, 1);
}

/** Facing right. */
function drawPlayerSide(ctx: Ctx, shirt: string) {
  px(ctx, SHADOW, 4, 14, 8, 1);
  px(ctx, HAIR, 4, 1, 8, 4);
  px(ctx, HAIR, 4, 5, 3, 1);
  px(ctx, SKIN, 7, 3, 5, 4); // face
  px(ctx, EYES, 10, 5);
  px(ctx, shirt, 5, 7, 6, 4);
  px(ctx, SKIN, 8, 8, 1, 3); // arm
  px(ctx, PANTS, 5, 11, 6, 2);
  px(ctx, SHOES, 5, 13, 2, 1);
  px(ctx, SHOES, 8, 13, 3, 1);
}

const ICON_W = 11;
const ICON_H = 10;
const BUBBLE_W = 15;
const BUBBLE_H = 14;

/** Pixel grids for emote icons: one string per row, one character per pixel, "." for empty. */
interface PixelGrid {
  rows: string[];
  colors: Record<string, string>;
}

const EMOTE_ICONS: Record<EmoteId, PixelGrid> = {
  wave: {
    rows: [
      "...o.o.o...",
      "..oyoyoyo..",
      "..oyoyoyoo.",
      "..oyoyoyoyo",
      ".ooyyyyyyyo",
      "oyoyyyyyyyo",
      "oyyyyyyyyyo",
      ".oyyyyyyyso",
      "..oyyyyyso.",
      "...oooooo..",
    ],
    colors: { o: "#7a4e2a", y: "#ffd36b", s: "#e5a83f" },
  },
  heart: {
    rows: [
      ".ooo...ooo.",
      "orrro.orrro",
      "orhhrorrrro",
      "orhrrrrrrro",
      "orrrrrrrrro",
      ".orrrrrrro.",
      "..orrrrro..",
      "...orrro...",
      "....oro....",
      ".....o.....",
    ],
    colors: { o: "#8c2a3c", r: "#e8506a", h: "#ffb3c1" },
  },
};

function drawGrid(ctx: Ctx, grid: PixelGrid, ox: number, oy: number) {
  grid.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = grid.colors[row[x]];
      if (color) px(ctx, color, ox + x, oy + y);
    }
  });
}

/** A white speech bubble with rounded corners and a little tail at the bottom. */
function drawBubble(ctx: Ctx) {
  const line = "#4a3b2a";
  px(ctx, "#ffffff", 1, 1, BUBBLE_W - 2, 10);
  px(ctx, line, 1, 0, BUBBLE_W - 2, 1); // top
  px(ctx, line, 1, 11, BUBBLE_W - 2, 1); // bottom
  px(ctx, line, 0, 1, 1, 10); // sides
  px(ctx, line, BUBBLE_W - 1, 1, 1, 10);
  const mid = (BUBBLE_W - 1) / 2;
  px(ctx, "#ffffff", mid, 11); // tail
  px(ctx, line, mid - 1, 12);
  px(ctx, "#ffffff", mid, 12);
  px(ctx, line, mid + 1, 12);
  px(ctx, line, mid, 13);
}
