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
/** The clock card's sun and moon. */
export const SUN_KEY = "sun";
export const MOON_KEY = "moon";
/** The pack's "Zzz" bubble, same size as the emote bubbles. */
export const ZZZ_KEY = "zzz";
/** The pack's camp props; the tent is the named frame TENT_FRAME. */
export const CAMP_KEY = "camp";
export const TENT_FRAME = "tent";
/** Our crops sheet: growth stages, harvested item and seed packet per crop (see manifest.json). */
export const CROPS_KEY = "crops";
/** Our dug soil: frame = neighbour mask (N1 E2 S4 W8), +16 when watered. */
export const SOIL_KEY = "soil";
/** The outline's corner, drawn in code at boot. */
export const OUTLINE_KEY = "outline";
/** Item icons that are single images. */
export const HOE_KEY = "item-hoe";
export const WATERING_CAN_KEY = "item-watering-can";
export const BAG_KEY = "item-bag";
export const FISH_KEY = "item-fish";
/** A 7×7 gold coin, for the wallet. */
export const COIN_KEY = "coin";
export const BEACH_ITEMS_KEY = "beach-items";
/** A small white dot for dirt puffs and splashes, drawn in code at boot. */
export const PARTICLE_KEY = "particle";

/** The pose rows of a character sheet after the walk cycle: row 4 swings a tool. */
const SWING_ROW = 4;

export const emoteFrame = (emote: EmoteId) => EMOTES.findIndex((e) => e.id === emote);
export const swingFrame = (facing: Facing) => SWING_ROW * SHEET_COLUMNS + FACING_COLUMN[facing];

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
  load.image(SUN_KEY, encodeURI(`${PACK}Ui/Skill Icon/Meteo/Sun.png`));
  load.image(MOON_KEY, encodeURI(`${PACK}Ui/Skill Icon/Meteo/Moon.png`));
  load.image(ZZZ_KEY, `${PACK}Ui/Emote/emote28.png`);
  load.image(CAMP_KEY, `${PACK}Backgrounds/Tilesets/tileset_camp.png`);
  load.spritesheet(CROPS_KEY, `${CUSTOM}crops.png`, { frameWidth: 16, frameHeight: 16 });
  load.spritesheet(SOIL_KEY, `${CUSTOM}soil.png`, { frameWidth: 16, frameHeight: 16 });
  load.spritesheet(BEACH_ITEMS_KEY, `${CUSTOM}beach-items.png`, { frameWidth: 16, frameHeight: 16 });
  load.image(HOE_KEY, `${PACK}Items/Tool/Hoe.png`);
  load.image(WATERING_CAN_KEY, `${PACK}Items/Tool/WateringCan.png`);
  load.image(BAG_KEY, `${PACK}Items/Object/Bag.png`);
  load.image(FISH_KEY, `${PACK}Items/Food/Fish.png`);
  load.image(COIN_KEY, `${PACK}Items/Treasure/GoldCoin.png`);
}

/** Where the tent is on the pack's camp sheet: the plain one, 3 × 3 tiles. */
const TENT_ON_SHEET = { x: 64, y: 0, width: 48, height: 48 };

/** Frames cut from bigger sheets, and the few tiny textures drawn in code. Call once the art has loaded. */
function createTextures(scene: Phaser.Scene): void {
  const { x, y, width, height } = TENT_ON_SHEET;
  scene.textures.get(CAMP_KEY).add(TENT_FRAME, 0, x, y, width, height);

  // The outline's corner: an L of white pixels with a dark edge, 16×16, for the top-left corner.
  // The other three corners are the same image flipped.
  const corner = scene.make.graphics({}, false);
  corner.fillStyle(0x000000, 0.55).fillRect(0, 0, 6, 2).fillRect(0, 0, 2, 6);
  corner.fillStyle(0xffffff, 1).fillRect(0, 0, 5, 1).fillRect(0, 0, 1, 5);
  corner.generateTexture(OUTLINE_KEY, 16, 16);
  corner.destroy();

  const dot = scene.make.graphics({}, false);
  dot.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
  dot.generateTexture(PARTICLE_KEY, 2, 2);
  dot.destroy();
}

/** Sets up the animations and extra frames, once the art has loaded. */
export function createAnimations(scene: Phaser.Scene): void {
  createTextures(scene);
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
