import { button, el, openPanel, type Panel } from "./panel";
import { parseSeen, TIPS, tipFor, type TipEvent, type TipId } from "./tipRules";
import "./tips.css";

const SEEN_KEY = "cozy-farm.tipsSeen";
/** A tip goes by itself after this long. */
const TIP_MS = 10_000;

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
  private timer: number | undefined;

  /** Something happened that might call for a tip. */
  event(event: TipEvent) {
    const tip = tipFor(event, this.seen);
    if (tip && !this.waiting.includes(tip)) this.waiting.push(tip);
  }

  /** Every frame: shows the next waiting tip when nothing's in the way. */
  update(canShow: boolean) {
    if (this.shown?.isOpen) {
      if (!canShow) this.close();
      return;
    }
    const tip = this.waiting[0];
    if (!canShow || !tip) return;
    this.waiting.shift();
    if (this.seen.has(tip)) return;
    this.seen.add(tip);
    saveSeen(this.seen);
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
  }
}
