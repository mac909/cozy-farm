import Phaser from "phaser";
import { CHARACTERS, type CharacterId } from "../../../shared/content/characters";
import { EMOTES, type EmoteId } from "../../../shared/content/emotes";
import type { Facing } from "../../../shared/movement";
import { tilesetImageUrl } from "../../../shared/world/tiledMap";
import { VILLAGE_TILED } from "../../../shared/world/villageMap";

/** Art lives in client/public/assets/: the Ninja Adventure pack, plus our own sprites in custom/. */
const PACK = "/assets/ninja-adventure/";
const CUSTOM = "/assets/custom/";

export const VILLAGE_KEY = "village";
export const tilesetKey = (name: string) => `tileset-${name}`;
export const characterKey = (id: CharacterId) => `character-${id}`;
/** Speech bubbles, one frame per emote in EMOTES order. */
export const EMOTES_KEY = "emotes";
/** HUD icons: music on, music off. */
export const UI_ICONS_KEY = "ui-icons";
export const UI_ICON = { musicOn: 0, musicOff: 1 } as const;
export const SHIPPING_CRATE_KEY = "shipping-crate";
export const RIPPLES_KEY = "ripples";
export const RIPPLE_ANIM = "ripple";

export const emoteFrame = (emote: EmoteId) => EMOTES.findIndex((e) => e.id === emote);

/**
 * Character sheets are 4 columns (facing down, up, left, right) by 7 rows of animations.
 * Rows 0–3 are the walk cycle; row 0 alone is standing still.
 */
const SHEET_COLUMNS = 4;
const FACING_COLUMN: Record<Facing, number> = { down: 0, up: 1, left: 2, right: 3 };
const WALK_ROWS = [0, 1, 2, 3];
const WALK_FPS = 8;

export const idleFrame = (facing: Facing) => FACING_COLUMN[facing];
export const walkFrames = (facing: Facing) => WALK_ROWS.map((row) => row * SHEET_COLUMNS + FACING_COLUMN[facing]);
export const walkAnimKey = (id: CharacterId, facing: Facing) => `${characterKey(id)}-walk-${facing}`;

/** Queues every image the game needs. Call from a scene's preload(). */
export function loadArt(scene: Phaser.Scene): void {
  const { load } = scene;
  load.tilemapTiledJSON(VILLAGE_KEY, VILLAGE_TILED);
  for (const tileset of VILLAGE_TILED.tilesets) {
    if (tileset.image) load.image(tilesetKey(tileset.name), tilesetImageUrl(tileset.image));
  }
  for (const { id, folder } of CHARACTERS) {
    load.spritesheet(characterKey(id), `${PACK}Actor/Character/${folder}/SpriteSheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
  }
  load.spritesheet(EMOTES_KEY, `${CUSTOM}emotes.png`, { frameWidth: 14, frameHeight: 13 });
  load.spritesheet(UI_ICONS_KEY, `${CUSTOM}ui-icons.png`, { frameWidth: 16, frameHeight: 16 });
  load.spritesheet(SHIPPING_CRATE_KEY, `${CUSTOM}shipping-crate.png`, { frameWidth: 32, frameHeight: 32 });
  load.spritesheet(RIPPLES_KEY, encodeURI(`${PACK}Backgrounds/Animated/Water Ripples/SpriteSheet16x16.png`), {
    frameWidth: 16,
    frameHeight: 16,
  });
}

/** Sets up the animations, once the art has loaded. */
export function createAnimations(scene: Phaser.Scene): void {
  for (const { id } of CHARACTERS) {
    for (const facing of Object.keys(FACING_COLUMN) as Facing[]) {
      scene.anims.create({
        key: walkAnimKey(id, facing),
        frames: walkFrames(facing).map((frame) => ({ key: characterKey(id), frame })),
        frameRate: WALK_FPS,
        repeat: -1,
      });
    }
  }
  scene.anims.create({ key: RIPPLE_ANIM, frames: scene.anims.generateFrameNumbers(RIPPLES_KEY), frameRate: 4, repeat: -1 });
}
