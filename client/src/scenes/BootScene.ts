import Phaser from "phaser";
import { createAnimations, loadArt } from "../art/assets";

/** Loads the art and prepares shared state, then starts the world. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    loadArt(this);
  }

  create() {
    createAnimations(this);
    // Set before any scene listens, so later updates arrive as "changedata" events.
    this.registry.set("netStatus", "connecting");
    this.scene.start("world");
  }
}
