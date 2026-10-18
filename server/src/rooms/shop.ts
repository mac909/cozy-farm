import type { Client } from "colyseus";
import { buyAtStand, buyAtStore } from "../../../shared/economy/trade";
import type { BuyMessage } from "../../../shared/messages";
import type { FarmRoom } from "./FarmRoom";
import { tradeAt } from "./trade";

/**
 * Buying with the shared coins, into your own bag: "buy" at the seed stand (seeds) or at the
 * general store (furniture and decorations).
 */
export function registerShop(room: FarmRoom) {
  room.onMessage("buy", (client: Client, message: BuyMessage) => {
    if (message?.at === "store") {
      tradeAt(room, client, "store", (farmerId) => buyAtStore(room.world, farmerId, message?.itemId, message?.count));
    } else {
      tradeAt(room, client, "seedStand", (farmerId) => buyAtStand(room.world, farmerId, message?.itemId, message?.count));
    }
  });
}
