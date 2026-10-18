import type { BadgeIcon, BadgeId } from "../../../shared/content/badges";
import type { ItemId } from "../../../shared/content/items";
import type { SkillId } from "../../../shared/content/skills";
import type { FarmerProgress } from "../../../shared/progress/farmerProgress";
import { button, el, openPanel, picture, type Panel } from "./panel";
import "./board.css";
import "./book.css";
import "./you.css";
import { loadYouTab, saveYouTab } from "./youStorage";
import { badgeCells, perkLines, skillRows, youSubtitle } from "./youText";

export interface YouPanelOptions {
  name: string;
  /** Your face, in a round frame at the top. */
  face: string;
  skillIcon(skill: SkillId): string;
  itemIcon(itemId: ItemId): string;
  badgeIcon(icon: BadgeIcon): string;
  /** Open on this tab rather than the one last looked at. */
  tab?: "skills" | "badges";
  /** "Change name or look": the card closes and the picker opens. */
  changeLook(): void;
  onClose(): void;
}

/**
 * The You card (Milestone 7), behind your own face at the top right: your skills (a bar for each,
 * the next perk, today's experience) and the perks you have; your badges, earned in gold and the
 * rest as silhouettes with a hint; and Change name or look. Only ever your own: skills are never
 * compared. It stays up to date while it's open.
 */
export class YouPanel {
  private readonly panel: Panel;
  private readonly sub: HTMLElement;
  private readonly tabs: HTMLElement;
  private readonly body: HTMLElement;
  private tab: "skills" | "badges";
  private progress: FarmerProgress | null = null;
  private day = 1;
  private picked: BadgeId | null = null;
  private shown = "";

  constructor(private readonly options: YouPanelOptions) {
    this.tab = options.tab ?? loadYouTab();
    this.panel = openPanel({ cardClass: "you", closeOnBackdrop: true, onClose: options.onClose });
    const head = el("div", "panel-head");
    const ring = el("span", "board-ring");
    ring.append(picture(options.face));
    const words = el("div", "you-name");
    this.sub = el("small");
    words.append(el("h2", "panel-title", options.name), this.sub);
    const close = button("×", "panel-x", () => this.close());
    close.setAttribute("aria-label", "Close");
    head.append(ring, words, close);
    this.tabs = el("div", "book-tabs you-tabs");
    this.body = el("div", "you-body");
    const change = button("Change name or look", "panel-button soft", () => {
      this.close();
      options.changeLook();
    });
    this.panel.card.append(head, this.tabs, this.body, change);
  }

  get isOpen(): boolean {
    return this.panel.isOpen;
  }

  close() {
    this.panel.close();
  }

  /** Shows your progress as the server last said, on game day `day` (for "+36 today"). */
  update(progress: FarmerProgress, day: number) {
    this.progress = progress;
    this.day = day;
    this.render();
  }

  private render() {
    const progress = this.progress;
    if (!progress) return;
    const key = JSON.stringify([this.tab, this.picked, this.day, progress]);
    if (key === this.shown) return;
    this.shown = key;
    this.sub.textContent = youSubtitle(progress, this.tab);
    const tab = (id: "skills" | "badges", title: string) => {
      const node = button(title, `book-tab${this.tab === id ? " on" : ""}`, () => {
        this.tab = id;
        saveYouTab(id);
        this.render();
      });
      return node;
    };
    this.tabs.replaceChildren(tab("skills", "Skills"), tab("badges", "Badges"));
    this.body.replaceChildren(...(this.tab === "skills" ? this.skills(progress) : this.badges(progress)));
  }

  private skills(progress: FarmerProgress): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const row of skillRows(progress, this.day)) {
      const line = el("div", "you-skill");
      const icon = el("span", "you-icon");
      icon.append(picture(this.options.skillIcon(row.id)));
      const words = el("div", "grow");
      const top = el("div", "you-skill-top");
      const name = el("b", "", row.name);
      if (row.today) name.append(el("span", "you-today", row.today));
      top.append(name, el("span", "you-level", `Level ${row.level}`));
      const bar = el("div", `board-bar you-bar${row.fraction >= 1 ? " full" : ""}`);
      const fill = el("i");
      fill.style.width = `${Math.round(row.fraction * 100)}%`;
      bar.append(fill);
      const next = el("small");
      if (row.title) next.append(document.createTextNode(`${row.title} · `));
      if (row.next) {
        next.append(document.createTextNode("Next: "), el("b", "", row.next.name), document.createTextNode(`, ${row.next.text}`));
      } else next.append(document.createTextNode("Top level! Every perk is yours."));
      words.append(top, bar, next);
      line.append(icon, words);
      out.push(line);
    }
    const perks = perkLines(progress);
    out.push(el("div", "panel-label", "Your perks"));
    if (perks.length === 0) out.push(el("p", "you-quiet", "Each level brings a little something. Farm, fish and forage, and the first comes soon."));
    else {
      const list = el("ul", "you-perks");
      for (const perk of perks) {
        const item = el("li");
        item.append(el("b", "", `${perk.name}.`), document.createTextNode(` ${perk.text}`));
        list.append(item);
      }
      out.push(list);
    }
    return out;
  }

  private badges(progress: FarmerProgress): HTMLElement[] {
    const cells = badgeCells(progress);
    const grid = el("div", "you-badges");
    for (const cell of cells) {
      const node = button("", `you-badge${cell.earned ? "" : " no"}${cell.id === this.picked ? " picked" : ""}`, () => {
        this.picked = this.picked === cell.id ? null : cell.id;
        this.render();
      });
      const medal = el("span", "you-medal");
      if (cell.earned) medal.append(picture(this.options.badgeIcon(cell.icon)));
      else medal.textContent = "?";
      node.append(medal, el("span", "you-badge-name", cell.label));
      node.setAttribute("aria-label", cell.earned ? cell.name : `Still to earn: ${cell.label}`);
      grid.append(node);
    }
    const info = el("div", "book-info you-info");
    const picked = cells.find((cell) => cell.id === this.picked);
    if (!picked) info.append(el("div", "book-hint", "Tap a badge to read about it."));
    else {
      const medal = el("span", `you-medal small${picked.earned ? "" : " no"}`);
      if (picked.earned) medal.append(picture(this.options.badgeIcon(picked.icon)));
      else medal.textContent = "?";
      const words = el("div", "grow");
      words.append(el("b", "", picked.earned ? picked.name : "Still to earn"), el("small", "", picked.info));
      info.append(medal, words);
    }
    return [grid, info];
  }
}
