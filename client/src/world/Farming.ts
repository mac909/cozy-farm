import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { CROPS } from "../../../shared/content/crops";
import { cropItemId, type ItemId } from "../../../shared/content/items";
import {
  HOE,
  WATERING_CAN,
  actionWord,
  chooseAction,
  hintFor,
  hintText,
  seedCrop,
  type Action,
  type DoorKind,
  type FarmActionKind,
  type Hint,
  type Spot,
} from "../../../shared/farming/actions";
import type { FurnitureId, PlaceKind } from "../../../shared/content/furniture";
import type { FarmTile } from "../../../shared/farming/farming";
import { roomFor, type Inventory } from "../../../shared/inventory/inventory";
import type { FarmActionMessage } from "../../../shared/messages";
import { facingFor, type Facing } from "../../../shared/movement";
import type { FarmState } from "../../../shared/schema";
import { readFarm } from "../../../shared/stateSync";
import type { TilePos } from "../../../shared/world/map";
import { CLIENT_NEAR_TILES, feetTile, isNeighbour, placeNear, targetTile, type Point } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { tileKey, type TileKey } from "../../../shared/world/world";
import { TILE_SIZE } from "../../../shared/constants";
import { CAMP_KEY, HOUSE_SHEET_KEY, SHIPPING_CRATE_KEY, TENT_FRAME } from "../art/assets";
import { DOOR_FRAME } from "../art/houseArt";
import { iconScale, itemIcon } from "../art/itemIcons";
import { playSound, type SoundId } from "../audio/sounds";
import type { ActionView } from "../ui/ActionButton";
import type { Character } from "./Character";
import { playFarmEffect } from "./effects";
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

/** What tapping the Action button does at each place, door and bed, and with furniture in hand. */
export interface ActionHandlers {
  sleep(): void;
  crate(): void;
  seeds(): void;
  shop(): void;
  enter(houseId: string, how: DoorKind): void;
  leave(houseId: string): void;
  place(itemId: FurnitureId): void;
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
  /** What tapping the Action button does, beyond farming. */
  on: ActionHandlers;
  /** Whether the Action button or Space is being held down (hold to repeat). */
  holding(): boolean;
  /** You dug, planted, watered or picked (asked the server to): for the first-day tips. */
  acted?(kind: FarmActionKind): void;
}

/** Whether an action changes a farm tile (the ones hold-to-repeat repeats). */
function isFarmAction(action: Action): action is Extract<Action, { kind: FarmActionKind }> {
  return action.kind === "till" || action.kind === "plant" || action.kind === "water" || action.kind === "harvest";
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
    } else if (this.holdArmed && isFarmAction(aim.action) && tileKey(aim.target.col, aim.target.row) !== this.repeatFrom) {
      this.act();
      aim = this.aim();
    }
    const { action, held, target, spot } = aim;
    const faded = action.kind === "none";
    const holdingTool = held === HOE || held === WATERING_CAN || seedCrop(held) !== null;
    // The outline shows while you hold a tool or seeds, or face something ripe, so walking around town stays clean.
    if (!spot && !this.options.busy() && (holdingTool || action.kind === "harvest")) this.outlineHost.show(target, faded);
    else this.outlineHost.hide();
    this.options.showAction(this.viewFor(aim));
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
    const farmland = VILLAGE_MAP.farmland[target.row]?.[target.col] ?? false;
    const bag = this.options.bag();
    const held = bag?.[this.options.selectedSlot()]?.itemId ?? null;
    // Places win even with the mouse over a tile (they're never next to the farm field).
    const place = placeNear(VILLAGE_MAP, position, CLIENT_NEAR_TILES);
    const spot: Spot | null = place ? { kind: "place", place } : this.options.spot(position);
    const placing = this.options.placing();
    return { action: chooseAction(tile, farmland, held, spot, placing), target, tile, farmland, held, spot, placing };
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
