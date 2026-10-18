import type { Client } from "colyseus";
import { findAt } from "../../../shared/beachcombing/beachcombing";
import { collectFind } from "../../../shared/collection/collect";
import { collectForage } from "../../../shared/foraging/forage";
import type { PickUpMessage } from "../../../shared/messages";
import { feetTile, inReach } from "../../../shared/world/places";
import { applyCollected } from "./collection";
import type { FarmRoom } from "./FarmRoom";

/**
 * Picking things up off the ground: "pickUp" messages, for a beach find, or driftwood or a branch
 * (Milestone 6). It must be within reach of where the player last said they were. The night
 * brings the tide and the morning's driftwood (night.ts).
 */
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
    const world = room.world;
    const result = findAt(world.beach.finds, col, row) ? collectFind(world, player.farmerId, col, row) : collectForage(world, player.farmerId, col, row);
    applyCollected(room, client, result);
  });
}
