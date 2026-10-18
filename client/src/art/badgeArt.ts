import type { BadgeIcon } from "../../../shared/content/badges";
import { BADGE_COTTAGE_KEY, BADGE_LIGHTHOUSE_KEY, BADGE_PORCH_KEY, BADGE_SHOP_KEY, EMOTES_KEY, emoteFrame, furnitureIconKey, MOON_KEY, UI_ICON, UI_ICONS_KEY } from "./assets";
import { itemIcon, type Icon } from "./itemIcons";

/**
 * A badge's picture inside its medal (Milestone 7): an item's icon, or one of the game's own
 * pictures (shared/content/badges.ts says which).
 */
export function badgeIcon(icon: BadgeIcon): Icon {
  if ("item" in icon) return itemIcon(icon.item);
  switch (icon.picture) {
    case "lighthouse":
      return { key: BADGE_LIGHTHOUSE_KEY, size: 32 };
    case "cottage":
      return { key: BADGE_COTTAGE_KEY, size: 32 };
    case "porch":
      return { key: BADGE_PORCH_KEY, size: 32 };
    case "heart":
      return { key: EMOTES_KEY, frame: emoteFrame("heart") };
    case "book":
      return { key: UI_ICONS_KEY, frame: UI_ICON.book };
    case "bed":
      return { key: furnitureIconKey("red_bed"), size: 32 };
    case "view":
      return { key: MOON_KEY };
    case "shop":
      return { key: BADGE_SHOP_KEY, size: 32 };
  }
}
