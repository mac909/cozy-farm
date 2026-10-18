import type { Client } from "colyseus";
import type { TradeResult } from "../../../shared/economy/trade";
import type { HintReason } from "../../../shared/farming/actions";
import { placeNear, SERVER_NEAR_TILES, type PlaceId } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import type { FarmRoom } from "./FarmRoom";

/** What a player is told when they try to trade too far from a place. */
const NOT_NEAR: Partial<Record<PlaceId, HintReason>> = { crate: "not-near-crate", seedStand: "not-near-stand", store: "not-near-store" };

/**
 * Runs a trade for a player standing next to a place (the crate, the seed stand or the store): checks they're
 * there and awake, then applies the shared rule, and tells them why if it didn't (all) work.
 */
export function tradeAt(room: FarmRoom, client: Client, place: PlaceId, trade: (farmerId: string) => TradeResult) {
  const player = room.state.players.get(client.sessionId);
  if (!player || room.isBusy(client)) return;
  if (placeNear(VILLAGE_MAP, player, SERVER_NEAR_TILES, [place]) !== place) {
    room.hint(client, { reason: NOT_NEAR[place] ?? "too-far" });
    return;
  }
  const result = trade(player.farmerId);
  if (result.ok) room.change(result.world);
  if (result.hint) room.hint(client, result.hint);
}
