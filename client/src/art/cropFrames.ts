import { CROPS, type CropId } from "../../../shared/content/crops";

/**
 * Frames in our crops.png: one row per crop, in CROPS order, with this many columns: the growth
 * stages from 0, the harvested item in ITEM_COLUMN and the seed packet in PACKET_COLUMN
 * (see tools/sprites/render.ts and manifest.json).
 */
const CROP_SHEET_COLUMNS = 7;
const ITEM_COLUMN = 5;
const PACKET_COLUMN = 6;
const CROP_ROWS = Object.keys(CROPS) as CropId[];

const cropRow = (cropId: CropId) => CROP_ROWS.indexOf(cropId) * CROP_SHEET_COLUMNS;

export const cropStageFrame = (cropId: CropId, stage: number) => cropRow(cropId) + stage;
export const cropItemFrame = (cropId: CropId) => cropRow(cropId) + ITEM_COLUMN;
export const seedPacketFrame = (cropId: CropId) => cropRow(cropId) + PACKET_COLUMN;
