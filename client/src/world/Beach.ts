import Phaser from "phaser";
import { TILE_SIZE } from "../../../shared/constants";
import { findAt, type Beach, type BeachFind } from "../../../shared/beachcombing/beachcombing";
import { BEACH_ITEMS_KEY } from "../art/assets";
import { itemIcon } from "../art/itemIcons";
import { playBurst } from "./effects";
import { PERK } from "../../../shared/content/skills";

/** Finds lie on the sand: over the map's ground and decor layers, under everyone walking past. */
const FIND_DEPTH = -500;

/** Now and then one of them glints, so they catch the eye across the beach (more often with Bright eyes). */
const GLINT_MS = 1400;

/**
 * What's lying on the beach, as the server last said: a shell or a bit of sea glass on its tile,
 * glinting now and then. New finds fade in; picked-up ones pop away with a flick of sand.
 */
export class BeachView {
  private finds: Beach = [];
  private readonly sprites = new Map<string, Phaser.GameObjects.Image>();
  private seen = false;
  /** How many times as often finds glint: more with Bright eyes (Foraging level 2, Milestone 7). */
  private glints = 1;
  private ticks = 0;

  constructor(private readonly scene: Phaser.Scene) {
    scene.time.addEvent({ delay: GLINT_MS / PERK.brightEyes, loop: true, callback: () => this.tick() });
  }

  /** Bright eyes: finds glint more often on this screen. */
  setBrightEyes(on: boolean) {
    this.glints = on ? PERK.brightEyes : 1;
  }

  private tick() {
    this.ticks = (this.ticks + 1) % PERK.brightEyes;
    if (this.glints > 1 || this.ticks === 0) this.glint();
  }

  /** The find lying on tile (col, row), if any. */
  findAt(col: number, row: number): BeachFind | undefined {
    return findAt(this.finds, col, row);
  }

  /** Shows the beach as the server last said. */
  update(finds: Beach) {
    this.finds = finds;
    const keep = new Set<string>();
    for (const find of finds) {
      const key = `${find.col},${find.row},${find.findId}`;
      keep.add(key);
      if (this.sprites.has(key)) continue;
      const icon = itemIcon(find.findId);
      const sprite = this.scene.add
        .image(find.col * TILE_SIZE + TILE_SIZE / 2, find.row * TILE_SIZE + TILE_SIZE / 2, icon.key ?? BEACH_ITEMS_KEY, icon.frame)
        .setDepth(FIND_DEPTH);
      // Washing up while you watch: a soft fade in. The first look after joining just shows them.
      if (this.seen) this.scene.tweens.add({ targets: sprite, alpha: { from: 0, to: 1 }, duration: 900 });
      this.sprites.set(key, sprite);
    }
    for (const [key, sprite] of this.sprites) {
      if (keep.has(key)) continue;
      this.sprites.delete(key);
      playBurst(this.scene, sprite.x, sprite.y + 2, "sand", FIND_DEPTH + 1);
      this.scene.tweens.add({ targets: sprite, y: sprite.y - 6, alpha: 0, scale: 1.3, duration: 220, onComplete: () => sprite.destroy() });
    }
    this.seen = true;
  }

  /** A glint on one find on screen. */
  private glint() {
    const view = this.scene.cameras.main.worldView;
    const onScreen = [...this.sprites.values()].filter((s) => view.contains(s.x, s.y));
    if (onScreen.length === 0) return;
    const sprite = onScreen[Math.floor(Math.random() * onScreen.length)];
    playBurst(this.scene, sprite.x + Phaser.Math.Between(-3, 3), sprite.y - 2, "glint", FIND_DEPTH + 1);
  }
}
