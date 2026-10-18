import type { Client } from "colyseus";
import { isCount, isSlotIndex, moveSlot, splitStack, type Inventory } from "../../../shared/inventory/inventory";
import type { MoveItemMessage, SplitStackMessage } from "../../../shared/messages";
import { farmerOf, setFarmerBag } from "../../../shared/world/world";
import type { FarmRoom } from "./FarmRoom";

/**
 * The bag screen: "moveItem" (onto another slot, swapping or joining a stack) and "splitStack".
 * Only the player's own bag, so there's nothing to be near. The shared rules refuse anything that
 * doesn't make sense, and a refusal changes nothing.
 */
export function registerBag(room: FarmRoom) {
  const withBag = (client: Client, change: (bag: Inventory) => { ok: true; inventory: Inventory } | { ok: false }) => {
    const farmerId = room.farmerIdOf(client);
    const farmer = farmerId ? farmerOf(room.world, farmerId) : undefined;
    if (!farmerId || !farmer) return;
    const result = change(farmer.bag);
    if (result.ok) room.change(setFarmerBag(room.world, farmerId, result.inventory));
  };

  room.onMessage("moveItem", (client: Client, message: MoveItemMessage) => {
    withBag(client, (bag) =>
      isSlotIndex(bag, message?.from) && isSlotIndex(bag, message?.to) ? moveSlot(bag, message.from, message.to) : { ok: false },
    );
  });

  room.onMessage("splitStack", (client: Client, message: SplitStackMessage) => {
    withBag(client, (bag) => {
      const to = message?.to;
      if (!isSlotIndex(bag, message?.from) || !isCount(message?.count) || (to !== undefined && !isSlotIndex(bag, to))) return { ok: false };
      return splitStack(bag, message.from, message.count, to);
    });
  });
}
