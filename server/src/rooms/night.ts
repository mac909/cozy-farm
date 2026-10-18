import type { Client } from "colyseus";
import type { MorningMessage, WakeUpMessage } from "../../../shared/messages";
import type { Player } from "../../../shared/schema";
import { bedNear } from "../../../shared/decor/beds";
import { nightStarts, recentDrops, type Dropped } from "../../../shared/world/bedtime";
import { houseAt } from "../../../shared/world/houses";
import { tileCenter } from "../../../shared/world/map";
import { endNight } from "../../../shared/world/night";
import { placeNear, SERVER_NEAR_TILES, wakeSpots } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { liveWorld } from "../world/liveWorld";
import { VILLAGE_SHORE } from "./beach";
import type { FarmRoom } from "./FarmRoom";

/**
 * The tent and the beds, going to bed, and the night: "sleep" and "wake" messages, and the check after every
 * clock tick, sleep, wake and leave. The night starts when everyone online is in bed (waiting
 * DROP_WAIT_MS for anyone who dropped while still up), or at midnight.
 */
export class Bedtime {
  /** Farmers whose connection dropped while they were still up, recently. */
  private drops: Dropped[] = [];

  constructor(private readonly room: FarmRoom) {
    room.onMessage("sleep", (client: Client) => this.sleep(client));
    room.onMessage("wake", (client: Client) => this.wake(client));
  }

  /** Whether this player is in bed (and so can't farm). */
  inBed(client: Client): boolean {
    return this.room.state.players.get(client.sessionId)?.inBed === true;
  }

  /** Someone joined: if they dropped a moment ago, the night needn't wait for them any more. */
  joined(farmerId: string) {
    this.drops = this.drops.filter((drop) => drop.farmerId !== farmerId);
  }

  /**
   * Someone left (already removed from the players). If they were still up, the night waits a
   * little in case they come back, unless they're still here on another device.
   */
  left(player: Player) {
    const stillHere = [...this.room.state.players.values()].some((p) => p.farmerId === player.farmerId);
    if (!player.inBed && !stillHere) this.drops.push({ farmerId: player.farmerId, at: Date.now() });
    this.check();
  }

  /** Starts the night if it's time. Cheap; called after every tick. */
  check() {
    const now = Date.now();
    this.drops = recentDrops(this.drops, now);
    if (this.room.state.players.size === 0) return;
    const online = [...this.room.state.players.values()].map((p) => p.inBed);
    if (nightStarts(this.room.world.clock, online, this.drops, now)) this.startNight();
  }

  /**
   * The night, all in one go so a save is never half evening and half morning: crops grow, the
   * soil dries, the crate sells and the next day starts; everyone gets up, the world is saved, and
   * each player is told what happened and where to wake up.
   */
  startNight() {
    const { world, report } = endNight(this.room.world, VILLAGE_SHORE);
    this.room.change(world);
    this.room.state.players.forEach((player) => (player.inBed = false));
    this.drops = [];
    liveWorld().saveNow();
    console.log(
      `Night: day ${report.day} begins. ${report.grew} crops grew, ${report.ready} ripe, the crate sold for ${report.sale.total}, ${report.washedUp.length} finds washed up.`,
    );

    // Where to wake up first, so the client knows the morning card waits for its fade. Anyone
    // in a house wakes up where they are (by their bed); everyone else in front of the tent.
    const spots = wakeSpots(VILLAGE_MAP.tent, Math.max(1, this.room.clients.length));
    let outside = 0;
    this.room.clients.forEach((client) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player && houseAt(VILLAGE_MAP, player)) {
        client.send("wakeUp", { x: player.x, y: player.y } satisfies WakeUpMessage);
        return;
      }
      const spot = spots[outside++ % spots.length];
      client.send("wakeUp", tileCenter(spot.col, spot.row) satisfies WakeUpMessage);
    });
    this.room.broadcast("morning", report satisfies MorningMessage);
  }

  private sleep(client: Client) {
    const player = this.room.state.players.get(client.sessionId);
    if (!player || player.inBed) return;
    const inTent = placeNear(VILLAGE_MAP, player, SERVER_NEAR_TILES, ["tent"]) === "tent";
    const bed = inTent ? null : bedNear(VILLAGE_MAP, this.room.world.houses, player, SERVER_NEAR_TILES);
    if (!inTent && !bed) {
      this.room.hint(client, { reason: "not-near-bed" });
      return;
    }
    player.inBed = true;
    console.log(`${player.name} went to bed ${bed ? `in ${bed.plan.id}` : "in the tent"}`);
    this.check();
  }

  private wake(client: Client) {
    const player = this.room.state.players.get(client.sessionId);
    if (!player?.inBed) return;
    player.inBed = false;
    console.log(`${player.name} got up`);
  }
}
