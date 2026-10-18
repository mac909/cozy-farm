import type { Client } from "colyseus";
import { addCoins, isCoinAmount } from "../../../shared/economy/wallet";
import type { DevMessage } from "../../../shared/messages";
import { DAY_END_MINUTE, DAY_START_MINUTE } from "../../../shared/time/clock";
import { buildOvernight, fillStep } from "../../../shared/village/projects";
import { isSkillId } from "../../../shared/content/skills";
import { grantXp } from "../../../shared/progress/progress";
import { checkEveryone, tell } from "./progress";
import { isSeasonId } from "../../../shared/content/seasons";
import { yearStartFor } from "../../../shared/time/seasons";
import { startSeasons } from "../../../shared/world/night";
import { isItemId } from "../../../shared/content/items";
import { addItems } from "../../../shared/inventory/inventory";
import { farmerOf, setFarmerBag } from "../../../shared/world/world";
import type { FarmRoom } from "./FarmRoom";
import { announceVillage } from "./village";

/** Whether dev commands work: everywhere but the real farm. */
export const DEV_COMMANDS_ON = process.env.NODE_ENV !== "production";

/**
 * Shortcuts for testing, so checks don't have to wait for crops to grow: start the night now, set
 * the clock, add coins, fill the board's step (or a porch's), build what's gathered now, add
 * experience to your skills, skip to a season, put things in your bag. The real farm (NODE_ENV=production)
 * ignores them.
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
      case "fillStep": {
        const farmerId = room.farmerIdOf(client);
        if (!farmerId) return;
        const project = typeof message.project === "string" ? message.project : undefined;
        const result = fillStep(room.world, farmerId, project);
        console.log(`[dev] ${client.sessionId}: fill ${project ?? "the board's step"}${result.ok ? "" : ` (${result.hint.reason})`}`);
        if (!result.ok) return room.hint(client, result.hint);
        room.change(result.world);
        announceVillage(room, client, result.events);
        break;
      }
      case "xp": {
        const farmerId = room.farmerIdOf(client);
        const skill = message.skill;
        if (!farmerId || !isSkillId(skill) || typeof value !== "number" || !Number.isFinite(value) || value <= 0) return;
        console.log(`[dev] ${client.sessionId}: ${value} ${skill} experience`);
        const result = grantXp(room.world, farmerId, skill, value);
        room.change(result.world);
        tell(room, farmerId, result.events);
        break;
      }
      case "build": {
        const before = room.world;
        const { world, built } = buildOvernight(before);
        console.log(`[dev] ${client.sessionId}: build now (${built.length} step${built.length === 1 ? "" : "s"})`);
        // Opening the garden shop brings the seasons, as overnight; the village's badges follow.
        room.change(room.roomForBuilt(before, startSeasons(world)));
        checkEveryone(room);
        break;
      }
      case "item": {
        const farmerId = room.farmerIdOf(client);
        const farmer = farmerId ? farmerOf(room.world, farmerId) : undefined;
        if (!farmerId || !farmer || !isItemId(message.item) || !Number.isSafeInteger(value) || (value as number) < 1) return;
        const added = addItems(farmer.bag, message.item, value as number);
        console.log(`[dev] ${client.sessionId}: ${value} ${message.item}${added.ok ? "" : " (no room)"}`);
        if (added.ok) room.change(setFarmerBag(room.world, farmerId, added.inventory));
        else room.hint(client, { reason: "bag-full" });
        break;
      }
      case "season": {
        const season = message.season;
        if (!isSeasonId(season)) return;
        console.log(`[dev] ${client.sessionId}: today is the first day of ${season}`);
        room.change({ ...room.world, yearStart: yearStartFor(room.world.clock.day, season) });
        break;
      }
    }
  });
}
