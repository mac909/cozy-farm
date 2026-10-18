import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { TILE_SIZE } from "../../../shared/constants";
import { FURNITURE, footprintOf, goesIn, nextTurn, type FurnitureId } from "../../../shared/content/furniture";
import { furnitureOf, ITEMS } from "../../../shared/content/items";
import { farmBoard, farmKeepClear, houseBoard } from "../../../shared/decor/boards";
import { pieceArea, pieceAt, placeRefusal, type Board, type PlacedPiece } from "../../../shared/decor/pieces";
import { hintText, type HintReason } from "../../../shared/farming/actions";
import type { Inventory } from "../../../shared/inventory/inventory";
import type { MovePieceMessage, PlacePieceMessage, TakePieceMessage } from "../../../shared/messages";
import type { Vec } from "../../../shared/movement";
import type { FarmState } from "../../../shared/schema";
import { areaOf, floorOrigin, floorSize, floorToMap, houseById, mapToFloor, VILLAGE, villageRect, type AreaId } from "../../../shared/world/houses";
import type { TilePos } from "../../../shared/world/map";
import { feetTile } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { iconScale, itemIcon } from "../art/itemIcons";
import { UI_ICON, UI_ICONS_KEY } from "../art/assets";
import { playSound } from "../audio/sounds";
import type { ActionView } from "../ui/ActionButton";
import type { Character } from "./Character";
import type { Homes, Resident } from "./Homes";
import { drawPiece } from "./pieceSprites";

/** Over the characters, tree tops and the dark round a room; under name tags. */
const GHOST_DEPTH = 960_000;
const OK_COLOR = 0x9be564;
const NO_COLOR = 0xff6b6b;
const HOVER_COLOR = 0xffffff;
/** The stick moves the cursor a tile at once, then again after this long, then every REPEAT_MS. */
const FIRST_REPEAT_MS = 280;
const REPEAT_MS = 120;
/** A touch this short and still is a tap on a tile (the cursor jumps there), not a push on the stick. */
const TAP_MS = 250;
const TAP_PIXELS = 12;

/** What the arrange buttons in the HUD show. */
export interface ArrangeHud {
  /** What you're carrying, if anything ("Sofa"). */
  carrying: string | null;
  canTurn: boolean;
  canPutAway: boolean;
}

/** A piece being carried about: from a bag slot, or lifted from where it stood. */
type Carry =
  | { itemId: FurnitureId; turn: number; from: "bag"; slot: number }
  | { itemId: FurnitureId; turn: number; from: "placed"; index: number; piece: PlacedPiece };

export interface ArrangeOptions {
  homes: Homes;
  me: Character;
  /** Your character, for where you stand and which tile is in front of you. */
  player: Phaser.GameObjects.Sprite;
  facingTile(): TilePos;
  room(): Room<FarmState> | null;
  bag(): Inventory | null;
  selectedSlot(): number;
  /** Whether a farm tile has been dug (decorations stay off the soil). */
  dug(col: number, row: number): boolean;
  /** Everyone and where they stand. */
  residents(): readonly Resident[];
  showAction(view: ActionView): void;
  /** Shows the arrange buttons in the HUD, or (null) the usual ones. */
  showHud(view: ArrangeHud | null): void;
  /** Whether a pointer is over one of the HUD's buttons (so a click isn't also a click on the world). */
  overHud(pointer: Phaser.Input.Pointer): boolean;
  /** Arranging started: for the tips. */
  started?(): void;
}

/**
 * Arrange mode: putting furniture down in your own house, or decorations on the farm, with one
 * thumb or the keys. Your character stands still; the joystick (or keys, or the mouse, or a tap
 * on a tile) moves a cursor over the grid. Carrying a piece, it shows there in green where it fits
 * and red where it doesn't: Place, Turn, Put away. Not carrying, the cursor shows what's under it:
 * Lift it to carry, Turn it on the spot, or Put it away. Done (Esc) stops. Nothing changes on the
 * server until Place, Turn or Put away.
 */
