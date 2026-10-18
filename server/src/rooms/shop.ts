import type { Client } from "colyseus";
import { buyAtStand } from "../../../shared/economy/trade";
import type { BuyMessage } from "../../../shared/messages";
import type { FarmRoom } from "./FarmRoom";
import { tradeAt } from "./trade";

/** The seed stand at the top of the beach path: "buy" seeds with the shared coins, into your own bag. */
export function registerShop(room: FarmRoom) {
  room.onMessage("buy", (client: Client, message: BuyMessage) => {
    tradeAt(room, client, "seedStand", (farmerId) => buyAtStand(room.world, farmerId, message?.itemId, message?.count));
  });
}
