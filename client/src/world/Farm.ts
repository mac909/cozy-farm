import Phaser from "phaser";
import { TILE_SIZE } from "../../../shared/constants";
import { isRipe, UNTILLED, type FarmTile } from "../../../shared/farming/farming";
import { parseTileKey, tileKey, type TileKey } from "../../../shared/world/world";
import { CROPS_KEY, SOIL_KEY } from "../art/assets";
import { cropStageFrame } from "../art/cropFrames";
import { changeBetween, sameTile, soilFrame, type TileChange } from "./farmChanges";

/** Dug soil draws over the map's ground layers, under everything standing on it. */
export const SOIL_DEPTH = -900;

/** Crops stand on the bottom of their tile, a couple of pixels up, as in the mockups. */
const CROP_LIFT = 2;

interface DrawnTile {
  tile: FarmTile;
  soil: Phaser.GameObjects.Image;
  crop?: Phaser.GameObjects.Image;
  /** The bob of a ripe crop. */
  bob?: Phaser.Tweens.Tween;
}

/**
 * The farm as the server last described it: dug soil (each tile's border joined to its dug
 * neighbours), and a crop on top, one sprite frame per growth stage.
 */
export class FarmView {
  private readonly tiles = new Map<TileKey, DrawnTile>();

  constructor(private readonly scene: Phaser.Scene) {}

  /** The tile at col, row as last shown. */
  tileAt(col: number, row: number): FarmTile {
    return this.tiles.get(tileKey(col, row))?.tile ?? UNTILLED;
  }

  /** Shows the farm and says what changed on each tile since the last time. */
  update(farm: Readonly<Record<TileKey, FarmTile>>): TileChange[] {
    const changes: TileChange[] = [];
    const reshaped = new Set<TileKey>();
    const touch = (col: number, row: number) => {
      for (const [dc, dr] of [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]]) reshaped.add(tileKey(col + dc, row + dr));
    };

    for (const [key, drawn] of this.tiles) {
      if (Object.hasOwn(farm, key)) continue;
      drawn.bob?.remove();
      drawn.soil.destroy();
      drawn.crop?.destroy();
      this.tiles.delete(key);
      const at = parseTileKey(key);
      if (at) touch(at.col, at.row);
    }

    for (const [key, tile] of Object.entries(farm) as [TileKey, FarmTile][]) {
      const at = parseTileKey(key);
      if (!at || tile.kind === "untilled") continue;
      const drawn = this.tiles.get(key);
      const before = drawn?.tile ?? UNTILLED;
      if (drawn && sameTile(before, tile)) continue;
      const change = changeBetween(before, tile);
      if (change) changes.push({ ...at, change });
      if (!drawn) {
        const soil = this.scene.add.image(at.col * TILE_SIZE, at.row * TILE_SIZE, SOIL_KEY, 0).setOrigin(0, 0).setDepth(SOIL_DEPTH);
        this.tiles.set(key, { tile, soil });
        touch(at.col, at.row);
      } else {
        drawn.tile = tile;
        reshaped.add(key);
      }
      this.drawCrop(this.tiles.get(key)!, at.col, at.row);
    }

    for (const key of reshaped) {
      const drawn = this.tiles.get(key);
      const at = parseTileKey(key);
      if (!drawn || !at) continue;
      drawn.soil.setFrame(soilFrame((c, r) => this.tiles.has(tileKey(c, r)), at.col, at.row, drawn.tile.kind !== "untilled" && drawn.tile.watered));
    }
    return changes;
  }

  destroy() {
    for (const drawn of this.tiles.values()) {
      drawn.bob?.remove();
      drawn.soil.destroy();
      drawn.crop?.destroy();
    }
    this.tiles.clear();
  }

  private drawCrop(drawn: DrawnTile, col: number, row: number) {
    const { tile } = drawn;
    if (tile.kind !== "planted") {
      drawn.bob?.remove();
      drawn.bob = undefined;
      drawn.crop?.destroy();
      drawn.crop = undefined;
      return;
    }
    const frame = cropStageFrame(tile.cropId, tile.stage);
    const y = row * TILE_SIZE - CROP_LIFT;
    if (!drawn.crop) {
      drawn.crop = this.scene.add
        .image(col * TILE_SIZE, y, CROPS_KEY, frame)
        .setOrigin(0, 0)
        // Sorted with the characters: someone standing on the tile below is drawn in front.
        .setDepth(row * TILE_SIZE + TILE_SIZE / 2 - 1);
    } else {
      drawn.crop.setFrame(frame);
    }
    // Ripe crops bob a pixel, so you can spot them across the field. Each starts at its own moment.
    if (isRipe(tile) && !drawn.bob) {
      drawn.bob = this.scene.tweens.add({
        targets: drawn.crop,
        y: y - 1,
        duration: 450,
        yoyo: true,
        repeat: -1,
        repeatDelay: 700,
        delay: ((col * 7 + row * 13) % 10) * 90,
        ease: "Stepped",
      });
    } else if (!isRipe(tile) && drawn.bob) {
      drawn.bob.remove();
      drawn.bob = undefined;
      drawn.crop.setY(y);
    }
  }
}
