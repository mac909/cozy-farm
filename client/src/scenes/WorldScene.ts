import Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import { POSITION_SEND_MS, TILE_SIZE, WALK_SPEED } from "../../../shared/constants";
import { DEFAULT_CHARACTER } from "../../../shared/content/characters";
import type { EmoteId } from "../../../shared/content/emotes";
import { FISHING_ROD, ITEMS, type ItemId } from "../../../shared/content/items";
import { isHint } from "../../../shared/farming/actions";
import { PositionBuffer, REMOTE_DELAY_MS } from "../../../shared/interpolation";
import type {
  BookEventMessage,
  BuyMessage,
  CastStartedMessage,
  CatchBugMessage,
  ClimbMessage,
  EmoteEvent,
  EmoteMessage,
  JoinOptions,
  LookMessage,
  MorningMessage,
  GiveAllMessage,
  GiveMessage,
  MoveItemMessage,
  MoveMessage,
  PlacedMessage,
  ProgressMessage,
  ShipMessage,
  SplitStackMessage,
  UnshipMessage,
  VillageEventMessage,
  WakeUpMessage,
  YouMessage,
} from "../../../shared/messages";
import { smallTalkFor } from "../../../shared/content/keeper";
import { PROJECTS, PROJECT_IDS, houseProjectOf, projectDef, stepName } from "../../../shared/content/projects";
import { ownerWords } from "../../../shared/content/houseUpgrades";
import { builtThings } from "../../../shared/village/built";
import { everythingOpen, openUpgrades, wantedFor } from "../../../shared/village/projects";
import { EMPTY_VILLAGE, type BuiltStep, type Village } from "../../../shared/village/village";
import { lookAt, NOTHING_BUILT } from "../../../shared/world/gates";
import { villageRect } from "../../../shared/world/houses";
import { todayFor, type Today } from "../../../shared/world/today";
import { readForage, readProgress, readVillage, type HelperView } from "../../../shared/stateSync";
import { PERK, SKILLS } from "../../../shared/content/skills";
import { EMPTY_PROGRESS, hasPerk, type FarmerProgress } from "../../../shared/progress/farmerProgress";
import { YouPanel } from "../ui/YouPanel";
import { progressCards, seenNow, somethingNew } from "../ui/youText";
import { loadSeen, saveSeen } from "../ui/youStorage";
import { badgeIcon } from "../art/badgeArt";
import { BoardPanel } from "../ui/BoardPanel";
import { keeperNotes, ownerOf, projectName, type BoardState, type KeeperNote } from "../ui/boardText";
import { PorchesView } from "../world/Porches";
import { showKeeperNote, showNotesList } from "../ui/KeeperNote";
import { showOpeningCard } from "../ui/OpeningCard";
import { eveningTint } from "../ui/evening";
import { markNoteRead, markOpeningShown, notesRead, openingShown } from "../ui/villageStorage";
import { ForageView } from "../world/Forage";
import { lighthouseFrame, VillageView, type GatedOnScreen } from "../world/Village";
import { clampMove, type Facing, facingFor, isFacing, turnsOnly, type Vec } from "../../../shared/movement";
import { isEmote, type Look, lookFrom } from "../../../shared/player";
import type { FarmState, Player } from "../../../shared/schema";
import { countOf, type Inventory } from "../../../shared/inventory/inventory";
import type { Crate } from "../../../shared/economy/shop";
import { readBag, readBeach, readBook, readBugs, readClock, readCrate } from "../../../shared/stateSync";
import { EMPTY_BOOK, type CollectionBook } from "../../../shared/collection/collection";
import { roomFor } from "../../../shared/inventory/inventory";
import type { GameClock } from "../../../shared/time/clock";
import { tileCenter } from "../../../shared/world/map";
import { COLLISION_LAYER, FARMLAND_LAYER, isAboveCharacters, OBJECTS_LAYER } from "../../../shared/world/tiledMap";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { isFarmerId, type FarmerId } from "../../../shared/world/world";
import {
  characterKey,
  COIN_KEY,
  faceKey,
  KEEPER_FACE_KEY,
  BADGE_PORCH_KEY,
  LIGHTHOUSE_FRAME,
  LIGHTHOUSE_KEY,
  RIPPLE_ANIM,
  RIPPLES_KEY,
  HOUSE_SHEET_KEY,
  SEED_STAND_KEY,
  SHIPPING_CRATE_KEY,
  STORE_FRAME,
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
import { BookPanel } from "../ui/BookPanel";
import { celebrationFor } from "../ui/bookText";
import { Celebrations } from "../ui/Celebration";
import { CratePanel } from "../ui/CratePanel";
import { ShopPanel } from "../ui/ShopPanel";
import { generalStoreCatalog, seedStandCatalog, type ShopCatalog } from "../ui/shopText";
import { Tips } from "../ui/Tips";
import { EVENING_MINUTE } from "../ui/ClockCard";
import { playSound } from "../audio/sounds";
import { Bedtime } from "../world/Bedtime";
import { Character } from "../world/Character";
import { Farming } from "../world/Farming";
import { Homes, type Resident } from "../world/Homes";
import { Arrange } from "../world/Arrange";
import { BeachView } from "../world/Beach";
import { playBurst } from "../world/effects";
import { Fishing, OtherLines } from "../world/Fishing";
import { MeadowView } from "../world/Meadow";
import { homeOf } from "../../../shared/decor/decorate";
import { targetTile, feetTile } from "../../../shared/world/places";
import { areaOf, VILLAGE } from "../../../shared/world/houses";
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

/** The view from the top of the lighthouse: how fast the stick looks round, in world pixels a second. */
const VIEW_PAN_SPEED = 260;
/** The lighthouse's beam goes round once in this long. */
const BEAM_TURN_MS = 14_000;
/** The glow comes up with the dusk and is full this far into it (the evening tint's strength). */
const FULL_GLOW_TINT = 0.12;
/** The sea's colour (our beach terrain's), and over everything in the world but the rooms' dark. */
const VIEW_SEA_COLOR = 0x71ddee;
const VIEW_SEA_DEPTH = 900_000;

type Direction = "up" | "down" | "left" | "right";

/** Another player, drawn a moment behind where the server says they are, so they move smoothly. */
interface RemotePlayer {
  character: Character;
  positions: PositionBuffer;
  /** When their drawn position last changed (performance.now()). */
  lastMovedAt: number;
  /** Who they are and whether they're asleep, as the server last said. */
  name: string;
  farmerId: string;
  inBed: boolean;
  /** Their bobber's tile while they fish ("col,row"), or "". */
  fishing: string;
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
  private homes!: Homes;
  private arrange!: Arrange;
  /** Everyone and where they're drawn, as of this frame. */
  private residents: Resident[] = [];
  private readonly tips = new Tips();
  /** The shipping crate on the dock, and what's in it as the server last said. */
  private crateSprite!: Phaser.GameObjects.Image;
  private crate: Crate = [];
  /** What's lying on the beach. */
  private beach!: BeachView;
  /** Your own fishing, and everyone else's lines. */
  private fishing!: Fishing;
  private otherLines!: OtherLines;
  /** The bugs in the meadow. */
  private meadow!: MeadowView;
  /** The shared collection book, as the server last said, and the cards that cheer what's new in it. */
  private book: CollectionBook = EMPTY_BOOK;
  private celebrations!: Celebrations;
  /** The village (Milestone 6) as the server last said: Marlow, the projects and who helped, what's lying about. */
  private village: Village = EMPTY_VILLAGE;
  private helpers: Record<string, HelperView[]> = {};
  private clock: GameClock = { day: 1, minute: 360 };
  /** The map as of today, with what's built. */
  private today: Today = todayFor(VILLAGE_MAP, NOTHING_BUILT);
  private villageView!: VillageView;
  private forage!: ForageView;
  /** The cottages' porches (Milestone 7). */
  private porches!: PorchesView;
  /** A note or opening card is up (they wait for each other and for the morning card). */
  private noteOpen = false;
  /** How many times you've talked to Marlow, so his small talk goes round. */
  private talks = 0;
  /** Up the lighthouse, looking at the view. */
  private viewing = false;
  /** More sea below the village while looking at the view, so the rooms drawn down there stay out of sight. */
  private viewSea!: Phaser.GameObjects.Rectangle;
  /** Your own skills and badges (Milestone 7), as the server last said. Never anyone else's. */
  private progress: FarmerProgress = EMPTY_PROGRESS;

  constructor() {
    super("world");
  }

  create() {
    const map = this.make.tilemap({ key: VILLAGE_KEY });
    const { collision, gated } = this.buildMap(map);

    const savedLook = loadLook();
    this.farmerId = loadFarmerId();
    this.look = savedLook ?? { name: "", character: DEFAULT_CHARACTER };
    this.registry.set("look", this.look);
    // Set before the HUD starts listening, so later changes reach it (a first set isn't a change).
    this.registry.set("youNew", false);

    const spawn = tileCenter(VILLAGE_MAP.spawn.col, VILLAGE_MAP.spawn.row);
    this.player = this.physics.add.sprite(spawn.x, spawn.y, characterKey(this.look.character), 0);
    // Collide with the feet only, so characters can walk up behind trees and fences.
    this.player.body.setSize(10, 6).setOffset(3, 10);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.add.collider(this.player, collision);
    // Walls that come and go as the village is built (the brambles, the board): each its own collider.
    const onScreen: GatedOnScreen[] = gated.map(({ gate, layer }) =>
      gate.kind === "collision" ? { gate, layer, collider: this.physics.add.collider(this.player, layer) } : { gate, layer },
    );

    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(this.player, true);
    this.fitZoom();
    this.me = new Character(this, this.player, this.look, this.zoom);
    this.villageView = new VillageView(this, VILLAGE_MAP.lighthouse, this.zoom);
    this.villageView.setGated(onScreen);
    this.villageView.show(this.today, this.clock.minute, 0);
    this.porches = new PorchesView(this);
    this.forage = new ForageView(this);
    const village = villageRect(VILLAGE_MAP);
    this.viewSea = this.add
      .rectangle(village.x, village.y + village.height, village.width, 4000, VIEW_SEA_COLOR)
      .setOrigin(0, 0)
      .setDepth(VIEW_SEA_DEPTH)
      .setVisible(false);
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
    // Your face at the top right: the You card (skills, badges, and changing your name or look).
    this.ui.events.on("editLook", () => this.openYou());
    this.ui.events.on("bag", () => this.toggleBag());
    this.ui.events.on("book", () => this.toggleBook());
    this.celebrations = new Celebrations({
      icon: (itemId) => iconUrl(this.textures, itemIcon(itemId)),
      openBook: () => {
        if (!(this.panel instanceof BookPanel)) this.toggleBook();
      },
      shown: (celebration) => playSound(this, celebration.big ? "morning" : "coin"),
    });
    startMusic(this);
    installDevCommands(
      (message) => this.room?.send("dev", message),
      (col, row, facing) => {
        const at = tileCenter(col, row);
        this.teleport(at.x, at.y, facing);
      },
    );

    this.homes = new Homes(this, {
      me: this.me,
      myFarmerId: () => this.farmerId,
      room: () => this.room,
      teleport: (x, y, facing) => this.teleport(x, y, facing),
      arrived: (_area, how) => {
        if (how === "moveIn") this.tips.event("movedIn");
      },
    });
    this.homes.setZoom(this.zoom);
    this.physics.add.collider(this.player, this.homes.colliders);
    this.beach = new BeachView(this);
    this.meadow = new MeadowView(this);

    this.bedtime = new Bedtime(this, {
      room: () => this.room,
      inVillage: (player) => areaOf(VILLAGE_MAP, player) === VILLAGE,
      me: this.me,
      wakeAt: (x, y) => this.teleport(x, y, "down"),
      fade: (atDark, done) => this.ui.nightFade(atDark, done),
      closePanels: () => {
        this.closePanel();
        this.arrange.stop();
        this.fishing.stop();
        this.stopView();
      },
      show: ({ inBed, sleepers }) => {
        if (this.registry.get("inBed") !== inBed) this.registry.set("inBed", inBed);
        if (this.registry.get("sleepers") !== sleepers) this.registry.set("sleepers", sleepers);
      },
      coinIcon: () => iconUrl(this.textures, { key: COIN_KEY }),
      itemIcon: (itemId) => iconUrl(this.textures, itemIcon(itemId)),
      morningShown: (report) => playSound(this, report.sale.total > 0 ? "coin" : "morning"),
      cardClosed: () => this.releaseKeys(),
      village: (report) => ({
        keeperArrived: report.day === this.village.keeperDay,
        picture: (built) => this.builtPicture(built),
        tall: (built) => houseProjectOf(built.project) === null,
        owner: (houseId) => ownerOf(this.boardState(), houseId),
        look: (built) => this.lookAtBuilt(built),
      }),
    });
    this.ui.events.on("escape", () => {
      if (this.viewing) this.stopView();
      else if (this.fishing.isActive) this.fishing.stop();
      else if (this.arrange.isActive) this.arrange.stop();
      else this.bedtime.wake();
    });

    this.farming = new Farming(this, new Outline(this), {
      me: this.me,
      facing: () => this.facing,
      face: (facing) => (this.facing = facing),
      room: () => this.room,
      bag: () => this.registry.get("bag") as Inventory | null,
      selectedSlot: () => this.registry.get("selectedSlot") as number,
      showAction: (view) => this.ui.setAction(view),
      busy: () => this.bedtime.asleep || this.panel?.isOpen === true || this.arrange.isActive || this.fishing.isActive || this.viewing || this.noteOpen,
      spot: (position) => this.homes.spot(position),
      placing: () => this.homes.placing(),
      findAt: (col, row) => this.beach.findAt(col, row),
      forageAt: (col, row) => this.forage.itemAt(col, row),
      map: () => this.today.map,
      built: () => this.today.built,
      keeperTile: () => (this.homes.currentArea === VILLAGE ? this.villageView.keeperAt : null),
      wanted: (itemId) => this.wanted(itemId),
      bugNear: (position) => this.meadow.bugNear(position, hasPerk(this.progress, "lightStep") ? PERK.lightStepTiles : 0),
      on: {
        catchBug: (id, bugId) => this.catchBug(id, bugId),
        fish: (_spot, col, row) => this.fishing.start(col, row),
        sleep: () => this.bedtime.sleep(),
        crate: () => this.openCrate(),
        seeds: () => this.openShop(seedStandCatalog(), "seedStand"),
        shop: () => this.openShop(generalStoreCatalog(), "store"),
        enter: (houseId, how) => this.homes.enter(houseId, how),
        leave: (houseId) => this.homes.leave(houseId),
        place: () => this.arrange.start(this.registry.get("selectedSlot") as number),
        board: () => this.openBoard(),
        give: (project, need, slot) => this.give(project, need, slot),
        talk: () => this.talk(),
        climb: () => this.startView(),
      },
      holding: () => this.ui.actionHeld(),
      acted: (kind) => {
        if (kind === "till") this.tips.event("dug");
        if (kind === "water") this.tips.event("watered");
        if (kind === "harvest") this.tips.event("picked");
        if (kind === "pickUp") this.tips.event("pickedUp");
        if (kind === "pickUpMaterial") this.tips.event("pickedUpMaterial");
      },
    });
    this.arrange = new Arrange(this, {
      homes: this.homes,
      me: this.me,
      player: this.player,
      facingTile: () => targetTile(feetTile(this.player), this.facing),
      room: () => this.room,
      bag: () => this.registry.get("bag") as Inventory | null,
      selectedSlot: () => this.registry.get("selectedSlot") as number,
      dug: (col, row) => this.farming.view.tileAt(col, row).kind !== "untilled",
      residents: () => this.residents,
      showAction: (view) => this.ui.setAction(view),
      showHud: (view) => {
        if (JSON.stringify(this.registry.get("arrange")) !== JSON.stringify(view)) this.registry.set("arrange", view);
      },
      overHud: (pointer) => this.ui.input.hitTestPointer(pointer).length > 0,
      hudInput: this.ui.input,
      started: () => this.tips.event("arranging"),
      today: () => this.today,
    });
    this.fishing = new Fishing(this, {
      me: this.me,
      room: () => this.room,
      map: () => this.today.map,
      face: (facing) => {
        this.facing = facing;
        this.me.setMotion(facing, false);
      },
      showAction: (view) => this.ui.setAction(view),
      showHud: (view) => this.ui.setFishing(view),
      holding: () => this.ui.actionHeld(),
      overHud: (pointer) => this.ui.input.hitTestPointer(pointer).length > 0,
      hudInput: this.ui.input,
      touch: this.sys.game.device.input.touch,
      ended: (caught) => {
        if (caught) this.tips.event("caughtFish");
      },
    });
    this.otherLines = new OtherLines(this);
    this.ui.events.on("selectSlot", (_slot: number, item: { itemId?: string } | null) => {
      if (item?.itemId === FISHING_ROD) this.tips.event("rod");
      // Putting the rod away reels in.
      else if (this.fishing.isActive) this.fishing.stop();
      // Something the board wants: the name flash says so.
      const itemId = item?.itemId;
      if (itemId && Object.hasOwn(ITEMS, itemId) && wantedFor(this.boardWorld(), itemId as ItemId, this.farmerId ?? undefined)) {
        this.ui.showToast(`${ITEMS[itemId as ItemId].name} · wanted on the board`);
      }
    });
    this.ui.events.on("action", () => {
      if (this.fishing.isActive) this.fishing.press();
      else if (this.arrange.isActive) this.arrange.act();
      else this.farming.act();
    });
    this.ui.events.on("arrange", () => {
      if (this.arrange.isActive) this.arrange.stop();
      // Holding furniture that goes here, you start off carrying it.
      else if (!this.bedtime.asleep && this.panel === null) this.arrange.start(this.registry.get("selectedSlot") as number, false);
    });
    this.ui.events.on("turn", () => this.arrange.turn());
    this.ui.events.on("putAway", () => this.arrange.putAway());
    this.ui.events.on("done", () => this.arrange.stop());

    this.connection = new FarmConnection(() => this.joinOptions(), {
      status: (status) => this.registry.set("netStatus", status),
      joined: (room) => this.onJoined(room),
      lost: () => this.onLost(),
      replaced: () =>
        void showOtherDevice(this.look.name).then(() => {
          this.releaseKeys();
          this.connection.resume();
        }),
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

  update(time: number, delta: number) {
    const input = this.readInput();
    let move: Vec;
    if (this.bedtime.holdStill(input)) {
      // In bed you stay put; moving gets you up instead.
      move = { x: 0, y: 0 };
    } else if (this.viewing) {
      // Up the lighthouse: the stick looks round the village.
      move = { x: 0, y: 0 };
      const camera = this.cameras.main;
      camera.scrollX += (input.x * VIEW_PAN_SPEED * delta) / 1000;
      camera.scrollY += (input.y * VIEW_PAN_SPEED * delta) / 1000;
    } else if (this.fishing.isActive) {
      // Fishing: you stand still; walking off with the keys reels in.
      move = { x: 0, y: 0 };
      if (input.x !== 0 || input.y !== 0) this.fishing.stop();
    } else if (this.arrange.isActive) {
      // Arranging: the stick moves the cursor, not you.
      move = { x: 0, y: 0 };
    } else if (input === this.ui.joystick?.vector && turnsOnly(input)) {
      // A light push on the joystick turns you on the spot, so lining up on a tile is easy.
      move = { x: 0, y: 0 };
      this.facing = facingFor(input.x, input.y, this.facing);
    } else {
      move = clampMove(input.x, input.y);
    }
    this.player.setVelocity(move.x * WALK_SPEED, move.y * WALK_SPEED);
    if (move.x !== 0 || move.y !== 0) this.farming.forgetPointer();
    this.facing = facingFor(move.x, move.y, this.facing);
    this.me.setMotion(this.facing, move.x !== 0 || move.y !== 0);
    this.sendPosition(time);
    if (this.fishing.isActive) {
      this.farming.pause();
      this.fishing.update(delta);
    } else if (this.arrange.isActive) {
      this.farming.pause();
      this.arrange.update(input);
    } else {
      this.farming.update();
    }
    this.tips.update(
      !this.bedtime.asleep &&
        !this.bedtime.cardOpen &&
        this.panel === null &&
        this.room !== null &&
        !this.fishing.isActive &&
        !this.celebrations.showing &&
        !this.noteOpen &&
        !this.viewing,
    );
    // Marlow's first note, and a project's opening card, wait for a quiet moment.
    if (this.canShowCard()) this.showVillageCards();
    this.showGlow(time);

    const now = performance.now();
    const drawAt = now - REMOTE_DELAY_MS;
    const residents: Resident[] = [
      { name: this.look.name, farmerId: this.farmerId ?? "", x: this.player.x, y: this.player.y, inBed: this.registry.get("inBed") === true },
    ];
    for (const remote of this.remotes.values()) {
      const pose = remote.positions.sample(drawAt);
      if (!pose) continue;
      const { sprite } = remote.character;
      if (pose.x !== sprite.x || pose.y !== sprite.y) remote.lastMovedAt = now;
      sprite.setPosition(pose.x, pose.y);
      remote.character.setMotion(pose.facing, now - remote.lastMovedAt < REMOTE_STILL_MS);
      residents.push({ name: remote.name, farmerId: remote.farmerId, x: pose.x, y: pose.y, inBed: remote.inBed });
    }
    this.residents = residents;
    this.homes.update(this.player, this.arrange.isActive || this.viewing ? { x: 0, y: 0 } : input, residents);
    this.meadow.tick();
    const canArrange = !this.bedtime.asleep && this.room !== null && this.homes.placing() !== null;
    if (this.registry.get("canArrange") !== canArrange) this.registry.set("canArrange", canArrange);
    // You only see who's where you are: the village, or the same room. Sleepers are tucked in.
    const lines: Parameters<OtherLines["update"]>[0][number][] = [];
    for (const [id, remote] of this.remotes) {
      const { sprite } = remote.character;
      remote.character.setHidden(remote.inBed || areaOf(VILLAGE_MAP, sprite) !== this.homes.currentArea);
      const facing = remote.character.facingNow;
      lines.push({ id, x: sprite.x, y: sprite.y, depth: sprite.depth, facing, fishing: remote.fishing, visible: !remote.character.hidden });
    }
    this.otherLines.update(lines);
  }

  /**
   * Draws the Tiled map: every tile layer in Tiled's order, tree tops over the characters,
   * the shipping crate, and ripples on the sea. Returns the hidden collision layer, and the layers
   * that come and go as the village is built (art, and walls), for the village view to show and hide.
   */
  private buildMap(map: Phaser.Tilemaps.Tilemap): { collision: Phaser.Tilemaps.TilemapLayer; gated: GatedOnScreen[] } {
    const tilesets = map.tilesets.map((tileset) => map.addTilesetImage(tileset.name, tilesetKey(tileset.name))!);
    const gates = new Map(VILLAGE_MAP.gates.layers.map((gate) => [gate.name, gate]));
    const gated: GatedOnScreen[] = [];
    const hidden = (name: string) =>
      name === COLLISION_LAYER || name === FARMLAND_LAYER || name.startsWith(`${COLLISION_LAYER} `) || name.startsWith(`${FARMLAND_LAYER} `);
    map.layers.forEach((data, index) => {
      const gate = gates.get(data.name);
      if (hidden(data.name)) {
        // A wall that comes and goes (the brambles): its own hidden collision layer.
        if (gate?.kind === "collision") {
          const walls = map.createLayer(data.name, tilesets, 0, 0)!.setVisible(false);
          walls.setCollisionByExclusion([-1]);
          gated.push({ gate, layer: walls });
        }
        return;
      }
      // Always shown, even if it was hidden in Tiled while editing (unless it waits for something to be built).
      const layer = map.createLayer(data.name, tilesets, 0, 0)!.setVisible(true).setAlpha(1);
      layer.setDepth(isAboveCharacters(data) ? ABOVE_DEPTH + index : GROUND_DEPTH + index * 10);
      if (gate) gated.push({ gate, layer });
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
    const store = VILLAGE_MAP.store;
    this.add
      .image(store.x, store.y, HOUSE_SHEET_KEY, STORE_FRAME)
      .setOrigin(0, 0)
      .setDepth(store.y + store.height);

    // Ripples sit on the water, just above the ground layer.
    for (const ripple of map.getObjectLayer(OBJECTS_LAYER)?.objects ?? []) {
      if (ripple.name !== "ripple") continue;
      this.add
        .sprite(ripple.x ?? 0, ripple.y ?? 0, RIPPLES_KEY)
        .setDepth(GROUND_DEPTH + 1)
        .play({ key: RIPPLE_ANIM, delay: Phaser.Math.Between(0, 2000), repeatDelay: Phaser.Math.Between(500, 3000) });
    }
    return { collision, gated };
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
    this.villageView?.follow();
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
        remote.name = player.name;
        remote.farmerId = player.farmerId;
        // Asleep in the tent or a bed: hidden (in update()).
        remote.inBed = player.inBed;
        remote.fishing = player.fishing;
      });
    });
    room.onMessage("wakeUp", (message: WakeUpMessage) => this.bedtime.wakeUp(message));
    room.onMessage("morning", (report: MorningMessage) => this.bedtime.morning(report));
    $(room.state).players.onRemove((_player, sessionId) => this.removeRemote(sessionId));
    this.farming.joined();
    this.tips.event("started");
    room.onStateChange((state) => this.readState(state));
    room.onMessage("hint", (hint: unknown) => {
      if (!isHint(hint)) return;
      this.farming.hint(hint);
      this.fishing.refused();
    });
    room.onMessage("castStarted", (message: CastStartedMessage) => this.fishing.started(message));
    room.onMessage("bookEvent", (message: BookEventMessage) => this.celebrate(message));
    room.onMessage("villageEvent", (message: VillageEventMessage) => this.onVillageEvent(message));
    room.onMessage("progress", (message: ProgressMessage) => this.onProgress(message));
    // Where you were isn't somewhere you can stand any more: you're at the spawn point.
    room.onMessage("placed", (message: PlacedMessage) => {
      if (Number.isFinite(message?.x) && Number.isFinite(message?.y)) this.teleport(message.x, message.y, "down");
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
      if (clock.minute >= EVENING_MINUTE) this.tips.event("evening");
    }
    this.readVillage(state, clock);
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
    // Your own skills and badges (Milestone 7).
    if (me) this.readProgress(readProgress(me.progress, clock.day));

    this.farming.readFarm(state);
    this.homes.readState(state);
    this.beach.update(readBeach(state.beach));
    const book = readBook(state.book);
    if (JSON.stringify(book) !== JSON.stringify(this.book)) {
      this.book = book;
      if (this.panel instanceof BookPanel) this.panel.update(book);
    }
    this.meadow.update(readBugs(state.bugs));
    // Not moved in anywhere yet, with a cottage free: say where they are.
    if (this.farmerId && VILLAGE_MAP.houses.length > 0 && !homeOf(this.homes.houseViews, this.farmerId)) {
      const free = VILLAGE_MAP.houses.some((plan) => !this.homes.houseViews[plan.id]);
      if (free) this.tips.event("homeless");
    }
  }

  // ---------- You: skills and badges (Milestone 7) ----------

  /** Your skills and badges as the server last said: the You card follows, and the gold dot says if there's something new. */
  private readProgress(progress: FarmerProgress) {
    if (JSON.stringify(progress) === JSON.stringify(this.progress)) return;
    this.progress = progress;
    this.beach.setBrightEyes(hasPerk(progress, "brightEyes"));
    if (this.panel instanceof YouPanel) {
      this.panel.update(progress, this.clock.day);
      if (this.farmerId) saveSeen(this.farmerId, seenNow(progress));
    }
    this.showYouDot();
  }

  /** The gold dot on your face: a level or a badge this device hasn't shown you yet. */
  private showYouDot() {
    const isNew = this.farmerId !== null && somethingNew(this.progress, loadSeen(this.farmerId));
    if (this.registry.get("youNew") !== isNew) this.registry.set("youNew", isNew);
  }

  /** The You card: your skills, perks and badges, and Change name or look. */
  private openYou(tab?: "skills" | "badges") {
    if (this.panel instanceof YouPanel) {
      this.closePanel();
      return;
    }
    const you = this.openPanel(
      (onClose) =>
        new YouPanel({
          name: this.look.name,
          face: iconUrl(this.textures, { key: faceKey(this.look.character) }),
          skillIcon: (skill) => iconUrl(this.textures, itemIcon(SKILLS[skill].icon)),
          itemIcon: (itemId) => iconUrl(this.textures, itemIcon(itemId)),
          badgeIcon: (icon) => iconUrl(this.textures, badgeIcon(icon)),
          tab,
          changeLook: () => void this.changeLook(),
          onClose,
        }),
    );
    if (!you) return;
    you.update(this.progress, this.clock.day);
    if (this.farmerId) saveSeen(this.farmerId, seenNow(this.progress));
    this.showYouDot();
  }

  /**
   * A level, a gift or a badge: a small card at the top of your own screen (nobody else's), with
   * the jingle and a sparkle over your head. Tapping it opens the You card.
   */
  private onProgress(message: ProgressMessage) {
    const events = Array.isArray(message?.events) ? message.events : [];
    for (const card of progressCards(events)) {
      const picture =
        "skill" in card.picture
          ? iconUrl(this.textures, itemIcon(SKILLS[card.picture.skill].icon))
          : "item" in card.picture
            ? iconUrl(this.textures, itemIcon(card.picture.item))
            : iconUrl(this.textures, badgeIcon(card.picture.badge));
      this.celebrations.add({
        title: card.title,
        line: card.line,
        itemId: null,
        big: card.big,
        picture,
        pictureClass: "badge" in card.picture ? "medal" : "skill",
        tap: () => {
          if (!(this.panel instanceof YouPanel)) this.openYou(card.tab);
        },
      });
      if (card.big && !this.me.hidden) playBurst(this, this.player.x, this.player.y - 10, "twinkle", this.player.depth + 5);
    }
    if (events.length > 0) this.tips.event("progressed");
    this.showYouDot();
  }

  // ---------- The village: Marlow, the board, the lighthouse (Milestone 6) ----------

  /** The village as the server last said (Marlow, the projects, what's lying about), and the map as of today. */
  private readVillage(state: FarmState, clock: GameClock) {
    this.clock = clock;
    const { village, helpers } = readVillage(state.village);
    const changed = JSON.stringify([village, helpers]) !== JSON.stringify([this.village, this.helpers]);
    if (changed) {
      this.village = village;
      this.helpers = helpers;
    }
    this.today = todayFor(VILLAGE_MAP, builtThings(this.villageNow()));
    // A note pinned on the board for each thing taking gifts: the village's project, and the porches.
    this.villageView.show(this.today, clock.minute, everythingOpen(this.boardWorld()).length);
    this.porches.show(this.today.built, eveningTint(clock.minute) > 0);
    this.forage.update(readForage(state.forage));
    if (openUpgrades(this.boardWorld()).length > 0) this.tips.event("porches");
    if (changed) {
      if (this.panel instanceof BoardPanel) this.refreshPanel();
      if (this.panel instanceof BookPanel) this.panel.refreshVillage();
    }
  }

  /** The village and the clock, as the rules want them. */
  private villageNow(): { village: Village; clock: GameClock } {
    return { village: this.village, clock: this.clock };
  }

  /** The village with who lives where, for the house upgrades (Milestone 7). */
  private boardWorld() {
    return { village: this.village, clock: this.clock, houses: this.homes.houseViews };
  }

  private boardState(): BoardState {
    const houses = Object.fromEntries(Object.entries(this.homes.houseViews).map(([id, h]) => [id, { owner: h.owner, ownerName: h.ownerName }]));
    return { village: this.village, helpers: this.helpers, clock: this.clock, houses, me: this.farmerId };
  }

  /** At the board, holding something it wants: what the held stack would give to (the village's project, else your porch first), and how many. */
  private wanted(itemId: ItemId): { project: string; need: string; count: number } | null {
    const wanted = wantedFor(this.boardWorld(), itemId, this.farmerId ?? undefined);
    const bag = this.registry.get("bag") as Inventory | null;
    const held = bag?.[this.registry.get("selectedSlot") as number];
    if (!wanted || !held || held.itemId !== itemId) return null;
    return { project: wanted.project.id, need: wanted.key, count: Math.min(held.count, wanted.left) };
  }

  /** The bag strip's line for something the board wants: "The lighthouse needs 3 more", "Pip's porch needs 3 more". */
  private wantedLine(itemId: ItemId): string | null {
    const wanted = wantedFor(this.boardWorld(), itemId, this.farmerId ?? undefined);
    if (!wanted) return null;
    const name = wanted.project.house ? projectName(wanted.project, this.boardState()) : wanted.project.shortName;
    return `${name} needs ${wanted.left} more`;
  }

  /** A project's picture as it stands: the lighthouse dark, scaffolded, mended or lit; a porch. */
  private projectPicture(projectId = "lighthouse"): string {
    if (houseProjectOf(projectId)) return iconUrl(this.textures, { key: BADGE_PORCH_KEY });
    return iconUrl(this.textures, { key: LIGHTHOUSE_KEY, frame: lighthouseFrame(this.today.built) });
  }

  /** The picture of something built overnight: the lighthouse as that step left it, or the porch. */
  private builtPicture(built: BuiltStep): string {
    if (houseProjectOf(built.project)) return iconUrl(this.textures, { key: BADGE_PORCH_KEY });
    const project = PROJECTS[built.project];
    const names = new Set(project ? project.steps.slice(0, built.step + 1).map((_, i) => stepName(project, i)) : []);
    return iconUrl(this.textures, { key: LIGHTHOUSE_KEY, frame: lighthouseFrame(names) });
  }

  /** The morning card's Look: the camera glides to what was built, and back. */
  private lookAtBuilt(built: BuiltStep) {
    const house = houseProjectOf(built.project);
    if (house) {
      // A porch: its cottage.
      const plan = VILLAGE_MAP.houses.find((p) => p.id === house.houseId);
      const at = lookAt(VILLAGE_MAP, built.project, plan?.building ?? null);
      if (at) this.glideTo(at);
      return;
    }
    const project = PROJECTS[built.project];
    const at = project ? lookAt(VILLAGE_MAP, stepName(project, built.step), VILLAGE_MAP.lighthouse) : null;
    if (at) this.glideTo(at);
  }

  /** The camera glides somewhere in the village and, after a moment, back to you (about three seconds). */
  private glideTo(at: { x: number; y: number }) {
    if (this.viewing || this.homes.currentArea !== VILLAGE) return;
    const camera = this.cameras.main;
    camera.stopFollow();
    camera.pan(at.x, at.y, 900, "Sine.easeInOut", true, (_camera: Phaser.Cameras.Scene2D.Camera, out: number) => {
      if (out < 1) return;
      this.time.delayedCall(1300, () =>
        camera.pan(this.player.x, this.player.y, 800, "Sine.easeInOut", true, (_c: Phaser.Cameras.Scene2D.Camera, back: number) => {
          if (back >= 1 && !this.viewing) camera.startFollow(this.player, true);
        }),
      );
    });
  }

  /** The Village Board's card (or one project's). */
  private openBoard(project: string | null = null) {
    const board = this.openPanel(
      (onClose) =>
        new BoardPanel({
          icon: (itemId) => iconUrl(this.textures, itemIcon(itemId)),
          coinIcon: iconUrl(this.textures, { key: COIN_KEY }),
          face: (character) => iconUrl(this.textures, { key: faceKey(character) }),
          keeperFace: iconUrl(this.textures, { key: KEEPER_FACE_KEY }),
          projectPicture: (id) => this.projectPicture(id),
          porchPicture: iconUrl(this.textures, { key: BADGE_PORCH_KEY }),
          give: (id, need) => {
            playSound(this, "tap");
            this.room?.send("give", { project: id, need } satisfies GiveMessage);
          },
          giveAll: (id) => {
            playSound(this, "tap");
            this.room?.send("giveAll", { project: id } satisfies GiveAllMessage);
          },
          openNotes: () => this.openNotes(),
          project,
          onClose,
        }),
    );
    board?.update(this.boardState(), this.registry.get("bag"), this.registry.get("coins"));
  }

  /** Every note Marlow has written, to read again. */
  private openNotes() {
    this.openPanel((onClose) => showNotesList(keeperNotes(this.village, this.clock, this.boardState().houses), iconUrl(this.textures, { key: KEEPER_FACE_KEY }), onClose));
  }

  /** The Action button's "Give 7": from the held stack. */
  private give(project: string, need: string, slot: number) {
    this.me.swing(this.facing);
    playSound(this, "tap");
    this.room?.send("give", { project, need, slot } satisfies GiveMessage);
  }

  /**
   * Talk to Marlow: his newest note if you haven't read it on this device (older ones are on the
   * board, under his notes), otherwise a little small talk.
   */
  private talk() {
    const newest = keeperNotes(this.village, this.clock, this.boardState().houses).at(-1);
    if (newest && !notesRead(this.noteReader()).has(newest.id)) {
      this.showNote(newest, newest.id === "first");
      return;
    }
    const lines = smallTalkFor(this.clock.minute, this.today.built);
    if (lines.length === 0) return;
    this.villageView.keeper.showHint(lines[(this.clock.day + this.talks++) % lines.length]);
    playSound(this, "tap");
  }

  /** Whose notes are read: the farmer this device plays (or the device, until it knows). */
  private noteReader(): string {
    return this.farmerId ?? "device";
  }

  private showNote(note: KeeperNote, first: boolean) {
    markNoteRead(this.noteReader(), note.id);
    this.noteOpen = true;
    this.releaseKeys();
    playSound(this, "open");
    const { done } = showKeeperNote(note, iconUrl(this.textures, { key: KEEPER_FACE_KEY }), first);
    void done.then((choice) => {
      this.noteOpen = false;
      this.releaseKeys();
      if (first) this.tips.event("metKeeper");
      if (choice === "look") this.villageView.pointAtBoard();
    });
  }

  /** Nothing's in the way of a card: awake, no panel or other card, not fishing, arranging or up the lighthouse. */
  private canShowCard(): boolean {
    return (
      this.room !== null &&
      !this.bedtime.asleep &&
      !this.bedtime.cardOpen &&
      this.panel === null &&
      !this.noteOpen &&
      !this.fishing.isActive &&
      !this.arrange.isActive &&
      !this.viewing
    );
  }

  /**
   * Marlow's first note, once on each device; then the opening card of any project opened since
   * this device last looked. What's waiting is worked out again only when something's built (or
   * someone else picks up the device), not every frame.
   */
  private showVillageCards() {
    const key = `${this.noteReader()}|${[...this.today.built].sort().join(",")}`;
    if (key !== this.cardsCheckedFor) {
      this.cardsCheckedFor = key;
      const first = this.today.built.has("keeper") && !notesRead(this.noteReader()).has("first");
      const opened = PROJECT_IDS.find((id) => this.today.built.has(id) && !openingShown(id));
      this.waitingCard = first ? "first" : (opened ?? null);
    }
    const waiting = this.waitingCard;
    if (!waiting) return;
    // Shown once: the next check finds it marked.
    this.cardsCheckedFor = "";
    this.waitingCard = null;
    if (waiting === "first") this.showNote(keeperNotes(this.village, this.clock)[0], true);
    else this.showOpening(waiting);
  }

  /** What showVillageCards last worked out, and for which reader and built things. */
  private cardsCheckedFor = "";
  private waitingCard: string | null = null;

  /** A project's opening card, with a chime (the lighthouse: when the lamp comes on at dusk). */
  private showOpening(projectId: string) {
    const project = PROJECTS[projectId];
    markOpeningShown(projectId);
    // The card says his note, so it counts as read.
    markNoteRead(this.noteReader(), projectId);
    this.noteOpen = true;
    this.releaseKeys();
    playSound(this, "morning");
    const lit = iconUrl(this.textures, { key: LIGHTHOUSE_KEY, frame: LIGHTHOUSE_FRAME.lit });
    const porch = iconUrl(this.textures, { key: BADGE_PORCH_KEY });
    void showOpeningCard(project, { hero: lit, lines: [lit, iconUrl(this.textures, itemIcon("lanternfish")), lit, porch] }).then((see) => {
      this.noteOpen = false;
      this.releaseKeys();
      this.tips.event("lit");
      const lighthouse = VILLAGE_MAP.lighthouse;
      if (see && lighthouse) this.glideTo({ x: lighthouse.x + lighthouse.width / 2, y: lighthouse.y + lighthouse.height / 2 });
    });
  }

  /** Something happened at the board: a gift floats up from it; a step's last thing in is cheered on every screen. */
  private onVillageEvent(message: VillageEventMessage) {
    const event = message?.event;
    if (!event || typeof message.by !== "string") return;
    if (event.type === "gift") {
      this.villageView.floatFromBoard(`+${event.count.toLocaleString("en-GB")}`);
      return;
    }
    const project = projectDef(event.project);
    const step = project?.steps[event.step];
    if (!project || !step) return;
    // A porch says whose: "That's everything for Pip's porch!"
    const owner = project.house ? ownerOf(this.boardState(), project.house.houseId) : "";
    this.celebrations.add({
      title: ownerWords(step.cheer, owner),
      line: `${message.by} brought the last of it. ${ownerWords(step.tonight, owner)}`,
      itemId: null,
      big: true,
      picture: iconUrl(this.textures, { key: KEEPER_FACE_KEY }),
      tap: () => {
        if (!(this.panel instanceof BoardPanel)) this.openBoard(event.project);
      },
    });
    const giver = message.sessionId === this.room?.sessionId ? this.me : this.remotes.get(message.sessionId)?.character;
    if (giver && !giver.hidden) {
      playBurst(this, giver.sprite.x, giver.sprite.y - 10, "celebrate", giver.sprite.depth + 5);
      giver.showEmote("heart");
    }
  }

  /** The lit lighthouse's glow and beam, and the porch lanterns', from dusk, over the evening tint. Every frame. */
  private showGlow(time: number) {
    const lamp = this.villageView.lamp;
    const tint = eveningTint(this.clock.minute);
    if (tint <= 0 || this.homes.currentArea !== VILLAGE) {
      this.ui.setGlow(null);
      return;
    }
    const camera = this.cameras.main;
    const view = camera.worldView;
    const strength = Math.min(1, tint / FULL_GLOW_TINT);
    const onScreen = (x: number, y: number) => ({ x: (x - view.x) * camera.zoom, y: (y - view.y) * camera.zoom });
    const lanterns = this.porches.lights().map(({ x, y }) => ({ ...onScreen(x, y), zoom: camera.zoom, strength }));
    const lit = lamp && this.today.built.has("lighthouse");
    this.ui.setGlow(
      lit ? { ...onScreen(lamp.x, lamp.y), zoom: camera.zoom, strength, angle: ((time % BEAM_TURN_MS) / BEAM_TURN_MS) * Math.PI * 2 } : null,
      lanterns,
    );
  }

  /** Climb: the camera pulls back over the whole village from the top of the lighthouse. The stick looks round; Down or Esc comes back. */
  private startView() {
    const lighthouse = VILLAGE_MAP.lighthouse;
    if (this.viewing || !lighthouse || !this.today.built.has("lighthouse")) return;
    this.closePanel();
    this.arrange.stop();
    this.fishing.stop();
    this.viewing = true;
    this.releaseKeys();
    playSound(this, "open");
    this.me.setHidden(true);
    const camera = this.cameras.main;
    camera.stopFollow();
    this.applyZoom(1);
    camera.centerOn(lighthouse.x + lighthouse.width / 2, lighthouse.y);
    this.viewSea.setVisible(true);
    this.ui.setViewing(true);
    // After dark, the view counts for Up the Lighthouse (Milestone 7).
    this.room?.send("climb", {} satisfies ClimbMessage);
  }

  /** Back down the lighthouse. */
  private stopView() {
    if (!this.viewing) return;
    this.viewing = false;
    this.viewSea.setVisible(false);
    this.me.setHidden(this.bedtime.asleep);
    this.fitZoom();
    this.cameras.main.startFollow(this.player, true);
    this.ui.setViewing(false);
    this.releaseKeys();
  }

  /** Catch: a gentle swish, and the bug's yours once the server agrees. */
  private catchBug(id: string, bugId: ItemId) {
    const bag = this.registry.get("bag") as Inventory | null;
    if (bag && roomFor(bag, bugId) < 1) {
      this.farming.hint({ reason: "bag-full" });
      return;
    }
    this.me.swing(this.facing);
    playSound(this, "pick", 0.7);
    this.meadow.startCatch(id, { x: this.player.x, y: this.player.y });
    this.room?.send("catchBug", { id } satisfies CatchBugMessage);
    this.tips.event("caughtBug");
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
      name: player.name,
      farmerId: player.farmerId,
      inBed: player.inBed,
      fishing: player.fishing,
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

  /**
   * Forgets which keys are held, in both scenes (each has its own keys: WASD here, Space in the
   * HUD). A card over the game keeps key releases from the game, so without this a key let go
   * while it was open would stay "down": walking on by itself, or Space ignored next time.
   */
  private releaseKeys() {
    this.input.keyboard?.resetKeys();
    this.ui.input.keyboard?.resetKeys();
  }

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
    this.arrange.stop();
    this.fishing.stop();
    this.closePanel();
    this.releaseKeys();
    playSound(this, "open");
    const panel = open(() => {
      this.releaseKeys();
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
          place: (slot) => {
            this.closePanel();
            this.arrange.start(slot);
          },
          openBook: () => this.toggleBook(),
          wanted: (itemId) => this.wantedLine(itemId),
          onClose,
        }),
    );
    bag?.update(this.registry.get("bag"), this.registry.get("coins"));
  }

  /** The book button, C, the bag's Book button, or a celebration card: opens the collection book, or closes it. */
  private toggleBook() {
    if (this.panel instanceof BookPanel) {
      this.closePanel();
      return;
    }
    const book = this.openPanel(
      (onClose) =>
        new BookPanel({
          icon: (itemId) => iconUrl(this.textures, itemIcon(itemId)),
          // The Village page: the board, to read, once Marlow is here.
          village: {
            state: () => (this.today.built.has("keeper") ? this.boardState() : null),
            board: {
              icon: (itemId) => iconUrl(this.textures, itemIcon(itemId)),
              coinIcon: iconUrl(this.textures, { key: COIN_KEY }),
              face: (character) => iconUrl(this.textures, { key: faceKey(character) }),
              projectPicture: (id) => this.projectPicture(id),
            },
          },
          onClose,
        }),
    );
    book?.update(this.book);
  }

  /** Something new in the book: a card on everyone's screen, and confetti over whoever found it. */
  private celebrate(message: BookEventMessage) {
    if (!message?.event || typeof message.by !== "string") return;
    const celebration = celebrationFor(message.event, message.by);
    this.celebrations.add(celebration);
    const finder = message.sessionId === this.room?.sessionId ? this.me : this.remotes.get(message.sessionId)?.character;
    if (finder && !finder.hidden && celebration.big) {
      playBurst(this, finder.sprite.x, finder.sprite.y - 10, "celebrate", finder.sprite.depth + 5);
      finder.showEmote("heart");
    }
    if (message.event.type === "discovered") this.tips.event("discovered");
  }

  /** Next to the crate: opens the crate card. */
  private openCrate() {
    const crate = this.openPanel(
      (onClose) =>
        new CratePanel({
          icon: (itemId) => iconUrl(this.textures, itemIcon(itemId)),
          coinIcon: iconUrl(this.textures, { key: COIN_KEY }),
          ship: (slot, count) => {
            playSound(this, "tap");
            this.room?.send("ship", { slot, count } satisfies ShipMessage);
          },
          unship: (itemId, count) => {
            playSound(this, "tap");
            this.room?.send("unship", { itemId, count } satisfies UnshipMessage);
          },
          onClose,
        }),
    );
    this.refreshPanel();
    return crate;
  }

  /** Next to the seed stand or the general store: opens its card. */
  private openShop(catalog: ShopCatalog, at: "seedStand" | "store") {
    const shop = this.openPanel(
      (onClose) =>
        new ShopPanel({
          catalog,
          icon: (itemId) => iconUrl(this.textures, itemIcon(itemId)),
          coinIcon: iconUrl(this.textures, { key: COIN_KEY }),
          buy: (itemId, count) => {
            playSound(this, "coin");
            this.room?.send("buy", { itemId, count, at } satisfies BuyMessage);
          },
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
    if (this.panel instanceof BoardPanel) this.panel.update(this.boardState(), bag, coins);
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
    this.releaseKeys();
    const look = await pickLook({
      current: firstTime ? null : this.look,
      initial,
      frame: (character, frame) => this.textures.getBase64(characterKey(character), frame),
      walkFrames: walkFrames("down"),
    });
    this.releaseKeys();
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
    // Up the lighthouse the view stays pulled back.
    this.applyZoom(this.viewing ? 1 : this.zoom);
  }

  /** The camera's zoom (whole numbers only, so the pixels stay crisp), and everything that keeps a steady size on screen. */
  private applyZoom(zoom: number) {
    this.cameras.main.setZoom(zoom);
    this.me?.setZoom(zoom);
    for (const { character } of this.remotes.values()) character.setZoom(zoom);
    this.homes?.setZoom(zoom);
    this.villageView?.setZoom(zoom);
  }
}
