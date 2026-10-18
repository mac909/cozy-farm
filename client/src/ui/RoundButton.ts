import Phaser from "phaser";

interface RoundButtonOptions {
  /** Diameter in screen pixels. */
  size: number;
  icon: string;
  iconFrame?: number;
  /** Whole numbers keep pixel art crisp. */
  iconScale: number;
  /** A small key hint in the corner, for keyboards (e.g. "1"). */
  hint?: string;
  onPress: () => void;
}

/** A big, thumb-sized round button with a pixel-art icon. It fires as soon as it's touched. */
export class RoundButton extends Phaser.GameObjects.Container {
  private readonly icon: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, { size, icon, iconFrame, iconScale, hint, onPress }: RoundButtonOptions) {
    super(scene);
    const radius = size / 2;
    const disc = scene.add
      .circle(0, 0, radius, 0x1d2f3b, 0.55)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setInteractive({ useHandCursor: true });
    this.icon = scene.add.image(0, 0, icon, iconFrame).setScale(iconScale);
    this.add([disc, this.icon]);
    if (hint) {
      const label = scene.add
        .text(radius * 0.7, radius * 0.7, hint, {
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

    disc.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.setScale(0.9);
      onPress();
    });
    const release = () => this.setScale(1);
    disc.on(Phaser.Input.Events.POINTER_UP, release);
    disc.on(Phaser.Input.Events.POINTER_OUT, release);
    scene.add.existing(this);
  }

  setIcon(key: string, frame?: number) {
    this.icon.setTexture(key, frame);
    return this;
  }
}
