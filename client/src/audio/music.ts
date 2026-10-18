import Phaser from "phaser";

const MUSIC_KEY = "music";
const MUSIC_URL = encodeURI("/assets/ninja-adventure/Audio/Musics/33 - Calm Village.ogg");
/** Soft: it plays the whole time. */
const MUSIC_VOLUME = 0.35;
const MUTED_KEY = "cozy-farm.muted";

/** Whether sound is off on this device. Storage can be unavailable (e.g. private browsing), so failures mean "on". */
export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_KEY, String(muted));
  } catch {
    // Not remembered on this device; sound is on again next time.
  }
}

/**
 * Loads the music in the background, so it doesn't hold up the first screen, and loops it.
 * Browsers only allow sound after the first tap or key press; Phaser waits for that by itself.
 */
export function startMusic(scene: Phaser.Scene): void {
  scene.sound.mute = loadMuted();
  scene.load.audio(MUSIC_KEY, MUSIC_URL);
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    // Missing if this browser can't play Ogg, or the file didn't load: the game just stays quiet.
    if (!scene.cache.audio.exists(MUSIC_KEY)) return;
    const play = () => scene.sound.play(MUSIC_KEY, { loop: true, volume: MUSIC_VOLUME });
    if (scene.sound.locked) scene.sound.once(Phaser.Sound.Events.UNLOCKED, play);
    else play();
  });
  scene.load.start();
}
