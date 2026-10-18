import { FURNITURE } from "../../../shared/content/furniture";
import { ITEMS } from "../../../shared/content/items";
import { CROPS } from "../../../shared/content/crops";
import { SEASONS } from "../../../shared/content/seasons";
import { toolDef } from "../../../shared/content/tools";
import { allYear } from "../../../shared/time/seasons";
import { furnitureDetail } from "./shopText";
import type { ItemStack } from "../../../shared/inventory/inventory";

/** The tools everyone starts with: the strip just says what a tool is. */
const STARTER_TOOLS: ReadonlySet<string> = new Set(["hoe", "watering_can", "fishing_rod"]);

/** What the bag's info strip says about a stack: its name and count, and what it's for or worth. */
export function itemInfo(stack: ItemStack): { title: string; detail: string } {
  const item = ITEMS[stack.itemId];
  const title = stack.count > 1 ? `${item.name} ×${stack.count}` : item.name;
  if (item.category === "tool") {
    // The garden shop's upgrades (Milestone 8) say what they do.
    const tool = toolDef(stack.itemId);
    return { title, detail: tool && !STARTER_TOOLS.has(stack.itemId) ? tool.does : "A tool: it never wears out, and can't be sold" };
  }
  if (item.sellPrice === undefined) return { title, detail: "Can't be sold" };
  if (item.category === "seed") {
    // A seasonal seed (Milestone 8) says when it goes in.
    const when = allYear(item.cropId) ? "" : ` in ${(CROPS[item.cropId].seasons ?? []).map((s) => SEASONS[s].name.toLowerCase()).join(" or ")}`;
    return { title, detail: `Plant in dug soil${when} · sells back for ${item.sellPrice} each` };
  }
  if (item.category === "furniture") return { title, detail: `${furnitureDetail(FURNITURE[item.furnitureId])} · sells back for ${item.sellPrice}` };
  return { title, detail: `Sells for ${item.sellPrice} each in the crate` };
}
