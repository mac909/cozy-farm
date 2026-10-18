import type { Client } from "colyseus";
import type { TradeResult } from "../../../shared/economy/trade";
import { placeNear, SERVER_NEAR_TILES, type PlaceId } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import type { FarmRoom } from "./FarmRoom";

/**
 * Runs a trade for a player standing next to a place (the crate or the seed stand): checks they're
 * there and awake, then applies the shared rule, and tells them why if it didn't (all) work.
 */
export function tradeAt(room: FarmRoom, client: Client, place: PlaceId, trade: (farmerId: string) => TradeResult) {
  const player = room.state.players.get(client.sessionId);
  if (!player || room.isBusy(client)) return;
  if (placeNear(VILLAGE_MAP, player, SERVER_NEAR_TILES, [place]) !== place) {
    room.hint(client, { reason: place === "crate" ? "not-near-crate" : "not-near-stand" });
    return;
  }
  const result = trade(player.farmerId);
  if (result.ok) room.change(result.world);
  if (result.hint) room.hint(client, result.hint);
}
