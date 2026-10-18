import type { Client } from "colyseus";
import { isFurnitureId } from "../../../shared/content/furniture";
import { farmBoard, houseBoard } from "../../../shared/decor/boards";
import { dugIn, movePiece, placeFromBag, putAway, type DecorResult, type DecorTarget } from "../../../shared/decor/decorate";
import { isTileNumber } from "../../../shared/decor/pieces";
import type { MovePieceMessage, PlacePieceMessage, TakePieceMessage } from "../../../shared/messages";
import type { Player } from "../../../shared/schema";
import { areaOf, houseAt, mapToFloor, VILLAGE } from "../../../shared/world/houses";
import type { TilePos } from "../../../shared/world/map";
import { feetTile } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import type { FarmRoom } from "./FarmRoom";

const isTurn = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < 8;

/**
 * Where a player is arranging, from where they stand: their own house's room (furniture, in floor
 * tiles), or the village (decorations, in map tiles). Nothing that blocks walking goes where
 * someone in the same place is standing. `local` turns map tiles into the target's own tiles.
 */
function whereIs(room: FarmRoom, player: Player): { target: DecorTarget; local: (at: TilePos) => TilePos } {
  const plan = houseAt(VILLAGE_MAP, player);
  const area = plan?.id ?? VILLAGE;
  const standing = [...room.state.players.values()].filter((p) => areaOf(VILLAGE_MAP, p) === area && !p.inBed).map((p) => feetTile(p));
  if (plan) {
    const occupied = (col: number, row: number) =>
      standing.some((feet) => {
        const at = mapToFloor(plan, feet);
        return at.col === col && at.row === row;
      });
    return { target: { kind: "house", houseId: plan.id, board: houseBoard(plan, occupied) }, local: (at) => mapToFloor(plan, at) };
  }
  const occupied = (col: number, row: number) => standing.some((feet) => feet.col === col && feet.row === row);
  const { map, keepClear } = room.today;
  return { target: { kind: "farm", board: farmBoard(map, dugIn(room.world), occupied, keepClear) }, local: (at) => at };
}

/**
 * Furniture in your own house and decorations on the farm: "placePiece" from your bag,
 * "movePiece" (moving or turning one that's down) and "takePiece" (back into your bag). The
 * shared rules check the rest: only the owner arranges a house, pieces fit where they go.
 */
export function registerDecor(room: FarmRoom) {
  const run = (client: Client, change: (farmerId: string, where: ReturnType<typeof whereIs>) => DecorResult) => {
    const player = room.state.players.get(client.sessionId);
    if (!player || room.isBusy(client)) return;
    const result = change(player.farmerId, whereIs(room, player));
    if (result.ok) room.change(result.world);
    else room.hint(client, result.hint);
  };

  room.onMessage("placePiece", (client: Client, message: PlacePieceMessage) => {
    if (!isTileNumber(message?.col) || !isTileNumber(message?.row) || !isTurn(message?.turn) || !Number.isInteger(message?.slot)) return;
    run(client, (farmerId, { target, local }) => {
      const at = local({ col: message.col, row: message.row });
      return placeFromBag(room.world, farmerId, target, message.slot, { ...at, turn: message.turn });
    });
  });

  room.onMessage("movePiece", (client: Client, message: MovePieceMessage) => {
    const itemId = message?.itemId;
    if (!isFurnitureId(itemId) || !isTurn(message?.turn)) return;
    if (![message.col, message.row, message.toCol, message.toRow].every(isTileNumber)) return;
    run(client, (farmerId, { target, local }) => {
      const from = local({ col: message.col, row: message.row });
      const to = local({ col: message.toCol, row: message.toRow });
      return movePiece(room.world, farmerId, target, { itemId, ...from }, { ...to, turn: message.turn });
    });
  });

  room.onMessage("takePiece", (client: Client, message: TakePieceMessage) => {
    const itemId = message?.itemId;
    if (!isFurnitureId(itemId) || !isTileNumber(message?.col) || !isTileNumber(message?.row)) return;
    run(client, (farmerId, { target, local }) => {
      const at = local({ col: message.col, row: message.row });
      return putAway(room.world, farmerId, target, { itemId, ...at });
    });
  });
}
