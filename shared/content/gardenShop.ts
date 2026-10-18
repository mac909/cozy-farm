import { CROP_IDS, CROPS } from "./crops";
import { seedItemId, type ItemId, type SeedItemId } from "./items";
import type { Need } from "./projects";
import type { ToolId } from "./tools";

/**
 * The garden shop on the boardwalk (Milestone 8): Mrs Penhallow's old shop, reopened by the
 * village's second project. An honesty box, no shopkeeper. It sells the ten new seeds (each
 * season's, and the two that grow all year) and tool upgrades. Every number here is a first guess,
 * meant to be tuned by playing (docs/plans/progression.md, sections 2.3 and 2.5).
 */

/** The built name the shop opens with: the garden shop project, finished. */
export const GARDEN_SHOP_OPENS = "gardenShop";

/** Every seed the shop sells, in crops.ts order; which are out depends on the season (shared/economy/gardenShop.ts). */
export const GARDEN_SHOP_SEEDS: readonly SeedItemId[] = CROP_IDS.filter((id) => CROPS[id].sold === "gardenShop").map(seedItemId);

/** A tool upgrade: personal, so each of you buys your own. */
export interface ToolUpgradeDef {
  /** Its id in messages: the tool it gives. */
  readonly id: ToolId;
  /** The tool it replaces, in the same bag slot; null for a new one, which needs a free slot. */
  readonly from: ToolId | null;
  /** Coins from the shared wallet, and things from your own bag. */
  readonly costs: readonly Need[];
}

/** The upgrades, in the order the shop lists them. */
export const TOOL_UPGRADES: readonly ToolUpgradeDef[] = [
  {
    id: "big_watering_can",
    from: "watering_can",
    costs: [
      { kind: "coins", count: 1500 },
      { kind: "item", itemId: "driftwood", count: 8 },
    ],
  },
  {
    id: "wide_hoe",
    from: "hoe",
    costs: [
      { kind: "coins", count: 1200 },
      { kind: "item", itemId: "branch", count: 8 },
    ],
  },
  {
    id: "good_rod",
    from: "fishing_rod",
    costs: [
      { kind: "coins", count: 2000 },
      { kind: "item", itemId: "driftwood", count: 6 },
    ],
  },
  {
    id: "bug_net",
    from: null,
    costs: [
      { kind: "coins", count: 800 },
      { kind: "item", itemId: "branch", count: 6 },
    ],
  },
  {
    id: "shell_basket",
    from: null,
    costs: [
      { kind: "coins", count: 800 },
      { kind: "item", itemId: "driftwood", count: 6 },
    ],
  },
];

export function isToolUpgradeId(id: unknown): id is ToolId {
  return TOOL_UPGRADES.some((upgrade) => upgrade.id === id);
}

export function toolUpgrade(id: ToolId): ToolUpgradeDef | undefined {
  return TOOL_UPGRADES.find((upgrade) => upgrade.id === id);
}

/** Upgrades still to come, shown faded with when (the sprinkling can needs stone from the cove). */
export const LATER_TOOL_UPGRADES: readonly { readonly name: string; readonly does: string; readonly afterHint: string; readonly icon: ItemId }[] = [
  { name: "Sprinkling Can", does: "Waters a 3 × 3 patch in front.", afterHint: "Once the bridge to the cove is mended", icon: "big_watering_can" },
];

/** The words on the shop's card. */
export const GARDEN_SHOP_WORDS = {
  title: "Garden shop",
  /** Under the title. */
  honesty: "An honesty box on the counter: leave the coins in the tin.",
  /** Before the seasons have begun (only the dev world sees this). */
  noSeason: "All of Mrs Penhallow's seeds",
} as const;
