/** Tile ids. Each id is also the frame index in the tileset image. */
export const Tile = {
  Grass: 0,
  Flowers: 1,
  Tree: 2,
  Path: 3,
  Sand: 4,
  Water: 5,
  Dock: 6,
  Soil: 7,
} as const;

export type TileId = (typeof Tile)[keyof typeof Tile];
export const TILE_COUNT = Object.keys(Tile).length;

/** Marks where players appear. The spawn tile itself is grass. */
export const SPAWN_CHAR = "P";

/** The characters used in text maps. */
export const LEGEND: Partial<Record<string, TileId>> = {
  ".": Tile.Grass,
  ",": Tile.Flowers,
  T: Tile.Tree,
  "#": Tile.Path,
  ":": Tile.Sand,
  "~": Tile.Water,
  "=": Tile.Dock,
  "%": Tile.Soil,
  [SPAWN_CHAR]: Tile.Grass,
};

/** Tiles nobody can walk through. */
export const BLOCKED_TILES: readonly TileId[] = [Tile.Tree, Tile.Water];

export function isBlocked(tile: TileId): boolean {
  return BLOCKED_TILES.includes(tile);
}
