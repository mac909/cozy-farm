import Phaser from "phaser";
import { createPlaceholderArt } from "../art/placeholderArt";

/** Prepares art and shared state, then starts the world. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create() {
    createPlaceholderArt(this);
    // Set before any scene listens, so later updates arrive as "changedata" events.
    this.registry.set("netStatus", "connecting");
    this.scene.start("world");
  }
}
