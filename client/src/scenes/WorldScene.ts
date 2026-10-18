import Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import { POSITION_SEND_MS, TILE_SIZE, WALK_SPEED } from "../../../shared/constants";
import { DEFAULT_CHARACTER } from "../../../shared/content/characters";
import type { EmoteId } from "../../../shared/content/emotes";
import { PositionBuffer, REMOTE_DELAY_MS } from "../../../shared/interpolation";
import type { EmoteEvent, EmoteMessage, JoinOptions, LookMessage, MoveMessage } from "../../../shared/messages";
import { clampMove, type Facing, facingFor, isFacing, type Vec } from "../../../shared/movement";
import { isEmote, type Look, lookFrom } from "../../../shared/player";
import type { FarmState, Player } from "../../../shared/schema";
import { readClock } from "../../../shared/stateSync";
import type { GameClock } from "../../../shared/time/clock";
import { tileCenter } from "../../../shared/world/map";
import { COLLISION_LAYER, FARMLAND_LAYER, isAboveCharacters, OBJECTS_LAYER } from "../../../shared/world/tiledMap";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import {
  characterKey,
  RIPPLE_ANIM,
  RIPPLES_KEY,
  SHIPPING_CRATE_KEY,
  tilesetKey,
  VILLAGE_KEY,
  walkFrames,
} from "../art/assets";
import { startMusic } from "../audio/music";
import { installDevCommands } from "../net/devCommands";
import { FarmConnection } from "../net/connection";
import { pickLook } from "../ui/LookPicker";
import { loadLook, saveLook } from "../ui/lookStorage";
import { Character } from "../world/Character";
import type { UIScene } from "./UIScene";

/** The camera picks the whole-number zoom that shows about this many tiles across the screen's shorter side. */
const TARGET_VISIBLE_TILES = 12;

/** Map layers draw under the characters (whose depth is their y), except tree tops, which draw over them. */
const GROUND_DEPTH = -1000;
const ABOVE_DEPTH = 500_000;

/** A remote player counts as walking until they've stood still this long, so brief pauses between updates don't flicker. */
const REMOTE_STILL_MS = 150;

type Direction = "up" | "down" | "left" | "right";

/** Another player, drawn a moment behind where the server says they are, so they move smoothly. */
interface RemotePlayer {
  character: Character;
  positions: PositionBuffer;
  /** When their drawn position last changed (performance.now()). */
  lastMovedAt: number;
}

