import type { Client } from "colyseus";
import { buyAtStand, buyAtStore } from "../../../shared/economy/trade";
import { buyAtGardenShop, upgradeTool } from "../../../shared/economy/gardenShop";
import type { BuyMessage, UpgradeToolMessage } from "../../../shared/messages";
import type { FarmRoom } from "./FarmRoom";
import { tradeAt } from "./trade";

/**
 * Buying with the shared coins, into your own bag: "buy" at the seed stand (seeds), at the general
 * store (furniture and decorations), or at the garden shop (this season's seeds, Milestone 8); and
 * "upgradeTool" at the garden shop (your own tools).
 */
export function registerShop(room: FarmRoom) {
  room.onMessage("buy", (client: Client, message: BuyMessage) => {
    if (message?.at === "store") {
      tradeAt(room, client, "store", (farmerId) => buyAtStore(room.world, farmerId, message?.itemId, message?.count));
    } else if (message?.at === "gardenShop") {
      tradeAt(room, client, "gardenShop", (farmerId) => buyAtGardenShop(room.world, farmerId, message?.itemId, message?.count));
    } else {
      tradeAt(room, client, "seedStand", (farmerId) => buyAtStand(room.world, farmerId, message?.itemId, message?.count));
    }
  });
  room.onMessage("upgradeTool", (client: Client, message: UpgradeToolMessage) => {
    const done = tradeAt(room, client, "gardenShop", (farmerId) => upgradeTool(room.world, farmerId, message?.tool));
    if (done) console.log(`${room.state.players.get(client.sessionId)?.name}: a new ${message.tool}`);
  });
}
