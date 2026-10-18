import type { Client } from "colyseus";
import { shoreOf } from "../../../shared/beachcombing/tide";
import { collectFind } from "../../../shared/collection/collect";
import type { PickUpMessage } from "../../../shared/messages";
import { feetTile, inReach } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { applyCollected } from "./collection";
import type { FarmRoom } from "./FarmRoom";

/** Where finds wash up on the village's beach, read from the map once. The night brings the tide (night.ts). */
export const VILLAGE_SHORE = shoreOf(VILLAGE_MAP);

/** Beachcombing: "pickUp" messages. The find must be within reach of where the player last said they were. */
export function registerBeach(room: FarmRoom) {
  room.onMessage("pickUp", (client: Client, message: PickUpMessage) => {
    const player = room.state.players.get(client.sessionId);
    const col = message?.col;
    const row = message?.row;
    if (!player || room.isBusy(client) || !Number.isInteger(col) || !Number.isInteger(row)) return;
    if (!inReach(feetTile(player), { col, row })) {
      room.hint(client, { reason: "too-far" });
      return;
    }
    applyCollected(room, client, collectFind(room.world, player.farmerId, col, row));
  });
}
