import Phaser from "phaser";
import { createAnimations, loadArt } from "../art/assets";
import { loadSounds } from "../audio/sounds";

/** Loads the art and prepares shared state, then starts the world. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    loadArt(this);
    loadSounds(this);
  }

  create() {
    createAnimations(this);
    // Set before any scene listens, so later updates arrive as "changedata" events.
    this.registry.set("netStatus", "connecting");
    this.registry.set("clock", null);
    this.registry.set("bag", null);
    this.registry.set("selectedSlot", 0);
    this.registry.set("inBed", false);
    this.registry.set("sleepers", null);
    this.registry.set("coins", null);
    this.scene.start("world");
  }
}
