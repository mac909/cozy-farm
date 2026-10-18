import type { MorningReport } from "../../../shared/world/world";
import "./morning.css";
import { morningWords } from "./morningText";
import { button, el, openPanel, picture } from "./panel";

/**
 * The card after the night: the day, what grew, what the crate sold and the coins it made.
 * Resolves when it's closed (Let's go, Escape, or tapping around it).
 */
export function showMorningCard(report: MorningReport, coinIcon: string): Promise<void> {
  return new Promise((resolve) => {
    const words = morningWords(report);
    const panel = openPanel({ cardClass: "morning", closeKeys: [" ", "Enter"], closeOnBackdrop: true, onClose: resolve });
    const { card } = panel;
    card.append(el("h2", "panel-title center", words.title));
    if (words.growth) card.append(el("p", "panel-text center", words.growth));
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
