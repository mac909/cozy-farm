import Phaser from "phaser";
import { stickToMove, type Vec } from "../../../shared/movement";

/** How far, in screen pixels, the thumb can travel from where it went down. */
const RADIUS = 48;

/**
 * A floating thumbstick for phones: put a thumb down anywhere and drag.
 * It only reacts to touch, so it never gets in the way on a laptop, and it ignores
 * touches that land on a button.
 */
export class Joystick {
  /** Current movement direction, length 0–1. */
  vector: Vec = { x: 0, y: 0 };
  /** Off while fishing: a touch anywhere on the screen is the reel then, not the stick. */
  private enabled = true;

  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;
  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;

  constructor(scene: Phaser.Scene) {
    this.base = scene.add.circle(0, 0, RADIUS, 0xffffff, 0.15).setStrokeStyle(2, 0xffffff, 0.35).setVisible(false);
    this.thumb = scene.add.circle(0, 0, RADIUS * 0.45, 0xffffff, 0.45).setVisible(false);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }

  /** Turns the stick on or off; turning it off lets go of it. */
  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled && this.pointerId !== null) {
      this.pointerId = null;
      this.vector = { x: 0, y: 0 };
      this.base.setVisible(false);
      this.thumb.setVisible(false);
    }
  }

  private onDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) {
    if (!this.enabled || !pointer.wasTouch || this.pointerId !== null || over.length > 0) return;
    this.pointerId = pointer.id;
    this.originX = pointer.x;
    this.originY = pointer.y;
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.thumb.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  private onMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.pointerId) return;
    const dx = pointer.x - this.originX;
    const dy = pointer.y - this.originY;
    const distance = Math.hypot(dx, dy);
    const scale = distance > RADIUS ? RADIUS / distance : 1;
    this.thumb.setPosition(this.originX + dx * scale, this.originY + dy * scale);
    this.vector = stickToMove(dx, dy, RADIUS);
  }

  private onUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.vector = { x: 0, y: 0 };
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }
}
