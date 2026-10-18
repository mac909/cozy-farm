import type { ItemId, SeedItemId } from "../../../shared/content/items";
import { SEED_STAND_STOCK } from "../../../shared/content/seedStand";
import { roomFor, type Inventory } from "../../../shared/inventory/inventory";
import { button, el, openPanel, panelHead, picture, type Panel } from "./panel";
import "./shop.css";
import { buyLabel, clampCount, seedLine, startingCount } from "./shopText";

export interface ShopPanelOptions {
  icon(itemId: ItemId): string;
  coinIcon: string;
  /** Asks the server to buy `count` of a seed with the shared coins. */
  buy(itemId: SeedItemId, count: number): void;
  onClose(): void;
}

/**
 * The seed stand at the top of the beach path: the six seeds, each with how long it takes and
 * what it sells for. Tap one to open it, choose how many with − and + (or 5 and 10), and buy.
 * The button says why when you can't: "Need 20 more coins" or "Your bag is full".
 */
export class ShopPanel {
  private readonly panel: Panel;
  private readonly coinsChip: HTMLSpanElement;
  private readonly rows = new Map<SeedItemId, HTMLDivElement>();
  private open: SeedItemId | null = null;
  private count = 5;
  private bag: Inventory | null = null;
  private coins = 0;
  /** "Bought 5!" shows on the button for a moment after buying. */
  private boughtUntil = 0;
  private boughtTimer: number | undefined;

  constructor(private readonly options: ShopPanelOptions) {
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
    for (const itemId of SEED_STAND_STOCK) {
      const row = el("div", "shop-row");
      this.rows.set(itemId, row);
      list.append(row);
    }
    this.panel.card.append(panelHead("Seed stand", () => this.close(), this.coinsChip), list);
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

  private toggle(itemId: SeedItemId) {
    if (this.open === itemId) {
      this.open = null;
    } else {
      this.open = itemId;
      this.count = startingCount(seedLine(itemId).price, this.coins);
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
    for (const [itemId, row] of this.rows) {
      const { name, detail, price } = seedLine(itemId);
      const isOpen = this.open === itemId;
      row.classList.toggle("open", isOpen);
      const head = button("", "shop-line", () => this.toggle(itemId));
      head.setAttribute("aria-expanded", String(isOpen));
      const words = el("div", "grow");
      words.append(el("b", "", name), el("small", "", detail));
      const cost = el("span", "shop-price");
      cost.append(picture(this.options.coinIcon, "panel-coin"), document.createTextNode(` ${price}`));
      head.append(picture(this.options.icon(itemId)), words, cost);
      row.replaceChildren(head);
      if (isOpen) row.append(this.buyControls(itemId, price));
    }
  }

  private buyControls(itemId: SeedItemId, price: number): HTMLDivElement {
    const box = el("div", "shop-buy");
    const stepper = el("div", "shop-stepper");
    stepper.append(
      button("−", "shop-step", () => this.setCount(this.count - 1)),
      el("span", "shop-count", String(this.count)),
      button("+", "shop-step", () => this.setCount(this.count + 1)),
      button("5", "shop-quick push", () => this.setCount(5)),
      button("10", "shop-quick", () => this.setCount(10)),
    );
    stepper.querySelector(".shop-step")!.setAttribute("aria-label", "One fewer");
    stepper.querySelectorAll(".shop-step")[1].setAttribute("aria-label", "One more");
    const room = this.bag ? roomFor(this.bag, itemId) : 0;
    const label = buyLabel(this.count, price, this.coins, room);
    const bought = performance.now() < this.boughtUntil;
    const go = button(bought ? `Bought ${this.count}!` : label.text, "panel-button", () => this.buy(itemId));
    go.disabled = !label.enabled && !bought;
    box.append(stepper, go);
    return box;
  }

  private buy(itemId: SeedItemId) {
    this.options.buy(itemId, this.count);
    // Says so straight away; the coins and bag change when the server's answer arrives.
    this.boughtUntil = performance.now() + 1200;
    window.clearTimeout(this.boughtTimer);
    this.boughtTimer = window.setTimeout(() => this.render(), 1250);
    this.render();
  }
}
