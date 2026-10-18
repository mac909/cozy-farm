import Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import { POSITION_SEND_MS, TILE_SIZE, WALK_SPEED } from "../../../shared/constants";
import { DEFAULT_CHARACTER } from "../../../shared/content/characters";
import type { EmoteId } from "../../../shared/content/emotes";
import { ITEMS, type ItemId } from "../../../shared/content/items";
import { isHint } from "../../../shared/farming/actions";
import { PositionBuffer, REMOTE_DELAY_MS } from "../../../shared/interpolation";
import type {
  BuyMessage,
  EmoteEvent,
  EmoteMessage,
  JoinOptions,
  LookMessage,
  MorningMessage,
  MoveItemMessage,
  MoveMessage,
  ShipMessage,
  SplitStackMessage,
  UnshipMessage,
  WakeUpMessage,
  YouMessage,
} from "../../../shared/messages";
import { clampMove, type Facing, facingFor, isFacing, type Vec } from "../../../shared/movement";
import { isEmote, type Look, lookFrom } from "../../../shared/player";
import type { FarmState, Player } from "../../../shared/schema";
import { countOf, type Inventory } from "../../../shared/inventory/inventory";
import type { Crate } from "../../../shared/economy/shop";
import { readBag, readClock, readCrate } from "../../../shared/stateSync";
import type { GameClock } from "../../../shared/time/clock";
import { tileCenter } from "../../../shared/world/map";
import { COLLISION_LAYER, FARMLAND_LAYER, isAboveCharacters, OBJECTS_LAYER } from "../../../shared/world/tiledMap";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { isFarmerId, type FarmerId } from "../../../shared/world/world";
import {
  characterKey,
  COIN_KEY,
  RIPPLE_ANIM,
  RIPPLES_KEY,
  SEED_STAND_KEY,
  SHIPPING_CRATE_KEY,
  tilesetKey,
  VILLAGE_KEY,
  walkFrames,
} from "../art/assets";
import { iconUrl, itemIcon } from "../art/itemIcons";
import { startMusic } from "../audio/music";
import { installDevCommands } from "../net/devCommands";
import { FarmConnection } from "../net/connection";
import { fetchFarmers } from "../net/farmers";
import { pickFarmer, showOtherDevice } from "../ui/FarmerPicker";
import { loadFarmerId, saveFarmerId } from "../ui/farmerStorage";
import { pickLook } from "../ui/LookPicker";
import { loadLook, saveLook } from "../ui/lookStorage";
import { BagPanel } from "../ui/BagPanel";
import { CratePanel } from "../ui/CratePanel";
import { ShopPanel } from "../ui/ShopPanel";
import { Bedtime } from "../world/Bedtime";
import { Character } from "../world/Character";
import { Farming } from "../world/Farming";
import { Outline } from "../world/Outline";
import type { UIScene } from "./UIScene";

