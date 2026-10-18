import type { ItemId } from "./items";

/**
 * What each tool does (Milestone 8, with the garden shop's upgrades). Tools never wear out, run dry
 * or get lost. An upgrade does everything the tool it replaced did, and a little more, so the
 * rules ask what *kind* of tool you have ("a hoe", "a can"), never which one. Every number here is
 * a first guess, meant to be tuned by playing (docs/plans/progression.md, section 2.5).
 */

/** What a tool is for. The bug net and the shell basket help just by being in your bag. */
export type ToolKind = "hoe" | "can" | "rod" | "net" | "basket";

export interface ToolDef {
  readonly kind: ToolKind;
  /**
   * A hoe or a can: how many tiles across it covers, the tile in front in the middle (3: the ones
   * either side too). 1 if missing.
   */
  readonly width?: number;
  /** A rod: bites come after this much of the wait they would (0.7: 30% sooner). */
  readonly biteFactor?: number;
  /** A rod: this much longer to hook a bite, in ms. */
  readonly hookMs?: number;
  /** A net: catch bugs from this many tiles further away. */
  readonly reachTiles?: number;
  /** A basket: Pick up takes everything lying within this many tiles of you, too. */
  readonly radius?: number;
  /** Shown in the bag's strip and the garden shop: what it does. */
  readonly does: string;
}

export const TOOLS = {
  hoe: { kind: "hoe", does: "Digs the farm field's grass, a tile at a time." },
  wide_hoe: { kind: "hoe", width: 3, does: "Digs three tiles at once: the one in front and either side." },
  watering_can: { kind: "can", does: "Waters a tile. It never runs dry." },
  big_watering_can: { kind: "can", width: 3, does: "Waters three tiles at once: the one in front and either side." },
  fishing_rod: { kind: "rod", does: "Face the water and tap Fish." },
  good_rod: { kind: "rod", biteFactor: 0.7, hookMs: 200, does: "Bites come 30% sooner, with a fifth of a second longer to hook them." },
  bug_net: { kind: "net", reachTiles: 1, does: "In your bag, it catches bugs from a step further away." },
  shell_basket: { kind: "basket", radius: 1, does: "In your bag, Pick up takes everything lying right round you at once." },
} as const satisfies Partial<Record<ItemId, ToolDef>>;

export type ToolId = keyof typeof TOOLS;

export function isToolId(id: unknown): id is ToolId {
  return typeof id === "string" && Object.hasOwn(TOOLS, id);
}

/** What a tool is, or null for anything that isn't one. */
export function toolDef(itemId: string | null | undefined): ToolDef | null {
  return isToolId(itemId) ? TOOLS[itemId] : null;
}

/** The kind of tool an item is, or null. */
export function toolKind(itemId: string | null | undefined): ToolKind | null {
  return toolDef(itemId)?.kind ?? null;
}
