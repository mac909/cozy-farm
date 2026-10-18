import Phaser from "phaser";
import { TILE_SIZE } from "../../../shared/constants";
import { TILE_COUNT, Tile, type TileId } from "../../../shared/world/tiles";

export const TILESET_KEY = "tiles";
export const PLAYER_KEY = "player";

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

  const player = scene.textures.createCanvas(PLAYER_KEY, S, S)!;
  drawPlayer(player.getContext());
  player.refresh();
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

function drawPlayer(ctx: Ctx) {
  px(ctx, "rgba(0, 0, 0, 0.2)", 4, 14, 8, 1); // shadow
  px(ctx, "#6b4429", 4, 1, 8, 4); // hair
  px(ctx, "#f6d2ae", 5, 3, 6, 4); // face
  px(ctx, "#2b2b2b", 6, 5); // eyes
  px(ctx, "#2b2b2b", 9, 5);
  px(ctx, "#ef7d6d", 4, 7, 8, 4); // shirt
  px(ctx, "#f6d2ae", 3, 8, 1, 2); // arms
  px(ctx, "#f6d2ae", 12, 8, 1, 2);
  px(ctx, "#4f6aa3", 5, 11, 6, 2); // pants
  px(ctx, "#3b2a20", 5, 13, 2, 1); // shoes
  px(ctx, "#3b2a20", 9, 13, 2, 1);
}
