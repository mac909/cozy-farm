import type { Client } from "colyseus";
import { collectFish } from "../../../shared/collection/collect";
import type { FishId } from "../../../shared/content/fish";
import { FISHING_ROD } from "../../../shared/content/items";
import { cast, FISHING } from "../../../shared/fishing/fishing";
import { bobberTile, fishingSpot } from "../../../shared/fishing/spots";
import { countOf, roomFor } from "../../../shared/inventory/inventory";
import type { CastMessage, CastStartedMessage, LandFishMessage } from "../../../shared/messages";
import { farmerOf } from "../../../shared/world/world";
import { feetTile, inReach } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { applyCollected } from "./collection";
import type { FarmRoom } from "./FarmRoom";

/**
 * A fish can't be landed sooner than this after its cast: the line flying out, the shortest wait
 * for a bite, and a quick reel, less a little for lag.
 */
const MIN_LAND_MS = FISHING.castMs + FISHING.biteDelayMs.min - 200;

/** A cast nobody has landed or reeled in after this long is forgotten. */
const CAST_FORGOTTEN_MS = 10 * 60 * 1000;

/** A line in the water: the fish the server picked for it, and when. */
interface Line {
  fishId: FishId;
  at: number;
}

/**
 * Fishing: "cast", "landFish" and "reelIn" messages. Casting checks the rod and the water and picks
 * the fish (from the spot and the time of day, with the server's own random seed); the player's
 * device plays the bite and the reel and says when it's landed. Each cast lands one fish at most.
 * While someone fishes, their bobber's tile is in their Player state, so everyone sees the line.
 */
export function registerFishing(room: FarmRoom) {
  const lines = new Map<string, Line>();

  const stop = (client: Client) => {
    lines.delete(client.sessionId);
    const player = room.state.players.get(client.sessionId);
    if (player && player.fishing !== "") player.fishing = "";
  };

  room.onMessage("cast", (client: Client, message: CastMessage) => {
    const player = room.state.players.get(client.sessionId);
    const col = message?.col;
    const row = message?.row;
    if (!player || room.isBusy(client) || !Number.isInteger(col) || !Number.isInteger(row)) return;
    const farmer = farmerOf(room.world, player.farmerId);
    if (!farmer) return;
    if (countOf(farmer.bag, FISHING_ROD) === 0) return room.hint(client, { reason: "no-rod" });
    const feet = feetTile(player);
    const water = { col, row };
    if (!inReach(feet, water)) return room.hint(client, { reason: "too-far" });
    const spot = fishingSpot(VILLAGE_MAP, feet, water);
    if (!spot) return room.hint(client, { reason: "no-water" });
    const line = cast(spot, room.world.clock.minute, Math.floor(Math.random() * 2 ** 32));
    if (!line.ok) return room.hint(client, { reason: "nothing-biting" });
    if (roomFor(farmer.bag, line.state.fishId) < 1) return room.hint(client, { reason: "bag-full" });

    const now = Date.now();
    for (const [id, old] of lines) if (now - old.at > CAST_FORGOTTEN_MS) lines.delete(id);
    lines.set(client.sessionId, { fishId: line.state.fishId, at: now });
    const bobber = bobberTile(VILLAGE_MAP, feet, water);
    player.fishing = `${bobber.col},${bobber.row}`;
    client.send("castStarted", { state: line.state } satisfies CastStartedMessage);
  });

  room.onMessage("landFish", (client: Client, message: LandFishMessage) => {
    const player = room.state.players.get(client.sessionId);
    const line = lines.get(client.sessionId);
    stop(client);
    if (!player || !line) return;
    if (Date.now() - line.at < MIN_LAND_MS) {
      console.log(`${player.name}: a fish landed too quickly after its cast, so it's let go`);
      return;
    }
    const sizeCm = typeof message?.sizeCm === "number" ? message.sizeCm : NaN;
    if (applyCollected(room, client, collectFish(room.world, player.farmerId, line.fishId, sizeCm))) {
      console.log(`${player.name} caught a ${line.fishId}`);
    }
  });

  room.onMessage("reelIn", (client: Client) => stop(client));

  return { left: (client: Client) => lines.delete(client.sessionId) };
}
