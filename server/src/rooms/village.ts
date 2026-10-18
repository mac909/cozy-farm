import type { Client } from "colyseus";
import { isProjectId } from "../../../shared/content/projects";
import type { GiveAllMessage, GiveMessage, VillageEventMessage } from "../../../shared/messages";
import { giveEverything, giveToProject, type GiveResult, type VillageEvent } from "../../../shared/village/projects";
import type { FarmRoom } from "./FarmRoom";
import { tradeAt } from "./trade";

/**
 * The Village Board (Milestone 6): "give" and "giveAll" messages, from a player standing at the
 * board and awake. The shared rules check the rest (the project is up, the step is taking gifts,
 * the bag has what it needs). Every gift, and every step's last thing going in, is announced to
 * everyone, so both screens show the "+3" and the cheer.
 */
export function registerVillage(room: FarmRoom) {
  const giveAt = (client: Client, give: (farmerId: string) => GiveResult) => {
    let events: VillageEvent[] = [];
    const ok = tradeAt(room, client, "board", (farmerId) => {
      const result = give(farmerId);
      if (result.ok) events = result.events;
      return result;
    });
    if (ok) announceVillage(room, client, events);
  };

  room.onMessage("give", (client: Client, message: GiveMessage) => {
    const project = message?.project;
    const need = message?.need;
    const slot = message?.slot;
    if (!isProjectId(project) || typeof need !== "string" || need.length > 40) return;
    if (slot !== undefined && !Number.isInteger(slot)) return;
    giveAt(client, (farmerId) => giveToProject(room.world, farmerId, project, need, slot));
  });

  room.onMessage("giveAll", (client: Client, message: GiveAllMessage) => {
    const project = message?.project;
    if (!isProjectId(project)) return;
    giveAt(client, (farmerId) => giveEverything(room.world, farmerId, project));
  });
}

/** Tells everyone what just happened at the board, so both screens cheer. */
export function announceVillage(room: FarmRoom, client: Client, events: readonly VillageEvent[]) {
  const by = room.state.players.get(client.sessionId)?.name ?? "";
  for (const event of events) room.broadcast("villageEvent", { event, by, sessionId: client.sessionId } satisfies VillageEventMessage);
}
