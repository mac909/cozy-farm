import Phaser from "phaser";

/** What the Action button shows: an icon, the word on its tag, and whether it's faded. */
export interface ActionView {
  /** A texture key and frame, or null for none. */
  icon: { key: string; frame?: string | number } | null;
  /** Whole numbers keep pixel art crisp; 16-pixel items show at 3×. */
  iconScale: number;
  /** "Dig", "Water", "Sleep"…, or null when faded. */
  word: string | null;
  /** Nothing would happen: tapping it gives a hint instead. */
  faded: boolean;
}

const FADED_ALPHA = 0.45;

/**
 * The big round button in the bottom-right corner that does whatever the tile in front of you
 * needs. Its icon and word say what that is before you tap; it fades when nothing would happen.
 * It fires as soon as it's touched.
 */
export class ActionButton extends Phaser.GameObjects.Container {
  private readonly icon: Phaser.GameObjects.Image;
  private readonly tag: Phaser.GameObjects.Container;
  private readonly tagBox: Phaser.GameObjects.Graphics;
  private readonly tagText: Phaser.GameObjects.Text;
  private shown = "";

  constructor(scene: Phaser.Scene, size: number, keyHint: string | undefined, onPress: () => void) {
    super(scene);
    const radius = size / 2;
    const disc = scene.add
      .circle(0, 0, radius, 0x1d2f3b, 0.72)
      .setStrokeStyle(3, 0xffffff, 0.85)
      .setInteractive({ useHandCursor: true });
    this.icon = scene.add.image(0, -4, "__DEFAULT").setVisible(false);
    this.tagBox = scene.add.graphics();
    this.tagText = scene.add
      .text(0, 0, "", {
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#4a3b2a",
        resolution: window.devicePixelRatio,
      })
      .setOrigin(0.5);
    this.tag = scene.add.container(0, radius - 2, [this.tagBox, this.tagText]);
    this.add([disc, this.icon, this.tag]);
    if (keyHint) {
      this.add(
        scene.add
          .text(radius * 0.72, -radius * 0.78, keyHint, {
            fontFamily: "system-ui, sans-serif",
            fontSize: "11px",
            fontStyle: "bold",
            color: "#ffffff",
            backgroundColor: "#1d2f3b",
            padding: { x: 5, y: 1 },
            resolution: window.devicePixelRatio,
          })
          .setOrigin(0.5),
      );
    }
    disc.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.heldBy = pointer.id;
      this.press();
      onPress();
    });
    // Let go anywhere (a thumb often slides off the button while walking).
    const release = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.heldBy) this.heldBy = null;
    };
    scene.input.on(Phaser.Input.Events.POINTER_UP, release);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
    scene.add.existing(this);
  }

  /** Which pointer is holding the button down, if any. */
  private heldBy: number | null = null;

  /** Whether it's being held down (hold to repeat). */
  get held(): boolean {
    return this.heldBy !== null && this.visible;
  }

  /** Shows a quick press, as if tapped (for Space and Enter). */
  press() {
    this.setScale(0.9);
    this.scene.time.delayedCall(120, () => this.setScale(1));
  }

  /** Cheap to call every frame: it only redraws when the view changes. */
  show(view: ActionView) {
    const key = JSON.stringify(view);
    if (key === this.shown) return;
    this.shown = key;
    if (view.icon) {
      this.icon.setTexture(view.icon.key, view.icon.frame).setScale(view.iconScale).setVisible(true);
      this.icon.setY(view.word ? -4 : 0);
    } else {
      this.icon.setVisible(false);
    }
    this.tag.setVisible(view.word !== null);
    if (view.word) {
      this.tagText.setText(view.word);
      const width = this.tagText.width + 16;
      const height = 19;
      this.tagBox
        .clear()
        .fillStyle(0xfff8e7, 1)
        .fillRoundedRect(-width / 2, -height / 2, width, height, 8)
        .lineStyle(2, 0x1d2f3b, 1)
        .strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    }
    this.setAlpha(view.faded ? FADED_ALPHA : 1);
  }
}
