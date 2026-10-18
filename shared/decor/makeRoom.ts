import type { WorldMap } from "../world/map";
import type { World } from "../world/world";
import { farmBoard } from "./boards";
import { dugIn } from "./decorate";
import { placeRefusal, type PlacedPiece } from "./pieces";

/**
 * Building never squashes a decoration (Milestone 6): when something new stands on the farm (the
 * Village Board, a shopfront), any decoration in its way moves to the nearest free spot, the way
 * round it facing. Nothing is lost. `before` and `after` are the map before and after the change;
 * only decorations that fitted before and don't now are moved.
 */
export function makeRoom(world: World, before: WorldMap, after: WorldMap): World {
  const dug = dugIn(world);
  const was = farmBoard(before, dug);
  const now = farmBoard(after, dug);
  let pieces: PlacedPiece[] = [...world.decorations];
  let moved = false;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (placeRefusal(was, pieces, piece, i) !== null || placeRefusal(now, pieces, piece, i) === null) continue;
    const spot = nearestFree(now, pieces, piece, i, after);
    if (!spot) continue;
    pieces = pieces.map((p, j) => (j === i ? spot : p));
    moved = true;
  }
  return moved ? { ...world, decorations: pieces } : world;
}

/** The nearest spot to `piece` it fits on now, searching outwards ring by ring. */
function nearestFree(board: ReturnType<typeof farmBoard>, pieces: readonly PlacedPiece[], piece: PlacedPiece, index: number, map: WorldMap): PlacedPiece | null {
  const reach = Math.max(map.width, map.height);
  for (let ring = 1; ring <= reach; ring++) {
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const col = piece.col + dc;
        const row = piece.row + dr;
        if (col < 0 || row < 0) continue;
        const moved = { ...piece, col, row };
        if (placeRefusal(board, pieces, moved, index) === null) return moved;
      }
    }
  }
  return null;
}
