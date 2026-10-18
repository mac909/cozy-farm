import { type Client, Room } from "colyseus";
import { TILE_SIZE } from "../../../shared/constants";
import type { EmoteEvent, EmoteMessage, JoinOptions, LookMessage, MoveMessage } from "../../../shared/messages";
import { isFacing } from "../../../shared/movement";
import { isEmote, lookFrom } from "../../../shared/player";
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
    this.onMessage("look", (client, message: LookMessage) => this.changeLook(client, message));
    this.onMessage("emote", (client, message: EmoteMessage) => this.emote(client, message));
  }

  onJoin(client: Client, options?: Partial<JoinOptions>) {
    const player = new Player();
    const spawn = tileCenter(VILLAGE_MAP.spawn.col, VILLAGE_MAP.spawn.row);
    player.x = spawn.x;
    player.y = spawn.y;
    // Someone rejoining after a dropped connection carries on from where they were.
    this.place(player, options ?? {});
    this.dress(player, options);
    this.state.players.set(client.sessionId, player);
    console.log(`${player.name} (${client.sessionId}) joined (${this.state.players.size} online)`);
  }

  onLeave(client: Client) {
    const name = this.state.players.get(client.sessionId)?.name;
    this.state.players.delete(client.sessionId);
    console.log(`${name} (${client.sessionId}) left (${this.state.players.size} online)`);
  }

  private movePlayer(client: Client, message: MoveMessage) {
    const player = this.state.players.get(client.sessionId);
    if (player) this.place(player, message ?? {});
  }

  /** Applies a reported position and facing, ignoring anything that isn't a sensible value. */
  private place(player: Player, at: { x?: unknown; y?: unknown; facing?: unknown; sentAt?: unknown }) {
    if (Number.isFinite(at.x) && Number.isFinite(at.y)) {
      player.x = clamp(at.x as number, 0, WORLD_WIDTH);
      player.y = clamp(at.y as number, 0, WORLD_HEIGHT);
    }
    if (isFacing(at.facing)) player.facing = at.facing;
    if (Number.isFinite(at.sentAt)) player.sentAt = at.sentAt as number;
  }

  private changeLook(client: Client, message: LookMessage) {
    const player = this.state.players.get(client.sessionId);
    if (player) this.dress(player, message);
  }

  private dress(player: Player, look: unknown) {
    const { name, color } = lookFrom(look);
    player.name = name;
    player.color = color;
  }

  private emote(client: Client, message: EmoteMessage) {
    if (!this.state.players.has(client.sessionId) || !isEmote(message?.emote)) return;
    const event: EmoteEvent = { sessionId: client.sessionId, emote: message.emote };
    // The sender already shows it, without waiting for the round trip.
    this.broadcast("emote", event, { except: client });
  }
}
