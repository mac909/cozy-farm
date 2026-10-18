import { CROPS } from "../../../shared/content/crops";
import { GARDEN_SHOP_SEEDS, GARDEN_SHOP_WORDS, LATER_TOOL_UPGRADES } from "../../../shared/content/gardenShop";
import { ITEMS, pluralName, type ItemId, type SeedItemDef, type SeedItemId } from "../../../shared/content/items";
import { SEASON_IDS, SEASONS, type SeasonId } from "../../../shared/content/seasons";
import { TOOLS } from "../../../shared/content/tools";
import { seedsOut, upgradesFor } from "../../../shared/economy/gardenShop";
import type { Inventory } from "../../../shared/inventory/inventory";
import { allYear, seasonLabel, type SeasonDate } from "../../../shared/time/seasons";
import { seedLine, type ShopLine } from "./shopText";

/**
 * The words on the garden shop's card (Milestone 8): its seeds by season, and the tool upgrades
 * with what each costs and what you're still short of.
 */

/** A seed on the garden shop's card; `later` (faded, no Buy): the season it's out in. */
export interface GardenSeedLine extends ShopLine {
  later: string | null;
}

export interface GardenSeedShelf {
  title: string;
  lines: GardenSeedLine[];
  /** The other seasons' seeds, faded. */
  later: boolean;
}

const seasonName = (id: SeasonId) => SEASONS[id].name;

/** A seed's line: the seed stand's, with its season said. */
function gardenLine(itemId: SeedItemId, later: string | null): GardenSeedLine {
  const line = seedLine(itemId);
  const cropId = (ITEMS[itemId] as SeedItemDef).cropId;
  const seasons = CROPS[cropId].seasons ?? [];
  const when = allYear(cropId) ? "all year" : seasons.map((s) => SEASONS[s].name.toLowerCase()).join(" or ");
  return { ...line, detail: `${line.detail} · ${when}`, later };
}

/**
 * The seed shelves for a season: this season's seeds, the ones that grow all year, then the rest
 * of the year's, faded, starting with the next season. Before the seasons begin, every seed.
 */
export function gardenSeedShelves(date: SeasonDate | null): GardenSeedShelf[] {
  if (date === null) return [{ title: GARDEN_SHOP_WORDS.noSeason, lines: GARDEN_SHOP_SEEDS.map((id) => gardenLine(id, null)), later: false }];
  const out = seedsOut(date);
  const cropOf = (id: SeedItemId) => (ITEMS[id] as SeedItemDef).cropId;
  const now = out.filter((id) => !allYear(cropOf(id)));
  const always = out.filter((id) => allYear(cropOf(id)));
  const order = SEASON_IDS.map((_, i) => SEASON_IDS[(SEASON_IDS.indexOf(date.season) + i) % SEASON_IDS.length]).slice(1);
  const later = order.flatMap((season) =>
    GARDEN_SHOP_SEEDS.filter((id) => !out.includes(id) && CROPS[cropOf(id)].seasons?.[0] === season).map((id) => gardenLine(id, seasonName(season))),
  );
  return [
    { title: `${seasonName(date.season)} seeds`, lines: now.map((id) => gardenLine(id, null)), later: false },
    { title: "All year", lines: always.map((id) => gardenLine(id, null)), later: false },
    { title: "Later in the year", lines: later, later: true },
  ].filter((shelf) => shelf.lines.length > 0);
}

/** Under the shop's title: "Spring 7 · new seeds every season", and the honesty box. */
export function gardenShopNote(date: SeasonDate | null): string {
  return date ? `${seasonLabel(date)} · new seeds every season. ${GARDEN_SHOP_WORDS.honesty}` : GARDEN_SHOP_WORDS.honesty;
}

/** A tool upgrade on the card. */
export interface ToolRow {
  /** The tool it gives, or null for one still to come. */
  id: ItemId | null;
  /** Its picture. */
  icon: ItemId;
  name: string;
  /** What it does. */
  does: string;
  /** "1,500 coins · 8 driftwood", or when it comes. */
  cost: string;
  /** "have": yours already; "ready": tap to get it; "short": why not; "later": not yet. */
  state: "have" | "ready" | "short" | "later";
  /** The button's words: "Upgrade", "Buy", "Need 3 more driftwood", "Yours". */
  button: string;
}

const coins = (n: number) => `${n.toLocaleString("en-GB")} coins`;

/** Every upgrade for someone with `bag` and the shared `coins`, then the ones still to come. */
export function toolRows(bag: Inventory | null, wallet: number | null): ToolRow[] {
  const rows: ToolRow[] = upgradesFor(bag ?? [], wallet ?? 0).map((look): ToolRow => {
    const { upgrade } = look;
    const cost = upgrade.costs
      .map((need) => (need.kind === "coins" ? coins(need.count) : need.kind === "item" ? `${need.count} ${pluralName(need.itemId).toLowerCase()}` : ""))
      .join(" · ");
    const base = { id: upgrade.id as ItemId, icon: upgrade.id as ItemId, name: ITEMS[upgrade.id as ItemId].name, does: TOOLS[upgrade.id].does, cost };
    if (look.have) return { ...base, state: "have", button: "Yours" };
    if (look.ready) return { ...base, state: "ready", button: upgrade.from ? "Upgrade" : "Buy" };
    const short = look.short[0];
    const reason =
      short?.kind === "coins"
        ? `Need ${short.count.toLocaleString("en-GB")} more coins`
        : short?.kind === "item"
          ? `Need ${short.count} more ${pluralName(short.itemId).toLowerCase()}`
          : look.bagFull
            ? "Your bag is full"
            : "Not just now";
    return { ...base, state: "short", button: reason };
  });
  for (const later of LATER_TOOL_UPGRADES) {
    rows.push({ id: null, icon: later.icon, name: later.name, does: later.does, cost: later.afterHint, state: "later", button: "Later" });
  }
  return rows;
}
