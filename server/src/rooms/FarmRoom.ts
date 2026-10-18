import { type Client, Room } from "colyseus";
import { TILE_SIZE } from "../../../shared/constants";
import type { MoveMessage } from "../../../shared/messages";
import { FACINGS } from "../../../shared/movement";
import { FarmState, Player } from "../../../shared/schema";
import { tileCenter } from "../../../shared/world/map";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";

const WORLD_WIDTH = VILLAGE_MAP.width * TILE_SIZE;
const WORLD_HEIGHT = VILLAGE_MAP.height * TILE_SIZE;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** The one shared world that both players join. */
export class FarmRoom extends Room<FarmState> {
  maxClients = 4;

  onCreate() {
    this.setState(new FarmState());
    this.onMessage("move", (client, message: MoveMessage) => this.movePlayer(client, message));
  }

  onJoin(client: Client) {
    const spawn = tileCenter(VILLAGE_MAP.spawn.col, VILLAGE_MAP.spawn.row);
    const player = new Player();
    player.x = spawn.x;
    player.y = spawn.y;
    this.state.players.set(client.sessionId, player);
    console.log(`${client.sessionId} joined (${this.state.players.size} online)`);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    console.log(`${client.sessionId} left (${this.state.players.size} online)`);
  }

  private movePlayer(client: Client, message: MoveMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !Number.isFinite(message?.x) || !Number.isFinite(message?.y)) return;
    player.x = clamp(message.x, 0, WORLD_WIDTH);
    player.y = clamp(message.y, 0, WORLD_HEIGHT);
    if (FACINGS.includes(message.facing)) player.facing = message.facing;
  }
}
