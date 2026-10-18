import type { Client } from "colyseus";
import { shipToCrate, takeBackFromCrate } from "../../../shared/economy/trade";
import type { ShipMessage, UnshipMessage } from "../../../shared/messages";
import type { FarmRoom } from "./FarmRoom";
import { tradeAt } from "./trade";

/** The shipping crate on the dock: "ship" from your bag into it, "unship" back out. It sells overnight (night.ts). */
export function registerCrate(room: FarmRoom) {
  room.onMessage("ship", (client: Client, message: ShipMessage) => {
    tradeAt(room, client, "crate", (farmerId) => shipToCrate(room.world, farmerId, message?.slot, message?.count));
  });
  room.onMessage("unship", (client: Client, message: UnshipMessage) => {
    tradeAt(room, client, "crate", (farmerId) => takeBackFromCrate(room.world, farmerId, message?.itemId, message?.count));
  });
}
