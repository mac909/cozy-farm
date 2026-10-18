import { toolDef, type ToolDef, type ToolKind } from "../content/tools";
import type { ItemId } from "../content/items";
import type { Inventory } from "../inventory/inventory";
import type { Facing } from "../movement";
import type { TilePos } from "../world/map";

/**
 * Tools in the bag (Milestone 8): which hoe, can or rod a farmer has, and which tiles a wide tool
 * covers. Tools work by kind, so an upgrade does everything the old tool did.
 */

const STEP: Record<Facing, TilePos> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

/** A tool in a bag: which one it is, and what it does. */
export interface ToolInBag {
  readonly itemId: ItemId;
  readonly def: ToolDef;
}

/**
 * The tool of `kind` a farmer uses: the one in `slot` if that's one (the one they're holding),
 * otherwise the first of that kind in their bag, or null if they haven't one.
 */
export function toolOfKind(bag: Inventory, kind: ToolKind, slot?: number): ToolInBag | null {
  const held = slot !== undefined && Number.isInteger(slot) ? bag[slot] : null;
  const heldDef = toolDef(held?.itemId);
  if (held && heldDef?.kind === kind) return { itemId: held.itemId, def: heldDef };
  for (const stack of bag) {
    const def = toolDef(stack?.itemId);
    if (stack && def?.kind === kind) return { itemId: stack.itemId, def };
  }
  return null;
}

/** Whether a bag has a tool of `kind` (a hoe, a can, a rod; the net or the basket). */
export function hasToolKind(bag: Inventory, kind: ToolKind): boolean {
  return toolOfKind(bag, kind) !== null;
}

/**
 * The tiles a hoe or a can works on, facing `facing` with `target` in front: the target first, then
 * either side of it across your way (a wide tool), nearest first. Off the map's top or left edge
 * is left out; the caller checks the rest.
 */
export function toolTiles(def: ToolDef | null, target: TilePos, facing: Facing): TilePos[] {
  const width = Math.max(1, Math.floor(def?.width ?? 1));
  const across = STEP[facing].col === 0 ? { col: 1, row: 0 } : { col: 0, row: 1 };
  const tiles: TilePos[] = [target];
  for (let out = 1; out <= Math.floor((width - 1) / 2); out++) {
    for (const side of [-1, 1]) tiles.push({ col: target.col + across.col * out * side, row: target.row + across.row * out * side });
  }
  return tiles.filter((tile) => tile.col >= 0 && tile.row >= 0);
}
