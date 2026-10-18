import Phaser from "phaser";
import { TILE_SIZE } from "../../../shared/constants";
import { PARTICLE_KEY } from "../art/assets";
import type { FarmChange } from "./farmChanges";

interface Burst {
  /** Particle colours, picked at random. */
  tints: number[];
  count: number;
  speed: { min: number; max: number };
  /** Degrees; 270 is straight up. */
  angle: { min: number; max: number };
  gravityY: number;
  lifespan: number;
}

const BURSTS: Record<FarmChange, Burst> = {
  // A puff of dirt.
  dug: { tints: [0x8a5a35, 0xa97448, 0x6b4428], count: 10, speed: { min: 18, max: 42 }, angle: { min: 200, max: 340 }, gravityY: 90, lifespan: 420 },
  // A few seeds and crumbs.
  planted: { tints: [0x6b4428, 0xd9b46a], count: 6, speed: { min: 12, max: 26 }, angle: { min: 220, max: 320 }, gravityY: 80, lifespan: 320 },
  // A splash.
  watered: { tints: [0x7fd0f5, 0xbfeaff, 0x4fa9db], count: 12, speed: { min: 20, max: 46 }, angle: { min: 200, max: 340 }, gravityY: 110, lifespan: 450 },
  // A pop of leaves.
  picked: { tints: [0x74a334, 0xadbc3a, 0x4a7f4b], count: 10, speed: { min: 24, max: 50 }, angle: { min: 190, max: 350 }, gravityY: 70, lifespan: 500 },
};

/** Plays the little burst that goes with a farm tile changing, in the middle of the tile. */
export function playFarmEffect(scene: Phaser.Scene, col: number, row: number, change: FarmChange): void {
  const burst = BURSTS[change];
  const emitter = scene.add.particles(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2 + 2, PARTICLE_KEY, {
    speed: burst.speed,
    angle: burst.angle,
    gravityY: burst.gravityY,
    lifespan: burst.lifespan,
    scale: { start: 1, end: 0.5 },
    alpha: { start: 1, end: 0 },
    tint: burst.tints,
    emitting: false,
  });
  // Over the soil and crops of this tile, under anyone standing in front of it.
  emitter.setDepth(row * TILE_SIZE + TILE_SIZE / 2);
  emitter.explode(burst.count);
  scene.time.delayedCall(burst.lifespan + 100, () => emitter.destroy());
}
