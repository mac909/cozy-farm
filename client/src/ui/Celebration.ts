import type { ItemId } from "../../../shared/content/items";
import "./book.css";
import type { Celebration } from "./bookText";
import { el, openPanel, picture, type Panel } from "./panel";

/** How long a card stays: a discovery a little longer than a record. */
const BIG_MS = 4500;
const SMALL_MS = 3000;

export interface CelebrationOptions {
  icon(itemId: ItemId): string;
  /** Tapping the card opens the book. */
  openBook(): void;
  /** A card just came up (for its sound). */
  shown?(celebration: Celebration): void;
}

/**
 * Cards near the top of the screen for something new in the collection book: "New in the
 * collection book! Sea Bream, caught by Pip". Both players see them. They don't stop play, go by
 * themselves, and come one after another; tapping one opens the book.
 */
export class Celebrations {
  private readonly queue: Celebration[] = [];
  private shown: Panel | null = null;
  private timer: number | undefined;

  constructor(private readonly options: CelebrationOptions) {}

  /** A card is up now. */
  get showing(): boolean {
    return this.shown?.isOpen === true;
  }

  add(celebration: Celebration) {
    this.queue.push(celebration);
    if (!this.showing) this.next();
  }

  private next() {
    const celebration = this.queue.shift();
    if (!celebration) return;
    const panel = openPanel({ cardClass: `celebrate${celebration.big ? "" : " small"}`, passThrough: true, position: "top" });
    // Over any card that opens after it (the book, the bag), not dimmed behind it.
    panel.card.parentElement?.classList.add("over");
    if (celebration.itemId) panel.card.append(picture(this.options.icon(celebration.itemId), "celebrate-icon"));
    const words = el("div");
    words.append(el("div", "celebrate-title", celebration.title), el("div", "celebrate-line", celebration.line));
    panel.card.append(words);
    panel.card.addEventListener("click", () => {
      this.close();
      this.options.openBook();
    });
    this.shown = panel;
    this.options.shown?.(celebration);
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.close(), celebration.big ? BIG_MS : SMALL_MS);
  }

  private close() {
    window.clearTimeout(this.timer);
    this.shown?.close();
    this.shown = null;
    // The next one, after a breath.
    if (this.queue.length > 0) this.timer = window.setTimeout(() => this.next(), 250);
  }
}
