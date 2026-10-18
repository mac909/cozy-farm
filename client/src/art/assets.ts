import Phaser from "phaser";
import { BUGS, BUG_IDS, type BugId } from "../../../shared/content/bugs";
import { CHARACTERS, type CharacterId } from "../../../shared/content/characters";
import { EMOTES, type EmoteId } from "../../../shared/content/emotes";
import { FURNITURE_IDS, type FurnitureId } from "../../../shared/content/furniture";
import type { Facing } from "../../../shared/movement";
import { tilesetImageUrl } from "../../../shared/world/tiledMap";
import { VILLAGE_TILED } from "../../../shared/world/villageMap";
import { allPieceArt, FURNITURE_ART, FURNITURE_SHEETS, pieceFrame, type SheetId } from "./furnitureArt";
import { COTTAGES, cottageFrame, DOOR_FRAME, DOOR_ON_SHEET } from "./houseArt";

/** Art lives in client/public/assets/: the Ninja Adventure pack, plus our own sprites in custom/. */
const PACK = "/assets/ninja-adventure/";
const CUSTOM = "/assets/custom/";

export const VILLAGE_KEY = "village";
export const tilesetKey = (name: string) => `tileset-${name}`;
export const characterKey = (id: CharacterId) => `character-${id}`;
/** Speech bubbles, one frame per emote in EMOTES order. */
export const EMOTES_KEY = "emotes";
/** HUD icons: music on, music off, arrange, turn, done, book, stop. */
export const UI_ICONS_KEY = "ui-icons";
export const UI_ICON = { musicOn: 0, musicOff: 1, arrange: 2, turn: 3, done: 4, book: 5, stop: 6 } as const;
export const SHIPPING_CRATE_KEY = "shipping-crate";
/** Our seed stand, 32×32, drawn at the map's seedStand spot. */
export const SEED_STAND_KEY = "seed-stand";
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
/** Golden crops (Milestone 7): each crop's harvested item in gold, one 16×16 frame each in CROPS order. */
export const GOLDEN_CROPS_KEY = "golden-crops";
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
/** Our fish, one 16×16 icon each in FISH order. */
export const FISH_ICONS_KEY = "fish-icons";
/** Our bugs: one row per bug in BUGS order, four flutter frames then the icon. */
export const BUGS_KEY = "bugs";
export const BUG_COLUMNS = 5;
export const BUG_ICON_COLUMN = 4;
/** Each bug's flutter: its row's first four frames. */
export const bugAnimKey = (id: BugId) => `bug-${id}`;
/** The fishing rod, the bobber and the bobber dipped under. */
export const FISHING_KEY = "fishing";
export const FISHING_FRAME = { rod: 0, bobber: 1, dipped: 2 } as const;
/** The pack's red "!" bubble, for a bite. */
export const BITE_KEY = "bite";
/** A small white dot for dirt puffs and splashes, drawn in code at boot. */
export const PARTICLE_KEY = "particle";
/** The general store: the pack's green-roofed shop, a named frame on the house tileset. */
export const STORE_FRAME = "store";
/** Our building materials (Milestone 6): one 16×16 icon each, frames named in MATERIAL_FRAME. */
export const MATERIALS_KEY = "materials";
export const MATERIAL_FRAME = { driftwood: 0, branch: 1 } as const;
/** Our lighthouse, 48 × 96: dark, scaffolded, mended, lit. */
export const LIGHTHOUSE_KEY = "lighthouse";
export const LIGHTHOUSE_FRAME = { dark: 0, scaffold: 1, ready: 2, lit: 3 } as const;
/** Our Village Board, 32 × 32: frame n has n notes pinned on. */
export const BOARD_KEY = "village-board";
/** Marlow: the pack's OldMan3, and his face. */
export const KEEPER_KEY = "keeper";
export const KEEPER_FACE_KEY = "keeper-face";
/** Our porch (Milestone 7): the decking, the bench and the lantern, dark and lit, as named frames (PORCH_FRAME). */
export const PORCH_KEY = "porch";
export const PORCH_FRAME = { deck: "deck", bench: "bench", lanternOff: "lanternOff", lanternOn: "lanternOn" } as const;
/** Where each porch piece is on porch.png (tools/sprites/porch.ts). */
const PORCH_ON_SHEET: Readonly<Record<keyof typeof PORCH_FRAME, { x: number; y: number; w: number; h: number }>> = {
  deck: { x: 0, y: 0, w: 64, h: 16 },
  bench: { x: 0, y: 16, w: 32, h: 32 },
  lanternOff: { x: 32, y: 16, w: 16, h: 32 },
  lanternOn: { x: 48, y: 16, w: 16, h: 32 },
};
/** Badge pictures made at boot from bigger art (Milestone 7): the lit lighthouse's top, a little cottage, the porch. 32 × 32. */
export const BADGE_LIGHTHOUSE_KEY = "badge-lighthouse";
export const BADGE_COTTAGE_KEY = "badge-cottage";
export const BADGE_PORCH_KEY = "badge-porch";
/** Each character's face (the pack's facesets, 38 × 38), for the board's helpers. */
export const faceKey = (id: CharacterId) => `face-${id}`;
/** Furniture icons for the hotbar, the bag and the store: 32×32, made at boot from each piece's picture. */
export const furnitureIconKey = (id: FurnitureId) => `icon-${id}`;

