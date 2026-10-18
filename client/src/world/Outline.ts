import Phaser from "phaser";
import { TILE_SIZE } from "../../../shared/constants";
import type { TilePos } from "../../../shared/world/map";
import { OUTLINE_KEY } from "../art/assets";

/** Over the characters and tree tops, under name tags and bubbles. */
const OUTLINE_DEPTH = 900_000;
/** When the Action button is faded, so is the outline. */
const FAINT = 0.45;

/**
 * Four white pixel corners around the tile the Action button will act on, gently pulsing. The
 * corner art is one top-left corner; the other three are it flipped.
 */
export class Outline {
  private readonly container: Phaser.GameObjects.Container;
  private readonly pulse: Phaser.Tweens.Tween;
  private at: TilePos | null = null;

  constructor(scene: Phaser.Scene) {
    const corners = [
      [false, false],
      [true, false],
      [false, true],
      [true, true],
    ].map(([flipX, flipY]) => scene.add.image(0, 0, OUTLINE_KEY).setOrigin(0, 0).setFlip(flipX, flipY));
    this.container = scene.add.container(0, 0, corners).setDepth(OUTLINE_DEPTH).setVisible(false);
    this.pulse = scene.tweens.add({ targets: corners, alpha: { from: 1, to: 0.55 }, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  /** Shows the outline on a tile, faint when nothing would happen there. */
  show(tile: TilePos, faint: boolean) {
    if (this.at?.col !== tile.col || this.at?.row !== tile.row) {
      this.at = tile;
      this.container.setPosition(tile.col * TILE_SIZE, tile.row * TILE_SIZE);
    }
    this.container.setVisible(true).setAlpha(faint ? FAINT : 1);
  }

  hide() {
    this.container.setVisible(false);
    this.at = null;
  }

  destroy() {
    this.pulse.remove();
    this.container.destroy();
  }
}
