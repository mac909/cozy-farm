import { type Client, Room } from "colyseus";
import { TILE_SIZE } from "../../../shared/constants";
import type { EmoteEvent, EmoteMessage, JoinOptions, LookMessage, MoveMessage } from "../../../shared/messages";
import { isFacing } from "../../../shared/movement";
import { isEmote, lookFrom } from "../../../shared/player";
import { FarmState, Player } from "../../../shared/schema";
import { steppedMinute, writeClock } from "../../../shared/stateSync";
import { tickClock } from "../../../shared/time/clock";
import { tileCenter } from "../../../shared/world/map";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import type { World } from "../../../shared/world/world";
import { liveWorld } from "../world/liveWorld";
import { registerDevCommands } from "./dev";

const WORLD_WIDTH = VILLAGE_MAP.width * TILE_SIZE;
const WORLD_HEIGHT = VILLAGE_MAP.height * TILE_SIZE;

/** How often the room's clock ticks, in milliseconds. */
const TICK_MS = 250;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * The one shared world that both players join. It's made when the server starts and never closes.
 *
 * The plain World in liveWorld() is the source of truth: message handlers (one file per feature in
 * this folder) change it through `change()`, which copies what changed into the network state and
 * saves soon after.
 */
export class FarmRoom extends Room<FarmState> {
  maxClients = 8;
  autoDispose = false;

  onCreate() {
    this.setState(new FarmState());
    this.syncWorld();
    this.onMessage("move", (client, message: MoveMessage) => this.movePlayer(client, message));
    this.onMessage("look", (client, message: LookMessage) => this.changeLook(client, message));
    this.onMessage("emote", (client, message: EmoteMessage) => this.emote(client, message));
    registerDevCommands(this);
    this.setSimulationInterval((deltaMs) => this.tick(deltaMs), TICK_MS);
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
    // Nobody's left to change anything, so save now rather than in a moment.
    if (this.state.players.size === 0) liveWorld().saveNow();
  }

  /** The world as it is now. Treat it as read-only; change it with `change()`. */
  get world(): World {
    return liveWorld().world;
  }

  /** Replaces the world, copies what changed into the network state, and saves soon. */
  change(next: World, options?: { save?: boolean }) {
    liveWorld().set(next, options);
    this.syncWorld();
  }

  /** Copies the world into the network state. Only changed values are written, so only they get sent. */
  syncWorld() {
    const world = this.world;
    writeClock(this.state.clock, world.clock);
    if (this.state.coins !== world.coins) this.state.coins = world.coins;
  }

  /** Time passes only while someone's here. The network clock (and the save) only change every 10 game minutes. */
  private tick(deltaMs: number) {
    if (this.state.players.size === 0) return;
    const before = this.world.clock;
    const clock = tickClock(before, deltaMs);
    if (clock === before) return;
    const stepped = clock.day !== before.day || steppedMinute(clock.minute) !== steppedMinute(before.minute);
    this.change({ ...this.world, clock }, { save: stepped });
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
    const { name, character } = lookFrom(look);
    player.name = name;
    player.character = character;
  }

  private emote(client: Client, message: EmoteMessage) {
    if (!this.state.players.has(client.sessionId) || !isEmote(message?.emote)) return;
    const event: EmoteEvent = { sessionId: client.sessionId, emote: message.emote };
    // The sender already shows it, without waiting for the round trip.
    this.broadcast("emote", event, { except: client });
  }
}
