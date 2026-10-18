import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { FEET_OFFSET, TILE_SIZE } from "../../../shared/constants";
import type { PlaceKind } from "../../../shared/content/furniture";
import { houseLook } from "../../../shared/content/houses";
import { bedNear, pieceRectInHouse } from "../../../shared/decor/beds";
import { doorKind } from "../../../shared/decor/decorate";
import { pieceArea, type PlacedPiece } from "../../../shared/decor/pieces";
import type { DoorKind, Spot } from "../../../shared/farming/actions";
import type { MoveInMessage } from "../../../shared/messages";
import type { Facing, Vec } from "../../../shared/movement";
import type { FarmState } from "../../../shared/schema";
import { readHouses, readPieces, type HouseView } from "../../../shared/stateSync";
import {
  VILLAGE,
  areaOf,
  doorNear,
  exitNear,
  exitTile,
  frontOfDoor,
  houseById,
  villageRect,
  type AreaId,
} from "../../../shared/world/houses";
import { tileAt, tileCenter, type HousePlan, type Rect } from "../../../shared/world/map";
import { CLIENT_NEAR_TILES, type Point } from "../../../shared/world/places";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { HOUSE_SHEET_KEY, ZZZ_KEY } from "../art/assets";
import { cottageFrame } from "../art/houseArt";
import { playSound } from "../audio/sounds";
import type { Character } from "./Character";
import { houseSign, insideText, type Occupant } from "./houseText";
import { PieceGroup } from "./pieceSprites";

/** The pack's near-black: what's around a room on screen. */
const VOID_COLOR = 0x141b1b;
/** Over everything in the world (characters, tree tops, the outline), under name tags and bubbles. */
const VOID_DEPTH = 950_000;
/** Signs over the cottages, with the name tags. */
const SIGN_DEPTH = 1_000_000;
const ZZZ_DEPTH = 1_000_001;
/** How long to push into a door (or out over the mat) before going through, in ms. */
const PUSH_MS = 140;
/** How long to wait for the server to say a cottage is yours after asking to move in. */
const MOVE_IN_WAIT_MS = 4000;

/** Someone the cottages need to know about: where they are, and whether they're asleep. */
export interface Resident extends Occupant, Point {
  inBed: boolean;
}

export interface HomesOptions {
  me: Character;
  /** The farmer this device plays, once known. */
  myFarmerId(): string | null;
  room(): Room<FarmState> | null;
  /** Puts your own character somewhere at once, and tells the server. */
  teleport(x: number, y: number, facing: Facing): void;
  /** You arrived somewhere new (the village, or a room): for the tips. */
  arrived?(area: AreaId, how: DoorKind | "out"): void;
}

/**
 * The cottages and their rooms on this device: the cottages in the meadow with a sign over each
 * (whose it is, who's in), the furniture in every room and the decorations on the farm (with their
 * invisible walls), going in and out (through a door, or by walking into it), and the camera: in a
 * room it shows just the room, with the pack's dark background all round.
 */
