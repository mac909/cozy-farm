import type { Client } from "colyseus";
import { addCoins, isCoinAmount } from "../../../shared/economy/wallet";
import type { DevMessage } from "../../../shared/messages";
import { DAY_END_MINUTE, DAY_START_MINUTE } from "../../../shared/time/clock";
import type { FarmRoom } from "./FarmRoom";

/** Whether dev commands work: everywhere but the real farm. */
export const DEV_COMMANDS_ON = process.env.NODE_ENV !== "production";

/**
 * Shortcuts for testing, so checks don't have to wait for crops to grow: start the night now, set
 * the clock, add coins. The real farm (NODE_ENV=production) ignores them.
 */
export function registerDevCommands(room: FarmRoom, startNight: () => void) {
  if (!DEV_COMMANDS_ON) return;
  room.onMessage("dev", (client: Client, message: DevMessage) => {
    const value = message?.value;
    switch (message?.command) {
      case "nextDay":
        console.log(`[dev] ${client.sessionId}: next day`);
        startNight();
        break;
      case "setTime":
        if (typeof value !== "number" || !Number.isFinite(value)) return;
        console.log(`[dev] ${client.sessionId}: set the time to minute ${value}`);
        room.change({
          ...room.world,
          clock: { ...room.world.clock, minute: Math.min(Math.max(value, DAY_START_MINUTE), DAY_END_MINUTE) },
        });
        break;
      case "addCoins":
        if (!isCoinAmount(value)) return;
        console.log(`[dev] ${client.sessionId}: add ${value} coins`);
        room.change({ ...room.world, coins: addCoins(room.world.coins, value) });
        break;
    }
  });
}