/** The texture a furniture sheet is loaded as: the map's own tileset texture, or its own. */
export function sheetKey(sheet: SheetId): string {
  const { mapTileset } = FURNITURE_SHEETS[sheet];
  return mapTileset ? tilesetKey(mapTileset) : `furniture-${sheet}`;
}

/** The house tileset (the store and the cottages are cut from it). */
export const HOUSE_SHEET_KEY = tilesetKey("TilesetHouse");

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
    load.image(faceKey(id), `${PACK}Actor/Character/${folder}/Faceset.png`);
  }
  load.spritesheet(KEEPER_KEY, `${PACK}Actor/Character/OldMan3/SpriteSheet.png`, { frameWidth: 16, frameHeight: 16 });
  load.image(KEEPER_FACE_KEY, `${PACK}Actor/Character/OldMan3/Faceset.png`);
  load.spritesheet(MATERIALS_KEY, `${CUSTOM}materials.png`, { frameWidth: 16, frameHeight: 16 });
  load.spritesheet(LIGHTHOUSE_KEY, `${CUSTOM}lighthouse.png`, { frameWidth: 48, frameHeight: 96 });
  load.spritesheet(BOARD_KEY, `${CUSTOM}village-board.png`, { frameWidth: 32, frameHeight: 32 });
  load.image(PORCH_KEY, `${CUSTOM}porch.png`);
  load.spritesheet(EMOTES_KEY, `${CUSTOM}emotes.png`, { frameWidth: 14, frameHeight: 13 });
  load.spritesheet(UI_ICONS_KEY, `${CUSTOM}ui-icons.png`, { frameWidth: 16, frameHeight: 16 });
  load.spritesheet(SHIPPING_CRATE_KEY, `${CUSTOM}shipping-crate.png`, { frameWidth: 32, frameHeight: 32 });
  load.image(SEED_STAND_KEY, `${CUSTOM}seed-stand.png`);
  load.spritesheet(RIPPLES_KEY, encodeURI(`${PACK}Backgrounds/Animated/Water Ripples/SpriteSheet16x16.png`), {
    frameWidth: 16,
    frameHeight: 16,
  });
  load.image(SUN_KEY, encodeURI(`${PACK}Ui/Skill Icon/Meteo/Sun.png`));
  load.image(MOON_KEY, encodeURI(`${PACK}Ui/Skill Icon/Meteo/Moon.png`));
  load.image(ZZZ_KEY, `${PACK}Ui/Emote/emote28.png`);
  load.image(CAMP_KEY, `${PACK}Backgrounds/Tilesets/tileset_camp.png`);
  load.spritesheet(CROPS_KEY, `${CUSTOM}crops.png`, { frameWidth: 16, frameHeight: 16 });
  load.spritesheet(GOLDEN_CROPS_KEY, `${CUSTOM}golden-crops.png`, { frameWidth: 16, frameHeight: 16 });
  load.spritesheet(SOIL_KEY, `${CUSTOM}soil.png`, { frameWidth: 16, frameHeight: 16 });
  load.spritesheet(BEACH_ITEMS_KEY, `${CUSTOM}beach-items.png`, { frameWidth: 16, frameHeight: 16 });
  load.spritesheet(FISH_ICONS_KEY, `${CUSTOM}fish.png`, { frameWidth: 16, frameHeight: 16 });
  load.spritesheet(BUGS_KEY, `${CUSTOM}bugs.png`, { frameWidth: 16, frameHeight: 16 });
  load.spritesheet(FISHING_KEY, `${CUSTOM}fishing.png`, { frameWidth: 16, frameHeight: 16 });
  load.image(BITE_KEY, `${PACK}Ui/Emote/emote21.png`);
  load.image(HOE_KEY, `${PACK}Items/Tool/Hoe.png`);
  load.image(WATERING_CAN_KEY, `${PACK}Items/Tool/WateringCan.png`);
  load.image(BAG_KEY, `${PACK}Items/Object/Bag.png`);
  load.image(FISH_KEY, `${PACK}Items/Food/Fish.png`);
  load.image(COIN_KEY, `${PACK}Items/Treasure/GoldCoin.png`);
  for (const [sheet, { url }] of Object.entries(FURNITURE_SHEETS)) {
    if (url) load.image(sheetKey(sheet as SheetId), encodeURI(url));
  }
}

