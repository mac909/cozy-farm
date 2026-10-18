import { CROP_IDS, MAX_STAGES, type CropId } from "../../../shared/content/crops";

/**
 * Frames in our crops.png: one row per crop, in CROPS order, with this many columns: the growth
 * stages from 0 (room for MAX_STAGES), the harvested item in ITEM_COLUMN and the seed packet in
 * PACKET_COLUMN (see tools/sprites/render.ts and manifest.json).
 */
const ITEM_COLUMN = MAX_STAGES;
const PACKET_COLUMN = MAX_STAGES + 1;
const CROP_SHEET_COLUMNS = PACKET_COLUMN + 1;
const CROP_ROWS = CROP_IDS;

const cropRow = (cropId: CropId) => CROP_ROWS.indexOf(cropId) * CROP_SHEET_COLUMNS;

export const cropStageFrame = (cropId: CropId, stage: number) => cropRow(cropId) + stage;
export const cropItemFrame = (cropId: CropId) => cropRow(cropId) + ITEM_COLUMN;
export const seedPacketFrame = (cropId: CropId) => cropRow(cropId) + PACKET_COLUMN;
