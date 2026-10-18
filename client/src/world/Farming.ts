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
  type Hint,
} from "../../../shared/farming/actions";
import type { FarmTile } from "../../../shared/farming/farming";
import { roomFor, type Inventory } from "../../../shared/inventory/inventory";
import type { FarmActionMessage } from "../../../shared/messages";
import { facingFor, type Facing } from "../../../shared/movement";
import type { FarmState } from "../../../shared/schema";
import { readFarm } from "../../../shared/stateSync";
import type { TilePos } from "../../../shared/world/map";
import { CLIENT_NEAR_TILES, feetTile, isNeighbour, placeNear, targetTile, type PlaceId } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { tileKey, type TileKey } from "../../../shared/world/world";
import { CAMP_KEY, SHIPPING_CRATE_KEY, TENT_FRAME } from "../art/assets";
import { itemIcon } from "../art/itemIcons";
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

/** What the Action button would do right now, and where. */
interface Aim {
  action: Action;
  target: TilePos;
  tile: FarmTile;
  farmland: boolean;
  held: ItemId | null;
  place: PlaceId | null;
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
  /** The places that take over the Action button when you're next to them, and what tapping it there does. */
  places: Partial<Record<PlaceId, () => void>>;
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
    for (const { col, row, change } of changes) {
      const shownAt = this.recent.get(tileKey(col, row));
      if (shownAt !== undefined && now - shownAt < LOCAL_EFFECT_MS) continue;
      playFarmEffect(this.scene, col, row, change);
    }
  }

  /** Every frame: where the outline goes, and what the Action button says. */
  update() {
    this.hover = this.hoveredTile();
    const aim = this.aim();
    const { action, held, target, place } = aim;
    const faded = action.kind === "none";
    const holdingTool = held === HOE || held === WATERING_CAN || seedCrop(held) !== null;
    // The outline shows while you hold a tool or seeds, or face something ripe, so walking around town stays clean.
    if (!place && !this.options.busy() && (holdingTool || action.kind === "harvest")) this.outlineHost.show(target, faded);
    else this.outlineHost.hide();
    this.options.showAction(this.viewFor(aim));
  }

  /** The Action button (or Space, or a click on a tile next to you). */
  act() {
    if (this.options.busy()) return;
    const aim = this.aim();
    const { action, target, place } = aim;
    if (action.kind === "none") {
      this.hint(hintFor(aim.tile, aim.farmland, aim.held) ?? { reason: "empty-hand" });
      return;
    }
    if (action.kind === "sleep" || action.kind === "crate" || action.kind === "seeds") {
      if (place) this.options.places[place]?.();
      return;
    }
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
    this.recent.set(tileKey(target.col, target.row), performance.now());
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
    const open = Object.keys(this.options.places) as PlaceId[];
    const place = this.hover ? null : placeNear(VILLAGE_MAP, position, CLIENT_NEAR_TILES, open);
    return { action: chooseAction(tile, farmland, held, place), target, tile, farmland, held, place };
  }

  /** The tile under the mouse, if it's one of the 8 around you. */
  private hoveredTile(): TilePos | null {
    if (!this.pointer || this.options.busy()) return null;
    const world = this.scene.cameras.main.getWorldPoint(this.pointer.x, this.pointer.y);
    const tile = { col: Math.floor(world.x / 16), row: Math.floor(world.y / 16) };
    return isNeighbour(feetTile(this.options.me.sprite), tile) ? tile : null;
  }

  private viewFor({ action, held }: Aim): ActionView {
    const word = actionWord(action);
    switch (action.kind) {
      case "sleep":
        return { icon: { key: CAMP_KEY, frame: TENT_FRAME }, iconScale: 1, word, faded: false };
      case "crate":
        return { icon: { key: SHIPPING_CRATE_KEY, frame: 0 }, iconScale: 1, word, faded: false };
      case "seeds":
        return { icon: itemIcon("carrot_seeds"), iconScale: 3, word, faded: false };
      case "harvest":
        return { icon: itemIcon(cropItemId(action.cropId)), iconScale: 3, word, faded: false };
      case "plant":
        return { icon: itemIcon(held ?? "radish_seeds"), iconScale: 3, word, faded: false };
      case "till":
      case "water":
        return { icon: held ? itemIcon(held) : null, iconScale: 3, word, faded: false };
      case "none":
        return { icon: held ? itemIcon(held) : null, iconScale: 3, word: null, faded: true };
    }
  }
}
