import Phaser from "phaser";
import { TILE_SIZE } from "../../../shared/constants";
import { houseLook } from "../../../shared/content/houses";
import { houseProjectId } from "../../../shared/content/projects";
import { VILLAGE_MAP } from "../../../shared/world/villageMap";
import { PORCH_FRAME, PORCH_KEY } from "../art/assets";

/** The decking lies on the ground: over the grass and its tufts, under finds, the bobber and everyone. */
const DECK_DEPTH = -600;

/** The middle of the lantern's glass, from the top-left of its 16 × 32 picture (tools/sprites/porch.ts). */
const LAMP_IN_SPRITE = { x: 8, y: 6 };

interface Porch {
  houseId: string;
  deck: Phaser.GameObjects.Image;
  bench: Phaser.GameObjects.Image;
  lantern: Phaser.GameObjects.Image;
}

/**
 * The cottages' porches on screen (Milestone 7): once a cottage's porch is built, wooden decking
 * along its front, a bench and a lantern on a post, which lights at dusk (its glow is drawn over the
 * evening tint, like the lighthouse's). Where the bench and the lantern stand is walled off by the
 * map's "Collision porch <house>" layer, which comes and goes with the rest (Village.ts).
 */
export class PorchesView {
  private readonly porches: Porch[];
  private shownKey = "";

  constructor(scene: Phaser.Scene) {
    this.porches = VILLAGE_MAP.houses.map((plan) => {
      const { x, y, width, height } = plan.building;
      const front = y + height;
      const { porch } = houseLook(plan.id);
      const bottom = front + TILE_SIZE;
      const deck = scene.add.image(x, front, PORCH_KEY, PORCH_FRAME.deck).setOrigin(0, 0).setDisplaySize(width, TILE_SIZE).setDepth(DECK_DEPTH);
      const bench = scene.add.image(x + porch.bench * TILE_SIZE, bottom, PORCH_KEY, PORCH_FRAME.bench).setOrigin(0, 1).setDepth(bottom);
      const lantern = scene.add.image(x + porch.lantern * TILE_SIZE, bottom, PORCH_KEY, PORCH_FRAME.lanternOff).setOrigin(0, 1).setDepth(bottom);
      for (const piece of [deck, bench, lantern]) piece.setVisible(false);
      return { houseId: plan.id, deck, bench, lantern };
    });
  }

  /** Shows the porches that are built; their lanterns lit from dusk (`lit`). */
  show(built: ReadonlySet<string>, lit: boolean) {
    const key = `${this.porches.map((p) => built.has(houseProjectId(p.houseId, "porch"))).join()}|${lit}`;
    if (key === this.shownKey) return;
    this.shownKey = key;
    for (const porch of this.porches) {
      const here = built.has(houseProjectId(porch.houseId, "porch"));
      for (const piece of [porch.deck, porch.bench, porch.lantern]) piece.setVisible(here);
      porch.lantern.setFrame(lit ? PORCH_FRAME.lanternOn : PORCH_FRAME.lanternOff);
    }
  }

  /** Where the lit lanterns' flames are, in world pixels, for their glow. */
  lights(): { x: number; y: number }[] {
    return this.porches
      .filter((porch) => porch.lantern.visible && porch.lantern.frame.name === PORCH_FRAME.lanternOn)
      .map(({ lantern }) => ({ x: lantern.x + LAMP_IN_SPRITE.x, y: lantern.y - lantern.height + LAMP_IN_SPRITE.y }));
  }
}
