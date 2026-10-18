import type { Client } from "colyseus";
import { moveIn } from "../../../shared/decor/decorate";
import type { MoveInMessage } from "../../../shared/messages";
import { FEET_OFFSET } from "../../../shared/constants";
import { doorNear, houseById } from "../../../shared/world/houses";
import { SERVER_NEAR_TILES } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import type { FarmRoom } from "./FarmRoom";

/**
 * The cottages: "moveIn" at an empty one's door. Going in and out needs nothing from the server
 * (each player moves their own character), and visiting is open to everyone.
 */
export function registerHouses(room: FarmRoom) {
  room.onMessage("moveIn", (client: Client, message: MoveInMessage) => {
    const player = room.state.players.get(client.sessionId);
    const plan = typeof message?.house === "string" ? houseById(VILLAGE_MAP, message.house) : null;
    if (!player || !plan || room.isBusy(client)) return;
    const feet = { x: player.x, y: player.y + FEET_OFFSET };
    if (doorNear(VILLAGE_MAP, feet, SERVER_NEAR_TILES)?.id !== plan.id) {
      room.hint(client, { reason: "not-near-door" });
      return;
    }
    const result = moveIn(room.world, player.farmerId, plan.id);
    if (!result.ok) {
      room.hint(client, result.hint);
      return;
    }
    room.change(result.world);
    console.log(`${player.name} moved into ${plan.id}`);
  });
}
