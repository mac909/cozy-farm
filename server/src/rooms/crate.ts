import type { Client } from "colyseus";
import { shipToCrate, takeBackFromCrate, type TradeResult } from "../../../shared/economy/trade";
import type { ShipMessage, UnshipMessage } from "../../../shared/messages";
import { placeNear, SERVER_NEAR_TILES, type PlaceId } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import type { FarmRoom } from "./FarmRoom";

/**
 * Runs a trade for a player standing next to a place (the crate or the seed stand): checks they're
 * there and awake, then applies the shared rule and tells them why if it didn't work.
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

/** The shipping crate on the dock: "ship" from your bag into it, "unship" back out. It sells overnight (night.ts). */
export function registerCrate(room: FarmRoom) {
  room.onMessage("ship", (client: Client, message: ShipMessage) => {
    tradeAt(room, client, "crate", (farmerId) => shipToCrate(room.world, farmerId, message?.slot, message?.count));
  });
  room.onMessage("unship", (client: Client, message: UnshipMessage) => {
    tradeAt(room, client, "crate", (farmerId) => takeBackFromCrate(room.world, farmerId, message?.itemId, message?.count));
  });
}
