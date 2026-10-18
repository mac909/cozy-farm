import { button, el, openPanel, type Panel } from "./panel";
import { parseSeen, SUPERSEDES, TIPS, tipFor, type TipEvent, type TipId } from "./tipRules";
import "./tips.css";

const SEEN_KEY = "cozy-farm.tipsSeen";
/** A tip goes by itself after this long. */
const TIP_MS = 10_000;
/** A tip pushed aside sooner than this (by the morning card, say) comes back later instead of counting as seen. */
const GLANCE_MS = 3000;

function loadSeen(): Set<TipId> {
  try {
    return parseSeen(localStorage.getItem(SEEN_KEY));
  } catch {
    return new Set();
  }
}

function saveSeen(seen: ReadonlySet<TipId>): void {
  try {
    localStorage.setItem(SEEN_KEY, [...seen].join(","));
  } catch {
    // Not remembered: a tip may show again next time.
  }
}

/**
 * The first-day tips: a small card near the top of the screen that doesn't stop play, each tip
 * once per device. Tips wait while something else is in the way (bed, a panel, the morning card).
 */
export class Tips {
  private readonly seen = loadSeen();
  private readonly waiting: TipId[] = [];
  private shown: Panel | null = null;
  private shownTip: TipId | null = null;
  private shownAt = 0;
  private timer: number | undefined;

  /** Something happened that might call for a tip. */
  event(event: TipEvent) {
    const tip = tipFor(event, this.seen);
    if (tip && !this.waiting.includes(tip)) this.waiting.push(tip);
    // A tip that's out of date now goes, shown or waiting.
    const stale = tip ? SUPERSEDES[tip] : undefined;
    if (stale) {
      if (this.shownTip === stale) this.close();
      const i = this.waiting.indexOf(stale);
      if (i >= 0) this.waiting.splice(i, 1);
    }
  }

  /** Every frame: shows the next waiting tip when nothing's in the way. */
  update(canShow: boolean) {
    if (this.shown?.isOpen) {
      if (!canShow) {
        // Pushed aside before anyone could read it: show it again later.
        const tip = this.shownTip;
        if (tip && performance.now() - this.shownAt < GLANCE_MS) {
          this.seen.delete(tip);
          saveSeen(this.seen);
          this.waiting.unshift(tip);
        }
        this.close();
      }
      return;
    }
    const tip = this.waiting[0];
    if (!canShow || !tip) return;
    this.waiting.shift();
    if (this.seen.has(tip)) return;
    this.seen.add(tip);
    saveSeen(this.seen);
    this.shownTip = tip;
    this.shownAt = performance.now();
    this.show(TIPS[tip]);
  }

  private show(text: string) {
    const panel = openPanel({ cardClass: "tip", passThrough: true, position: "top" });
    panel.card.append(el("p", "tip-text", text), button("OK", "tip-ok", () => this.close()));
    this.shown = panel;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.close(), TIP_MS);
  }

  private close() {
    window.clearTimeout(this.timer);
    this.shown?.close();
    this.shown = null;
    this.shownTip = null;
  }
}
