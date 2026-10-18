import type { ItemId } from "../../../shared/content/items";
import type { CharacterId } from "../../../shared/content/characters";
import type { Inventory } from "../../../shared/inventory/inventory";
import type { HelperView } from "../../../shared/stateSync";
import "./board.css";
import "./book.css";
import { boardWords, homeWords, projectCard, type BoardState, type HomeRow, type ProjectCard } from "./boardText";
import { button, el, picture } from "./panel";

export interface VillageBoardOptions {
  /** The book's Village page: everything to read, nothing to give. */
  readOnly: boolean;
  icon(itemId: ItemId): string;
  coinIcon: string;
  face(character: CharacterId): string;
  /** A project's picture as it stands (the lighthouse dark, scaffolded or lit; a porch). */
  projectPicture(projectId: string): string;
  /** The porch's picture, for the Your home tab (Milestone 7). */
  porchPicture?: string;
  /** Show the Village and Your home tabs (the board card; the book's page is the village only). */
  tabs?: boolean;
  give?(project: string, need: string): void;
  giveAll?(project: string): void;
  /** Marlow's notes, to read again. */
  openNotes?(): void;
}

/**
 * The Village Board's insides (Milestone 6): what's up now (one project at a time), what's
 * finished, and Marlow's notes; tap a project for its card, with each need, Give buttons, who's
 * helping (faces, never counts), what's next and what it opens. The board card and the
 * collection book's Village page both show it. It stays up to date while it's open. On the board
 * card, a second tab (Milestone 7) shows Your home: each cottage's upgrades, the porch first,
 * which anyone can give to.
 */
export class VillageBoard {
  private state: BoardState | null = null;
  private bag: Inventory | null = null;
  private coins: number | null = null;
  private project: string | null = null;
  private tab: "village" | "home" = "village";
  private shown = "";

  constructor(
    private readonly root: HTMLElement,
    private readonly options: VillageBoardOptions,
  ) {}

  /** Shows the board as the server last said, for someone with `bag` and the shared `coins`. */
  update(state: BoardState, bag: Inventory | null, coins: number | null) {
    this.state = state;
    this.bag = bag;
    this.coins = coins;
    this.render();
  }

  /** Opens a project's card (or the board, with null), on its own tab. */
  showProject(id: string | null) {
    this.project = id;
    if (id !== null) this.tab = id.includes(":") ? "home" : "village";
    this.shown = "";
    this.render();
  }

  /** Shows the Village or Your home tab. */
  showTab(tab: "village" | "home") {
    this.tab = tab;
    this.project = null;
    this.shown = "";
    this.render();
  }

  private render() {
    const state = this.state;
    if (!state) return;
    const card = this.project ? projectCard(this.project, state, this.options.readOnly ? null : this.bag, this.coins) : null;
    const words = card ?? (this.tab === "home" ? homeWords(state) : boardWords(state));
    const key = JSON.stringify([this.project, this.tab, words, this.options.readOnly ? null : this.coins]);
    if (key === this.shown) return;
    this.shown = key;
    const body = card ? this.projectView(card) : this.tab === "home" ? this.homeView(state) : this.boardView(state);
    this.root.replaceChildren(...(this.options.tabs && !card ? [this.tabsRow()] : []), ...body);
  }

  /** Village and Your home. */
  private tabsRow(): HTMLElement {
    const row = el("div", "book-tabs board-tabs");
    for (const [tab, title] of [
      ["village", "Village"],
      ["home", "Your home"],
    ] as const) {
      row.append(button(title, `book-tab${this.tab === tab ? " on" : ""}`, () => this.showTab(tab)));
    }
    return row;
  }

  /**
   * A project's picture in its little frame: the top of the lighthouse, where the lamp is; the
   * garden shop (Milestone 8), a little smaller; a porch as it is.
   */
  private picture(projectId: string): HTMLElement {
    const shape = projectId.includes(":") ? "square" : projectId === "gardenShop" ? "wide" : "tall";
    const pic = el("span", `board-pic${shape === "tall" ? " tall" : ""}`);
    pic.append(picture(this.options.projectPicture(projectId), shape));
    return pic;
  }

  /** The Your home tab: each cottage someone lives in, its upgrades built, up, or still to come. */
  private homeView(state: BoardState): HTMLElement[] {
    const words = homeWords(state);
    const says = el("p", "board-says", `“${words.line}” `);
    says.append(el("span", "board-sig", "— M."));
    const out: HTMLElement[] = [says];
    if (words.note) out.push(el("p", "board-quiet home-note", words.note));
    for (const cottage of words.cottages) {
      out.push(el("div", "panel-label", cottage.title));
      for (const row of cottage.rows) out.push(this.homeRow(row));
    }
    if (words.cottages.length > 0) out.push(el("p", "board-quiet home-note", "Either of you can help build either house."));
    return out;
  }

  private homeRow(row: HomeRow): HTMLElement {
    const open = row.state === "open" || row.state === "waiting";
    const node = open && row.id ? button("", "board-project", () => this.showProject(row.id)) : el("div", `board-project ${row.state === "later" ? "later" : "finished"}`);
    const pic = el("span", "board-pic");
    const src = row.icon === "porch" ? this.options.porchPicture : this.options.icon(row.icon);
    if (src) pic.append(picture(src, "square"));
    const words = el("div", "grow");
    words.append(el("b", "", row.name));
    if (row.state === "open") {
      const needs = el("small", "home-needs");
      row.needs.forEach((need, i) => {
        if (i > 0) needs.append(document.createTextNode(" · "));
        if (need.icon) needs.append(picture(this.options.icon(need.icon), "home-need"));
        needs.append(document.createTextNode(need.icon ? ` ${need.text}` : need.text));
      });
      const bar = el("div", "board-bar");
      const fill = el("i");
      fill.style.width = `${Math.round(row.progress * 100)}%`;
      bar.append(fill);
      words.append(needs, bar);
    } else if (row.sub) words.append(el("small", "", row.sub));
    node.append(pic, words);
    if (open) node.append(el("span", "board-chev", "›"));
    else if (row.state === "built") node.append(el("span", "board-tick", "✓"));
    return node;
  }