/** Where the store is on the pack's house tileset: the green-roofed shop, 4 × 3 tiles. */
const STORE_ON_SHEET = { x: 304, y: 0, width: 64, height: 48 };

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

  const houseSheet = scene.textures.get(HOUSE_SHEET_KEY);
  houseSheet.add(STORE_FRAME, 0, STORE_ON_SHEET.x, STORE_ON_SHEET.y, STORE_ON_SHEET.width, STORE_ON_SHEET.height);
  for (const [style, { x: cx, y: cy, width: cw, height: ch }] of Object.entries(COTTAGES)) {
    houseSheet.add(cottageFrame(style as keyof typeof COTTAGES), 0, cx, cy, cw, ch);
  }
  houseSheet.add(DOOR_FRAME, 0, DOOR_ON_SHEET.x, DOOR_ON_SHEET.y, DOOR_ON_SHEET.width, DOOR_ON_SHEET.height);
  for (const { id, turn, art } of allPieceArt()) {
    scene.textures.get(sheetKey(art.sheet)).add(pieceFrame(id, turn), 0, art.x, art.y, art.w, art.h);
  }
  for (const id of FURNITURE_IDS) furnitureIcon(scene, id);

  const porch = scene.textures.get(PORCH_KEY);
  for (const [name, r] of Object.entries(PORCH_ON_SHEET)) porch.add(name, 0, r.x, r.y, r.w, r.h);
  badgePictures(scene);
}

/**
 * Pictures for badges and cards that the game draws bigger elsewhere (Milestone 7), each 32 × 32:
 * the top of the lit lighthouse, the orange cottage at half size, and the porch's bench.
 */
function badgePictures(scene: Phaser.Scene) {
  const draw = (key: string, paint: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = scene.textures.createCanvas(key, 32, 32);
    if (!canvas) return;
    canvas.context.imageSmoothingEnabled = false;
    paint(canvas.context);
    canvas.refresh();
  };
  const source = (key: string) => scene.textures.get(key).getSourceImage() as HTMLImageElement;
  // The lit lamp room: the top of the lit frame (the fourth, 48 wide).
  draw(BADGE_LIGHTHOUSE_KEY, (ctx) => ctx.drawImage(source(LIGHTHOUSE_KEY), 3 * 48 + 8, 0, 32, 32, 0, 0, 32, 32));
  const cottage = COTTAGES.orange;
  draw(BADGE_COTTAGE_KEY, (ctx) => ctx.drawImage(source(HOUSE_SHEET_KEY), cottage.x, cottage.y, cottage.width, cottage.height, 0, 6, 32, 24));
  draw(BADGE_PORCH_KEY, (ctx) => {
    const sheet = source(PORCH_KEY);
    const { bench } = PORCH_ON_SHEET;
    ctx.drawImage(sheet, bench.x, bench.y + 12, bench.w, bench.h - 12, 0, 8, bench.w, bench.h - 12);
  });
}

/**
 * A 32×32 icon of a piece, drawn from its first picture: doubled if it's one tile, as it is if it
 * fits, otherwise shrunk to fit. Centred, standing on the bottom.
 */
function furnitureIcon(scene: Phaser.Scene, id: FurnitureId) {
  const art = FURNITURE_ART[id][0];
  const source = scene.textures.get(sheetKey(art.sheet)).getSourceImage() as HTMLImageElement;
  const canvas = scene.textures.createCanvas(furnitureIconKey(id), 32, 32);
  if (!canvas) return;
  const scale = art.w <= 16 && art.h <= 16 ? 2 : Math.min(1, 32 / Math.max(art.w, art.h));
  const w = Math.round(art.w * scale);
  const h = Math.round(art.h * scale);
  const ctx = canvas.context;
  ctx.imageSmoothingEnabled = false;
  if (art.flipX) {
    ctx.translate(32, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, art.x, art.y, art.w, art.h, Math.floor((32 - w) / 2), 32 - h - Math.floor((32 - h) / 4), w, h);
  canvas.refresh();
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
  BUG_IDS.forEach((id, row) => {
    const first = row * BUG_COLUMNS;
    scene.anims.create({
      key: bugAnimKey(id),
      frames: scene.anims.generateFrameNumbers(BUGS_KEY, { start: first, end: first + 3 }),
      // Fireflies drift and blink slowly; butterflies flap.
      frameRate: BUGS[id].glows ? 4 : 10,
      repeat: -1,
    });
  });
}
