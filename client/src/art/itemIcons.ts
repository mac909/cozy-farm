import type Phaser from "phaser";
import { BUG_IDS } from "../../../shared/content/bugs";
import { FISH_IDS } from "../../../shared/content/fish";
import { ITEMS, type ItemId } from "../../../shared/content/items";
import {
  BEACH_ITEMS_KEY,
  BUG_COLUMNS,
  BUG_ICON_COLUMN,
  BUGS_KEY,
  CROPS_KEY,
  FISH_ICONS_KEY,
  FISHING_FRAME,
  FISHING_KEY,
  furnitureIconKey,
  HOE_KEY,
  MATERIAL_FRAME,
  MATERIALS_KEY,
  WATERING_CAN_KEY,
} from "./assets";
import { cropItemFrame, seedPacketFrame } from "./cropFrames";

/** A picture: a texture key, its frame if the texture is a sheet, and its size (16 unless it says). */
export interface Icon {
  key: string;
  frame?: number;
  /** Width and height in pixels: 16 for most items, 32 for furniture. */
  size?: number;
}

/** How much to scale an icon so it shows `pixels` across. */
export function iconScale(icon: Icon, pixels: number): number {
  return pixels / (icon.size ?? 16);
}

/** Frames in beach-items.png for the beach finds in items.ts. */
const BEACH_FRAMES: Partial<Record<ItemId, number>> = {
  scallop_shell: 0,
  cowrie_shell: 1,
  conch_shell: 2,
  starfish: 4,
  sea_glass: 5,
};

const urls = new Map<string, string>();

/**
 * An image URL of a texture frame, for the HTML panels (bag, crate, seed stand). Made once per
 * frame and kept. Phaser's getBase64 needs the art loaded, so call it from a running scene.
 */
export function iconUrl(textures: Phaser.Textures.TextureManager, icon: Icon): string {
  const id = `${icon.key}#${icon.frame ?? ""}`;
  let url = urls.get(id);
  if (url === undefined) {
    url = textures.getBase64(icon.key, icon.frame);
    urls.set(id, url);
  }
  return url;
}

/** The picture for an item in the hotbar, the bag and the Action button. */
export function itemIcon(itemId: ItemId): Icon {
  const item = ITEMS[itemId];
  switch (item.category) {
    case "seed":
      return { key: CROPS_KEY, frame: seedPacketFrame(item.cropId) };
    case "crop":
      return { key: CROPS_KEY, frame: cropItemFrame(item.cropId) };
    case "tool":
      if (itemId === "fishing_rod") return { key: FISHING_KEY, frame: FISHING_FRAME.rod };
      return { key: itemId === "watering_can" ? WATERING_CAN_KEY : HOE_KEY };
    case "beach":
      return { key: BEACH_ITEMS_KEY, frame: BEACH_FRAMES[itemId] ?? 0 };
    case "material":
      return { key: MATERIALS_KEY, frame: MATERIAL_FRAME[itemId as keyof typeof MATERIAL_FRAME] ?? 0 };
    case "fish":
      return { key: FISH_ICONS_KEY, frame: FISH_IDS.indexOf(item.fishId) };
    case "bug":
      return { key: BUGS_KEY, frame: BUG_IDS.indexOf(item.bugId) * BUG_COLUMNS + BUG_ICON_COLUMN };
    case "furniture":
      return { key: furnitureIconKey(item.furnitureId), size: 32 };
  }
}
