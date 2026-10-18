import type { ItemId } from "../../../shared/content/items";
import { roomFor, type Inventory } from "../../../shared/inventory/inventory";
import { button, el, openPanel, panelHead, picture, type Panel } from "./panel";
import "./shop.css";
import { buyLabel, clampCount, startingCount, type ShopCatalog, type ShopLine } from "./shopText";

export interface ShopPanelOptions {
  /** What's for sale: the seed stand's seeds, or the general store's shelves. */
  catalog: ShopCatalog;
  icon(itemId: ItemId): string;
  coinIcon: string;
  /** Asks the server to buy `count` of an item with the shared coins. */
  buy(itemId: ItemId, count: number): void;
  onClose(): void;
}

/**
 * A stand or shop's card: its lines, each with what it is and its price, under shelf headings if
 * it has them. Tap one to open it, choose how many with − and + (or the quick buttons), and buy.
 * The button says why when you can't: "Need 20 more coins" or "Your bag is full".
 */
export class ShopPanel {
  private readonly panel: Panel;
  private readonly coinsChip: HTMLSpanElement;
  private readonly rows = new Map<ItemId, { row: HTMLDivElement; line: ShopLine }>();
  private open: ItemId | null = null;
  private count = 5;
  private bag: Inventory | null = null;
  private coins = 0;
  /** "Bought 5!" shows on the button for a moment after buying. */
  private boughtUntil = 0;
  private boughtTimer: number | undefined;

  constructor(private readonly options: ShopPanelOptions) {
    const { catalog } = options;
    this.panel = openPanel({
      cardClass: "shop",
      closeOnBackdrop: true,
      onClose: () => {
        window.clearTimeout(this.boughtTimer);
        options.onClose();
      },
    });
    this.coinsChip = el("span", "panel-coins");
    const list = el("div", "shop-list");
    for (const shelf of catalog.shelves) {
      if (shelf.title) list.append(el("div", "panel-label shop-shelf", shelf.title));
      for (const line of shelf.lines) {
        const row = el("div", "shop-row");
        this.rows.set(line.itemId, { row, line });
        list.append(row);
      }
    }
    this.panel.card.append(panelHead(catalog.title, () => this.close(), this.coinsChip), list);
  }

  get isOpen(): boolean {
    return this.panel.isOpen;
  }

  close() {
    this.panel.close();
  }

  /** Shows the coins and what fits in your bag, as the server last said. */
  update(bag: Inventory | null, coins: number | null) {
    this.bag = bag;
    this.coins = coins ?? 0;
    this.coinsChip.replaceChildren(picture(this.options.coinIcon, "panel-coin"), document.createTextNode(String(coins ?? "…")));
    this.render();
  }

  private toggle(line: ShopLine) {
    if (this.open === line.itemId) {
      this.open = null;
    } else {
      this.open = line.itemId;
      this.count = startingCount(line.price, this.coins, this.options.catalog.quick[0]);
    }
    this.boughtUntil = 0;
    this.render();
  }

  private setCount(count: number) {
    this.count = clampCount(count);
    this.boughtUntil = 0;
    this.render();
  }

  private render() {
    for (const { row, line } of this.rows.values()) {
      const isOpen = this.open === line.itemId;
      row.classList.toggle("open", isOpen);
      const head = button("", "shop-line", () => this.toggle(line));
      head.setAttribute("aria-expanded", String(isOpen));
      const words = el("div", "grow");
      words.append(el("b", "", line.name), el("small", "", line.detail));
      const cost = el("span", "shop-price");
      cost.append(picture(this.options.coinIcon, "panel-coin"), document.createTextNode(` ${line.price}`));
      head.append(picture(this.options.icon(line.itemId)), words, cost);
      row.replaceChildren(head);
      if (isOpen) row.append(this.buyControls(line));
    }
  }

  private buyControls(line: ShopLine): HTMLDivElement {
    const box = el("div", "shop-buy");
    const stepper = el("div", "shop-stepper");
    const [first, second] = this.options.catalog.quick;
    stepper.append(
      button("−", "shop-step", () => this.setCount(this.count - 1)),
      el("span", "shop-count", String(this.count)),
      button("+", "shop-step", () => this.setCount(this.count + 1)),
      button(String(first), "shop-quick push", () => this.setCount(first)),
      button(String(second), "shop-quick", () => this.setCount(second)),
    );
    stepper.querySelector(".shop-step")!.setAttribute("aria-label", "One fewer");
    stepper.querySelectorAll(".shop-step")[1].setAttribute("aria-label", "One more");
    const room = this.bag ? roomFor(this.bag, line.itemId) : 0;
    const label = buyLabel(this.count, line.price, this.coins, room);
    const bought = performance.now() < this.boughtUntil;
    const go = button(bought ? `Bought ${this.count}!` : label.text, "panel-button", () => this.buy(line.itemId));
    go.disabled = !label.enabled && !bought;
    box.append(stepper, go);
    return box;
  }

  private buy(itemId: ItemId) {
    this.options.buy(itemId, this.count);
    // Says so straight away; the coins and bag change when the server's answer arrives.
    this.boughtUntil = performance.now() + 1200;
    window.clearTimeout(this.boughtTimer);
    this.boughtTimer = window.setTimeout(() => this.render(), 1250);
    this.render();
  }
}
