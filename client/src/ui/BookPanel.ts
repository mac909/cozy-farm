import type { BookSection, CollectionBook } from "../../../shared/collection/collection";
import type { ItemId } from "../../../shared/content/items";
import "./book.css";
import { BOOK_TABS, bookEntries, completionWords, type BookEntryView } from "./bookText";
import type { BoardState } from "./boardText";
import { button, el, openPanel, panelHead, picture, type Panel } from "./panel";
import { VillageBoard, type VillageBoardOptions } from "./VillageBoard";

/** A page of the book: one of the collection's, or the village's (the board, to read). */
type BookPage = BookSection | "village";

const TAB_KEY = "cozy-farm.bookTab";

function loadTab(): BookPage {
  try {
    const saved = localStorage.getItem(TAB_KEY);
    return saved === "village" || BOOK_TABS.some((tab) => tab.section === saved) ? (saved as BookPage) : "fish";
  } catch {
    return "fish";
  }
}

function saveTab(page: BookPage): void {
  try {
    localStorage.setItem(TAB_KEY, page);
  } catch {
    // Not remembered: it opens on the fish next time.
  }
}

/** The book's Village page (Milestone 6): the board as it stands, to read from anywhere. */
export interface VillagePage {
  /** The village as the server last said, or null before Marlow arrives (no page yet). */
  state(): BoardState | null;
  board: Omit<VillageBoardOptions, "readOnly" | "give" | "giveAll">;
}

export interface BookPanelOptions {
  icon(itemId: ItemId): string;
  village?: VillagePage;
  onClose(): void;
}

/**
 * The shared collection book: three pages (fish, beach finds, bugs), each a grid of everything
 * there is. Found things show in colour with their name; the rest are silhouettes. Tap one to read
 * about it in the strip underneath: how many, who found the first, the biggest fish, where and when.
 * The count at the top is the whole book. Once Marlow is here, a fourth page shows the Village
 * Board, to read (giving happens at the board). It stays up to date while it's open.
 */
export class BookPanel {
  private readonly panel: Panel;
  private readonly count: HTMLSpanElement;
  private readonly tabs: HTMLDivElement;
  private readonly grid: HTMLDivElement;
  private readonly info: HTMLDivElement;
  private readonly villageRoot: HTMLDivElement;
  private readonly board: VillageBoard | null;
  private book: CollectionBook | null = null;
  private page = loadTab();
  private picked: ItemId | null = null;

  constructor(private readonly options: BookPanelOptions) {
    this.panel = openPanel({ cardClass: "book", closeKeys: ["c"], closeOnBackdrop: true, onClose: options.onClose });
    this.count = el("span", "panel-coins book-count");
    this.tabs = el("div", "book-tabs");
    this.grid = el("div", "book-grid");
    this.info = el("div", "book-info");
    this.villageRoot = el("div", "book-village");
    this.board = options.village ? new VillageBoard(this.villageRoot, { ...options.village.board, readOnly: true }) : null;
    this.panel.card.append(panelHead("Collection book", () => this.close(), this.count), this.tabs, this.grid, this.info, this.villageRoot);
  }

  get isOpen(): boolean {
    return this.panel.isOpen;
  }

  close() {
    this.panel.close();
  }

  /** Shows the book as the server last said. */
  update(book: CollectionBook) {
    if (JSON.stringify(book) === JSON.stringify(this.book)) return;
    this.book = book;
    this.render();
  }

  /** The village changed: the Village page follows. */
  refreshVillage() {
    if (this.page === "village") this.render();
  }

  private render() {
    const book = this.book;
    if (!book) return;
    const village = this.options.village?.state() ?? null;
    if (this.page === "village" && !village) this.page = "fish";
    const words = completionWords(book);
    this.count.textContent = words.all;
    const tab = (page: BookPage, title: string, small: string) => {
      const node = button("", `book-tab${page === this.page ? " on" : ""}`, () => {
        this.page = page;
        this.picked = null;
        saveTab(page);
        this.render();
      });
      node.append(el("span", "", title), el("small", "", small));
      return node;
    };
    this.tabs.replaceChildren(
      ...BOOK_TABS.map(({ section, title }) => tab(section, title, words.tabs[section])),
      ...(village ? [tab("village", "Village", "board")] : []),
    );
    const onVillage = this.page === "village" && village !== null;
    this.grid.hidden = onVillage;
    this.info.hidden = onVillage;
    this.villageRoot.hidden = !onVillage;
    if (onVillage) {
      this.board?.update(village, null, null);
      return;
    }
    const entries = bookEntries(book, this.page as BookSection);
    this.grid.replaceChildren(...entries.map((entry) => this.cell(entry)));
    this.showInfo(entries.find((entry) => entry.id === this.picked) ?? null);
  }

  private cell(entry: BookEntryView): HTMLButtonElement {
    const cell = button("", `book-cell${entry.found ? "" : " unknown"}${entry.id === this.picked ? " picked" : ""}`, () => {
      this.picked = this.picked === entry.id ? null : entry.id;
      this.render();
    });
    cell.append(picture(this.options.icon(entry.id), "book-icon"), el("span", "book-name", entry.name));
    if (entry.found && entry.rarity !== "common") cell.append(el("span", `book-rarity ${entry.rarity}`, entry.rarity === "rare" ? "★" : "✦"));
    cell.setAttribute("aria-label", entry.found ? entry.name : "Not found yet");
    return cell;
  }

  private showInfo(entry: BookEntryView | null) {
    this.info.replaceChildren();
    if (!entry) {
      this.info.append(el("div", "book-hint", "Tap one to read about it."));
      return;
    }
    const words = el("div", "grow");
    words.append(el("b", "", entry.name === "???" ? "Still to find" : entry.name), ...entry.lines.map((line) => el("small", "", line)));
    this.info.append(picture(this.options.icon(entry.id), `book-icon big${entry.found ? "" : " unknown"}`), words);
  }
}
