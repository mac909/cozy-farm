import { TILE_SIZE } from "../constants";
import { LEGEND, SPAWN_CHAR, type TileId } from "./tiles";

export interface WorldMap {
  /** Width in tiles. */
  width: number;
  /** Height in tiles. */
  height: number;
  /** Tile ids, indexed [row][col]. */
  tiles: TileId[][];
  spawn: { col: number; row: number };
}

/** Turns a text map (one string per row; see LEGEND) into tile data. Throws if the map is malformed. */
export function parseMap(rows: readonly string[]): WorldMap {
  const height = rows.length;
  if (height === 0) throw new Error("Map has no rows");
  const width = rows[0].length;
  const tiles: TileId[][] = [];
  let spawn: WorldMap["spawn"] | undefined;

  for (let row = 0; row < height; row++) {
    const line = rows[row];
    if (line.length !== width) {
      throw new Error(`Map row ${row} is ${line.length} tiles wide, expected ${width}`);
    }
    const tileRow: TileId[] = [];
    for (let col = 0; col < width; col++) {
      const ch = line[col];
      if (ch === SPAWN_CHAR) {
        if (spawn) throw new Error("Map has more than one spawn point");
        spawn = { col, row };
      }
      const tile = LEGEND[ch];
      if (tile === undefined) {
        throw new Error(`Unknown map character "${ch}" at column ${col}, row ${row}`);
      }
      tileRow.push(tile);
    }
    tiles.push(tileRow);
  }

  if (!spawn) throw new Error("Map has no spawn point");
  return { width, height, tiles, spawn };
}

/** The world-pixel position of the middle of a tile. */
export function tileCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}
