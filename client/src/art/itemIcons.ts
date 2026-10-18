import type Phaser from "phaser";
import { ITEMS, type ItemId } from "../../../shared/content/items";
import { BAG_KEY, BEACH_ITEMS_KEY, CROPS_KEY, FISH_KEY, HOE_KEY, WATERING_CAN_KEY } from "./assets";
import { cropItemFrame, seedPacketFrame } from "./cropFrames";

/** A 16×16 picture: a texture key, and its frame if the texture is a sheet. */
export interface Icon {
  key: string;
  frame?: number;
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
      return { key: itemId === "watering_can" ? WATERING_CAN_KEY : HOE_KEY };
    case "beach":
      return { key: BEACH_ITEMS_KEY, frame: BEACH_FRAMES[itemId] ?? 0 };
    case "fish":
      return { key: FISH_KEY };
    case "furniture":
      // No furniture art yet (Milestone 4).
      return { key: BAG_KEY };
  }
}