export class Arrange {
  private active = false;
  private area: AreaId = VILLAGE;
  private cursor: TilePos = { col: 0, row: 0 };
  private carry: Carry | null = null;
  private ghost: Phaser.GameObjects.Image | null = null;
  private ghostKey = "";
  private readonly frame: Phaser.GameObjects.Graphics;
  /** The camera follows this while arranging, so the cursor can go anywhere on the farm. */
  private readonly focus: Phaser.GameObjects.Zone;
  private readonly keepClear = farmKeepClear(VILLAGE_MAP);
  private step: { dir: string; next: number } | null = null;
  private lastSlot = -1;
  private downAt: { x: number; y: number; time: number } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: ArrangeOptions,
  ) {
    this.frame = scene.add.graphics().setDepth(GHOST_DEPTH + 1).setVisible(false);
    this.focus = scene.add.zone(0, 0, 1, 1);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (!this.active || pointer.wasTouch || options.overHud(pointer)) return;
      this.pointAt(pointer);
    });
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (!this.active || options.overHud(pointer)) return;
      if (pointer.wasTouch) {
        this.downAt = { x: pointer.x, y: pointer.y, time: performance.now() };
        return;
      }
      // The left button (some pointers report no buttons held on the way down, so check which one changed).
      if (pointer.button !== 0) return;
      this.pointAt(pointer);
      this.act();
    });
    // On a phone, a quick tap on a tile moves the cursor there (a drag is the stick).
    scene.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      const down = this.downAt;
      this.downAt = null;
      if (!this.active || !pointer.wasTouch || !down) return;
      if (performance.now() - down.time > TAP_MS || Math.hypot(pointer.x - down.x, pointer.y - down.y) > TAP_PIXELS) return;
      this.pointAt(pointer);
      this.followCursor();
    });
  }

  get isActive(): boolean {
    return this.active;
  }

  /**
   * Starts arranging where you are, carrying the furniture in bag slot `slot` if it goes here. In
   * someone else's house there's nothing to arrange.
   */
  start(slot: number | null = null) {
    const kind = this.options.homes.placing();
    if (!kind) {
      this.hint("not-your-house");
      return;
    }
    this.active = true;
    this.area = this.options.homes.currentArea;
    this.carry = null;
    this.step = null;
    this.cursor = this.clamp(this.options.facingTile());
    this.lastSlot = this.options.selectedSlot();
    if (slot !== null) this.carryFromBag(slot, true);
    this.followCursor();
    this.scene.cameras.main.startFollow(this.focus, true, 0.25, 0.25);
    playSound(this.scene, "open");
    this.options.started?.();
  }

  /** Stops arranging. A lifted piece that wasn't put down stays where it was. */
  stop() {
    if (!this.active) return;
    this.active = false;
    this.dropCarry();
    this.ghost?.destroy();
    this.ghost = null;
    this.ghostKey = "";
    this.frame.setVisible(false);
    this.scene.cameras.main.startFollow(this.options.player, true);
    this.options.showHud(null);
  }

  /** Every frame while arranging: the stick moves the cursor; the ghost, the buttons and the Action button follow. */
  update(input: Vec) {
    if (!this.active) return;
    if (this.options.homes.currentArea !== this.area || !this.options.homes.placing()) {
      this.stop();
      return;
    }
    const slot = this.options.selectedSlot();
    if (slot !== this.lastSlot) {
      // Picking a hotbar slot carries what's in it (if it goes here), or nothing.
      this.lastSlot = slot;
      if (this.carry?.from === "placed") this.dropCarry();
      this.carryFromBag(slot, false);
    }
    // A carried stack ran out (the last one was put down).
    const bag = this.options.bag();
    if (this.carry?.from === "bag" && bag?.[this.carry.slot]?.itemId !== this.carry.itemId) this.carry = null;
    this.moveByStick(input);
    this.draw();
  }

  /** The Action button, Space or a click: put down what you're carrying, or lift what's under the cursor. */
  act() {
    if (!this.active) return;
    const carry = this.carry;
    const { pieces, local, toMap } = this.here();
    if (carry) {
      const refusal = this.refusal(carry);
      if (refusal) {
        this.hint(refusal);
        return;
      }
      const room = this.options.room();
      if (carry.from === "bag") {
        room?.send("placePiece", { slot: carry.slot, col: this.cursor.col, row: this.cursor.row, turn: carry.turn } satisfies PlacePieceMessage);
        // Keep carrying the rest of the stack: a fence goes down post after post.
      } else {
        const from = toMap(carry.piece);
        room?.send("movePiece", {
          itemId: carry.itemId,
          col: from.col,
          row: from.row,
          toCol: this.cursor.col,
          toRow: this.cursor.row,
          turn: carry.turn,
        } satisfies MovePieceMessage);
        this.dropCarry();
      }
      playSound(this.scene, "plant");
      return;
    }
    const at = local(this.cursor);
    const index = pieceAt(pieces, at.col, at.row);
    if (index === null) {
      this.options.me.showHint("Pick some furniture from your hotbar, or move to a piece to lift it.");
      return;
    }
    const piece = pieces[index];
    this.carry = { itemId: piece.itemId, turn: piece.turn, from: "placed", index, piece };
    this.cursor = toMap(piece);
    this.followCursor();
    this.options.homes.groupFor(this.area)?.setLifted(index);
    playSound(this.scene, "tap");
  }

  /** Turn (R): the piece you're carrying, or the one under the cursor, on the spot. */
  turn() {
    if (!this.active) return;
    if (this.carry) {
      this.carry = { ...this.carry, turn: nextTurn(this.carry.itemId, this.carry.turn) };
      playSound(this.scene, "tap");
      return;
    }
    const hovered = this.hovered();
    if (!hovered) return;
    const { piece } = hovered;
    if (FURNITURE[piece.itemId].turns.length < 2) {
      this.options.me.showHint("That only goes one way round.");
      return;
    }
    const from = this.here().toMap(piece);
    this.options.room()?.send("movePiece", {
      itemId: piece.itemId,
      col: from.col,
      row: from.row,
      toCol: from.col,
      toRow: from.row,
      turn: nextTurn(piece.itemId, piece.turn),
    } satisfies MovePieceMessage);
    playSound(this.scene, "tap");
  }

  /** Put away: what you're carrying (a lifted piece goes back in your bag), or the piece under the cursor. */
  putAway() {
    if (!this.active) return;
    const carry = this.carry;
    if (carry?.from === "bag") {
      this.carry = null;
      return;
    }
    const piece = carry?.from === "placed" ? carry.piece : this.hovered()?.piece;
    if (!piece) return;
    const at = this.here().toMap(piece);
    this.options.room()?.send("takePiece", { itemId: piece.itemId, col: at.col, row: at.row } satisfies TakePieceMessage);
    this.dropCarry();
    playSound(this.scene, "pick");
  }

  /** Where you're arranging: what's down there, its board, and its tiles to and from map tiles. */
  private here(): {
    pieces: readonly PlacedPiece[];
    board: Board;
    local: (at: TilePos) => TilePos;
    toMap: (at: TilePos) => TilePos;
  } {
    const residents = this.options.residents().filter((r) => !r.inBed && areaOf(VILLAGE_MAP, r) === this.area);
    const standing = residents.map((r) => feetTile(r));
    const plan = this.area === VILLAGE ? null : houseById(VILLAGE_MAP, this.area);
    if (plan) {
      const occupied = (col: number, row: number) => standing.some((feet) => {
        const at = mapToFloor(plan, feet);
        return at.col === col && at.row === row;
      });
      return {
        pieces: this.options.homes.houseViews[plan.id]?.furniture ?? [],
        board: houseBoard(plan, occupied),
        local: (at) => mapToFloor(plan, at),
        toMap: (at) => floorToMap(plan, at),
      };
    }
    const occupied = (col: number, row: number) => standing.some((feet) => feet.col === col && feet.row === row);
    return {
      pieces: this.options.homes.farmDecorations,
      board: farmBoard(VILLAGE_MAP, (col, row) => this.options.dug(col, row), occupied, this.keepClear),
      local: (at) => at,
      toMap: (at) => ({ col: at.col, row: at.row }),
    };
  }

  /** Why the carried piece can't go at the cursor, or null if it can. */
  private refusal(carry: Carry): HintReason | null {
    const { pieces, board, local } = this.here();
    const at = local(this.cursor);
    const moving = carry.from === "placed" ? pieces.findIndex((p) => p.itemId === carry.piece.itemId && p.col === carry.piece.col && p.row === carry.piece.row) : -1;
    return placeRefusal(board, pieces, { itemId: carry.itemId, col: at.col, row: at.row, turn: carry.turn }, moving >= 0 ? moving : null);
  }

  /** The piece under the cursor, if you're not carrying anything. */
  private hovered(): { piece: PlacedPiece; index: number } | null {
    if (this.carry) return null;
    const { pieces, local } = this.here();
    const at = local(this.cursor);
    const index = pieceAt(pieces, at.col, at.row);
    return index === null ? null : { piece: pieces[index], index };
  }

  /** Carries the furniture in a bag slot, if it goes here. `say` explains when it doesn't. */
  private carryFromBag(slot: number, say: boolean) {
    const itemId = furnitureOf(this.options.bag()?.[slot]?.itemId);
    const kind = this.options.homes.placing();
    if (!itemId || !kind) {
      this.carry = null;
      return;
    }
    if (!goesIn(itemId, kind)) {
      this.carry = null;
      if (say) this.hint(kind === "house" ? "farm-only" : "house-only");
      return;
    }
    this.carry = { itemId, turn: 0, from: "bag", slot };
  }

  /** Lets go of a lifted piece (it shows where it was again). */
  private dropCarry() {
    if (this.carry?.from === "placed") this.options.homes.groupFor(this.area)?.setLifted(null);
    this.carry = null;
  }

  /** The stick (or keys) nudge the cursor a tile at a time, repeating while held. */
  private moveByStick(input: Vec) {
    const strong = Math.max(Math.abs(input.x), Math.abs(input.y)) >= 0.5;
    if (!strong) {
      this.step = null;
      return;
    }
    const horizontal = Math.abs(input.x) >= Math.abs(input.y);
    const dir = horizontal ? (input.x > 0 ? "right" : "left") : input.y > 0 ? "down" : "up";
    const now = performance.now();
    if (this.step?.dir === dir && now < this.step.next) return;
    const first = this.step?.dir !== dir;
    this.step = { dir, next: now + (first ? FIRST_REPEAT_MS : REPEAT_MS) };
    const delta = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir]!;
    this.cursor = this.clamp({ col: this.cursor.col + delta[0], row: this.cursor.row + delta[1] });
    this.followCursor();
  }

  /** The cursor goes where the mouse (or a tap) is. */
  private pointAt(pointer: Phaser.Input.Pointer) {
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.cursor = this.clamp({ col: Math.floor(world.x / TILE_SIZE), row: Math.floor(world.y / TILE_SIZE) });
  }

  private followCursor() {
    this.focus.setPosition(this.cursor.col * TILE_SIZE + TILE_SIZE / 2, this.cursor.row * TILE_SIZE + TILE_SIZE / 2);
  }

  /** Keeps the cursor on the room's floor, or in the village. */
  private clamp(at: TilePos): TilePos {
    const plan = this.area === VILLAGE ? null : houseById(VILLAGE_MAP, this.area);
    let first: TilePos;
    let last: TilePos;
    if (plan) {
      first = floorOrigin(plan);
      const size = floorSize(plan);
      last = { col: first.col + size.width - 1, row: first.row + size.height - 1 };
    } else {
      const village = villageRect(VILLAGE_MAP);
      first = { col: 0, row: 0 };
      last = { col: Math.floor(village.width / TILE_SIZE) - 1, row: Math.floor(village.height / TILE_SIZE) - 1 };
    }
    return { col: Phaser.Math.Clamp(at.col, first.col, last.col), row: Phaser.Math.Clamp(at.row, first.row, last.row) };
  }

  /** The ghost and the frame round it, the Action button, and the HUD's buttons. */
  private draw() {
    const carry = this.carry;
    const hovered = this.hovered();
    let color = HOVER_COLOR;
    let area = { col: this.cursor.col, row: this.cursor.row, width: 1, height: 1 };
    let ok = false;
    if (carry) {
      const piece: PlacedPiece = { itemId: carry.itemId, col: this.cursor.col, row: this.cursor.row, turn: carry.turn };
      ok = this.refusal(carry) === null;
      color = ok ? OK_COLOR : NO_COLOR;
      area = pieceArea(piece);
      const key = JSON.stringify(piece);
      if (key !== this.ghostKey) {
        this.ghost?.destroy();
        this.ghostKey = key;
        this.ghost = drawPiece(this.scene, piece, { x: area.col * TILE_SIZE, y: area.row * TILE_SIZE, width: area.width * TILE_SIZE, height: area.height * TILE_SIZE })
          .setDepth(GHOST_DEPTH)
          .setAlpha(0.85);
      }
      this.ghost?.setTint(ok ? 0xffffff : 0xff9a9a);
    } else {
      this.ghost?.destroy();
      this.ghost = null;
      this.ghostKey = "";
      if (hovered) {
        const map = this.here().toMap(hovered.piece);
        const { width, height } = footprintOf(hovered.piece.itemId, hovered.piece.turn);
        area = { col: map.col, row: map.row, width, height };
      }
    }
    const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 180);
    this.frame
      .clear()
      .lineStyle(1, color, pulse)
      .strokeRect(area.col * TILE_SIZE + 0.5, area.row * TILE_SIZE + 0.5, area.width * TILE_SIZE - 1, area.height * TILE_SIZE - 1)
      .setVisible(true);

    if (carry) {
      const icon = itemIcon(carry.itemId);
      this.options.showAction({ icon, iconScale: iconScale(icon, 48), word: "Place", faded: !ok });
    } else if (hovered) {
      const icon = itemIcon(hovered.piece.itemId);
      this.options.showAction({ icon, iconScale: iconScale(icon, 48), word: "Lift", faded: false });
    } else {
      this.options.showAction({ icon: { key: UI_ICONS_KEY, frame: UI_ICON.arrange }, iconScale: 3, word: null, faded: true });
    }
    const turnable = (id: FurnitureId) => FURNITURE[id].turns.length > 1;
    this.options.showHud({
      carrying: carry ? ITEMS[carry.itemId].name : null,
      canTurn: carry ? turnable(carry.itemId) : hovered !== null && turnable(hovered.piece.itemId),
      canPutAway: carry !== null || hovered !== null,
    });
  }

  private hint(reason: HintReason) {
    this.options.me.showHint(hintText({ reason }));
  }
}
