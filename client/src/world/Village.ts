import Phaser from "phaser";
import { TILE_SIZE } from "../../../shared/constants";
import { DEFAULT_CHARACTER } from "../../../shared/content/characters";
import { KEEPER_NAME } from "../../../shared/content/keeper";
import { inEffect } from "../../../shared/world/gates";
import { keeperAt } from "../../../shared/world/keeper";
import type { GatedLayer, TilePos } from "../../../shared/world/map";
import type { Today } from "../../../shared/world/today";
import { BOARD_KEY, GARDEN_SHOP_FRAME, GARDEN_SHOP_KEY, KEEPER_KEY, LIGHTHOUSE_FRAME, LIGHTHOUSE_KEY } from "../art/assets";
import type { Rect } from "../../../shared/world/map";
import { Character } from "./Character";

/** A gated tile layer on screen: drawn (art) or walls (collision), and the rule for when. */
export interface GatedOnScreen {
  gate: GatedLayer;
  layer: Phaser.Tilemaps.TilemapLayer;
  /** For a collision layer: its collider with your character. */
  collider?: Phaser.Physics.Arcade.Collider;
}

/** The lamp, in the lighthouse sprite: the middle of its glass, from the sprite's top-left. */
const LAMP_IN_SPRITE = { x: 24, y: 17 };

/** Which picture of the lighthouse goes with what's built. */
export function lighthouseFrame(built: ReadonlySet<string>): number {
  if (built.has("lighthouse")) return LIGHTHOUSE_FRAME.lit;
  if (built.has("lighthouse/lamp")) return LIGHTHOUSE_FRAME.ready;
  if (built.has("lighthouse/stairs")) return LIGHTHOUSE_FRAME.scaffold;
  return LIGHTHOUSE_FRAME.dark;
}

/**
 * Which picture of the garden shop goes with what's built (Milestone 8): boarded up, patched (the
 * boards off its windows), open, or open with bunting on its opening day.
 */
export function gardenShopFrame(built: ReadonlySet<string>, openingToday = false): number {
  if (built.has("gardenShop")) return openingToday ? GARDEN_SHOP_FRAME.opening : GARDEN_SHOP_FRAME.open;
  if (built.has("gardenShop/shop")) return GARDEN_SHOP_FRAME.patched;
  return GARDEN_SHOP_FRAME.boarded;
}

/**
 * The village's new pieces on screen (Milestone 6): the Village Board (once Marlow is here, with a
 * note pinned on for each open project), the lighthouse on the point as it stands, the garden shop
 * (Milestone 8), Marlow where the clock says he is, and the map's layers that come and go as things
 * are built (the brambles, their walls, the board's, the boardwalk). Everything changes from what
 * the server says is built, which only changes overnight (or as the lamp is lit at dusk).
 */
export class VillageView {
  private readonly board: Phaser.GameObjects.Image;
  private readonly lighthouse: Phaser.GameObjects.Image | null;
  private readonly gardenShop: Phaser.GameObjects.Image | null;
  readonly keeper: Character;
  private keeperTile: TilePos | null = null;
  private gated: GatedOnScreen[] = [];
  private shownKey = "";

  constructor(
    private readonly scene: Phaser.Scene,
    lighthouse: Rect | null,
    zoom: number,
    gardenShop: Rect | null = null,
  ) {
    this.gardenShop = gardenShop
      ? scene.add
          .image(gardenShop.x, gardenShop.y + gardenShop.height, GARDEN_SHOP_KEY, GARDEN_SHOP_FRAME.boarded)
          .setOrigin(0, 1)
          .setDepth(gardenShop.y + gardenShop.height)
      : null;
    this.board = scene.add.image(0, 0, BOARD_KEY, 0).setOrigin(0, 0).setVisible(false);
    this.lighthouse = lighthouse
      ? scene.add
          .image(lighthouse.x, lighthouse.y + lighthouse.height, LIGHTHOUSE_KEY, LIGHTHOUSE_FRAME.dark)
          .setOrigin(0, 1)
          .setDepth(lighthouse.y + lighthouse.height)
      : null;
    const sprite = scene.add.sprite(0, 0, KEEPER_KEY, 0).setVisible(false);
    this.keeper = new Character(scene, sprite, { name: KEEPER_NAME, character: DEFAULT_CHARACTER }, zoom, KEEPER_KEY);
    this.keeper.setHidden(true);
  }

