import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { UIScene } from "./scenes/UIScene";
import { WorldScene } from "./scenes/WorldScene";

declare global {
  interface Window {
    /** The running game, exposed in dev so it can be inspected from the console. */
    game?: Phaser.Game;
  }
}

const parent = document.getElementById("game")!;

/** Phaser's WebGL renderer crashes if it boots at 0×0 (e.g. in a tab opened in the background), so wait for a real size. */
function whenSized(el: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const hasSize = () => el.clientWidth > 0 && el.clientHeight > 0;
    if (hasSize()) return resolve();
    const observer = new ResizeObserver(() => {
      if (!hasSize()) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(el);
  });
}

void whenSized(parent).then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#2b4a5e",
    pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
    physics: { default: "arcade", arcade: { debug: false } },
    input: { activePointers: 3 },
    // Dev only: ?loop=timer runs the game on timers instead of animation frames, so it keeps going
    // in a browser view that isn't on screen (as when Claude checks a change with no one watching).
    fps: { forceSetTimeOut: import.meta.env.DEV && new URLSearchParams(location.search).get("loop") === "timer" },
    // Order matters: later scenes draw on top, so the UI sits above the world.
    scene: [BootScene, WorldScene, UIScene],
  });
  if (import.meta.env.DEV) window.game = game;
});
