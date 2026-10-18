import type { Client } from "colyseus";
import { applyFarmAction, type FarmActionKind } from "../../../shared/farming/actions";
import type { FarmActionMessage } from "../../../shared/messages";
import { feetTile, inReach } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import type { FarmRoom } from "./FarmRoom";

const FARM_ACTIONS: readonly FarmActionKind[] = ["till", "plant", "water", "harvest"];

/** A whole-number tile on the map, or null. */
function tileOn(message: FarmActionMessage | undefined): { col: number; row: number } | null {
  const col = message?.col;
  const row = message?.row;
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null;
  if (col! < 0 || row! < 0 || col! >= VILLAGE_MAP.width || row! >= VILLAGE_MAP.height) return null;
  return { col: col!, row: row! };
}

/**
 * Dig, plant, water, pick: "till", "plant", "water" and "harvest" messages. The room checks the
 * message makes sense and the tile is within reach of where the player last said they were; the
 * shared rules check the rest (farmland, the right tool or seeds, room in the bag).
 */
export function registerFarming(room: FarmRoom) {
  for (const action of FARM_ACTIONS) {
    room.onMessage(action, (client: Client, message: FarmActionMessage) => {
      const player = room.state.players.get(client.sessionId);
      const tile = tileOn(message);
      if (!player || !tile || room.isBusy(client)) return;
      if (!inReach(feetTile(player), tile)) {
        room.hint(client, { reason: "too-far" });
        return;
      }
      const result = applyFarmAction(room.world, room.today.map, {
        farmerId: player.farmerId,
        action,
        col: tile.col,
        row: tile.row,
        slot: message?.slot,
      });
      if (result.ok) room.change(result.world);
      else room.hint(client, result.hint);
    });
  }
}
