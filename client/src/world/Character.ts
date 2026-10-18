import Phaser from "phaser";
import { EMOTE_SHOW_MS } from "../../../shared/constants";
import type { EmoteId } from "../../../shared/content/emotes";
import type { Facing } from "../../../shared/movement";
import type { Look } from "../../../shared/player";
import { characterKey, EMOTES_KEY, emoteFrame, idleFrame, swingFrame, walkAnimKey } from "../art/assets";

/** Name tags and bubbles draw above every character, and above tree tops. */
const OVERHEAD_DEPTH = 1_000_000;

/** Name tag text size in screen pixels, whatever the camera zoom. */
const NAME_FONT_PX = 12;

/** How long the tool-swing pose shows, in milliseconds. */
const SWING_MS = 250;

/** How long a hint's speech bubble stays, in milliseconds. */
const HINT_SHOW_MS = 2500;

/**
 * A character's sprite plus what floats over its head: a name tag and,
 * for a moment after an emote, a speech bubble. Used for every player, you included.
 */
export class Character {
  private readonly nameTag: Phaser.GameObjects.Text;
  private bubble?: Phaser.GameObjects.Image;
  private bubbleTween?: Phaser.Tweens.TweenChain;
  private hint?: Phaser.GameObjects.Container;
  private hintTween?: Phaser.Tweens.TweenChain;
  private zoom = 1;
  private swingTimer?: Phaser.Time.TimerEvent;
  private look: Look;
  private facing: Facing = "down";
  private moving = false;

  /**
   * `texture` is a sheet that isn't a player's character (Marlow, the pack's OldMan3): he only
   * stands, so it has no walk.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    readonly sprite: Phaser.GameObjects.Sprite,
    look: Look,
    zoom: number,
    private readonly texture?: string,
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
    if (this.swingTimer) {
      // Walking off cuts the swing short; standing still lets it finish.
      if (!moving) return;
      this.swingTimer.remove();
      this.swingTimer = undefined;
    } else if (facing === this.facing && moving === this.moving) {
      return;
    }
    this.facing = facing;
    this.moving = moving;
    this.showPose();
  }

  /** Swings the tool for a moment (the pack's attack pose), facing `facing`. */
  swing(facing: Facing) {
    this.facing = facing;
    this.moving = false;
    this.swingTimer?.remove();
    this.sprite.stop();
    this.sprite.setTexture(this.texture ?? characterKey(this.look.character), swingFrame(facing));
    this.swingTimer = this.scene.time.delayedCall(SWING_MS, () => {
      this.swingTimer = undefined;
      this.showPose();
    });
  }

  /** Hides the character and everything over its head (asleep in the tent), or shows them again. */
  setHidden(hidden: boolean) {
    if (this.sprite.visible === !hidden) return;
    this.sprite.setVisible(!hidden);
    this.nameTag.setVisible(!hidden);
    this.bubble?.setVisible(!hidden);
    this.hint?.setVisible(!hidden);
  }

  get hidden(): boolean {
    return !this.sprite.visible;
  }

  /** The world is zoomed in, so shrink the name tag by the same amount to keep it a steady, crisp size on screen. */
  setZoom(zoom: number) {
    this.zoom = zoom;
    this.nameTag.setScale(1 / zoom);
    this.hint?.setScale(1 / zoom);
  }

