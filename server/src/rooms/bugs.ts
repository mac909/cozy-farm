import type { Client } from "colyseus";
import { bugSlot, MEADOW, meadowBugs, type MeadowBug } from "../../../shared/bugs/meadow";
import { collectBug } from "../../../shared/collection/collect";
import { blocksWalking } from "../../../shared/content/furniture";
import { FEET_OFFSET, TILE_SIZE } from "../../../shared/constants";
import { farmKeepClear } from "../../../shared/decor/boards";
import { coveredTiles } from "../../../shared/decor/pieces";
import type { CatchBugMessage } from "../../../shared/messages";
import { writeBugs } from "../../../shared/stateSync";
import { tileCenter } from "../../../shared/world/map";
import { meadowGrass } from "../../../shared/world/terrain";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { applyCollected } from "./collection";
import type { FarmRoom } from "./FarmRoom";

/** Where bugs flutter: the meadow's open grass, minus the paths and doorsteps kept clear. Read from the map once. */
const KEEP_CLEAR = farmKeepClear(VILLAGE_MAP);
const MEADOW_TILES = meadowGrass(VILLAGE_MAP).filter(({ col, row }) => !KEEP_CLEAR.has(`${col},${row}`));

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
    this.bugs = meadowBugs({ day, slot, worldSeed: this.room.world.worldSeed, tiles: MEADOW_TILES, blocked });
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
    const far = Math.hypot(spot.x - player.x, spot.y - (player.y + FEET_OFFSET)) > MEADOW.serverCatchTiles * TILE_SIZE;
    if (far) return this.room.hint(client, { reason: "too-far" });
    if (applyCollected(this.room, client, collectBug(this.room.world, player.farmerId, bug.bugId))) {
      this.caught.add(bug.id);
      this.sync();
    }
  }
}
