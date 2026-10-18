import type { Client } from "colyseus";
import { findAt } from "../../../shared/beachcombing/beachcombing";
import { collectFind, lyingAround } from "../../../shared/collection/collect";
import { collectForage } from "../../../shared/foraging/forage";
import { toolOfKind } from "../../../shared/farming/tools";
import type { PickUpMessage } from "../../../shared/messages";
import type { Player } from "../../../shared/schema";
import { farmerOf } from "../../../shared/world/world";
import { feetTile, inReach } from "../../../shared/world/places";
import { applyCollected } from "./collection";
import { credit, serverRandom } from "./progress";
import { isBeachFindId } from "../../../shared/content/beachFinds";
import type { FarmRoom } from "./FarmRoom";

/**
 * Picking things up off the ground: "pickUp" messages, for a beach find, or driftwood or a branch
 * (Milestone 6). It must be within reach of where the player last said they were. With the shell
 * basket in your bag (Milestone 8), everything else lying right round you comes too. The night
 * brings the tide and the morning's driftwood (night.ts).
 */
export function registerBeach(room: FarmRoom) {
  room.onMessage("pickUp", (client: Client, message: PickUpMessage) => {
    const player = room.state.players.get(client.sessionId);
    const col = message?.col;
    const row = message?.row;
    if (!player || room.isBusy(client) || !Number.isInteger(col) || !Number.isInteger(row)) return;
    const feet = feetTile(player);
    if (!inReach(feet, { col, row })) {
      room.hint(client, { reason: "too-far" });
      return;
    }
    if (!pickUpAt(room, client, player, col, row)) return;
    const basket = toolOfKind(farmerOf(room.world, player.farmerId)?.bag ?? [], "basket");
    if (!basket) return;
    for (const tile of lyingAround(room.world, feet, basket.def.radius ?? 1)) {
      if (!pickUpAt(room, client, player, tile.col, tile.row, true)) break;
    }
  });
}

/** Picks up whatever lies on one tile, and credits it. `quiet`: no hint if it can't (the basket's extras). */
function pickUpAt(room: FarmRoom, client: Client, player: Player, col: number, row: number, quiet = false): boolean {
  const world = room.world;
  const isFind = findAt(world.beach.finds, col, row) !== undefined;
  const result = isFind ? collectFind(world, player.farmerId, col, row) : collectForage(world, player.farmerId, col, row, serverRandom());
  if (quiet && !result.ok) return false;
  if (!applyCollected(room, client, result) || !result.ok) return false;
  if (isFind && isBeachFindId(result.itemId)) credit(room, player.farmerId, { kind: "find", findId: result.itemId });
  else credit(room, player.farmerId, { kind: "material", itemId: result.itemId, count: result.count });
  return true;
}
