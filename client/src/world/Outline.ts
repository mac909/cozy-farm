import Phaser from "phaser";
import { TILE_SIZE } from "../../../shared/constants";
import type { TilePos } from "../../../shared/world/map";
import { OUTLINE_KEY } from "../art/assets";

/** Over the characters and tree tops, under name tags and bubbles. */
const OUTLINE_DEPTH = 900_000;
/** When the Action button is faded, so is the outline. */
const FAINT = 0.45;
/** The tiles beside the one in front (a wide hoe or a big can) are outlined a little fainter. */
const SIDE = 0.7;

/** Four corners round one tile. */
class TileCorners {
  readonly container: Phaser.GameObjects.Container;
  readonly corners: Phaser.GameObjects.Image[];
  at: TilePos | null = null;

  constructor(scene: Phaser.Scene) {
    this.corners = [
      [false, false],
      [true, false],
      [false, true],
      [true, true],
    ].map(([flipX, flipY]) => scene.add.image(0, 0, OUTLINE_KEY).setOrigin(0, 0).setFlip(flipX, flipY));
    this.container = scene.add.container(0, 0, this.corners).setDepth(OUTLINE_DEPTH).setVisible(false);
  }

  show(tile: TilePos, alpha: number) {
    if (this.at?.col !== tile.col || this.at?.row !== tile.row) {
      this.at = tile;
      this.container.setPosition(tile.col * TILE_SIZE, tile.row * TILE_SIZE);
    }
    this.container.setVisible(true).setAlpha(alpha);
  }

  hide() {
    this.container.setVisible(false);
    this.at = null;
  }
}

/**
 * White pixel corners round the tile the Action button will act on, gently pulsing; with a wide hoe
 * or a big can (Milestone 8), round the tiles beside it too. The corner art is one top-left
 * corner; the other three are it flipped.
 */
export class Outline {
  private readonly tiles: TileCorners[] = [];
  private readonly pulses: Phaser.Tweens.Tween[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.more(1);
  }

  /** Enough corners for `count` tiles. */
  private more(count: number) {
    while (this.tiles.length < count) {
      const tile = new TileCorners(this.scene);
      this.tiles.push(tile);
      this.pulses.push(
        this.scene.tweens.add({ targets: tile.corners, alpha: { from: 1, to: 0.55 }, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }),
      );
    }
  }

  /** Shows the outline on a tile (and the tiles beside it, `sides`), faint when nothing would happen there. */
  show(tile: TilePos, faint: boolean, sides: readonly TilePos[] = []) {
    this.more(1 + sides.length);
    this.tiles[0].show(tile, faint ? FAINT : 1);
    sides.forEach((side, i) => this.tiles[i + 1].show(side, (faint ? FAINT : 1) * SIDE));
    for (let i = 1 + sides.length; i < this.tiles.length; i++) this.tiles[i].hide();
  }

  hide() {
    for (const tile of this.tiles) tile.hide();
  }

  destroy() {
    for (const pulse of this.pulses) pulse.remove();
    for (const tile of this.tiles) tile.container.destroy();
  }
}
