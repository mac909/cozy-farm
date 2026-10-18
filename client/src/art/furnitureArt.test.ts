import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FURNITURE, FURNITURE_IDS } from "../../../shared/content/furniture";
import { VILLAGE_TILED } from "../../../shared/world/villageMap";
import { tilesetImageUrl } from "../../../shared/world/tiledMap";
import { FURNITURE_ART, FURNITURE_SHEETS, type SheetId } from "./furnitureArt";

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public");

/** A PNG's width and height, from its header. */
function pngSize(url: string): { width: number; height: number } {
  const bytes = fs.readFileSync(path.join(PUBLIC, decodeURI(url)));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function sheetUrl(sheet: SheetId): string {
  const { url, mapTileset } = FURNITURE_SHEETS[sheet];
  if (url) return url;
  const tileset = VILLAGE_TILED.tilesets.find((t) => t.name === mapTileset);
  if (!tileset?.image) throw new Error(`The map has no tileset ${mapTileset}`);
  return tilesetImageUrl(tileset.image);
}

describe("furniture pictures", () => {
  for (const id of FURNITURE_IDS) {
    it(`${id} has a picture for every way it turns, on its sheet, covering its tiles`, () => {
      const piece = FURNITURE[id];
      const art = FURNITURE_ART[id];
      expect(art).toHaveLength(piece.turns.length);
      art.forEach((picture, turn) => {
        const size = pngSize(sheetUrl(picture.sheet));
        expect(picture.x + picture.w).toBeLessThanOrEqual(size.width);
        expect(picture.y + picture.h).toBeLessThanOrEqual(size.height);
        if (piece.flat) return;
        // Standing pieces are at least as big as their tiles (a lamp or an umbrella can be bigger).
        const { width, height } = piece.turns[turn];
        expect(picture.w).toBeGreaterThanOrEqual(width * 16);
        expect(picture.h).toBeGreaterThanOrEqual(height * 16);
      });
    });
  }
});
