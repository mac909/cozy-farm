import type { Client } from "colyseus";
import { bugSlot, MEADOW, meadowBugs, type MeadowBug } from "../../../shared/bugs/meadow";
import { collectBug } from "../../../shared/collection/collect";
import { blocksWalking } from "../../../shared/content/furniture";
import { FEET_OFFSET, TILE_SIZE } from "../../../shared/constants";
import { coveredTiles } from "../../../shared/decor/pieces";
import type { CatchBugMessage } from "../../../shared/messages";
import { writeBugs } from "../../../shared/stateSync";
import { tileCenter } from "../../../shared/world/map";
import { applyCollected } from "./collection";
import { credit } from "./progress";
import { PERK } from "../../../shared/content/skills";
import { hasPerk } from "../../../shared/progress/farmerProgress";
import { toolOfKind } from "../../../shared/farming/tools";
import type { FarmRoom } from "./FarmRoom";

/**
 * Bugs in the meadow: a new lot every couple of game hours (shared/bugs/meadow.ts picks them from
 * the world seed, the day and the time), and "catchBug" messages. They aren't saved: after a
 * restart the same lot comes back, caught ones included. Nothing to lose but a butterfly.
 */
export class Meadow {
  private day = -1;
  private slot = -1;
  private bugs: MeadowBug[] = [];
  private readonly caught = new Set<string>();

  constructor(private readonly room: FarmRoom) {
    room.onMessage("catchBug", (client: Client, message: CatchBugMessage) => this.catch(client, message));
  }

  /** After every clock tick: when the hour comes round, the old lot flies off and a new one comes out. */
  check() {
    const { day, minute } = this.room.world.clock;
    const slot = bugSlot(minute);
    if (day === this.day && slot === this.slot) return;
    this.day = day;
    this.slot = slot;
    this.caught.clear();
    // Not where a decoration stands in the way.
    const blocked = new Set(
      this.room.world.decorations
        .filter((piece) => blocksWalking(piece.itemId))
        .flatMap(coveredTiles)
        .map(({ col, row }) => `${col},${row}`),
    );
    // Where they flutter: the meadow's open grass you can get to today, minus the paths and doorsteps kept clear.
    this.bugs = meadowBugs({ day, slot, worldSeed: this.room.world.worldSeed, tiles: this.room.today.meadow, blocked });
    this.sync();
  }

  private sync() {
    writeBugs(
      this.room.state.bugs,
      this.bugs.filter((bug) => !this.caught.has(bug.id)),
    );
  }

  private catch(client: Client, message: CatchBugMessage) {
    const player = this.room.state.players.get(client.sessionId);
    if (!player || this.room.isBusy(client) || typeof message?.id !== "string") return;
    const bug = this.bugs.find((b) => b.id === message.id && !this.caught.has(b.id));
    if (!bug) return this.room.hint(client, { reason: "flew-off" });
    const spot = tileCenter(bug.col, bug.row);
    // Light step (Foraging level 3) and the bug net (Milestone 8): each from a step further away.
    const farmer = this.room.world.farmers[player.farmerId];
    const net = toolOfKind(farmer?.bag ?? [], "net")?.def.reachTiles ?? 0;
    const reach = MEADOW.serverCatchTiles + (hasPerk(farmer?.progress, "lightStep") ? PERK.lightStepTiles : 0) + net;
    const far = Math.hypot(spot.x - player.x, spot.y - (player.y + FEET_OFFSET)) > reach * TILE_SIZE;
    if (far) return this.room.hint(client, { reason: "too-far" });
    if (applyCollected(this.room, client, collectBug(this.room.world, player.farmerId, bug.bugId))) {
      this.caught.add(bug.id);
      this.sync();
      credit(this.room, player.farmerId, { kind: "bug", bugId: bug.bugId });
    }
  }
}
