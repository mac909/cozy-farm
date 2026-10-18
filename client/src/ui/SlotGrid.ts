import type { ItemId } from "../../../shared/content/items";
import { HOTBAR_SLOTS, type Inventory, type Slot } from "../../../shared/inventory/inventory";
import { el, picture } from "./panel";

export interface SlotGridOptions {
  /** An item's picture, as an image URL. */
  icon(itemId: ItemId): string;
  /** A slot was tapped or clicked. */
  onTap(slot: number): void;
  /** With a mouse, a stack was dragged from one slot and dropped on another. */
  onDrag?(from: number, to: number): void;
  /** Slots shown faded (and not tappable), like tools at the crate. */
  faded?(slot: Slot): boolean;
}

/** Drag and drop only with a mouse: on a phone a drag that starts on a small slot is easy to fumble, so it's tap, then tap. */
const canDrag = () => typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches;

/**
 * A bag as two grids of 8 columns: the hotbar row on top (the same slots as the hotbar along the
 * bottom of the screen) and the rest of the bag under it. Used by the bag and the crate.
 */
export class SlotGrid {
  /** The hotbar's row. */
  readonly top: HTMLDivElement;
  /** The rest of the bag. */
  readonly rest: HTMLDivElement;
  private readonly cells: HTMLButtonElement[] = [];
  private readonly drag: boolean;
  private shown = "";

  constructor(
    slots: number,
    private readonly options: SlotGridOptions,
  ) {
    this.top = el("div", "panel-grid");
    this.rest = el("div", "panel-grid");
    this.drag = options.onDrag !== undefined && canDrag();
    const drag = this.drag;
    for (let i = 0; i < slots; i++) {
      const cell = el("button", `panel-cell${i < HOTBAR_SLOTS ? " hot" : ""}`);
      cell.type = "button";
      cell.addEventListener("click", () => {
        if (!cell.classList.contains("off")) options.onTap(i);
      });
      if (drag) this.allowDrag(cell, i);
      this.cells.push(cell);
      (i < HOTBAR_SLOTS ? this.top : this.rest).append(cell);
    }
  }

  /** Shows a bag, with one slot picked out (or none). Cheap when nothing changed. */
  show(bag: Inventory | null, selected: number | null) {
    const key = JSON.stringify([bag, selected]);
    if (key === this.shown) return;
    this.shown = key;
    this.cells.forEach((cell, i) => {
      const slot = bag?.[i] ?? null;
      const faded = slot !== null && (this.options.faded?.(slot) ?? false);
      cell.classList.toggle("selected", i === selected);
      cell.classList.toggle("off", faded);
      cell.draggable = this.drag && slot !== null && !faded;
      cell.replaceChildren();
      if (!slot) {
        cell.setAttribute("aria-label", `Empty slot ${i + 1}`);
        return;
      }
      cell.append(picture(this.options.icon(slot.itemId), ""));
      if (slot.count > 1) cell.append(el("span", "count", String(slot.count)));
      cell.setAttribute("aria-label", `Slot ${i + 1}`);
    });
  }

  private allowDrag(cell: HTMLButtonElement, slot: number) {
    cell.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", String(slot));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });
    cell.addEventListener("dragover", (event) => {
      event.preventDefault();
      cell.classList.add("drop");
    });
    cell.addEventListener("dragleave", () => cell.classList.remove("drop"));
    cell.addEventListener("drop", (event) => {
      event.preventDefault();
      cell.classList.remove("drop");
      const from = Number(event.dataTransfer?.getData("text/plain"));
      if (Number.isInteger(from) && from !== slot) this.options.onDrag?.(from, slot);
    });
  }
}
