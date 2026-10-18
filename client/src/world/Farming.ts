import Phaser from "phaser";
import type { Room } from "colyseus.js";
import type { BeachFind } from "../../../shared/beachcombing/beachcombing";
import type { BugId } from "../../../shared/content/bugs";
import { CROPS } from "../../../shared/content/crops";
import type { FishingSpot } from "../../../shared/content/fish";
import { cropItemId, FISHING_ROD, ITEMS, type ItemId } from "../../../shared/content/items";
import { fishingSpot } from "../../../shared/fishing/spots";
import type { ForageItem } from "../../../shared/foraging/forage";
import { closedHintAt } from "../../../shared/world/gates";
import type { WorldMap } from "../../../shared/world/map";
import {
  HOE,
  WATERING_CAN,
  actionWord,
  chooseAction,
  hintFor,
  hintText,
  isHint,
  seedCrop,
  type Action,
  type DoorKind,
  type FarmActionKind,
  type Hint,
  type HintReason,
  type Spot,
} from "../../../shared/farming/actions";
import type { FurnitureId, PlaceKind } from "../../../shared/content/furniture";
import type { FarmTile } from "../../../shared/farming/farming";
import { roomFor, type Inventory } from "../../../shared/inventory/inventory";
import type { FarmActionMessage, PickUpMessage } from "../../../shared/messages";
import { facingFor, type Facing } from "../../../shared/movement";
import type { FarmState } from "../../../shared/schema";
import { readFarm } from "../../../shared/stateSync";
import type { TilePos } from "../../../shared/world/map";
import { CLIENT_NEAR_TILES, feetTile, isNeighbour, nearLighthouseDoor, placeNear, targetTile, type Point } from "../../../shared/world/places";
import { tileKey, type TileKey } from "../../../shared/world/world";
import { TILE_SIZE } from "../../../shared/constants";
import {
  BOARD_KEY,
  CAMP_KEY,
  HOUSE_SHEET_KEY,
  KEEPER_FACE_KEY,
  LIGHTHOUSE_FRAME,
  LIGHTHOUSE_KEY,
  SHIPPING_CRATE_KEY,
  TENT_FRAME,
} from "../art/assets";
import { DOOR_FRAME } from "../art/houseArt";
import { iconScale, itemIcon } from "../art/itemIcons";
import { playSound, type SoundId } from "../audio/sounds";
import type { ActionView } from "../ui/ActionButton";
import type { Character } from "./Character";
import { playBurst, playFarmEffect } from "./effects";
import { FarmView } from "./Farm";
import type { FarmChange } from "./farmChanges";

/** A change we showed straight away on tap isn't shown again when the server's update arrives this soon after. */
const LOCAL_EFFECT_MS = 1500;

/** The burst that goes with each farm action. */
const ACTION_EFFECT: Record<"till" | "plant" | "water" | "harvest", FarmChange> = {
  till: "dug",
  plant: "planted",
  water: "watered",
  harvest: "picked",
};

/** The sound that goes with each farm change. */
const CHANGE_SOUND: Record<FarmChange, SoundId> = {
  dug: "dig",
  planted: "plant",
  watered: "water",
  picked: "pick",
};

/** The other player's farming sounds play this loud, and only when it happens on your screen. */
const REMOTE_LOUDNESS = 0.5;

/** What the Action button would do right now, and where. */
interface Aim {
  action: Action;
  target: TilePos;
  tile: FarmTile;
  farmland: boolean;
  held: ItemId | null;
  spot: Spot | null;
  /** What kind of furniture can go down where you are. */
  placing: PlaceKind | null;
}

/** What tapping the Action button does at each place, door and bed, with furniture in hand, by a bug and at the water. */
export interface ActionHandlers {
  catchBug(id: string, bugId: BugId): void;
  fish(spot: FishingSpot, col: number, row: number): void;
  sleep(): void;
  crate(): void;
  seeds(): void;
  shop(): void;
  enter(houseId: string, how: DoorKind): void;
  leave(houseId: string): void;
  place(itemId: FurnitureId): void;
  /** The Village Board's card. */
  board(): void;
  /** Gives from a bag slot to a project's need, at the board. */
  give(project: string, need: string, slot: number): void;
  /** Talks to Marlow. */
  talk(): void;
  /** Climbs the lit lighthouse for the view. */
  climb(): void;
}