export class Homes {
  /** Invisible walls under furniture and decorations; the player collides with these. */
  readonly colliders: Phaser.Physics.Arcade.StaticGroup;
  private houses: Record<string, HouseView> = {};
  private decorations: PlacedPiece[] = [];
  private readonly furniture = new Map<string, PieceGroup>();
  private readonly decor: PieceGroup;
  private readonly signs = new Map<string, { title: Phaser.GameObjects.Text; inside: Phaser.GameObjects.Text }>();
  private readonly voids: Phaser.GameObjects.Rectangle[];
  private readonly zzzs: Phaser.GameObjects.Image[] = [];
  private zoom = 1;
  private area: AreaId = VILLAGE;
  private pendingMoveIn: { houseId: string; until: number } | null = null;
  /** Pushing into a door or out over a mat since when (performance.now()). */
  private pushSince: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: HomesOptions,
  ) {
    this.colliders = scene.physics.add.staticGroup();
    this.decor = new PieceGroup(scene, this.colliders);
    for (const plan of VILLAGE_MAP.houses) {
      const { x, y, width, height } = plan.building;
      scene.add
        .image(x, y, HOUSE_SHEET_KEY, cottageFrame(houseLook(plan.id).style))
        .setOrigin(0, 0)
        .setDepth(y + height);
      this.furniture.set(plan.id, new PieceGroup(scene, this.colliders));
      const text = (size: number, color: string) =>
        scene.add
          .text(x + width / 2, y, "", {
            fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            fontSize: `${size}px`,
            fontStyle: "bold",
            color,
            stroke: "#2b2b2b",
            strokeThickness: 3,
            resolution: window.devicePixelRatio,
          })
          .setOrigin(0.5, 1)
          .setDepth(SIGN_DEPTH);
      this.signs.set(plan.id, { title: text(12, "#fff8e7"), inside: text(11, "#ffd36b") });
    }
    const big = 4000;
    this.voids = [0, 1, 2, 3].map(() => scene.add.rectangle(0, 0, big, big, VOID_COLOR).setOrigin(0, 0).setDepth(VOID_DEPTH).setVisible(false));
    this.applyCamera();
  }

  /** Where you are: the village, or a house's room. */
  get currentArea(): AreaId {
    return this.area;
  }

  /** What's in each house, as the server last said. */
  get houseViews(): Readonly<Record<string, HouseView>> {
    return this.houses;
  }

  /** The farm's decorations, as the server last said. */
  get farmDecorations(): readonly PlacedPiece[] {
    return this.decorations;
  }

  /** The furniture group drawn in a house (for lifting a piece in arrange mode). */
  groupFor(area: AreaId): PieceGroup | null {
    return area === VILLAGE ? this.decor : (this.furniture.get(area) ?? null);
  }

  /** After every update from the server: who lives where, the furniture and the decorations. */
  readState(state: FarmState) {
    this.houses = readHouses(state.houses);
    this.decorations = readPieces(state.decorations);
    for (const plan of VILLAGE_MAP.houses) {
      const house = this.houses[plan.id];
      this.furniture.get(plan.id)!.show(house?.furniture ?? [], (piece) => pieceRectInHouse(plan, piece));
      this.signs.get(plan.id)!.title.setText(houseSign(house?.ownerName || null));
    }
    this.decor.show(this.decorations, (piece) => {
      const area = pieceArea(piece);
      return { x: area.col * TILE_SIZE, y: area.row * TILE_SIZE, width: area.width * TILE_SIZE, height: area.height * TILE_SIZE };
    });

    // Moved in: straight inside.
    const pending = this.pendingMoveIn;
    if (pending && this.houses[pending.houseId]?.owner === this.options.myFarmerId()) {
      this.pendingMoveIn = null;
      this.goIn(pending.houseId, "moveIn");
      this.options.me.showHint("Welcome home!");
    }
  }

  /**
   * Every frame: notices when you've gone into a room or come out (the camera follows), goes
   * through a door you're pushing into, and keeps the signs and the beds' Zzz up to date.
   */
  update(me: Point, input: Vec, residents: readonly Resident[]) {
    if (this.pendingMoveIn && performance.now() > this.pendingMoveIn.until) this.pendingMoveIn = null;
    const area = areaOf(VILLAGE_MAP, me);
    if (area !== this.area) {
      this.area = area;
      this.applyCamera();
    }
    this.pushThroughDoors(me, input);
    this.showWhoIsIn(residents);
    this.showSleepers(residents);
  }

  /** The door, way out or bed you're standing by, if any: they take over the Action button. */
  spot(position: Point): Spot | null {
    const feet = { x: position.x, y: position.y + FEET_OFFSET };
    if (this.area === VILLAGE) {
      const door = doorNear(VILLAGE_MAP, feet, CLIENT_NEAR_TILES);
      return door ? { kind: "door", houseId: door.id, how: doorKind(this.houses, door.id, this.options.myFarmerId() ?? "") } : null;
    }
    const exit = exitNear(VILLAGE_MAP, feet);
    if (exit) return { kind: "exit", houseId: exit.id };
    return bedNear(VILLAGE_MAP, this.houses, position, CLIENT_NEAR_TILES) ? { kind: "bed" } : null;
  }

  /** What can be put down where you are: decorations outdoors, furniture in your own house, nothing in anyone else's. */
  placing(): PlaceKind | null {
    if (this.area === VILLAGE) return "farm";
    const me = this.options.myFarmerId();
    return me && this.houses[this.area]?.owner === me ? "house" : null;
  }

  /** The Action button at a door: in you go, or (at an empty one) ask to move in first. */
  enter(houseId: string, how: DoorKind) {
    if (how !== "moveIn") {
      this.goIn(houseId, how);
      return;
    }
    const message: MoveInMessage = { house: houseId };
    this.options.room()?.send("moveIn", message);
    this.pendingMoveIn = { houseId, until: performance.now() + MOVE_IN_WAIT_MS };
  }

  /** The Action button on the mat (or walking out over it): back outside, in front of the door. */
  leave(houseId: string) {
    const plan = houseById(VILLAGE_MAP, houseId);
    if (!plan) return;
    const front = frontOfDoor(plan);
    const at = tileCenter(front.col, front.row);
    playSound(this.scene, "open");
    this.options.teleport(at.x, at.y, "down");
    this.options.arrived?.(VILLAGE, "out");
  }

  /** The camera zoom changed (the screen was resized or turned). */
  setZoom(zoom: number) {
    this.zoom = zoom;
    for (const { title, inside } of this.signs.values()) {
      title.setScale(1 / zoom);
      inside.setScale(1 / zoom);
    }
    this.applyCamera();
  }

  private goIn(houseId: string, how: DoorKind) {
    const plan = houseById(VILLAGE_MAP, houseId);
    if (!plan) return;
    const exit = exitTile(plan);
    const at = tileCenter(exit.col, exit.row);
    playSound(this.scene, "open");
    this.options.teleport(at.x, at.y, "up");
    this.options.arrived?.(houseId, how);
  }

  /** Walking into a door you can go through, or down off the mat out of a room, takes you through. */
  private pushThroughDoors(me: Point, input: Vec) {
    const feet = tileAt(me.x, me.y + FEET_OFFSET);
    let through: (() => void) | null = null;
    if (this.area === VILLAGE && input.y < -0.5 && Math.abs(input.x) < 0.5) {
      const plan = VILLAGE_MAP.houses.find((p) => {
        const front = frontOfDoor(p);
        return front.col === feet.col && front.row === feet.row;
      });
      const how = plan ? doorKind(this.houses, plan.id, this.options.myFarmerId() ?? "") : null;
      // Moving in is a choice: it takes a tap on the Action button.
      if (plan && how && how !== "moveIn") through = () => this.goIn(plan.id, how);
    } else if (this.area !== VILLAGE && input.y > 0.5 && Math.abs(input.x) < 0.5) {
      const plan = houseById(VILLAGE_MAP, this.area);
      const exit = plan && exitTile(plan);
      if (plan && exit && exit.col === feet.col && exit.row === feet.row) through = () => this.leave(plan.id);
    }
    if (!through) {
      this.pushSince = null;
      return;
    }
    const now = performance.now();
    this.pushSince ??= now;
    if (now - this.pushSince >= PUSH_MS) {
      this.pushSince = null;
      through();
    }
  }

  /** The line under each cottage's sign: who's in it right now. */
  private showWhoIsIn(residents: readonly Resident[]) {
    for (const plan of VILLAGE_MAP.houses) {
      const sign = this.signs.get(plan.id)!;
      const owner = this.houses[plan.id]?.owner ?? null;
      const inside = residents.filter((r) => areaOf(VILLAGE_MAP, r) === plan.id);
      const text = insideText(owner, inside) ?? "";
      if (sign.inside.text !== text) sign.inside.setText(text);
      const top = plan.building.y - 1;
      sign.inside.setPosition(plan.building.x + plan.building.width / 2, top);
      sign.title.setPosition(plan.building.x + plan.building.width / 2, top - (text ? sign.inside.displayHeight : 0));
    }
  }

  /** A Zzz over each bed someone's asleep in, in the room you're in. */
  private showSleepers(residents: readonly Resident[]) {
    let used = 0;
    if (this.area !== VILLAGE) {
      for (const sleeper of residents) {
        if (!sleeper.inBed || areaOf(VILLAGE_MAP, sleeper) !== this.area) continue;
        const bed = bedNear(VILLAGE_MAP, this.houses, sleeper, 2.5);
        if (!bed) continue;
        const zzz = this.zzzs[used] ?? this.makeZzz();
        zzz.setPosition(bed.rect.x + bed.rect.width / 2 + 6, bed.rect.y + 4 + Math.round(Math.sin(performance.now() / 450) * 2)).setVisible(true);
        used++;
      }
    }
    for (let i = used; i < this.zzzs.length; i++) this.zzzs[i].setVisible(false);
  }

  private makeZzz(): Phaser.GameObjects.Image {
    const zzz = this.scene.add.image(0, 0, ZZZ_KEY).setOrigin(0.5, 1).setDepth(ZZZ_DEPTH);
    this.zzzs.push(zzz);
    return zzz;
  }

  /**
   * Outdoors the camera stays in the village. In a room it centres on the room (following you if
   * the room is bigger than the screen), and everything round the room is dark.
   */
  private applyCamera() {
    const camera = this.scene.cameras.main;
    const plan = this.area === VILLAGE ? null : houseById(VILLAGE_MAP, this.area);
    if (!plan) {
      const village = villageRect(VILLAGE_MAP);
      camera.setBounds(village.x, village.y, village.width, village.height);
      for (const v of this.voids) v.setVisible(false);
      return;
    }
    const room = plan.interior;
    const zoom = this.zoom || camera.zoom || 1;
    const width = Math.max(room.width + 2 * TILE_SIZE, camera.width / zoom);
    const height = Math.max(room.height + 2 * TILE_SIZE, camera.height / zoom);
    camera.setBounds(room.x + room.width / 2 - width / 2, room.y + room.height / 2 - height / 2, width, height);
    this.surround(room);
  }

  /** Puts the four dark rectangles round a room. */
  private surround(room: Rect) {
    const big = this.voids[0].width;
    const [top, bottom, left, right] = this.voids;
    top.setPosition(room.x - big / 2, room.y - big).setVisible(true);
    bottom.setPosition(room.x - big / 2, room.y + room.height).setVisible(true);
    left.setPosition(room.x - big, room.y - big / 2).setVisible(true);
    right.setPosition(room.x + room.width, room.y - big / 2).setVisible(true);
  }
}

/** Where a house's room is, for anyone who needs its plan. */
export function planOf(houseId: string): HousePlan | null {
  return houseById(VILLAGE_MAP, houseId);
}
