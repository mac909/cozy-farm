import { furnitureOf, type ItemId } from "../../../shared/content/items";
import { INVENTORY_SLOTS, type Inventory } from "../../../shared/inventory/inventory";
import "./bag.css";
import { itemInfo } from "./itemInfo";
import { button, el, openPanel, panelHead, picture, type Panel } from "./panel";
import { SlotGrid } from "./SlotGrid";

export interface BagPanelOptions {
  icon(itemId: ItemId): string;
  coinIcon: string;
  /** Asks the server to move the stack in `from` onto `to` (swapping, or joining the same item). */
  move(from: number, to: number): void;
  /** Asks the server to split `count` off the stack in `from` into the first empty slot. */
  split(from: number, count: number): void;
  /** Closes the bag and starts putting down the furniture in `slot`. */
  place(slot: number): void;
  /** Opens the collection book instead. */
  openBook(): void;
  onClose(): void;
}

/**
 * The bag screen: all 24 slots, the hotbar row on top. Tap a stack to pick it up (the strip
 * underneath says what it is and what it's worth), then tap another slot to move it there:
 * onto an empty slot it moves, onto the same thing it joins the stack, onto something else
 * they swap. Split halves a stack. With a mouse, drag and drop works too. Close with ×, Esc, B
 * or Tab. Time keeps going while it's open: it's shared time.
 */
export class BagPanel {
  private readonly panel: Panel;
  private readonly grid: SlotGrid;
  private readonly coins: HTMLSpanElement;
  private readonly info: HTMLDivElement;
  private readonly tip: HTMLParagraphElement;
  private bag: Inventory | null = null;
  private selected: number | null = null;

  constructor(private readonly options: BagPanelOptions) {
    this.panel = openPanel({ cardClass: "bag", closeKeys: ["b", "Tab"], closeOnBackdrop: true, onClose: options.onClose });
    this.coins = el("span", "panel-coins");
    this.grid = new SlotGrid(INVENTORY_SLOTS, {
      icon: options.icon,
      onTap: (slot) => this.tap(slot),
      onDrag: (from, to) => {
        this.selected = null;
        options.move(from, to);
        this.render();
      },
    });
    this.info = el("div", "bag-info");
    this.tip = el("p", "panel-tip");
    this.panel.card.append(
      panelHead("Bag", () => this.close(), button("Book", "panel-pill", () => options.openBook()), this.coins),
      el("div", "panel-label", "Hotbar"),
      this.grid.top,
      el("div", "panel-label", "Bag"),
      this.grid.rest,
      this.info,
      this.tip,
    );
  }

  get isOpen(): boolean {
    return this.panel.isOpen;
  }

  close() {
    this.panel.close();
  }

  /** Shows the bag and coins as the server last said. */
  update(bag: Inventory | null, coins: number | null) {
    this.bag = bag;
    this.coins.replaceChildren(picture(this.options.coinIcon, "panel-coin"), document.createTextNode(String(coins ?? "…")));
    // A picked-up stack that's gone (planted, shipped, moved by a late update) is let go.
    if (this.selected !== null && !bag?.[this.selected]) this.selected = null;
    this.render();
  }

  private tap(slot: number) {
    const stack = this.bag?.[slot] ?? null;
    if (this.selected === null) {
      if (stack) this.selected = slot;
    } else if (this.selected === slot) {
      this.selected = null;
    } else {
      this.options.move(this.selected, slot);
      this.selected = null;
    }
    this.render();
  }

  private render() {
    this.grid.show(this.bag, this.selected);
    const stack = this.selected !== null ? (this.bag?.[this.selected] ?? null) : null;
    this.info.replaceChildren();
    this.info.classList.toggle("empty", !stack);
    if (!stack || this.selected === null) {
      this.info.append(el("div", "bag-hint", "Tap something to pick it up."));
      this.tip.textContent = "The top row is your hotbar.";
      return;
    }
    const from = this.selected;
    const { title, detail } = itemInfo(stack);
    const words = el("div", "grow");
    words.append(el("b", "", title), el("small", "", detail));
    this.info.append(picture(this.options.icon(stack.itemId)), words);
    if (furnitureOf(stack.itemId)) {
      this.info.append(button("Place", "panel-button bag-split", () => this.options.place(from)));
    }
    const hasRoom = this.bag?.includes(null) ?? false;
    if (stack.count > 1 && hasRoom) {
      this.info.append(
        button("Split", "panel-button soft bag-split", () => {
          // The new half lands in the first empty slot; nothing stays picked up.
          this.options.split(from, Math.floor(stack.count / 2));
          this.selected = null;
          this.render();
        }),
      );
    }
    this.tip.textContent = furnitureOf(stack.itemId) ? "Place puts it down, or tap another slot to move it." : "Tap another slot to move it there.";
  }
}
