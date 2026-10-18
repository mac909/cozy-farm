import type { FurnitureId } from "./furniture";

/**
 * How each cottage on the map looks and what's waiting inside when someone moves in. Keyed by the
 * cottage's name in the Tiled map ("house1"). A cottage added in Tiled without a line here gets
 * DEFAULT_HOUSE.
 */
export interface HouseLook {
  /** Which of the pack's cottages it is (client/src/art/houseArt.ts). */
  style: "orange" | "sand" | "cream" | "red";
  /** The door's column in the building's bottom row, counting from 0 on the left. */
  door: number;
  /** The bed waiting inside on moving in. */
  bed: FurnitureId;
}

export const DEFAULT_HOUSE: HouseLook = { style: "orange", door: 1, bed: "red_bed" };

export const HOUSES: Readonly<Record<string, HouseLook>> = {
  house1: { style: "orange", door: 1, bed: "red_bed" },
  house2: { style: "cream", door: 1, bed: "blue_bed" },
};

export function houseLook(houseId: string): HouseLook {
  return Object.hasOwn(HOUSES, houseId) ? HOUSES[houseId] : DEFAULT_HOUSE;
}

/**
 * What's in a cottage the moment you move in, in tiles from the room's top-left floor tile: the
 * bed in the corner, and a fern by it.
 */
export function moveInFurniture(houseId: string): { itemId: FurnitureId; col: number; row: number; turn: number }[] {
  return [
    { itemId: houseLook(houseId).bed, col: 0, row: 0, turn: 0 },
    { itemId: "potted_fern", col: 1, row: 0, turn: 0 },
  ];
}
