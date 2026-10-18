import Phaser from "phaser";
import { FEET_OFFSET, TILE_SIZE } from "../../../shared/constants";
import { flutterOffset, MEADOW, type MeadowBug } from "../../../shared/bugs/meadow";
import { BUGS, type BugId } from "../../../shared/content/bugs";
import { tileCenter } from "../../../shared/world/map";
import type { Point } from "../../../shared/world/places";
import { bugAnimKey, BUGS_KEY } from "../art/assets";
import { playBurst } from "./effects";

/** Bugs fly over the meadow: drawn by where they are, a little in front of whoever's under them. */
const FLY_LIFT = 20;

interface DrawnBug {
  bug: MeadowBug;
  sprite: Phaser.GameObjects.Sprite;
  glow?: Phaser.GameObjects.Arc;
}

/**
 * The bugs out in the meadow, as the server last said: each one flutters round its spot (the same
 * loop on every screen, from the wall clock), and fireflies glow. New ones fade in; a caught one
 * twinkles into whoever caught it; the rest fly off when the hour comes round.
 */
export class MeadowView {
  private readonly drawn = new Map<string, DrawnBug>();
  /** The bug you've just asked to catch, and where you were: it flies to you when the server agrees. */
  private catching: { id: string; at: Point } | null = null;
  private seen = false;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Shows the bugs out now. */
  update(bugs: readonly MeadowBug[]) {
    const ids = new Set(bugs.map((bug) => bug.id));
    for (const [id, drawn] of this.drawn) {
      if (ids.has(id)) continue;
      this.drawn.delete(id);
      this.goAway(drawn, this.catching?.id === id ? this.catching.at : null);
    }
    for (const bug of bugs) {
      if (this.drawn.has(bug.id)) continue;
      const sprite = this.scene.add.sprite(0, 0, BUGS_KEY).play({ key: bugAnimKey(bug.bugId), startFrame: Phaser.Math.Between(0, 3) });
      const drawn: DrawnBug = { bug, sprite };
      if (BUGS[bug.bugId].glows) {
        drawn.glow = this.scene.add.circle(0, 0, 6, 0xfff3a0, 0.35).setBlendMode(Phaser.BlendModes.ADD);
      }
      if (this.seen) {
        sprite.setAlpha(0);
        this.scene.tweens.add({ targets: [sprite], alpha: 1, duration: 1200 });
      }
      this.drawn.set(bug.id, drawn);
      this.place(drawn, Date.now());
    }
    this.seen = true;
  }

  /** Every frame: everyone flutters on. */
  tick() {
    const now = Date.now();
    for (const drawn of this.drawn.values()) this.place(drawn, now);
  }

  /** The bug close enough to catch from where you stand (its drawn place to your feet), if any: the closest. */
  bugNear(position: Point, extraTiles = 0): { id: string; bugId: BugId } | null {
    const feet = { x: position.x, y: position.y + FEET_OFFSET };
    let best: { id: string; bugId: BugId } | null = null;
    // Light step (Foraging level 3): a step further.
    let bestDistance = (MEADOW.catchTiles + extraTiles) * TILE_SIZE;
    for (const { bug, sprite } of this.drawn.values()) {
      // A bug flies a little above the ground it's over.
      const distance = Math.hypot(sprite.x - feet.x, sprite.y + FLY_LIFT / 2 - feet.y);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = { id: bug.id, bugId: bug.bugId };
      }
    }
    return best;
  }

  /** You tapped Catch: a twinkle now, and it flies to you once the server says it's yours. */
  startCatch(id: string, me: Point) {
    this.catching = { id, at: me };
    const drawn = this.drawn.get(id);
    if (drawn) playBurst(this.scene, drawn.sprite.x, drawn.sprite.y, "twinkle", drawn.sprite.depth + 1);
  }

  private place({ bug, sprite, glow }: DrawnBug, now: number) {
    const home = tileCenter(bug.col, bug.row);
    const offset = flutterOffset(bug.id, now, TILE_SIZE);
    const x = Math.round(home.x + offset.x);
    const y = Math.round(home.y + offset.y - FLY_LIFT / 2);
    // Facing the way it's drifting.
    if (x !== sprite.x) sprite.setFlipX(x < sprite.x);
    sprite.setPosition(x, y).setDepth(y + FLY_LIFT);
    if (glow) {
      glow.setPosition(x, y + 2).setDepth(y + FLY_LIFT - 1);
      glow.setAlpha(0.2 + 0.25 * (0.5 + 0.5 * Math.sin(now / 300 + bug.col)));
    }
  }

  /** A caught bug twinkles into whoever caught it (you, if `to`); otherwise it flutters up and away. */
  private goAway({ sprite, glow }: DrawnBug, to: Point | null) {
    glow?.destroy();
    sprite.stop();
    if (to) {
      playBurst(this.scene, sprite.x, sprite.y, "twinkle", sprite.depth + 1);
      this.scene.tweens.add({ targets: sprite, x: to.x, y: to.y - 8, scale: 0.4, alpha: 0, duration: 350, onComplete: () => sprite.destroy() });
      this.catching = null;
      return;
    }
    this.scene.tweens.add({ targets: sprite, y: sprite.y - 40, alpha: 0, duration: 1200, ease: "Sine.easeIn", onComplete: () => sprite.destroy() });
  }
}
