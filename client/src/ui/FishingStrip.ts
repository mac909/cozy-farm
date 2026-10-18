import Phaser from "phaser";
import type { FishingHudView } from "./fishingText";

const WIDTH = 236;
const HEIGHT = 50;
const BAR = { width: 196, height: 12 };
const REEL_COLOR = 0x9be564;
const TUG_COLOR = 0xef7d6d;

/**
 * The strip at the top of the screen while fishing: what to do now ("Wait for a bite…", "Tap now!",
 * "Hold to reel it in") and, once it's hooked, how far in the fish is. It pulses on a bite and
 * the bar turns red while the fish pulls.
 */
export class FishingStrip extends Phaser.GameObjects.Container {
  /** Its height: it hangs up from where it's put. */
  static readonly HEIGHT = HEIGHT;

  private readonly box: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;
  private shown = "";
  private pulse?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    super(scene);
    this.box = scene.add.graphics();
    this.box
      .fillStyle(0xfff8e7, 0.96)
      .fillRoundedRect(-WIDTH / 2, -HEIGHT, WIDTH, HEIGHT, 14)
      .lineStyle(2, 0x1d2f3b, 1)
      .strokeRoundedRect(-WIDTH / 2, -HEIGHT, WIDTH, HEIGHT, 14);
    this.label = scene.add
      .text(0, -HEIGHT + 8, "", {
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#4a3b2a",
        resolution: window.devicePixelRatio,
      })
      .setOrigin(0.5, 0);
    this.bar = scene.add.graphics();
    this.add([this.box, this.label, this.bar]);
    this.setVisible(false);
    scene.add.existing(this);
  }

  /** Cheap to call every frame: it only redraws when something it shows changes. */
  show(view: FishingHudView | null) {
    if (!view) {
      this.shown = "";
      this.pulse?.stop();
      this.pulse = undefined;
      this.setScale(1).setVisible(false);
      return;
    }
    const progress = view.progress === null ? null : Math.round(view.progress * 50) / 50;
    const key = JSON.stringify([view.text, progress, view.tugging, view.biting]);
    if (key === this.shown) return;
    this.shown = key;
    this.setVisible(true);
    this.label.setText(view.text).setColor(view.biting || view.tugging ? "#c2412d" : "#4a3b2a");
    // Words only until it's hooked: centred in the strip.
    this.label.setY(progress === null ? -HEIGHT / 2 - 9 : -HEIGHT + 7);

    this.bar.clear();
    if (progress !== null) {
      const x = -BAR.width / 2;
      const y = -BAR.height - 9;
      this.bar.fillStyle(0xe4d3ad, 1).fillRoundedRect(x, y, BAR.width, BAR.height, 6);
      const filled = Math.max(BAR.height, BAR.width * progress);
      this.bar.fillStyle(view.tugging ? TUG_COLOR : REEL_COLOR, 1).fillRoundedRect(x, y, filled, BAR.height, 6);
      this.bar.lineStyle(2, 0x1d2f3b, 0.8).strokeRoundedRect(x, y, BAR.width, BAR.height, 6);
    }

    if (view.biting && !this.pulse) {
      this.pulse = this.scene.tweens.add({ targets: this, scale: 1.08, duration: 160, yoyo: true, repeat: -1 });
    } else if (!view.biting && this.pulse) {
      this.pulse.stop();
      this.pulse = undefined;
      this.setScale(1);
    }
  }
}
