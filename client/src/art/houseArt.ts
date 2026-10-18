import type { HouseLook } from "../../../shared/content/houses";

/**
 * The cottages on the pack's house tileset (TilesetHouse.png), 4 × 3 tiles each with the door in
 * the second column, and a door for the Action button.
 */
export const COTTAGES: Readonly<Record<HouseLook["style"], { x: number; y: number; width: number; height: number }>> = {
  orange: { x: 0, y: 0, width: 64, height: 48 },
  sand: { x: 64, y: 0, width: 64, height: 48 },
  cream: { x: 128, y: 0, width: 64, height: 48 },
  red: { x: 192, y: 0, width: 64, height: 48 },
};

export const cottageFrame = (style: HouseLook["style"]) => `cottage:${style}`;

/** A wooden door, for the Action button at a cottage and the way out of a room. */
export const DOOR_ON_SHEET = { x: 128, y: 48, width: 16, height: 16 };
export const DOOR_FRAME = "door";