/** The village itself: map, characters, camera. */
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private me!: Character;
  private look!: Look;
  private remotes = new Map<string, RemotePlayer>();
  private keys!: Record<Direction, Phaser.Input.Keyboard.Key[]>;
  private ui!: UIScene;
  private connection!: FarmConnection;
  private room: Room<FarmState> | null = null;
  private zoom = 1;
  private facing: Facing = "down";
  private lastSent = { x: NaN, y: NaN, facing: "down" as Facing, at: 0 };

  constructor() {
    super("world");
  }

  create() {
    const map = this.make.tilemap({ key: VILLAGE_KEY });
    const collision = this.buildMap(map);

    const savedLook = loadLook();
    this.look = savedLook ?? { name: "", character: DEFAULT_CHARACTER };
    this.registry.set("look", this.look);

    const spawn = tileCenter(VILLAGE_MAP.spawn.col, VILLAGE_MAP.spawn.row);
    this.player = this.physics.add.sprite(spawn.x, spawn.y, characterKey(this.look.character), 0);
    // Collide with the feet only, so characters can walk up behind trees and fences.
    this.player.body.setSize(10, 6).setOffset(3, 10);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.add.collider(this.player, collision);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(this.player, true);
    this.fitZoom();
    this.me = new Character(this, this.player, this.look, this.zoom);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitZoom, this);
    // Name tags and bubbles follow their sprites after physics has moved them this frame.
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.followSprites, this);

    const keyboard = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: [keyboard.addKey(K.W), keyboard.addKey(K.UP)],
      down: [keyboard.addKey(K.S), keyboard.addKey(K.DOWN)],
      left: [keyboard.addKey(K.A), keyboard.addKey(K.LEFT)],
      right: [keyboard.addKey(K.D), keyboard.addKey(K.RIGHT)],
    };

    this.scene.launch("ui");
    this.ui = this.scene.get("ui") as UIScene;
    this.ui.events.on("emote", (emote: EmoteId) => this.emote(emote));
    this.ui.events.on("editLook", () => void this.changeLook());
    startMusic(this);
    installDevCommands((message) => this.room?.send("dev", message));

    this.connection = new FarmConnection(() => this.joinOptions(), {
      status: (status) => this.registry.set("netStatus", status),
      joined: (room) => this.onJoined(room),
      lost: () => this.onLost(),
    });
    // First time on this device: pick a name and character before joining, so the other player sees who arrived.
    if (savedLook) this.connection.start();
    else void this.changeLook(true).then(() => this.connection.start());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitZoom, this);
      this.connection.stop();
    });
  }

  update(time: number) {
    const input = this.readInput();
    const move = clampMove(input.x, input.y);
    this.player.setVelocity(move.x * WALK_SPEED, move.y * WALK_SPEED);
    this.facing = facingFor(move.x, move.y, this.facing);
    this.me.setMotion(this.facing, move.x !== 0 || move.y !== 0);
    this.sendPosition(time);

    const now = performance.now();
    const drawAt = now - REMOTE_DELAY_MS;
    for (const remote of this.remotes.values()) {
      const pose = remote.positions.sample(drawAt);
      if (!pose) continue;
      const { sprite } = remote.character;
      if (pose.x !== sprite.x || pose.y !== sprite.y) remote.lastMovedAt = now;
      sprite.setPosition(pose.x, pose.y);
      remote.character.setMotion(pose.facing, now - remote.lastMovedAt < REMOTE_STILL_MS);
    }
  }

  /**
   * Draws the Tiled map: every tile layer in Tiled's order, tree tops over the characters,
   * the shipping crate, and ripples on the sea. Returns the hidden collision layer.
   */
  private buildMap(map: Phaser.Tilemaps.Tilemap): Phaser.Tilemaps.TilemapLayer {
    const tilesets = map.tilesets.map((tileset) => map.addTilesetImage(tileset.name, tilesetKey(tileset.name))!);
    map.layers.forEach((data, index) => {
      if (data.name === COLLISION_LAYER || data.name === FARMLAND_LAYER) return;
      // Always shown, even if it was hidden in Tiled while editing.
      const layer = map.createLayer(data.name, tilesets, 0, 0)!.setVisible(true).setAlpha(1);
      layer.setDepth(isAboveCharacters(data) ? ABOVE_DEPTH + index : GROUND_DEPTH + index * 10);
    });
    const collision = map.createLayer(COLLISION_LAYER, tilesets, 0, 0)!.setVisible(false);
    collision.setCollisionByExclusion([-1]);

    const crate = VILLAGE_MAP.shippingCrate;
    this.add
      .image(crate.x, crate.y, SHIPPING_CRATE_KEY, 0)
      .setOrigin(0, 0)
      .setDepth(crate.y + crate.height);

    // Ripples sit on the water, just above the ground layer.
    for (const ripple of map.getObjectLayer(OBJECTS_LAYER)?.objects ?? []) {
      if (ripple.name !== "ripple") continue;
      this.add
        .sprite(ripple.x ?? 0, ripple.y ?? 0, RIPPLES_KEY)
        .setDepth(GROUND_DEPTH + 1)
        .play({ key: RIPPLE_ANIM, delay: Phaser.Math.Between(0, 2000), repeatDelay: Phaser.Math.Between(500, 3000) });
    }
    return collision;
  }

  /** The joystick wins while it's held; otherwise WASD or the arrow keys. */
  private readInput(): Vec {
    const stick = this.ui.joystick?.vector;
    if (stick && (stick.x !== 0 || stick.y !== 0)) return stick;
    const held = (dir: Direction) => (this.keys[dir].some((key) => key.isDown) ? 1 : 0);
    return { x: held("right") - held("left"), y: held("down") - held("up") };
  }

  private followSprites() {
    this.me.followSprite();
    for (const { character } of this.remotes.values()) character.followSprite();
  }

  private sendPosition(time: number) {
    if (!this.room || time - this.lastSent.at < POSITION_SEND_MS) return;
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    const { lastSent } = this;
    if (x === lastSent.x && y === lastSent.y && this.facing === lastSent.facing) return;
    const message: MoveMessage = { x, y, facing: this.facing, sentAt: Math.round(performance.now()) };
    this.room.send("move", message);
    this.lastSent = { x, y, facing: this.facing, at: time };
  }

  /** Who we are and where we're standing, so rejoining after a dropped connection carries on in place. */
  private joinOptions(): JoinOptions {
    return { ...this.look, x: Math.round(this.player.x), y: Math.round(this.player.y), facing: this.facing };
  }

  private onJoined(room: Room<FarmState>) {
    this.room = room;
    this.lastSent = { x: NaN, y: NaN, facing: this.facing, at: 0 };
    const $ = getStateCallbacks(room);
    $(room.state).players.onAdd((player, sessionId) => {
      if (sessionId === room.sessionId) return;
      const remote = this.addRemote(sessionId, player);
      $(player).onChange(() => {
        this.recordPosition(remote, player);
        remote.character.setLook(lookFrom(player));
      });
    });
    $(room.state).players.onRemove((_player, sessionId) => this.removeRemote(sessionId));
    room.onStateChange((state) => this.readState(state));
    room.onMessage("emote", (event: EmoteEvent) => {
      if (isEmote(event?.emote)) this.remotes.get(event.sessionId)?.character.showEmote(event.emote);
    });
  }

  /** After every update from the server: passes on whatever the HUD shows. */
  private readState(state: FarmState) {
    const clock = readClock(state.clock);
    const shown = this.registry.get("clock") as GameClock | null;
    if (!shown || shown.day !== clock.day || shown.minute !== clock.minute) this.registry.set("clock", clock);
  }

  /** The connection dropped: other players will come back when we rejoin (with new session ids). */
  private onLost() {
    this.room = null;
    for (const sessionId of [...this.remotes.keys()]) this.removeRemote(sessionId);
  }

  private addRemote(sessionId: string, player: Player): RemotePlayer {
    this.removeRemote(sessionId);
    const look = lookFrom(player);
    const sprite = this.add.sprite(player.x, player.y, characterKey(look.character), 0);
    const remote: RemotePlayer = {
      character: new Character(this, sprite, look, this.zoom),
      positions: new PositionBuffer(),
      lastMovedAt: 0,
    };
    this.recordPosition(remote, player);
    this.remotes.set(sessionId, remote);
    return remote;
  }

  private recordPosition(remote: RemotePlayer, player: Player) {
    const facing = isFacing(player.facing) ? player.facing : "down";
    remote.positions.push(performance.now(), player.sentAt, player.x, player.y, facing);
  }

  private removeRemote(sessionId: string) {
    this.remotes.get(sessionId)?.character.destroy();
    this.remotes.delete(sessionId);
  }

  private emote(emote: EmoteId) {
    // Shown right away for us; the server passes it on to everyone else.
    this.me.showEmote(emote);
    const message: EmoteMessage = { emote };
    this.room?.send("emote", message);
  }

  /** Opens the name and character picker, then remembers the choice on this device and tells the server. */
  private async changeLook(firstTime = false) {
    this.input.keyboard?.resetKeys();
    const look = await pickLook({
      current: firstTime ? null : this.look,
      frame: (character, frame) => this.textures.getBase64(characterKey(character), frame),
      walkFrames: walkFrames("down"),
    });
    if (!look) return;
    this.look = look;
    saveLook(look);
    this.registry.set("look", look);
    this.me.setLook(look);
    const message: LookMessage = look;
    this.room?.send("look", message);
  }

  private fitZoom() {
    const shortSide = Math.min(this.scale.width, this.scale.height);
    this.zoom = Math.max(1, Math.round(shortSide / (TILE_SIZE * TARGET_VISIBLE_TILES)));
    this.cameras.main.setZoom(this.zoom);
    this.me?.setZoom(this.zoom);
    for (const { character } of this.remotes.values()) character.setZoom(this.zoom);
  }
}
