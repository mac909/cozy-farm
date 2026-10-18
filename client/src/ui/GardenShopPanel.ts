import { GARDEN_SHOP_WORDS } from "../../../shared/content/gardenShop";
import type { ItemId } from "../../../shared/content/items";
import { roomFor, type Inventory } from "../../../shared/inventory/inventory";
import type { SeasonDate } from "../../../shared/time/seasons";
import "./book.css";
import "./garden.css";
import { gardenSeedShelves, gardenShopNote, toolRows, type GardenSeedLine } from "./gardenShopText";
import { button, el, openPanel, panelHead, picture, type Panel } from "./panel";
import "./shop.css";
import { buyLabel, clampCount, startingCount } from "./shopText";

export interface GardenShopPanelOptions {
  icon(itemId: ItemId): string;
  coinIcon: string;
  /** Asks the server to buy `count` seeds with the shared coins. */
  buy(itemId: ItemId, count: number): void;
  /** Asks the server for a tool upgrade (the tool it gives). */
  upgrade(tool: ItemId): void;
  onClose(): void;
}

type Tab = "seeds" | "tools";

/**
 * The garden shop's card (Milestone 8): two tabs. **Seeds**: this season's seeds and the two that
 * grow all year, to buy like at the seed stand (tap one, choose how many, Buy), and the rest of the
 * year's faded, with their seasons. **Tools**: the upgrades, each with what it does, what it costs
 * and its button ("Upgrade", or what you're still short of). Your own tools; the shared coins.
 */
export class GardenShopPanel {
  private readonly panel: Panel;
  private readonly coinsChip: HTMLSpanElement;
  private readonly note: HTMLParagraphElement;
  private readonly tabs: Record<Tab, HTMLButtonElement>;
  private readonly body: HTMLDivElement;
  private tab: Tab = "seeds";
  private open: ItemId | null = null;
  private count = 5;
  private bag: Inventory | null = null;
  private coins = 0;
  private season: SeasonDate | null = null;
  /** "Bought 5!" or "Yours!" shows on a button for a moment. */
  private doneUntil = 0;
  private doneTimer: number | undefined;

  constructor(private readonly options: GardenShopPanelOptions) {
    this.panel = openPanel({
      cardClass: "shop garden",
      closeOnBackdrop: true,
      onClose: () => {
        window.clearTimeout(this.doneTimer);
        options.onClose();
      },
    });
    this.coinsChip = el("span", "panel-coins");
    this.note = el("p", "garden-note");
    const tabs = el("div", "book-tabs garden-tabs");
    this.tabs = {
      seeds: button("Seeds", "book-tab", () => this.show("seeds")),
      tools: button("Tools", "book-tab", () => this.show("tools")),
    };
    tabs.append(this.tabs.seeds, this.tabs.tools);
    this.body = el("div", "shop-list");
    this.panel.card.append(panelHead(GARDEN_SHOP_WORDS.title, () => this.close(), this.coinsChip), this.note, tabs, this.body);
  }

  get isOpen(): boolean {
    return this.panel.isOpen;
  }

  close() {
    this.panel.close();
  }

  /** Shows the coins, your bag and the season, as the server last said. */
  update(bag: Inventory | null, coins: number | null, season: SeasonDate | null) {
    this.bag = bag;
    this.coins = coins ?? 0;
    this.season = season;
    this.coinsChip.replaceChildren(picture(this.options.coinIcon, "panel-coin"), document.createTextNode(String(coins ?? "…")));
    this.note.textContent = gardenShopNote(season);
    this.render();
  }

  private show(tab: Tab) {
    this.tab = tab;
    this.open = null;
    this.doneUntil = 0;
    this.render();
  }

  private render() {
    for (const tab of Object.keys(this.tabs) as Tab[]) {
      this.tabs[tab].classList.toggle("on", tab === this.tab);
      this.tabs[tab].setAttribute("aria-pressed", String(tab === this.tab));
    }
    this.body.replaceChildren();
    if (this.tab === "seeds") this.renderSeeds();
    else this.renderTools();
  }

