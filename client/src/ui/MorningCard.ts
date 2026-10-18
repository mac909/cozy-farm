import type { ItemId } from "../../../shared/content/items";
import type { BuiltStep } from "../../../shared/village/village";
import type { MorningReport } from "../../../shared/world/world";
import "./board.css";
import "./morning.css";
import { morningWords } from "./morningText";
import { button, el, openPanel, picture } from "./panel";

/** The village's part of the morning card (Milestone 6). */
export interface MorningVillage {
  /** Marlow arrived this morning: the storm's line. */
  keeperArrived: boolean;
  /** A picture of something built (the lighthouse as it is now, a porch). */
  picture(built: BuiltStep): string;
  /** That picture's shape: tall (the lighthouse), wide (the garden shop, Milestone 8) or square (a porch). */
  shape?(built: BuiltStep): "tall" | "wide" | "square";
  /** Whose a cottage is, by name, for a house upgrade's line ("Pip's cottage has a porch now"). */
  owner?(houseId: string): string;
  /** Look: the card closes and the camera glides there and back. */
  look(built: BuiltStep): void;
  /** The day spring first came (Milestone 8): the season's day in the title, and its first morning. */
  yearStart?: number;
}

/**
 * The card after the night: the day, what grew, what was built in the village (with Look), what
 * washed up on the beach, what the crate sold and the coins it made. Resolves when it's closed
 * (Let's go, Escape, or tapping around it).
 */
export function showMorningCard(
  report: MorningReport,
  coinIcon: string,
  itemIcon: (itemId: ItemId) => string,
  village?: MorningVillage,
): Promise<void> {
  return new Promise((resolve) => {
    const words = morningWords(report, village?.keeperArrived ?? false, village?.owner, village?.yearStart ?? 0);
    const panel = openPanel({ cardClass: "morning", closeKeys: [" ", "Enter"], closeOnBackdrop: true, onClose: resolve });
    const { card } = panel;
    card.append(el("h2", "panel-title center", words.title));
    if (words.growth) card.append(el("p", "panel-text center", words.growth));
    if (words.storm) card.append(el("p", "panel-text center", words.storm));
    if (words.season) {
      const season = el("div", "morning-season");
      season.append(el("b", "", words.season.title), el("small", "", words.season.news));
      card.append(season);
    }
    if (words.village.length > 0 && village) {
      card.append(el("div", "panel-label", "In the village"));
      for (const { built, line, note } of words.village) {
        const row = el("div", "morning-village");
        const pic = picture(village.picture(built));
        const [width, height] = { tall: [24, 48], wide: [48, 36], square: [32, 32] }[village.shape?.(built) ?? "tall"];
        pic.style.width = `${width}px`;
        pic.style.height = `${height}px`;
        const text = el("div", "grow");
        text.append(el("b", "", line), el("small", "", `“${note}”`));
        const look = button("Look", "board-give", () => {
          panel.close();
          village.look(built);
        });
        look.style.background = "#e4d3ad";
        look.style.color = "#4a3b2a";
        row.append(pic, text, look);
        card.append(row);
      }
    }
    if (words.beach) {
      const beach = el("div", "morning-beach");
      const finds = el("div", "morning-finds");
      for (const itemId of [...(report.washedUp ?? []), ...(report.foraged ?? [])]) finds.append(picture(itemIcon(itemId), "morning-find"));
      beach.append(el("p", "panel-text center", words.beach), finds);
      card.append(beach);
    }
    if (words.earned) {
      card.append(el("div", "panel-label", "The crate sold"));
      const table = el("table", "morning-sale");
      for (const line of words.sales) {
        const row = el("tr");
        row.append(el("td", "", line.text), el("td", "", line.total));
        table.append(row);
      }
      const total = el("div", "morning-total");
      const coins = el("span", "morning-coins");
      coins.append(picture(coinIcon, "panel-coin"), document.createTextNode(` ${words.earned.coins}`));
      total.append(el("span", "", words.earned.text), coins);
      card.append(table, total);
    }
    const go = button("Let's go", "panel-button", () => panel.close());
    card.append(go);
    go.focus({ preventScroll: true });
  });
}
