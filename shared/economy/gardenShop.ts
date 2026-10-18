import { GARDEN_SHOP_OPENS, GARDEN_SHOP_SEEDS, TOOL_UPGRADES, toolUpgrade, type ToolUpgradeDef } from "../content/gardenShop";
import { ITEMS, type ItemId, type SeedItemDef, type SeedItemId } from "../content/items";
import type { Need } from "../content/projects";
import { toolDef, type ToolId } from "../content/tools";
import type { HintReason } from "../farming/actions";
import { addItems, countOf, removeItems, roomFor, type Inventory } from "../inventory/inventory";
import { inSeason, seasonOn, type SeasonDate } from "../time/seasons";
import { builtThings } from "../village/built";
import { farmerOf, setFarmerBag, type FarmerId, type World } from "../world/world";
import { buyFrom, type TradeResult } from "./trade";

/**
 * The garden shop (Milestone 8): buying this season's seeds, and tool upgrades. Like the seed stand
 * and the store, everything is paid from the shared wallet into the buyer's own bag; an upgrade
 * also takes its materials from the buyer's bag, and is the buyer's own (tools are personal).
 */

const refuse = (reason: HintReason): TradeResult => ({ ok: false, hint: { reason } });

/** Whether the garden shop is open: its project is finished. */
export function gardenShopOpen(world: Pick<World, "village" | "clock">): boolean {
  return builtThings(world).has(GARDEN_SHOP_OPENS);
}

/** The season outdoors in a world (null before the seasons begin). */
export function seasonNow(world: Pick<World, "clock" | "yearStart">): SeasonDate | null {
  return seasonOn(world.clock.day, world.yearStart);
}

/** The seeds the shop has out in `date`'s season: that season's and the ones that grow all year (every seed, before the seasons begin). */
export function seedsOut(date: SeasonDate | null): SeedItemId[] {
  return GARDEN_SHOP_SEEDS.filter((id) => inSeason((ITEMS[id] as SeedItemDef).cropId, date));
}

/** The garden shop's seeds that aren't out now (shown faded on its card, with their seasons). */
export function seedsLater(date: SeasonDate | null): SeedItemId[] {
  const out = new Set(seedsOut(date));
  return GARDEN_SHOP_SEEDS.filter((id) => !out.has(id));
}

/** Buys `count` of this season's seeds at the garden shop, from the shared wallet into a farmer's bag. */
export function buyAtGardenShop(world: World, farmerId: FarmerId, itemId: string, count: number): TradeResult {
  if (!gardenShopOpen(world)) return refuse("shop-boarded");
  if (GARDEN_SHOP_SEEDS.includes(itemId as SeedItemId) && !seedsOut(seasonNow(world)).includes(itemId as SeedItemId)) {
    const cropId = (ITEMS[itemId as SeedItemId] as SeedItemDef).cropId;
    return { ok: false, hint: { reason: "out-of-season", cropId } };
  }
  return buyFrom(seedsOut(seasonNow(world)), world, farmerId, itemId, count);
}

/** Where a farmer stands with one upgrade, for the shop's card and the rule below. */
export interface UpgradeLook {
  readonly upgrade: ToolUpgradeDef;
  /** They have it already. */
  readonly have: boolean;
  /** What they're still short of, each "need" with how many more: coins (from the wallet) or things (from their bag). */
  readonly short: readonly Need[];
  /** A new tool (not an upgrade of one) with no room in the bag. */
  readonly bagFull: boolean;
  /** The bag slot of the tool it replaces, or null (a new tool, or they somehow haven't the old one). */
  readonly fromSlot: number | null;
  /** Everything's there: tap and it's theirs. */
  readonly ready: boolean;
}

/** Where someone with `bag` (and the shared `coins`) stands with an upgrade. */
export function lookAtUpgrade(upgrade: ToolUpgradeDef, bag: Inventory, coins: number): UpgradeLook {
  const have = countOf(bag, upgrade.id) > 0;
  const short: Need[] = [];
  for (const cost of upgrade.costs) {
    if (cost.kind === "coins" && coins < cost.count) short.push({ kind: "coins", count: cost.count - coins });
    if (cost.kind === "item") {
      const has = countOf(bag, cost.itemId);
      if (has < cost.count) short.push({ kind: "item", itemId: cost.itemId, count: cost.count - has });
    }
  }
  const fromSlot = upgrade.from ? bag.findIndex((slot) => slot?.itemId === upgrade.from) : -1;
  const bagFull = upgrade.from === null && roomFor(bag, upgrade.id) < 1 && !freesASlot(upgrade, bag);
  const ready = !have && short.length === 0 && !bagFull && (upgrade.from === null || fromSlot >= 0);
  return { upgrade, have, short, bagFull, fromSlot: fromSlot >= 0 ? fromSlot : null, ready };
}

/** Whether paying for an upgrade empties a slot (its materials were a whole stack), so a new tool fits. */
function freesASlot(upgrade: ToolUpgradeDef, bag: Inventory): boolean {
  let after: Inventory = bag;
  for (const cost of upgrade.costs) {
    if (cost.kind !== "item") continue;
    const taken = removeItems(after, cost.itemId, cost.count);
    if (!taken.ok) return false;
    after = taken.inventory;
  }
  return roomFor(after, upgrade.id) >= 1;
}

/** Every upgrade, for someone with `bag` and the shared `coins`. */
export function upgradesFor(bag: Inventory, coins: number): UpgradeLook[] {
  return TOOL_UPGRADES.map((upgrade) => lookAtUpgrade(upgrade, bag, coins));
}

/**
 * A farmer buys a tool upgrade at the garden shop: the coins from the shared wallet and the
 * materials from their own bag; the new tool takes the old one's slot (or a free one, for the net
 * and the basket). All or nothing.
 */
export function upgradeTool(world: World, farmerId: FarmerId, toolId: unknown): TradeResult {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return refuse("gone");
  if (!gardenShopOpen(world)) return refuse("shop-boarded");
  const upgrade = typeof toolId === "string" ? toolUpgrade(toolId as ToolId) : undefined;
  if (!upgrade || !toolDef(upgrade.id)) return refuse("not-for-sale");
  const look = lookAtUpgrade(upgrade, farmer.bag, world.coins);
  if (look.have) return refuse("has-tool");
  if (look.short.some((need) => need.kind === "coins")) return refuse("not-enough-coins");
  if (look.short.length > 0) return refuse("not-enough-things");
  if (look.bagFull) return refuse("bag-full");
  if (upgrade.from !== null && look.fromSlot === null) return refuse("gone");

  let bag: Inventory = farmer.bag;
  let coins = world.coins;
  for (const cost of upgrade.costs) {
    if (cost.kind === "coins") coins -= cost.count;
    else if (cost.kind === "item") {
      const taken = removeItems(bag, cost.itemId, cost.count);
      if (!taken.ok) return refuse("not-enough-things");
      bag = taken.inventory;
    }
  }
  if (look.fromSlot !== null) {
    bag = bag.map((slot, i) => (i === look.fromSlot ? { itemId: upgrade.id as ItemId, count: 1 } : slot));
  } else {
    const added = addItems(bag, upgrade.id, 1);
    if (!added.ok || added.leftover > 0) return refuse("bag-full");
    bag = added.inventory;
  }
  return { ok: true, world: { ...setFarmerBag(world, farmerId, bag), coins } };
}
