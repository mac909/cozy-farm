import { ITEMS, type ItemId } from "../../../shared/content/items";
import type { Crate } from "../../../shared/economy/shop";
import { isSellable } from "../../../shared/economy/shop";
import { crateValue } from "../../../shared/economy/trade";
import { INVENTORY_SLOTS, type Inventory } from "../../../shared/inventory/inventory";
import "./crate.css";
import { button, el, openPanel, panelHead, picture, type Panel } from "./panel";
import { SlotGrid } from "./SlotGrid";

export interface CratePanelOptions {
  icon(itemId: ItemId): string;
  coinIcon: string;
  /** Puts a whole stack from a bag slot in the crate. */
  ship(slot: number, count: number): void;
  /** Takes a whole line back out of the crate. */
  unship(itemId: ItemId, count: number): void;
  onClose(): void;
}

/**
 * The shipping crate on the dock. The top half is what's in it, from both of you, and what it
 * sells for tonight; tap a line to take it back. The bottom half is your bag; tap a stack to put
 * it all in (split it in the bag first to keep some). Tools can't be sold, so they're faded.
 */
export class CratePanel {
  private readonly panel: Panel;
  private readonly lines: HTMLDivElement;
  private readonly total: HTMLDivElement;
  private readonly grid: SlotGrid;
  private bag: Inventory | null = null;
  private crate: Crate = [];
  private shown = "";

  constructor(private readonly options: CratePanelOptions) {
    this.panel = openPanel({ cardClass: "crate", closeOnBackdrop: true, onClose: options.onClose });
    this.lines = el("div", "crate-lines");
    this.total = el("div", "crate-total");
    this.grid = new SlotGrid(INVENTORY_SLOTS, {
      icon: options.icon,
      faded: (slot) => slot !== null && !isSellable(slot.itemId),
      onTap: (slot) => {
        const stack = this.bag?.[slot];
        if (stack) options.ship(slot, stack.count);
      },
    });
    this.panel.card.append(
      panelHead("Shipping crate", () => this.close()),
      el("div", "panel-label", "In the crate · sells tonight"),
      this.lines,
      this.total,
      el("div", "panel-label", "Your bag · tap a stack to put it in"),
      this.grid.top,
      el("div", "crate-gap"),
      this.grid.rest,
      el("p", "panel-tip", "It all sells overnight, and the morning card says what sold. Tools (the hoe, the can and the rod) can't be sold."),
    );
  }

  get isOpen(): boolean {
    return this.panel.isOpen;
  }

  close() {
    this.panel.close();
  }

  /** Shows the crate and your bag as the server last said. */
  update(bag: Inventory | null, crate: Crate) {
    this.bag = bag;
    this.crate = crate;
    this.grid.show(bag, null);
    const key = JSON.stringify(crate);
    if (key === this.shown) return;
    this.shown = key;
    this.lines.replaceChildren();
    if (crate.length === 0) {
      this.lines.append(el("p", "crate-empty", "Nothing yet. Tap a stack in your bag to put it in."));
    }
    for (const { itemId, count } of crate) {
      const price = (ITEMS[itemId].sellPrice ?? 0) * count;
      const line = button("", "crate-line", () => this.options.unship(itemId, count));
      const words = el("div", "grow");
      words.append(el("b", "", `${ITEMS[itemId].name} ×${count}`), el("small", "", "Tap to take back"));
      const value = el("span", "crate-price");
      value.append(picture(this.options.coinIcon, "panel-coin"), document.createTextNode(` ${price}`));
      line.append(picture(this.options.icon(itemId)), words, value);
      this.lines.append(line);
    }
    this.total.replaceChildren();
    const value = el("span", "crate-price");
    value.append(picture(this.options.coinIcon, "panel-coin"), document.createTextNode(` ${crateValue(crate)}`));
    this.total.append(el("span", "", "Tonight"), value);
    this.total.hidden = crate.length === 0;
  }
}
