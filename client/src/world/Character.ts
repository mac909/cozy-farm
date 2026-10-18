import Phaser from "phaser";
import { EMOTE_SHOW_MS } from "../../../shared/constants";
import type { EmoteId } from "../../../shared/content/emotes";
import type { Facing } from "../../../shared/movement";
import type { Look } from "../../../shared/player";
import { characterKey, EMOTES_KEY, emoteFrame, idleFrame, walkAnimKey } from "../art/assets";

/** Name tags and bubbles draw above every character, and above tree tops. */
const OVERHEAD_DEPTH = 1_000_000;

/** Name tag text size in screen pixels, whatever the camera zoom. */
const NAME_FONT_PX = 12;

/**
 * A character's sprite plus what floats over its head: a name tag and,
 * for a moment after an emote, a speech bubble. Used for every player, you included.
 */
export class Character {
  private readonly nameTag: Phaser.GameObjects.Text;
  private bubble?: Phaser.GameObjects.Image;
  private bubbleTween?: Phaser.Tweens.TweenChain;
  private look: Look;
  private facing: Facing = "down";
  private moving = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly sprite: Phaser.GameObjects.Sprite,
    look: Look,
    zoom: number,
  ) {
    this.look = look;
    this.nameTag = scene.add
      .text(0, 0, look.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${NAME_FONT_PX}px`,
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#2b2b2b",
        strokeThickness: 3,
        resolution: window.devicePixelRatio,
      })
      .setOrigin(0.5, 1)
      .setDepth(OVERHEAD_DEPTH);
    this.setZoom(zoom);
    this.showPose();
  }

  /** Cheap to call often: it only redraws what changed. */
  setLook(look: Look) {
    const characterChanged = look.character !== this.look.character;
    if (look.name !== this.look.name) this.nameTag.setText(look.name);
    this.look = look;
    if (characterChanged) this.showPose();
  }

  /** Which way the character faces, and whether it's walking (animated) or standing still. */
  setMotion(facing: Facing, moving: boolean) {
    if (facing === this.facing && moving === this.moving) return;
    this.facing = facing;
    this.moving = moving;
    this.showPose();
  }

  /** The world is zoomed in, so shrink the name tag by the same amount to keep it a steady, crisp size on screen. */
  setZoom(zoom: number) {
    this.nameTag.setScale(1 / zoom);
  }

  /** Pops up a bubble over the character's head for a couple of seconds. A new emote replaces the old one. */
  showEmote(emote: EmoteId) {
    this.bubbleTween?.stop();
    this.bubble?.destroy();
    const bubble = this.scene.add.image(0, 0, EMOTES_KEY, emoteFrame(emote)).setOrigin(0.5, 1).setDepth(OVERHEAD_DEPTH + 1);
    this.bubble = bubble;
    this.followSprite();
    const fade = 250;
    this.bubbleTween = this.scene.tweens.chain({
      targets: bubble,
      tweens: [
        { alpha: { from: 0, to: 1 }, duration: 120 },
        { alpha: 0, delay: EMOTE_SHOW_MS - 120 - fade, duration: fade },
      ],
      onComplete: () => {
        bubble.destroy();
        if (this.bubble === bubble) this.bubble = undefined;
      },
    });
  }

  /** Call every frame after moving the sprite. */
  followSprite() {
    const { x, y } = this.sprite;
    // Sorted by where the feet are, so whoever is lower on screen is drawn in front.
    this.sprite.setDepth(y);
    // Rounded to whole world pixels, so the tag and bubble don't shimmer as the character moves.
    const headTop = Math.round(y) - this.sprite.displayHeight / 2;
    this.nameTag.setPosition(Math.round(x), headTop);
    this.bubble?.setPosition(Math.round(x), headTop - Math.ceil(this.nameTag.displayHeight));
  }

  destroy() {
    this.bubbleTween?.stop();
    this.bubble?.destroy();
    this.nameTag.destroy();
    this.sprite.destroy();
  }

  private showPose() {
    const { character } = this.look;
    if (this.moving) {
      this.sprite.play(walkAnimKey(character, this.facing), true);
    } else {
      this.sprite.stop();
      this.sprite.setTexture(characterKey(character), idleFrame(this.facing));
    }
  }
}