export interface FarmingOptions {
  /** Your own character. */
  me: Character;
  /** Which way you're facing, and turning to face somewhere. */
  facing(): Facing;
  face(facing: Facing): void;
  room(): Room<FarmState> | null;
  /** What's in your bag, and which hotbar slot is picked. */
  bag(): Inventory | null;
  selectedSlot(): number;
  /** Shows what the Action button says. */
  showAction(view: ActionView): void;
  /** True while you can't act (in bed, a panel open). */
  busy(): boolean;
  /** A cottage door, a room's way out or a bed you're next to (map places are found here). */
  spot(position: Point): Spot | null;
  /** What kind of furniture can go down where you are: "house" in your own, "farm" outdoors, null in someone else's. */
  placing(): PlaceKind | null;
  /** The beach find lying on a tile, if any. */
  findAt(col: number, row: number): BeachFind | undefined;
  /** The driftwood or branch lying on a tile, if any. */
  forageAt(col: number, row: number): ForageItem | undefined;
  /** The map as of today (what's built opens and closes things), and what's built. */
  map(): WorldMap;
  built(): ReadonlySet<string>;
  /** Where Marlow stands right now, if he's about. */
  keeperTile(): TilePos | null;
  /** At the board: what the item you're holding would give to, and how many. */
  wanted(itemId: ItemId): { project: string; need: string; count: number } | null;
  /** The bug close enough to catch from where you stand, if any. */
  bugNear(position: Point): { id: string; bugId: BugId } | null;
  /** What tapping the Action button does, beyond farming. */
  on: ActionHandlers;
  /** Whether the Action button or Space is being held down (hold to repeat). */
  holding(): boolean;
  /** You dug, planted, watered, picked or picked something up (asked the server to): for the first-day tips. */
  acted?(kind: FarmActionKind | "pickUp" | "pickUpMaterial"): void;
}

/** Whether an action changes a farm tile (the ones hold-to-repeat repeats). */
function isFarmAction(action: Action): action is Extract<Action, { kind: FarmActionKind }> {
  return action.kind === "till" || action.kind === "plant" || action.kind === "water" || action.kind === "harvest";
}

/** Whether holding the button repeats an action on each new tile you face: farming, and picking up along the beach. */
function repeats(action: Action): boolean {
  return isFarmAction(action) || action.kind === "pickUp";
}

/**
 * Dig, plant, water, pick: the farm on screen, the outline on the tile in front of you, what the
 * Action button says, and what happens when it's pressed. The tile itself changes when the
 * server's update arrives; the swing and the puff of dirt or splash play straight away.
 */
