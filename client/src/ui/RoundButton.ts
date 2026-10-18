import Phaser from "phaser";

interface RoundButtonOptions {
  /** Diameter (or width, when square) in screen pixels. */
  size: number;
  icon: string;
  iconFrame?: number;
  /** Whole numbers keep pixel art crisp. */
  iconScale: number;
  /** A small key hint in the corner, for keyboards (e.g. "Z"). */
  hint?: string;
  /** A rounded square instead of a circle. */
  square?: boolean;
  /** A word on a tag across the bottom, like the Action button's ("Turn"). */
  label?: string;
  onPress: () => void;
}

/** A big, thumb-sized button with a pixel-art icon. It fires as soon as it's touched. */
export class RoundButton extends Phaser.GameObjects.Container {
  private readonly icon: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, { size, icon, iconFrame, iconScale, hint, square, label, onPress }: RoundButtonOptions) {
    super(scene);
    const radius = size / 2;
    let touch: Phaser.GameObjects.GameObject;
    if (square) {
      const tile = scene.add.graphics();
      tile
        .fillStyle(0x1d2f3b, 0.62)
        .fillRoundedRect(-radius, -radius, size, size, 14)
        .lineStyle(2, 0xffffff, 0.6)
        .strokeRoundedRect(-radius, -radius, size, size, 14);
      const zone = scene.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });
      this.add([tile, zone]);
      touch = zone;
    } else {
      const disc = scene.add
        .circle(0, 0, radius, 0x1d2f3b, 0.55)
        .setStrokeStyle(2, 0xffffff, 0.6)
        .setInteractive({ useHandCursor: true });
      this.add(disc);
      touch = disc;
    }
    this.icon = scene.add.image(0, 0, icon, iconFrame).setScale(iconScale);
    this.add(this.icon);
    if (hint) {
      const label = scene.add
        .text(radius * 0.7, -radius * 0.7, hint, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#ffffff",
          backgroundColor: "#1d2f3b",
          padding: { x: 4, y: 1 },
          resolution: window.devicePixelRatio,
        })
        .setOrigin(0.5);
      this.add(label);
    }

    if (label) {
      const text = scene.add
        .text(0, 0, label, {
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#4a3b2a",
          resolution: window.devicePixelRatio,
        })
        .setOrigin(0.5);
      const w = text.width + 12;
      const h = 16;
      const box = scene.add.graphics();
      box
        .fillStyle(0xfff8e7, 1)
        .fillRoundedRect(-w / 2, -h / 2, w, h, 7)
        .lineStyle(2, 0x1d2f3b, 1)
        .strokeRoundedRect(-w / 2, -h / 2, w, h, 7);
      this.add(scene.add.container(0, radius - 1, [box, text]));
      this.icon.setY(-3);
    }

    touch.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.press();
      onPress();
    });
    const release = () => this.setScale(1);
    touch.on(Phaser.Input.Events.POINTER_UP, release);
    touch.on(Phaser.Input.Events.POINTER_OUT, release);
    scene.add.existing(this);
  }

  setIcon(key: string, frame?: number) {
    this.icon.setTexture(key, frame);
    return this;
  }

  /** Shows a quick press, as if tapped (for its keyboard shortcut). */
  press() {
    this.setScale(0.9);
    this.scene.time.delayedCall(120, () => this.setScale(1));
  }
}
