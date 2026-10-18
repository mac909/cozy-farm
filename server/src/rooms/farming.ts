import type { Client } from "colyseus";
import { ITEMS } from "../../../shared/content/items";
import { applyFarmAction, type FarmActionKind } from "../../../shared/farming/actions";
import type { FarmActionMessage } from "../../../shared/messages";
import { isFacing } from "../../../shared/movement";
import { feetTile, inReach } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import type { FarmRoom } from "./FarmRoom";
import { credit, serverRandom } from "./progress";

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
 * shared rules check the rest (farmland, the right tool or seeds, in season, room in the bag). A
 * pick counts for farming (Milestone 7), and the picker's perks may bring a little extra. A wide hoe
 * or a big can (Milestone 8) works across the way the player faces.
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
      const result = applyFarmAction(
        room.world,
        room.today.map,
        {
          farmerId: player.farmerId,
          action,
          col: tile.col,
          row: tile.row,
          slot: Number.isInteger(message?.slot) ? message.slot : undefined,
          facing: isFacing(message?.facing) ? message.facing : isFacing(player.facing) ? player.facing : undefined,
        },
        action === "harvest" ? serverRandom() : undefined,
      );
      if (!result.ok) {
        room.hint(client, result.hint);
        return;
      }
      room.change(result.world);
      const picked = result.harvested ? ITEMS[result.harvested.itemId] : null;
      if (picked?.category === "crop") credit(room, player.farmerId, { kind: "harvest", cropId: picked.cropId, regrown: result.regrown === true });
    });
  }
}