  /**
   * A speech bubble with a few words over the character's head for a couple of seconds: the
   * hints that teach the game. A new hint replaces the old one.
   */
  showHint(text: string) {
    if (this.hidden) return;
    this.hintTween?.stop();
    this.hint?.destroy();
    const label = this.scene.add
      .text(0, 0, text, {
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#3a3024",
        align: "center",
        wordWrap: { width: 220 },
        resolution: window.devicePixelRatio,
      })
      .setOrigin(0.5, 1);
    const width = label.width + 18;
    const height = label.height + 8;
    const box = this.scene.add.graphics();
    box.fillStyle(0xffffff, 1).lineStyle(2, 0x3a3024, 1);
    box.fillRoundedRect(-width / 2, -height - 6, width, height, 9).strokeRoundedRect(-width / 2, -height - 6, width, height, 9);
    box.fillTriangle(-6, -7, 6, -7, 0, 0).lineBetween(-6, -6, 0, 0).lineBetween(6, -6, 0, 0);
    label.setPosition(0, -10);
    const hint = this.scene.add.container(0, 0, [box, label]).setDepth(OVERHEAD_DEPTH + 2).setScale(1 / this.zoom);
    this.hint = hint;
    this.followSprite();
    this.hintTween = this.scene.tweens.chain({
      targets: hint,
      tweens: [
        { alpha: { from: 0, to: 1 }, duration: 120 },
        { alpha: 0, delay: HINT_SHOW_MS - 120 - 250, duration: 250 },
      ],
      onComplete: () => {
        hint.destroy();
        if (this.hint === hint) this.hint = undefined;
      },
    });
  }

  /** Words that rise from the character's head and fade, like "+1 Radish". */
  floatText(text: string) {
    const label = this.scene.add
      .text(Math.round(this.sprite.x), Math.round(this.sprite.y) - this.sprite.displayHeight, text, {
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#2b2b2b",
        strokeThickness: 3,
        resolution: window.devicePixelRatio,
      })
      .setOrigin(0.5, 1)
      .setDepth(OVERHEAD_DEPTH + 3)
      .setScale(1 / this.zoom);
    this.scene.tweens.add({
      targets: label,
      y: label.y - 14,
      alpha: { from: 1, to: 0 },
      delay: 400,
      duration: 700,
      onComplete: () => label.destroy(),
    });
  }

  /** Pops up a bubble over the character's head for a couple of seconds. A new emote replaces the old one. */
  showEmote(emote: EmoteId) {
    this.showBubble(EMOTES_KEY, emoteFrame(emote));
  }

  /** Pops up any bubble picture over the character's head for `ms` (the "!" of a bite, say). */
  showBubble(key: string, frame?: number, ms = EMOTE_SHOW_MS) {
    if (this.hidden) return;
    this.bubbleTween?.stop();
    this.bubble?.destroy();
    const bubble = this.scene.add.image(0, 0, key, frame).setOrigin(0.5, 1).setDepth(OVERHEAD_DEPTH + 1);
    this.bubble = bubble;
    this.followSprite();
    const fade = 250;
    this.bubbleTween = this.scene.tweens.chain({
      targets: bubble,
      tweens: [
        { alpha: { from: 0, to: 1 }, duration: 120 },
        { alpha: 0, delay: Math.max(0, ms - 120 - fade), duration: fade },
      ],
      onComplete: () => {
        bubble.destroy();
        if (this.bubble === bubble) this.bubble = undefined;
      },
    });
  }

  /** Takes down the bubble over the head now, if there is one. */
  hideBubble() {
    this.bubbleTween?.stop();
    this.bubble?.destroy();
    this.bubble = undefined;
  }

  /** Which way the character is facing. */
  get facingNow(): Facing {
    return this.facing;
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
    this.hint?.setPosition(Math.round(x), headTop - Math.ceil(this.nameTag.displayHeight));
  }

  destroy() {
    this.swingTimer?.remove();
    this.bubbleTween?.stop();
    this.bubble?.destroy();
    this.hintTween?.stop();
    this.hint?.destroy();
    this.nameTag.destroy();
    this.sprite.destroy();
  }

  private showPose() {
    const { character } = this.look;
    if (this.moving && !this.texture) {
      this.sprite.play(walkAnimKey(character, this.facing), true);
    } else {
      this.sprite.stop();
      this.sprite.setTexture(this.texture ?? characterKey(character), idleFrame(this.facing));
    }
  }
}
