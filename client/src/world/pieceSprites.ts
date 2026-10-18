import Phaser from "phaser";
import { blocksWalking, FURNITURE } from "../../../shared/content/furniture";
import type { PlacedPiece } from "../../../shared/decor/pieces";
import type { Rect } from "../../../shared/world/map";
import { sheetKey } from "../art/assets";
import { pieceArt, pieceFrame } from "../art/furnitureArt";

/** Rugs and mats lie on the floor: over the ground and the soil, under everything standing. */
export const FLAT_DEPTH = -850;

/**
 * A piece's picture standing on its tiles (`area`, in world pixels): its bottom middle on the
 * bottom middle of its tiles, sorted with the characters by its bottom edge so someone in front is
 * drawn over it and someone behind is hidden by its top. Rugs lie under everything.
 */
export function drawPiece(scene: Phaser.Scene, piece: PlacedPiece, area: Rect): Phaser.GameObjects.Image {
  const art = pieceArt(piece.itemId, piece.turn);
  const bottom = area.y + area.height;
  return scene.add
    .image(Math.round(area.x + (area.width - art.w) / 2), bottom, sheetKey(art.sheet), pieceFrame(piece.itemId, piece.turn))
    .setOrigin(0, 1)
    .setFlipX(art.flipX === true)
    .setDepth(FURNITURE[piece.itemId].flat ? FLAT_DEPTH : bottom - 3);
}

/**
 * A group of pieces on screen (one house's furniture, or the farm's decorations), with an invisible
 * wall under each piece that blocks walking. Redrawn whenever the group changes.
 */
export class PieceGroup {
  private images: Phaser.GameObjects.Image[] = [];
  private walls: Phaser.GameObjects.Zone[] = [];
  private shown = "";
  /** The pieces as last shown, and where each stands. */
  private placed: { piece: PlacedPiece; area: Rect }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly colliders: Phaser.Physics.Arcade.StaticGroup,
  ) {}

  /** Shows these pieces, each at its area in world pixels. Cheap when nothing changed. */
  show(pieces: readonly PlacedPiece[], areaOf: (piece: PlacedPiece) => Rect) {
    const key = JSON.stringify(pieces);
    if (key === this.shown) return;
    this.shown = key;
    this.clear();
    this.placed = pieces.map((piece) => ({ piece, area: areaOf(piece) }));
    for (const { piece, area } of this.placed) {
      this.images.push(drawPiece(this.scene, piece, area));
      if (!blocksWalking(piece.itemId)) continue;
      const wall = this.scene.add.zone(area.x + area.width / 2, area.y + area.height / 2, area.width, area.height);
      this.scene.physics.add.existing(wall, true);
      this.colliders.add(wall);
      this.walls.push(wall);
    }
  }

  /** What's shown, with where each piece stands. */
  get pieces(): readonly { piece: PlacedPiece; area: Rect }[] {
    return this.placed;
  }

  /** Hides one piece for a moment (it's been lifted to move), or shows it again. */
  setLifted(index: number | null) {
    this.images.forEach((image, i) => image.setAlpha(i === index ? 0.25 : 1));
  }

  destroy() {
    this.clear();
  }

  private clear() {
    for (const image of this.images) image.destroy();
    for (const wall of this.walls) {
      this.colliders.remove(wall, true, true);
    }
    this.images = [];
    this.walls = [];
  }
}
