import type { Client } from "colyseus";
import { isProjectId } from "../../../shared/content/projects";
import type { ClimbMessage, GiveAllMessage, GiveMessage, VillageEventMessage } from "../../../shared/messages";
import { NIGHT_VIEW_FROM } from "../../../shared/content/badges";
import { builtThings } from "../../../shared/village/built";
import { nearLighthouseDoor, SERVER_NEAR_TILES } from "../../../shared/world/places";
import { giveEverything, giveToProject, type GiveResult, type VillageEvent } from "../../../shared/village/projects";
import type { FarmRoom } from "./FarmRoom";
import { tradeAt } from "./trade";
import { credit } from "./progress";

/**
 * The Village Board (Milestone 6): "give" and "giveAll" messages, from a player standing at the
 * board and awake, to the village's project or either cottage's upgrade (Milestone 7). The shared
 * rules check the rest (the project is up, the step is taking gifts, the bag has what it needs).
 * Every gift, and every step's last thing going in, is announced to everyone, so both screens show
 * the "+3" and the cheer. Things given (never coins) count towards the giving badges. And "climb":
 * the view from the lit lighthouse, which after dark counts for Up the Lighthouse.
 */
export function registerVillage(room: FarmRoom) {
  const giveAt = (client: Client, give: (farmerId: string) => GiveResult) => {
    let events: VillageEvent[] = [];
    const ok = tradeAt(room, client, "board", (farmerId) => {
      const result = give(farmerId);
      if (result.ok) events = result.events;
      return result;
    });
    if (!ok) return;
    announceVillage(room, client, events);
    const things = events.reduce((n, event) => n + (event.type === "gift" && event.need !== "coins" ? event.count : 0), 0);
    const farmerId = room.farmerIdOf(client);
    if (farmerId && things > 0) credit(room, farmerId, { kind: "give", count: things });
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

  room.onMessage("climb", (client: Client, _message: ClimbMessage) => {
    const player = room.state.players.get(client.sessionId);
    if (!player || room.isBusy(client) || !builtThings(room.world).has("lighthouse")) return;
    if (!nearLighthouseDoor(room.today.map, player, SERVER_NEAR_TILES)) return;
    credit(room, player.farmerId, { kind: "view", night: room.world.clock.minute >= NIGHT_VIEW_FROM });
  });
}

/** Tells everyone what just happened at the board, so both screens cheer. */
export function announceVillage(room: FarmRoom, client: Client, events: readonly VillageEvent[]) {
  const by = room.state.players.get(client.sessionId)?.name ?? "";
  for (const event of events) room.broadcast("villageEvent", { event, by, sessionId: client.sessionId } satisfies VillageEventMessage);
}