export class Farming {
  readonly view: FarmView;
  private readonly outlineHost: { show(tile: TilePos, faint: boolean): void; hide(): void };
  /** The tile under the mouse, when it's one of the 8 around you (laptops). */
  private hover: TilePos | null = null;
  private pointer: { x: number; y: number } | null = null;
  private readonly recent = new Map<TileKey, number>();
  /** Effects wait for the first look at the farm after joining, so it doesn't puff everywhere at once. */
  private seenFarm = false;
  /** The Action button (or Space) was pressed and is still held: new tiles get acted on as you walk. */
  private holdArmed = false;
  /** The last tile tried during this hold, so it isn't tried again every frame. */
  private repeatFrom: TileKey | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    outline: { show(tile: TilePos, faint: boolean): void; hide(): void },
    private readonly options: FarmingOptions,
  ) {
    this.view = new FarmView(scene);
    this.outlineHost = outline;
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      this.pointer = pointer.wasTouch ? null : { x: pointer.x, y: pointer.y };
    });
    scene.input.on(Phaser.Input.Events.GAME_OUT, () => (this.pointer = null));
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      // A click on a tile next to you acts there (laptops). Touches steer the joystick instead.
      if (pointer.wasTouch || !pointer.leftButtonDown()) return;
      this.pointer = { x: pointer.x, y: pointer.y };
      this.hover = this.hoveredTile();
      if (this.hover) this.act();
    });
  }

  /** After joining (or rejoining): the next look at the farm is the starting point, not a change. */
  joined() {
    this.seenFarm = false;
  }

  /** Shows the farm from the server's latest state, with a puff or splash for each tile that changed. */
  readFarm(state: FarmState) {
    const changes = this.view.update(readFarm(state.farm));
    if (!this.seenFarm) {
      this.seenFarm = true;
      return;
    }
    const now = performance.now();
    const view = this.scene.cameras.main.worldView;
    for (const { col, row, change } of changes) {
      const shownAt = this.recent.get(tileKey(col, row));
      if (shownAt !== undefined && now - shownAt < LOCAL_EFFECT_MS) continue;
      playFarmEffect(this.scene, col, row, change);
      if (view.contains(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2)) {
        playSound(this.scene, CHANGE_SOUND[change], REMOTE_LOUDNESS);
      }
    }
  }

  /** Every frame: where the outline goes, and what the Action button says. */
  update() {
    this.hover = this.hoveredTile();
    let aim = this.aim();
    // Hold to repeat: while Action (or Space) stays held after a press, each new tile you face
    // gets the same treatment, so a row of soil is one stroke.
    if (!this.options.holding()) {
      this.holdArmed = false;
      this.repeatFrom = null;
    } else if (this.holdArmed && repeats(aim.action) && tileKey(...this.actedTile(aim)) !== this.repeatFrom) {
      this.act();
      aim = this.aim();
    }
    const { action, held, target, spot } = aim;
    const faded = action.kind === "none";
    const holdingTool = held === HOE || held === WATERING_CAN || seedCrop(held) !== null;
    // The outline shows while you hold a tool or seeds, or face something ripe, a find or the water to fish, so walking around town stays clean.
    const outlined = holdingTool || action.kind === "harvest" || action.kind === "pickUp" || action.kind === "fish";
    const [col, row] = this.actedTile(aim);
    if (!spot && !this.options.busy() && outlined) this.outlineHost.show({ col, row }, faded);
    else this.outlineHost.hide();
    this.options.showAction(this.viewFor(aim));
  }

  /** While something else has the Action button (arranging): no outline, and no holding to repeat. */
  pause() {
    this.outlineHost.hide();
    this.holdArmed = false;
    this.repeatFrom = null;
  }

  /** The Action button (or Space, or a click on a tile next to you). */
  act() {
    if (this.options.busy()) return;
    this.holdArmed = true;
    const aim = this.aim();
    const { action, target } = aim;
    const on = this.options.on;
    switch (action.kind) {
      case "none":
        this.hint(hintFor(aim.tile, aim.farmland, aim.held, aim.placing) ?? { reason: "empty-hand" });
        return;
      case "sleep":
        return on.sleep();
      case "crate":
        return on.crate();
      case "seeds":
        return on.seeds();
      case "shop":
        return on.shop();
      case "enter":
        return on.enter(action.houseId, action.how);
      case "leave":
        return on.leave(action.houseId);
      case "place":
        return on.place(action.itemId);
      case "catch":
        return on.catchBug(action.id, action.bugId);
      case "fish":
        return on.fish(action.spot, action.col, action.row);
      case "pickUp":
        return this.pickUp(action);
      case "board":
        return on.board();
      case "give":
        return on.give(action.project, action.need, this.options.selectedSlot());
      case "talk":
        return on.talk();
      case "climb":
        return on.climb();
      case "closed":
        this.hint({ reason: action.reason });
        return;
    }
    // Even if it's refused below, holding the button doesn't try this tile again every frame.
    this.repeatFrom = tileKey(target.col, target.row);
    if (action.kind === "harvest") {
      const bag = this.options.bag();
      if (bag && roomFor(bag, cropItemId(action.cropId)) < CROPS[action.cropId].harvestAmount) {
        this.hint({ reason: "bag-full" });
        return;
      }
    }
    const room = this.options.room();
    if (!room) return;
    const message: FarmActionMessage = { col: target.col, row: target.row };
    if (action.kind === "plant") message.slot = this.options.selectedSlot();
    room.send(action.kind, message);

    // Straight away, without waiting for the server: turn to the tile, swing, and the puff or splash.
    const feet = feetTile(this.options.me.sprite);
    this.options.face(facingFor(target.col - feet.col, target.row - feet.row, this.options.facing()));
    this.options.me.swing(this.options.facing());
    playFarmEffect(this.scene, target.col, target.row, ACTION_EFFECT[action.kind]);
    playSound(this.scene, CHANGE_SOUND[ACTION_EFFECT[action.kind]]);
    this.recent.set(tileKey(target.col, target.row), performance.now());
    this.options.acted?.(action.kind);
  }

  /** Picks up the find on a tile: the sand flicks up straight away, the find goes when the server says so. */
  private pickUp(action: Extract<Action, { kind: "pickUp" }>) {
    this.repeatFrom = tileKey(action.col, action.row);
    const bag = this.options.bag();
    if (bag && roomFor(bag, action.itemId) < 1) {
      this.hint({ reason: "bag-full" });
      return;
    }
    const room = this.options.room();
    if (!room) return;
    room.send("pickUp", { col: action.col, row: action.row } satisfies PickUpMessage);
    this.options.me.swing(this.options.facing());
    playSound(this.scene, "pick");
    const burst = action.itemId === "branch" ? "twigs" : "sand";
    playBurst(this.scene, action.col * TILE_SIZE + TILE_SIZE / 2, action.row * TILE_SIZE + TILE_SIZE / 2 + 2, burst);
    this.options.acted?.(ITEMS[action.itemId].category === "material" ? "pickUpMaterial" : "pickUp");
  }

  /** The tile an aim acts on: where the find lies when picking up, otherwise the tile in front. */
  private actedTile({ action, target }: Aim): [number, number] {
    return action.kind === "pickUp" ? [action.col, action.row] : [target.col, target.row];
  }

  /**
   * You walked: the mouse no longer picks the tile until it moves again. Otherwise a cursor left
   * resting over the game would keep pointing at the same spot beside you (the camera follows you),
   * and Space would act there instead of in front of you.
   */
  forgetPointer() {
    this.pointer = null;
  }

  /** A hint over your head. */
  hint(hint: Hint) {
    this.options.me.showHint(hintText(hint));
  }

  destroy() {
    this.view.destroy();
  }

  private aim(): Aim {
    const position = this.options.me.sprite;
    const feet = feetTile(position);
    const target = this.hover ?? targetTile(feet, this.options.facing());
    const tile = this.view.tileAt(target.col, target.row);
    const map = this.options.map();
    const built = this.options.built();
    const farmland = map.farmland[target.row]?.[target.col] ?? false;
    const bag = this.options.bag();
    const held = bag?.[this.options.selectedSlot()]?.itemId ?? null;
    // Places win even with the mouse over a tile (they're never next to the farm field). Facing
    // Marlow you talk to him, even by the board; standing right by him otherwise, too.
    const place = placeNear(map, position, CLIENT_NEAR_TILES);
    const keeper = this.options.keeperTile();
    const facingKeeper = keeper !== null && keeper.col === target.col && keeper.row === target.row;
    let spot: Spot | null = facingKeeper ? { kind: "keeper" } : place ? { kind: "place", place } : this.options.spot(position);
    if (!spot && keeper && (isNeighbour(feet, keeper) || (feet.col === keeper.col && feet.row === keeper.row))) spot = { kind: "keeper" };
    // The lighthouse's door: Climb once it's lit, otherwise a hint.
    if (!spot && nearLighthouseDoor(map, position, CLIENT_NEAR_TILES)) {
      spot = built.has("lighthouse") ? { kind: "climb" } : { kind: "closed", reason: "lighthouse-dark" };
    }
    // Something closed in front (the brambles): its hint.
    if (!spot) {
      const closed = closedHintAt(map, built, target);
      if (closed && isHint({ reason: closed })) spot = { kind: "closed", reason: closed as HintReason };
    }
    const placing = this.options.placing();
    // A find, driftwood or a branch in front, or underfoot; a bug close by; water in front to fish.
    const lying = (col: number, row: number) => {
      const find = this.options.findAt(col, row);
      if (find) return { itemId: find.findId as ItemId, col, row };
      const item = this.options.forageAt(col, row);
      return item ? { itemId: item.itemId as ItemId, col, row } : null;
    };
    const find = lying(target.col, target.row) ?? lying(feet.col, feet.row);
    const bug = this.options.bugNear(position);
    const water = held === FISHING_ROD ? fishingSpot(map, feet, target) : null;
    const fishing = water ? { spot: water, col: target.col, row: target.row } : null;
    // At the board, holding something it wants: Give.
    const wanted = place === "board" && held ? this.options.wanted(held) : null;
    const give = wanted && held ? { ...wanted, itemId: held } : null;
    const action = chooseAction(tile, farmland, held, spot, placing, { find, bug, fishing, give });
    return { action, target, tile, farmland, held, spot, placing };
  }

  /** The tile under the mouse, if it's one of the 8 around you. */
  private hoveredTile(): TilePos | null {
    if (!this.pointer || this.options.busy()) return null;
    const world = this.scene.cameras.main.getWorldPoint(this.pointer.x, this.pointer.y);
    const tile = { col: Math.floor(world.x / 16), row: Math.floor(world.y / 16) };
    return isNeighbour(feetTile(this.options.me.sprite), tile) ? tile : null;
  }

  private viewFor({ action, held, spot }: Aim): ActionView {
    const word = actionWord(action);
    switch (action.kind) {
      case "sleep":
        // A bed in a house, or the tent.
        if (spot?.kind === "bed") return { ...this.heldView("red_bed"), word, faded: false };
        return { icon: { key: CAMP_KEY, frame: TENT_FRAME }, iconScale: 1, word, faded: false };
      case "crate":
        return { icon: { key: SHIPPING_CRATE_KEY, frame: 0 }, iconScale: 1, word, faded: false };
      case "seeds":
        return { icon: itemIcon("carrot_seeds"), iconScale: 3, word, faded: false };
      case "shop":
        return { ...this.heldView("potted_fern"), word, faded: false };
      case "enter":
      case "leave":
        return { icon: { key: HOUSE_SHEET_KEY, frame: DOOR_FRAME }, iconScale: 3, word, faded: false };
      case "place":
        return { ...this.heldView(action.itemId), word, faded: false };
      case "pickUp":
        return { icon: itemIcon(action.itemId), iconScale: 3, word, faded: false };
      case "board":
        return { icon: { key: BOARD_KEY, frame: 1 }, iconScale: 1, word, faded: false };
      case "give":
        return { icon: itemIcon(action.itemId), iconScale: 3, word, faded: false };
      case "talk":
        return { icon: { key: KEEPER_FACE_KEY }, iconScale: 1, word, faded: false };
      case "climb":
        return { icon: { key: LIGHTHOUSE_KEY, frame: LIGHTHOUSE_FRAME.lit }, iconScale: 0.5, word, faded: false };
      case "closed":
        return { ...this.heldView(held), word: null, faded: true };
      case "catch":
        return { icon: itemIcon(action.bugId), iconScale: 3, word, faded: false };
      case "fish":
        return { ...this.heldView(FISHING_ROD), word, faded: false };
      case "harvest":
        return { icon: itemIcon(cropItemId(action.cropId)), iconScale: 3, word, faded: false };
      case "plant":
        return { icon: itemIcon(held ?? "radish_seeds"), iconScale: 3, word, faded: false };
      case "till":
      case "water":
        return { ...this.heldView(held), word, faded: false };
      case "none":
        return { ...this.heldView(held), word: null, faded: true };
    }
  }

  /** An item's picture on the Action button, 48 pixels across. */
  private heldView(itemId: ItemId | null): Pick<ActionView, "icon" | "iconScale"> {
    if (!itemId) return { icon: null, iconScale: 3 };
    const icon = itemIcon(itemId);
    return { icon, iconScale: iconScale(icon, 48) };
  }
}