  private renderSeeds() {
    for (const shelf of gardenSeedShelves(this.season)) {
      this.body.append(el("div", "panel-label shop-shelf", shelf.title));
      for (const line of shelf.lines) this.body.append(this.seedRow(line));
    }
  }

  private seedRow(line: GardenSeedLine): HTMLDivElement {
    const row = el("div", `shop-row${line.later ? " garden-later" : ""}`);
    const isOpen = this.open === line.itemId && !line.later;
    row.classList.toggle("open", isOpen);
    const head = button("", "shop-line", () => {
      if (line.later) return;
      if (this.open === line.itemId) this.open = null;
      else {
        this.open = line.itemId;
        this.count = startingCount(line.price, this.coins, 5);
      }
      this.doneUntil = 0;
      this.render();
    });
    head.setAttribute("aria-expanded", String(isOpen));
    if (line.later) head.setAttribute("aria-disabled", "true");
    const words = el("div", "grow");
    words.append(el("b", "", line.name), el("small", "", line.detail));
    const price = el("span", "shop-price");
    if (line.later) price.append(el("span", "garden-tag", line.later));
    else price.append(picture(this.options.coinIcon, "panel-coin"), document.createTextNode(` ${line.price}`));
    head.append(picture(this.options.icon(line.itemId)), words, price);
    row.append(head);
    if (isOpen) row.append(this.buyControls(line));
    return row;
  }

  private buyControls(line: GardenSeedLine): HTMLDivElement {
    const box = el("div", "shop-buy");
    const stepper = el("div", "shop-stepper");
    const set = (count: number) => {
      this.count = clampCount(count);
      this.doneUntil = 0;
      this.render();
    };
    stepper.append(
      button("−", "shop-step", () => set(this.count - 1)),
      el("span", "shop-count", String(this.count)),
      button("+", "shop-step", () => set(this.count + 1)),
      button("5", "shop-quick push", () => set(5)),
      button("10", "shop-quick", () => set(10)),
    );
    stepper.querySelectorAll(".shop-step")[0].setAttribute("aria-label", "One fewer");
    stepper.querySelectorAll(".shop-step")[1].setAttribute("aria-label", "One more");
    const room = this.bag ? roomFor(this.bag, line.itemId) : 0;
    const label = buyLabel(this.count, line.price, this.coins, room);
    const done = performance.now() < this.doneUntil;
    const go = button(done ? `Bought ${this.count}!` : label.text, "panel-button", () => {
      this.options.buy(line.itemId, this.count);
      this.flash();
    });
    go.disabled = !label.enabled && !done;
    box.append(stepper, go);
    return box;
  }

  private renderTools() {
    this.body.append(el("div", "panel-label shop-shelf", "For your own bag"));
    for (const row of toolRows(this.bag, this.coins)) {
      const line = el("div", `shop-row garden-tool${row.state === "later" ? " garden-later" : ""}`);
      const head = el("div", "shop-line");
      const words = el("div", "grow");
      words.append(el("b", "", row.name), el("small", "", row.does), el("small", "garden-cost", row.cost));
      head.append(picture(this.options.icon(row.icon)), words);
      line.append(head);
      if (row.state !== "later") {
        const done = performance.now() < this.doneUntil && row.state === "have";
        const go = button(done ? "Yours!" : row.button, `panel-button garden-get${row.state === "have" ? " soft" : ""}`, () => {
          if (row.state !== "ready" || !row.id) return;
          this.options.upgrade(row.id);
          this.flash();
        });
        go.disabled = row.state !== "ready";
        line.append(go);
      }
      this.body.append(line);
    }
  }

  /** The button says so straight away; the bag and coins change when the server answers. */
  private flash() {
    this.doneUntil = performance.now() + 1200;
    window.clearTimeout(this.doneTimer);
    this.doneTimer = window.setTimeout(() => this.render(), 1250);
    this.render();
  }
}
