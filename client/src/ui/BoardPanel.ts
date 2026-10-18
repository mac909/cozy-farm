import type { Inventory } from "../../../shared/inventory/inventory";
import "./board.css";
import type { BoardState } from "./boardText";
import { el, openPanel, panelHead, picture, type Panel } from "./panel";
import { VillageBoard, type VillageBoardOptions } from "./VillageBoard";

export interface BoardPanelOptions extends Omit<VillageBoardOptions, "readOnly" | "tabs"> {
  keeperFace: string;
  /** Open on this project's card rather than the board. */
  project?: string | null;
  onClose(): void;
}

/**
 * The Village Board's card (Milestone 6), from the Action button's "Board" next to it: Marlow's
 * line, what's up now, what's finished and his notes; a project's card with Give buttons. Its
 * second tab, Your home (Milestone 7), has each cottage's porch and what's to come.
 */
export class BoardPanel {
  private readonly panel: Panel;
  private readonly board: VillageBoard;

  constructor(options: BoardPanelOptions) {
    this.panel = openPanel({ cardClass: "board", closeOnBackdrop: true, onClose: options.onClose });
    const ring = el("span", "board-ring");
    ring.append(picture(options.keeperFace));
    const head = panelHead("The Village Board", () => this.close());
    head.prepend(ring);
    const body = el("div");
    this.panel.card.append(head, body);
    this.board = new VillageBoard(body, { ...options, readOnly: false, tabs: true });
    if (options.project) this.board.showProject(options.project);
  }

  get isOpen(): boolean {
    return this.panel.isOpen;
  }

  close() {
    this.panel.close();
  }

  update(state: BoardState, bag: Inventory | null, coins: number | null) {
    this.board.update(state, bag, coins);
  }
}
