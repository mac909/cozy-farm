import Phaser from "phaser";
import { TILE_SIZE } from "../../../shared/constants";
import { forageAt, type Forage, type ForageItem } from "../../../shared/foraging/forage";
import { itemIcon } from "../art/itemIcons";
import { playBurst } from "./effects";

/** Driftwood and branches lie on the ground: over the map's ground and decor, under everyone walking past. */
const FORAGE_DEPTH = -500;

/**
 * Driftwood on the beach and branches under the trees (Milestone 6), as the server last said. New
 * ones fade in; picked-up ones pop away with a little puff.
 */
export class ForageView {
  private items: Forage = [];
  private readonly sprites = new Map<string, Phaser.GameObjects.Image>();
  private seen = false;

  constructor(private readonly scene: Phaser.Scene) {}

  /** What's lying on tile (col, row), if anything. */
  itemAt(col: number, row: number): ForageItem | undefined {
    return forageAt(this.items, col, row);
  }

  /** Shows what's lying about as the server last said. */
  update(items: Forage) {
    this.items = items;
    const keep = new Set<string>();
    for (const item of items) {
      const key = `${item.col},${item.row},${item.itemId}`;
      keep.add(key);
      if (this.sprites.has(key)) continue;
      const icon = itemIcon(item.itemId);
      const sprite = this.scene.add
        .image(item.col * TILE_SIZE + TILE_SIZE / 2, item.row * TILE_SIZE + TILE_SIZE / 2, icon.key, icon.frame)
        .setDepth(FORAGE_DEPTH);
      if (this.seen) this.scene.tweens.add({ targets: sprite, alpha: { from: 0, to: 1 }, duration: 900 });
      this.sprites.set(key, sprite);
    }
    for (const [key, sprite] of this.sprites) {
      if (keep.has(key)) continue;
      this.sprites.delete(key);
      playBurst(this.scene, sprite.x, sprite.y + 2, key.endsWith("branch") ? "twigs" : "sand", FORAGE_DEPTH + 1);
      this.scene.tweens.add({ targets: sprite, y: sprite.y - 6, alpha: 0, scale: 1.3, duration: 220, onComplete: () => sprite.destroy() });
    }
    this.seen = true;
  }
}
