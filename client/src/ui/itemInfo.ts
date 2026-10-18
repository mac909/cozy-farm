import { FURNITURE } from "../../../shared/content/furniture";
import { ITEMS } from "../../../shared/content/items";
import { furnitureDetail } from "./shopText";
import type { ItemStack } from "../../../shared/inventory/inventory";

/** What the bag's info strip says about a stack: its name and count, and what it's for or worth. */
export function itemInfo(stack: ItemStack): { title: string; detail: string } {
  const item = ITEMS[stack.itemId];
  const title = stack.count > 1 ? `${item.name} ×${stack.count}` : item.name;
  if (item.category === "tool") return { title, detail: "A tool: it never wears out, and can't be sold" };
  if (item.sellPrice === undefined) return { title, detail: "Can't be sold" };
  if (item.category === "seed") return { title, detail: `Plant in dug soil · sells back for ${item.sellPrice} each` };
  if (item.category === "furniture") return { title, detail: `${furnitureDetail(FURNITURE[item.furnitureId])} · sells back for ${item.sellPrice}` };
  return { title, detail: `Sells for ${item.sellPrice} each in the crate` };
}
