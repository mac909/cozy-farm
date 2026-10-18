import Phaser from "phaser";
import type { SeasonId } from "../../../shared/content/seasons";
import { SEASON_DRIFT, SEASON_TERRAIN, SEASON_TREES, TERRAIN_TILESET } from "../art/seasonArt";
import { tilesetKey } from "../art/assets";

/** Drifting leaves and snow are over everything in the world but the HUD's own layers. */
const DRIFT_DEPTH = 850_000;

/**
 * The seasons on screen (Milestone 8): the map's trees swapped for their blossom, autumn or snowy
 * versions, the grass for its autumn or winter picture, and a few petals, leaves or snowflakes
 * drifting down outdoors. The season only changes overnight, so the swap happens under the
 * night's fade; before the seasons begin, the village looks as it's painted.
 */
export class SeasonView {
  /** Each layer's tiles as painted, so a season can always be worked out from them. */
  private readonly painted: { layer: Phaser.Tilemaps.TilemapLayer; indices: number[][] }[];
  private season: SeasonId | null = null;
  private driftAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: Phaser.Tilemaps.Tilemap,
    layers: readonly Phaser.Tilemaps.TilemapLayer[],
  ) {
    this.painted = layers.map((layer) => ({ layer, indices: layer.layer.data.map((row) => row.map((tile) => tile.index)) }));
  }

  /** Shows `season` (null: before the seasons begin, as painted). */
  show(season: SeasonId | null) {
    if (season === this.season) return;
    this.season = season;
    const swaps = this.swapsFor(season);
    for (const { layer, indices } of this.painted) {
      indices.forEach((row, r) =>
        row.forEach((painted, c) => {
          const wanted = swaps.get(painted) ?? painted;
          if (layer.getTileAt(c, r, true)?.index !== wanted) layer.putTileAt(wanted, c, r);
        }),
      );
    }
    const terrain = this.map.getTileset(TERRAIN_TILESET);
    const key = (season && SEASON_TERRAIN[season]) || tilesetKey(TERRAIN_TILESET);
    if (terrain && this.scene.textures.exists(key)) terrain.setImage(this.scene.textures.get(key));
  }

  /** Every frame, outdoors: now and then a petal, a leaf or a snowflake drifts down across the view. */
  tick(time: number, outdoors: boolean) {
    const drift = this.season ? SEASON_DRIFT[this.season] : null;
    if (!drift || !outdoors || time < this.driftAt) return;
    this.driftAt = time + drift.everyMs * (0.6 + Math.random() * 0.8);
    const view = this.scene.cameras.main.worldView;
    const x = view.x + Math.random() * view.width;
    const y = view.y - 4;
    const colour = drift.colours[Math.floor(Math.random() * drift.colours.length)];
    const flake = this.scene.add.rectangle(x, y, drift.size, drift.size, colour).setDepth(DRIFT_DEPTH).setAlpha(0.9);
    const fall = view.height + 8;
    const sway = (Math.random() - 0.5) * 60;
    this.scene.tweens.add({
      targets: flake,
      y: y + fall,
      x: x + sway,
      angle: Math.random() * 360,
      duration: (fall / 22) * 1000 * (0.8 + Math.random() * 0.5),
      ease: "Sine.easeInOut",
      onComplete: () => flake.destroy(),
    });
  }

  /** The tile swaps for a season, as global tile ids: painted → shown. */
  private swapsFor(season: SeasonId | null): Map<number, number> {
    const swaps = new Map<number, number>();
    if (!season) return swaps;
    const gid = (tileset: string, col: number, row: number): number | null => {
      const set = this.map.getTileset(tileset);
      return set ? set.firstgid + row * set.columns + col : null;
    };
    for (const { from, to, width, height } of SEASON_TREES[season]) {
      for (let dr = 0; dr < height; dr++)
        for (let dc = 0; dc < width; dc++) {
          const a = gid(from.tileset, from.col + dc, from.row + dr);
          const b = gid(to.tileset, to.col + dc, to.row + dr);
          if (a !== null && b !== null) swaps.set(a, b);
        }
    }
    return swaps;
  }
}
