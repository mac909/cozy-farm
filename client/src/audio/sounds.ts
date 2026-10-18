import Phaser from "phaser";

/** Short sounds from the pack's Audio folder. The music button mutes them too. */
const SOUNDS = {
  dig: { file: "Sounds/Elemental/Grass.wav", volume: 0.45 },
  plant: { file: "Sounds/Elemental/Grass.wav", volume: 0.25, rate: 1.4 },
  water: { file: "Sounds/Elemental/Water1.wav", volume: 0.35 },
  pick: { file: "Sounds/Elemental/Bubble2.wav", volume: 0.45 },
  coin: { file: "Sounds/Bonus/Coin.wav", volume: 0.4 },
  morning: { file: "Jingles/Success1.wav", volume: 0.4 },
  open: { file: "Sounds/Menu/Accept3.wav", volume: 0.25 },
  tap: { file: "Sounds/Menu/Move1.wav", volume: 0.25 },
} as const satisfies Record<string, { file: string; volume: number; rate?: number }>;

export type SoundId = keyof typeof SOUNDS;

const key = (id: SoundId) => `sound-${id}`;

/** Queues every sound. Call from a scene's preload(). Sounds that share a file load once. */
export function loadSounds(scene: Phaser.Scene): void {
  for (const id of Object.keys(SOUNDS) as SoundId[]) {
    scene.load.audio(key(id), encodeURI(`/assets/ninja-adventure/Audio/${SOUNDS[id].file}`));
  }
}

/**
 * Plays a sound once. `loudness` scales it (0.5 for something the other player did). Quiet if
 * the browser hasn't allowed sound yet (before the first tap) or the file didn't load.
 */
export function playSound(scene: Phaser.Scene, id: SoundId, loudness = 1): void {
  if (!scene.cache.audio.exists(key(id)) || scene.sound.locked) return;
  const sound: { volume: number; rate?: number } = SOUNDS[id];
  scene.sound.play(key(id), { volume: sound.volume * loudness, rate: sound.rate ?? 1 });
}
