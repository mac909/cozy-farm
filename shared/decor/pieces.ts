import { FURNITURE, footprintOf, goesIn, type FurnitureId, type PlaceKind } from "../content/furniture";
import type { HintReason } from "../farming/actions";

/**
 * Furniture and decorations standing somewhere: in a house (in tiles from the room's top-left
 * floor tile) or on the farm (in map tiles). Where a piece can go, and what it covers.
 */

/** A piece put down: which, where its top-left tile is, and which way round. */
export interface PlacedPiece {
  readonly itemId: FurnitureId;
  readonly col: number;
  readonly row: number;
  /** Index into the piece's `turns` in furniture.ts. */
  readonly turn: number;
}

/** The tiles a piece covers, as a rectangle of tiles. */
export function pieceArea(piece: PlacedPiece): { col: number; row: number; width: number; height: number } {
  const { width, height } = footprintOf(piece.itemId, piece.turn);
  return { col: piece.col, row: piece.row, width, height };
}

/** Whether a piece covers a tile. */
export function covers(piece: PlacedPiece, col: number, row: number): boolean {
  const area = pieceArea(piece);
  return col >= area.col && col < area.col + area.width && row >= area.row && row < area.row + area.height;
}

/** Every tile a piece covers. */
export function coveredTiles(piece: PlacedPiece): { col: number; row: number }[] {
  const area = pieceArea(piece);
  const tiles: { col: number; row: number }[] = [];
  for (let row = area.row; row < area.row + area.height; row++) for (let col = area.col; col < area.col + area.width; col++) tiles.push({ col, row });
  return tiles;
}

/** Whether two pieces cover any of the same tiles. */
export function overlap(a: PlacedPiece, b: PlacedPiece): boolean {
  const p = pieceArea(a);
  const q = pieceArea(b);
  return p.col < q.col + q.width && q.col < p.col + p.width && p.row < q.row + q.height && q.row < p.row + p.height;
}

/**
 * A flat piece (a rug) lies under others; anything else stands. A rug can go under a chair and a
 * chair on a rug, but two rugs or two chairs can't share a tile.
 */
function canShare(a: FurnitureId, b: FurnitureId): boolean {
  return Boolean(FURNITURE[a].flat) !== Boolean(FURNITURE[b].flat);
}

/** Somewhere to put things down: a house's floor, or the farm. */
export interface Board {
  kind: PlaceKind;
  /** Whether a piece may cover this tile at all (inside the room, not a wall, not the farm field...). */
  open(col: number, row: number): boolean;
  /** Someone's standing here, so nothing that blocks walking can go on it. */
  occupied?(col: number, row: number): boolean;
}

/**
 * Why a piece can't go at its spot on a board, or null if it can. `pieces` is what's already
 * there; `moving` is the index of the piece being moved, which doesn't get in its own way.
 */
export function placeRefusal(board: Board, pieces: readonly PlacedPiece[], piece: PlacedPiece, moving: number | null = null): HintReason | null {
  if (!goesIn(piece.itemId, board.kind)) return board.kind === "house" ? "farm-only" : "house-only";
  const tiles = coveredTiles(piece);
  if (!tiles.every(({ col, row }) => board.open(col, row))) return "cant-go-here";
  const def = FURNITURE[piece.itemId];
  const blocks = !def.flat && !def.walkable;
  const occupied = board.occupied;
  if (blocks && occupied && tiles.some(({ col, row }) => occupied(col, row))) return "someone-there";
  const clash = pieces.some((other, i) => i !== moving && overlap(other, piece) && !canShare(other.itemId, piece.itemId));
  return clash ? "cant-go-here" : null;
}

/** The piece on a tile, if any: one standing on a rug before the rug. Returns its index. */
export function pieceAt(pieces: readonly PlacedPiece[], col: number, row: number): number | null {
  let flat: number | null = null;
  for (let i = pieces.length - 1; i >= 0; i--) {
    if (!covers(pieces[i], col, row)) continue;
    if (!FURNITURE[pieces[i].itemId].flat) return i;
    flat ??= i;
  }
  return flat;
}

/** Whether a value is a sensible tile coordinate for a piece. */
export function isTileNumber(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 9999;
}
