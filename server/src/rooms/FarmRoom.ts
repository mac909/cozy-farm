import { randomUUID } from "node:crypto";
import { type Client, Room } from "colyseus";
import { REPLACED_CLOSE_CODE, TILE_SIZE } from "../../../shared/constants";
import type { Hint } from "../../../shared/farming/actions";
import type {
  EmoteEvent,
  EmoteMessage,
  HintMessage,
  JoinOptions,
  LookMessage,
  MorningMessage,
  MoveMessage,
  ReplacedMessage,
  YouMessage,
} from "../../../shared/messages";
import { isFacing } from "../../../shared/movement";
import { isEmote, type Look, lookFrom } from "../../../shared/player";
import { FarmState, Player } from "../../../shared/schema";
import {
  steppedMinute,
  writeBag,
  writeBeach,
  writeBook,
  writeClock,
  writeCrate,
  writeFarm,
  writeHouses,
  writePieces,
} from "../../../shared/stateSync";
import { tideIn } from "../../../shared/beachcombing/tide";
import { tickClock } from "../../../shared/time/clock";
import { tileCenter } from "../../../shared/world/map";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import {
  addFarmer,
  farmerOf,
  giveFishingRod,
  isFarmerId,
  listFarmers,
  setFarmerLook,
  type FarmerId,
  type World,
} from "../../../shared/world/world";
import { liveWorld } from "../world/liveWorld";
import { registerBag } from "./bag";
import { registerBeach, VILLAGE_SHORE } from "./beach";
import { registerCrate } from "./crate";
import { registerDecor } from "./decor";
import { registerDevCommands } from "./dev";
import { registerFarming } from "./farming";
import { registerFishing } from "./fishing";
import { registerHouses } from "./houses";
import { Bedtime } from "./night";
import { registerShop } from "./shop";

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
  private bedtime!: Bedtime;
  private fishing!: ReturnType<typeof registerFishing>;

  onCreate() {
    this.setState(new FarmState());
    // A world whose beach has never had a tide (brand new, or saved before Milestone 5) gets its first now.
    const tide = tideIn(this.world, VILLAGE_SHORE);
    if (tide.world !== this.world) liveWorld().set(tide.world);
    this.syncWorld();
    this.onMessage("move", (client, message: MoveMessage) => this.movePlayer(client, message));
    this.onMessage("look", (client, message: LookMessage) => this.changeLook(client, message));
    this.onMessage("emote", (client, message: EmoteMessage) => this.emote(client, message));
    // Each feature's messages live in their own file in this folder.
    registerFarming(this);
    registerBag(this);
    registerCrate(this);
    registerShop(this);
    registerHouses(this);
    registerDecor(this);
    registerBeach(this);
    this.fishing = registerFishing(this);
    this.bedtime = new Bedtime(this);
    registerDevCommands(this, () => this.bedtime.startNight());
    this.setSimulationInterval((deltaMs) => this.tick(deltaMs), TICK_MS);
  }

  onJoin(client: Client, options?: Partial<JoinOptions>) {
    const look = lookFrom(options);
    const { farmerId, tellDevice } = this.whoIsJoining(options, look);
    const known = farmerOf(this.world, farmerId) !== undefined;
    const joined = known ? setFarmerLook(this.world, farmerId, look) : addFarmer(this.world, farmerId, look);
    // Anyone still without a fishing rod (their bag was full when the save was upgraded) gets one now, if there's room.
    this.change(giveFishingRod(joined, farmerId));

    const player = new Player();
    const spawn = tileCenter(VILLAGE_MAP.spawn.col, VILLAGE_MAP.spawn.row);
    player.x = spawn.x;
    player.y = spawn.y;
    // Someone rejoining after a dropped connection carries on from where they were.
    this.place(player, options ?? {});
    player.name = look.name;
    player.character = look.character;
    player.farmerId = farmerId;
    this.state.players.set(client.sessionId, player);
    this.syncWorld();
    console.log(`${player.name} (${client.sessionId}) joined${known ? "" : " as someone new"} (${this.state.players.size} online)`);

    if (tellDevice) client.send("you", { farmerId } satisfies YouMessage);
    this.bedtime.joined(farmerId);
    this.replaceOlderDevices(client, farmerId);
    // Whoever missed the last morning catches up; the device knows if it already showed it.
    const morning = this.world.lastMorning;
    if (morning) client.send("morning", morning satisfies MorningMessage);
  }

  /**
   * Which farmer is joining. A device that knows its farmer id says so; one whose id the server
   * doesn't know (a dev save that was wiped, an older backup) gets a farmer made for it. Someone
   * new gets an id from the server (plain http:// pages can't make good ones). A page loaded before
   * farmers existed gets the farmer with its name and character, or a new one.
   */
  private whoIsJoining(options: Partial<JoinOptions> | undefined, look: Look): { farmerId: FarmerId; tellDevice: boolean } {
    if (isFarmerId(options?.farmerId)) return { farmerId: options.farmerId, tellDevice: false };
    if (options?.newFarmer !== true) {
      const same = listFarmers(this.world).find((f) => f.name === look.name && f.character === look.character);
      if (same) return { farmerId: same.id, tellDevice: true };
    }
    return { farmerId: randomUUID(), tellDevice: true };
  }

  /** The same farmer on two devices: the newest one wins, and the older one is told why it was let go. */
  private replaceOlderDevices(newest: Client, farmerId: FarmerId) {
    for (const other of this.clients) {
      if (other === newest || this.state.players.get(other.sessionId)?.farmerId !== farmerId) continue;
      console.log(`${other.sessionId} replaced by ${newest.sessionId} (same farmer on another device)`);
      other.send("replaced", {} satisfies ReplacedMessage);
      other.leave(REPLACED_CLOSE_CODE);
    }
  }

  /** Tells one player why what they tried didn't work. */
  hint(client: Client, hint: Hint) {
    client.send("hint", hint satisfies HintMessage);
  }

  /** Whether a player can't act right now: they're in bed. */
  isBusy(client: Client): boolean {
    return this.bedtime.inBed(client);
  }

  /** The farmer a connected player is, if they're still here. */
  farmerIdOf(client: Client): FarmerId | undefined {
    return this.state.players.get(client.sessionId)?.farmerId || undefined;
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    console.log(`${player?.name} (${client.sessionId}) left (${this.state.players.size} online)`);
    if (player) this.bedtime.left(player);
    this.fishing.left(client);
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
    writeFarm(this.state.farm, world.farm);
    writeCrate(this.state.crate, world.crate);
    writeHouses(this.state.houses, world.houses, world.farmers);
    writePieces(this.state.decorations, world.decorations);
    writeBeach(this.state.beach, world.beach.finds);
    writeBook(this.state.book, world.book);
    this.state.players.forEach((player) => {
      const farmer = farmerOf(world, player.farmerId);
      if (farmer) writeBag(player.bag, farmer.bag);
    });
  }

  /**
   * Time passes only while someone's here. The network clock (and the save) only change every 10
   * game minutes. Then: is it time for the night (midnight, or the wait for a dropped player is over)?
   */
  private tick(deltaMs: number) {
    if (this.state.players.size === 0) return;
    const before = this.world.clock;
    const clock = tickClock(before, deltaMs);
    if (clock !== before) {
      const stepped = clock.day !== before.day || steppedMinute(clock.minute) !== steppedMinute(before.minute);
      this.change({ ...this.world, clock }, { save: stepped });
    }
    this.bedtime.check();
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

  /** A new name or character: for the player on screen, and for their farmer (whose bag stays). */
  private changeLook(client: Client, message: LookMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const look = lookFrom(message);
    player.name = look.name;
    player.character = look.character;
    this.change(setFarmerLook(this.world, player.farmerId, look));
  }

  private emote(client: Client, message: EmoteMessage) {
    if (!this.state.players.has(client.sessionId) || !isEmote(message?.emote)) return;
    const event: EmoteEvent = { sessionId: client.sessionId, emote: message.emote };
    // The sender already shows it, without waiting for the round trip.
    this.broadcast("emote", event, { except: client });
  }
}