  private faces(faces: readonly HelperView[], label: string): HTMLElement {
    const row = el("div", "board-faces");
    for (const face of faces) {
      const img = picture(this.options.face(face.character), "board-face");
      img.title = face.name;
      img.alt = face.name;
      row.append(img);
    }
    row.append(el("small", "", faces.length > 0 ? label : "Nobody yet: be the first!"));
    return row;
  }

  private boardView(state: BoardState): HTMLElement[] {
    const words = boardWords(state);
    const says = el("p", "board-says", `“${words.line}” `);
    says.append(el("span", "board-sig", "— M."));
    const out: HTMLElement[] = [says, el("div", "panel-label", "Now")];
    if (words.now.length === 0) out.push(el("p", "board-quiet", "Nothing on the board just now."));
    for (const row of words.now) {
      const project = button("", "board-project", () => this.showProject(row.id));
      const pic = this.picture(row.id);
      const words = el("div", "grow");
      const bar = el("div", `board-bar${row.progress >= 1 ? " full" : ""}`);
      const fill = el("i");
      fill.style.width = `${Math.round(row.progress * 100)}%`;
      bar.append(fill);
      words.append(el("b", "", row.name), el("small", "", row.waiting ?? row.step), bar, this.faces(row.faces, "helping"));
      project.append(pic, words, el("span", "board-chev", "›"));
      out.push(project);
    }
    if (words.later.length > 0) {
      out.push(el("div", "panel-label", "Coming later"));
      for (const later of words.later) {
        const row = el("div", "board-project later");
        const text = el("div", "grow");
        text.append(el("b", "", later.title), el("small", "", later.hint));
        row.append(this.picture(later.id), text);
        out.push(row);
      }
    }
    if (words.finished.length > 0) {
      out.push(el("div", "panel-label", "Finished"));
      for (const done of words.finished) {
        const row = el("div", "board-project finished");
        const pic = this.picture(done.id);
        const text = el("div", "grow");
        text.append(el("b", "", done.name), el("small", "", done.when));
        row.append(pic, text);
        out.push(row);
      }
    }
    if (words.notes > 0 && this.options.openNotes) {
      out.push(button(`Marlow's notes (${words.notes})`, "panel-button soft", () => this.options.openNotes?.()));
    }
    return out;
  }

  private projectView(card: ProjectCard): HTMLElement[] {
    const back = button(card.home ? "‹ Your home" : "‹ The board", "panel-pill board-back", () => this.showProject(null));
    back.style.background = "#e4d3ad";
    back.style.color = "#4a3b2a";
    const head = el("div", "board-step");
    const pic = this.picture(card.id);
    const words = el("div", "grow");
    const step = card.step === null ? card.steps : card.step + 1;
    const dots = "●".repeat(Math.min(step, card.steps)) + "○".repeat(Math.max(0, card.steps - step));
    // A one-step project (a house upgrade) needs no dots or step count.
    const title = card.step === null ? `${card.name}: done!` : card.steps === 1 ? card.stepName : `Step ${step} of ${card.steps} · ${card.stepName}`;
    words.append(...(card.steps > 1 ? [el("div", "board-dots", dots)] : []), el("b", "", title), el("small", "", `“${card.blurb}”`));
    head.append(pic, words);
    const out: HTMLElement[] = [back, el("h3", "panel-title", card.name), head];
    for (const need of card.needs) out.push(this.needRow(card, need));
    if (card.waiting) out.push(el("p", "board-waiting", card.waiting));
    if (!this.options.readOnly && card.step !== null && !card.waiting) {
      const all = button("Give everything I can", "panel-button", () => this.options.giveAll?.(card.id));
      all.disabled = !card.canGiveAll;
      out.push(all);
    }
    out.push(el("div", "panel-label", "Helping"), this.faces(card.faces, ""));
    if (card.next) {
      out.push(el("div", "panel-label", `Next · ${card.next.name}`), el("div", "board-next", card.next.needs));
    }
    const opens = el("ul", "board-opens");
    for (const line of card.opens) opens.append(el("li", "", line));
    out.push(el("div", "panel-label", "When it's done"), opens);
    return out;
  }

  private needRow(card: ProjectCard, need: ProjectCard["needs"][number]): HTMLElement {
    const row = el("div", `board-need${need.done ? " done" : ""}`);
    const icon = el("span", "board-icon");
    if (need.coins) icon.append(picture(this.options.coinIcon, "coin"));
    else if (need.icon) icon.append(picture(this.options.icon(need.icon)));
    const words = el("div", "grow");
    words.append(el("b", "", need.name), el("small", "", need.sub));
    const count = el("span", "board-count", `${need.given.toLocaleString("en-GB")} / ${need.count.toLocaleString("en-GB")}`);
    row.append(icon, words, count);
    if (need.done) row.append(el("span", "board-tick", "✓"));
    else if (!this.options.readOnly && need.give > 0) {
      row.append(button(`Give ${need.give.toLocaleString("en-GB")}`, "board-give", () => this.options.give?.(card.id, need.key)));
    }
    return row;
  }
}
