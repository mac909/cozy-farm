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

/** Little bursts for collecting things (Milestone 5). */
export const COLLECT_BURSTS = {
  // A glint on something lying on the sand, so it catches the eye.
  glint: { tints: [0xffffff, 0xfff4c2], count: 3, speed: { min: 4, max: 10 }, angle: { min: 240, max: 300 }, gravityY: -10, lifespan: 600 },
  // Sand flicked up as a find is picked up.
  sand: { tints: [0xeecf9b, 0xd2b37d, 0xffffff], count: 8, speed: { min: 16, max: 34 }, angle: { min: 210, max: 330 }, gravityY: 80, lifespan: 380 },
  // Twigs and leaves as a branch is picked up (Milestone 6).
  twigs: { tints: [0x985c40, 0x74a334, 0xadbc3a], count: 8, speed: { min: 16, max: 34 }, angle: { min: 210, max: 330 }, gravityY: 80, lifespan: 380 },
  // The bobber landing, a bite, or a fish leaping out.
  splash: { tints: [0xffffff, 0xbfeaff, 0x71ddee], count: 10, speed: { min: 14, max: 34 }, angle: { min: 210, max: 330 }, gravityY: 90, lifespan: 420 },
  // A bug caught: a twinkle.
  twinkle: { tints: [0xffe166, 0xffffff, 0xf1ae41], count: 10, speed: { min: 14, max: 30 }, angle: { min: 0, max: 360 }, gravityY: 0, lifespan: 450 },
  // Something new in the collection book: confetti over the finder.
  celebrate: {
    tints: [0xef7d6d, 0xffe166, 0x71ddee, 0x9be564, 0xffffff],
    count: 24,
    speed: { min: 30, max: 70 },
    angle: { min: 220, max: 320 },
    gravityY: 120,
    lifespan: 900,
  },
} satisfies Record<string, Burst>;

export type CollectBurst = keyof typeof COLLECT_BURSTS;

/** Plays a collecting burst at a point in the world, at `depth` (defaults to above whatever's there). */
export function playBurst(scene: Phaser.Scene, x: number, y: number, kind: CollectBurst, depth = y + 20): void {
  emit(scene, x, y, COLLECT_BURSTS[kind], depth);
}

/** Plays the little burst that goes with a farm tile changing, in the middle of the tile. */
export function playFarmEffect(scene: Phaser.Scene, col: number, row: number, change: FarmChange): void {
  // Over the soil and crops of this tile, under anyone standing in front of it.
  emit(scene, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2 + 2, BURSTS[change], row * TILE_SIZE + TILE_SIZE / 2);
}

function emit(scene: Phaser.Scene, x: number, y: number, burst: Burst, depth: number): void {
  const emitter = scene.add.particles(x, y, PARTICLE_KEY, {
    speed: burst.speed,
    angle: burst.angle,
    gravityY: burst.gravityY,
    lifespan: burst.lifespan,
    scale: { start: 1, end: 0.5 },
    alpha: { start: 1, end: 0 },
    tint: burst.tints,
    emitting: false,
  });
  emitter.setDepth(depth);
  emitter.explode(burst.count);
  scene.time.delayedCall(burst.lifespan + 100, () => emitter.destroy());
}