/** A card over the game (bag, crate, seed stand). */
interface OpenPanel {
  readonly isOpen: boolean;
  close(): void;
}

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
  /** The farmer this device plays, once known. Null until picked, or for someone new until the server says. */
  private farmerId: FarmerId | null = null;
  private remotes = new Map<string, RemotePlayer>();
  private keys!: Record<Direction, Phaser.Input.Keyboard.Key[]>;
  private ui!: UIScene;
  private connection!: FarmConnection;
  private room: Room<FarmState> | null = null;
  private zoom = 1;
  private facing: Facing = "down";
  private lastSent = { x: NaN, y: NaN, facing: "down" as Facing, at: 0 };
  private farming!: Farming;
  private bedtime!: Bedtime;
  /** The shipping crate on the dock, and what's in it as the server last said. */
  private crateSprite!: Phaser.GameObjects.Image;
  private crate: Crate = [];

  constructor() {
    super("world");
  }

  create() {
    const map = this.make.tilemap({ key: VILLAGE_KEY });
    const collision = this.buildMap(map);

    const savedLook = loadLook();
    this.farmerId = loadFarmerId();
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
    this.ui.events.on("bag", () => this.toggleBag());
    startMusic(this);
    installDevCommands((message) => this.room?.send("dev", message));

    this.bedtime = new Bedtime(this, {
      room: () => this.room,
      me: this.me,
      wakeAt: (x, y) => this.teleport(x, y, "down"),
      fade: (atDark, done) => this.ui.nightFade(atDark, done),
      closePanels: () => this.closePanel(),
      show: ({ inBed, sleepers }) => {
        if (this.registry.get("inBed") !== inBed) this.registry.set("inBed", inBed);
        if (this.registry.get("sleepers") !== sleepers) this.registry.set("sleepers", sleepers);
      },
      coinIcon: () => iconUrl(this.textures, { key: COIN_KEY }),
    });
    this.ui.events.on("escape", () => this.bedtime.wake());

    this.farming = new Farming(this, new Outline(this), {
      me: this.me,
      facing: () => this.facing,
      face: (facing) => (this.facing = facing),
      room: () => this.room,
      bag: () => this.registry.get("bag") as Inventory | null,
      selectedSlot: () => this.registry.get("selectedSlot") as number,
      showAction: (view) => this.ui.setAction(view),
      busy: () => this.bedtime.asleep || this.panel?.isOpen === true,
      places: { tent: () => this.bedtime.sleep(), crate: () => this.openCrate(), seedStand: () => this.openShop() },
    });
    this.ui.events.on("action", () => this.farming.act());

    this.connection = new FarmConnection(() => this.joinOptions(), {
      status: (status) => this.registry.set("netStatus", status),
      joined: (room) => this.onJoined(room),
      lost: () => this.onLost(),
      replaced: () => void showOtherDevice(this.look.name).then(() => this.connection.resume()),
    });
    // First time on this device: who's playing (and for someone new, their name and character) before
    // joining, so the other player sees who arrived and everyone gets their own bag.
    if (savedLook && this.farmerId) this.connection.start();
    else void this.chooseFarmer(savedLook).then(() => this.connection.start());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitZoom, this);
      this.connection.stop();
    });
  }

  update(time: number) {
    const input = this.readInput();
    // In bed you stay put; moving gets you up instead.
    const move = this.bedtime.holdStill(input) ? { x: 0, y: 0 } : clampMove(input.x, input.y);
    this.player.setVelocity(move.x * WALK_SPEED, move.y * WALK_SPEED);
    this.facing = facingFor(move.x, move.y, this.facing);
    this.me.setMotion(this.facing, move.x !== 0 || move.y !== 0);
    this.sendPosition(time);
    this.farming.update();

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
    this.crateSprite = this.add
      .image(crate.x, crate.y, SHIPPING_CRATE_KEY, 0)
      .setOrigin(0, 0)
      .setDepth(crate.y + crate.height);
    const stand = VILLAGE_MAP.seedStand;
    this.add
      .image(stand.x, stand.y, SEED_STAND_KEY)
      .setOrigin(0, 0)
      .setDepth(stand.y + stand.height);

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
    return {
      ...this.look,
      farmerId: this.farmerId ?? undefined,
      newFarmer: this.farmerId === null,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      facing: this.facing,
    };
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
        // Asleep in the tent.
        remote.character.setHidden(player.inBed);
      });
    });
    room.onMessage("wakeUp", (message: WakeUpMessage) => this.bedtime.wakeUp(message));
    room.onMessage("morning", (report: MorningMessage) => this.bedtime.morning(report));
    $(room.state).players.onRemove((_player, sessionId) => this.removeRemote(sessionId));
    this.farming.joined();
    room.onStateChange((state) => this.readState(state));
    room.onMessage("hint", (hint: unknown) => {
      if (isHint(hint)) this.farming.hint(hint);
    });
    room.onMessage("you", (message: YouMessage) => {
      if (!isFarmerId(message?.farmerId)) return;
      this.farmerId = message.farmerId;
      saveFarmerId(message.farmerId);
    });
    // The connection handles being replaced (by its close code); this just keeps Colyseus from warning.
    room.onMessage("replaced", () => {});
    room.onMessage("emote", (event: EmoteEvent) => {
      if (isEmote(event?.emote)) this.remotes.get(event.sessionId)?.character.showEmote(event.emote);
    });
  }

  /** After every update from the server: passes on whatever the HUD shows. */
  private readState(state: FarmState) {
    const clock = readClock(state.clock);
    const shown = this.registry.get("clock") as GameClock | null;
    if (!shown || shown.day !== clock.day || shown.minute !== clock.minute) {
      this.registry.set("clock", clock);
      this.bedtime.clock(clock);
    }
    if (this.room) this.bedtime.readState(state, this.room.sessionId);

    const me = this.room ? state.players.get(this.room.sessionId) : undefined;
    const bag = me ? readBag(me.bag) : null;
    const before = this.registry.get("bag") as Inventory | null;
    let changed = false;
    if (JSON.stringify(bag) !== JSON.stringify(before)) {
      if (before && bag) this.announceNewItems(before, bag);
      this.registry.set("bag", bag);
      changed = true;
    }
    if (this.registry.get("coins") !== state.coins) {
      this.registry.set("coins", state.coins);
      changed = true;
    }
    const crate = readCrate(state.crate);
    if (JSON.stringify(crate) !== JSON.stringify(this.crate)) {
      this.crate = crate;
      // The lid stands open while something's waiting to be sold.
      this.crateSprite.setFrame(crate.length > 0 ? 1 : 0);
      changed = true;
    }
    if (changed) this.refreshPanel();

    this.farming.readFarm(state);
  }

  /** "+1 Radish" over your head for whatever just landed in your bag. */
  private announceNewItems(before: Inventory, after: Inventory) {
    const ids = new Set(after.flatMap((slot) => (slot ? [slot.itemId] : [])));
    for (const itemId of ids as Set<ItemId>) {
      const gained = countOf(after, itemId) - countOf(before, itemId);
      if (gained > 0) this.me.floatText(`+${gained} ${ITEMS[itemId].name}`);
    }
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
    remote.character.setHidden(player.inBed);
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

  /** Puts your own character somewhere at once (waking up), and tells the server straight away. */
  private teleport(x: number, y: number, facing: Facing) {
    this.player.body.reset(x, y);
    this.facing = facing;
    this.me.setMotion(facing, false);
    this.lastSent = { x: NaN, y: NaN, facing, at: 0 };
  }

  /** The panel that's open (bag, crate, seed stand), if any. Only one at a time. */
  private panel: OpenPanel | null = null;

  /** Closes the open panel, if any. */
  private closePanel() {
    const panel = this.panel;
    this.panel = null;
    panel?.close();
  }

  /**
   * Opens a panel over the game, closing any other. Keys held when it opens (or let go while
   * it's open, which the panel keeps from the game) are forgotten, so nobody walks off by themselves.
   */
  private openPanel<T extends OpenPanel>(open: (onClose: () => void) => T): T | null {
    if (this.bedtime.asleep) return null;
    this.closePanel();
    this.input.keyboard?.resetKeys();
    const panel = open(() => {
      this.input.keyboard?.resetKeys();
      if (this.panel === panel) this.panel = null;
    });
    this.panel = panel;
    return panel;
  }

  /** The bag button, B or Tab: opens the bag, or closes it. */
  private toggleBag() {
    if (this.panel instanceof BagPanel) {
      this.closePanel();
      return;
    }
    const bag = this.openPanel(
      (onClose) =>
        new BagPanel({
          icon: (itemId) => iconUrl(this.textures, itemIcon(itemId)),
          coinIcon: iconUrl(this.textures, { key: COIN_KEY }),
          move: (from, to) => this.room?.send("moveItem", { from, to } satisfies MoveItemMessage),
          split: (from, count) => this.room?.send("splitStack", { from, count } satisfies SplitStackMessage),
          onClose,
        }),
    );
    bag?.update(this.registry.get("bag"), this.registry.get("coins"));
  }

  /** Next to the crate: opens the crate card. */
  private openCrate() {
    const crate = this.openPanel(
      (onClose) =>
        new CratePanel({
          icon: (itemId) => iconUrl(this.textures, itemIcon(itemId)),
          coinIcon: iconUrl(this.textures, { key: COIN_KEY }),
          ship: (slot, count) => this.room?.send("ship", { slot, count } satisfies ShipMessage),
          unship: (itemId, count) => this.room?.send("unship", { itemId, count } satisfies UnshipMessage),
          onClose,
        }),
    );
    this.refreshPanel();
    return crate;
  }

  /** Next to the seed stand: opens its card. */
  private openShop() {
    const shop = this.openPanel(
      (onClose) =>
        new ShopPanel({
          icon: (itemId) => iconUrl(this.textures, itemIcon(itemId)),
          coinIcon: iconUrl(this.textures, { key: COIN_KEY }),
          buy: (itemId, count) => this.room?.send("buy", { itemId, count } satisfies BuyMessage),
          onClose,
        }),
    );
    this.refreshPanel();
    return shop;
  }

  /** Keeps an open panel up to date with the bag, the crate and the coins. */
  private refreshPanel() {
    const bag = this.registry.get("bag") as Inventory | null;
    const coins = this.registry.get("coins") as number | null;
    if (this.panel instanceof BagPanel || this.panel instanceof ShopPanel) this.panel.update(bag, coins);
    if (this.panel instanceof CratePanel) this.panel.update(bag, this.crate);
  }

  private emote(emote: EmoteId) {
    if (this.bedtime.asleep) return;
    // Shown right away for us; the server passes it on to everyone else.
    this.me.showEmote(emote);
    const message: EmoteMessage = { emote };
    this.room?.send("emote", message);
  }

  /**
   * Who's playing? Asks the server who has played, and lets them tap their name (getting their own
   * bag back) or start as someone new (picking a name and character). Nobody yet: straight to
   * someone new. Remembers the choice on this device.
   */
  private async chooseFarmer(savedLook: Look | null) {
    const farmers = await fetchFarmers();
    if (farmers.length > 0) {
      const choice = await pickFarmer({ farmers, face: (character) => this.textures.getBase64(characterKey(character), 0) });
      if (choice.kind === "farmer") {
        this.farmerId = choice.farmer.id;
        saveFarmerId(choice.farmer.id);
        this.setLook({ name: choice.farmer.name, character: choice.farmer.character });
        return;
      }
    }
    this.farmerId = null;
    saveFarmerId(null);
    await this.changeLook(true, savedLook);
  }

  /** Opens the name and character picker, then remembers the choice on this device and tells the server. */
  private async changeLook(firstTime = false, initial: Look | null = null) {
    this.input.keyboard?.resetKeys();
    const look = await pickLook({
      current: firstTime ? null : this.look,
      initial,
      frame: (character, frame) => this.textures.getBase64(characterKey(character), frame),
      walkFrames: walkFrames("down"),
    });
    if (!look) return;
    this.setLook(look);
    const message: LookMessage = look;
    this.room?.send("look", message);
  }

  private setLook(look: Look) {
    this.look = look;
    saveLook(look);
    this.registry.set("look", look);
    this.me.setLook(look);
  }

  private fitZoom() {
    const shortSide = Math.min(this.scale.width, this.scale.height);
    this.zoom = Math.max(1, Math.round(shortSide / (TILE_SIZE * TARGET_VISIBLE_TILES)));
    this.cameras.main.setZoom(this.zoom);
    this.me?.setZoom(this.zoom);
    for (const { character } of this.remotes.values()) character.setZoom(this.zoom);
  }
}
