import { CROPS, isCropId, type CropDef, type CropId } from "../content/crops";

/** Ground that hasn't been dug yet. */
export interface UntilledTile {
  readonly kind: "untilled";
}

/** Dug soil with nothing in it, ready for seeds. */
export interface TilledTile {
  readonly kind: "tilled";
  readonly watered: boolean;
}

/** Soil with a crop growing in it. */
export interface PlantedTile {
  readonly kind: "planted";
  readonly watered: boolean;
  readonly cropId: CropId;
  /** 0 = just planted; the crop's last stage (see ripeStage) = ripe. */
  readonly stage: number;
  /** Watered days spent in the current stage so far. */
  readonly daysInStage: number;
}

/** The state of one tile of the shared farm. Tiles are never changed in place; the actions below return new ones. */
export type FarmTile = UntilledTile | TilledTile | PlantedTile;

export const UNTILLED: FarmTile = { kind: "untilled" };

/** What an action returns: the tile's new state, or why the action isn't allowed. */
export type FarmResult<Reason extends string, Extra = {}> =
  | ({ ok: true; tile: FarmTile } & Extra)
  | { ok: false; reason: Reason };

export interface Harvested {
  cropId: CropId;
  amount: number;
}

function fail<Reason extends string>(reason: Reason): { ok: false; reason: Reason } {
  return { ok: false, reason };
}

/** The stage at which a crop is ripe. */
export function ripeStage(crop: CropDef): number {
  return crop.stages - 1;
}

/** Watered days from planting to ripe. */
export function daysToRipe(crop: CropDef): number {
  return ripeStage(crop) * crop.daysPerStage;
}

export function isRipe(tile: FarmTile): boolean {
  return tile.kind === "planted" && tile.stage >= ripeStage(CROPS[tile.cropId]);
}

/** Dig up untilled ground. */
export function till(tile: FarmTile): FarmResult<"already-tilled" | "has-crop"> {
  if (tile.kind === "tilled") return fail("already-tilled");
  if (tile.kind === "planted") return fail("has-crop");
  return { ok: true, tile: { kind: "tilled", watered: false } };
}

/** Plant one seed of `cropId` in empty tilled soil. Watered soil stays watered. */
export function plant(
  tile: FarmTile,
  cropId: string,
): FarmResult<"unknown-crop" | "not-tilled" | "has-crop"> {
  if (!isCropId(cropId)) return fail("unknown-crop");
  if (tile.kind === "untilled") return fail("not-tilled");
  if (tile.kind === "planted") return fail("has-crop");
  return {
    ok: true,
    tile: { kind: "planted", watered: tile.watered, cropId, stage: 0, daysInStage: 0 },
  };
}

/** Water tilled soil, with or without a crop. Once a day is enough. */
export function water(tile: FarmTile): FarmResult<"not-tilled" | "already-watered"> {
  if (tile.kind === "untilled") return fail("not-tilled");
  if (tile.watered) return fail("already-watered");
  return { ok: true, tile: { ...tile, watered: true } };
}

/**
 * Pick a ripe crop. Most crops leave empty tilled soil behind; regrowing crops
 * stay and drop back one stage. The soil keeps its watered flag either way.
 */
export function harvest(
  tile: FarmTile,
): FarmResult<"no-crop" | "not-ripe", { harvested: Harvested }> {
  if (tile.kind !== "planted") return fail("no-crop");
  const crop = CROPS[tile.cropId];
  if (tile.stage < ripeStage(crop)) return fail("not-ripe");
  const harvested = { cropId: tile.cropId, amount: crop.harvestAmount };
  const after: FarmTile = crop.regrows
    ? { ...tile, stage: ripeStage(crop) - 1, daysInStage: 0 }
    : { kind: "tilled", watered: tile.watered };
  return { ok: true, tile: after, harvested };
}

/** Overnight for one tile: a watered crop grows one day, then the soil dries out. Dry crops just wait; they never die. */
export function advanceTile(tile: FarmTile): FarmTile {
  if (tile.kind === "untilled" || !tile.watered) return tile;
  if (tile.kind === "tilled") return { ...tile, watered: false };
  return { ...grow(tile), watered: false };
}

/** Overnight for the whole farm. */
export function advanceDay(tiles: readonly FarmTile[]): FarmTile[] {
  return tiles.map(advanceTile);
}

function grow(tile: PlantedTile): PlantedTile {
  const crop = CROPS[tile.cropId];
  if (tile.stage >= ripeStage(crop)) return tile;
  const days = tile.daysInStage + 1;
  return days >= crop.daysPerStage
    ? { ...tile, stage: tile.stage + 1, daysInStage: 0 }
    : { ...tile, daysInStage: days };
}