  /** The map's gated layers, once the map is drawn. */
  setGated(gated: GatedOnScreen[]) {
    this.gated = gated;
    this.shownKey = "";
  }

  /** Where Marlow stands right now, or null. */
  get keeperAt(): TilePos | null {
    return this.keeperTile;
  }

  /** Where the lamp is, in world pixels (for the glow), or null if there's no lighthouse. */
  get lamp(): { x: number; y: number } | null {
    if (!this.lighthouse) return null;
    return { x: this.lighthouse.x + LAMP_IN_SPRITE.x, y: this.lighthouse.y - this.lighthouse.height + LAMP_IN_SPRITE.y };
  }

  /** The board's rectangle on screen, while it stands. */
  get boardRect(): Phaser.Geom.Rectangle | null {
    return this.board.visible ? this.board.getBounds() : null;
  }

  /**
   * Shows the village as of today (and the time, for Marlow). `openProjects`: notes pinned on the
   * board. `openedToday`: a project that opened this morning (bunting, and Marlow beside it).
   */
  show(today: Today, minute: number, openProjects: number, openedToday: string | null = null) {
    const { map, built } = today;
    const key = `${[...built].sort().join("|")}#${openProjects}#${openedToday}`;
    if (key !== this.shownKey) {
      this.shownKey = key;
      if (map.board) {
        this.board.setPosition(map.board.x, map.board.y).setDepth(map.board.y + map.board.height).setFrame(Math.min(2, openProjects)).setVisible(true);
      } else this.board.setVisible(false);
      this.lighthouse?.setFrame(lighthouseFrame(built));
      this.gardenShop?.setFrame(gardenShopFrame(built, openedToday === "gardenShop"));
      for (const { gate, layer, collider } of this.gated) {
        const on = inEffect(gate, built);
        if (collider) collider.active = on;
        else layer.setVisible(on);
      }
    }
    const spot = keeperAt(map, minute, built, openedToday);
    this.keeperTile = spot;
    if (spot) {
      this.keeper.sprite.setPosition(spot.col * TILE_SIZE + TILE_SIZE / 2, spot.row * TILE_SIZE + TILE_SIZE / 2);
      this.keeper.sprite.setDepth(this.keeper.sprite.y);
      this.keeper.setMotion(spot.facing, false);
    }
    this.keeper.setHidden(!spot);
  }

  /** Every frame, after the sprites move: Marlow's name tag follows him. */
  follow() {
    this.keeper.followSprite();
  }

  setZoom(zoom: number) {
    this.keeper.setZoom(zoom);
  }

  /** A bouncing arrow over the board for a moment ("Let's have a look"). */
  pointAtBoard() {
    const rect = this.boardRect;
    if (!rect) return;
    const arrow = this.scene.add
      .text(rect.centerX, rect.top - 2, "▼", { fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffd36b", stroke: "#4a3b2a", strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(1_000_000);
    this.scene.tweens.add({ targets: arrow, y: rect.top - 8, duration: 420, yoyo: true, repeat: 6, ease: "Sine.easeInOut", onComplete: () => arrow.destroy() });
  }

  /** "+3" floating up from the board: a gift, seen by everyone near it. */
  floatFromBoard(text: string) {
    const rect = this.boardRect;
    if (!rect) return;
    const label = this.scene.add
      .text(rect.centerX, rect.top + 4, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#c2412d",
        strokeThickness: 3,
        resolution: window.devicePixelRatio,
      })
      .setOrigin(0.5, 1)
      .setDepth(1_000_000)
      .setScale(1 / this.scene.cameras.main.zoom);
    this.scene.tweens.add({ targets: label, y: rect.top - 14, alpha: { from: 1, to: 0 }, duration: 1300, ease: "Sine.easeOut", onComplete: () => label.destroy() });
  }
}
