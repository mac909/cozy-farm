import { TILE_SIZE } from "../constants";
import type { GatedLayer, KeeperPoint, KeeperSpotId, MapGates, MapObject, Rect, TilePos, WorldMap } from "./map";

/**
 * Locked and unlocked places on the map (Milestone 6). Tiled layers may show only from
 * (`shownFrom`) or until (`shownUntil`) something is built, and objects may `need` something
 * built: brambles across the path until it's cleared, the board once Marlow is here, the point's
 * night fishing once the lighthouse is lit. `mapFor` gives the map as of today, and every rule
 * that's handed it (reach, places, fishing, the beach, the meadow) just works.
 */

/** Nothing built: the map as it starts. */
export const NOTHING_BUILT: ReadonlySet<string> = new Set();

/** Whether a gated layer or object is in effect with `built` done. */
export function inEffect(gate: { from?: string | null; until?: string | null; needs?: string | null }, built: ReadonlySet<string>): boolean {
  const from = gate.from ?? gate.needs ?? null;
  return (from === null || built.has(from)) && (gate.until == null || !built.has(gate.until));
}

/** The object fields of a map that can come and go, from its objects as of `built`. */
export function objectFields(
  objects: readonly MapObject[],
  built: ReadonlySet<string>,
): Pick<WorldMap, "board" | "lighthouse" | "pointWater" | "woods" | "deepWater" | "keeper"> {
  const here = objects.filter((o) => inEffect(o, built));
  const rects = (name: string) => here.filter((o) => o.name === name && !o.point).map((o) => ({ ...o.rect }));
  const keeper: Partial<Record<KeeperSpotId, KeeperPoint>> = {};
  for (const [name, spot] of Object.entries(KEEPER_POINTS) as [string, KeeperSpotId][]) {
    const point = here.find((o) => o.name === name);
    if (!point) continue;
    const facing = point.props.facing;
    keeper[spot] = {
      col: Math.floor(point.rect.x / TILE_SIZE),
      row: Math.floor(point.rect.y / TILE_SIZE),
      facing: facing === "up" || facing === "down" || facing === "left" || facing === "right" ? facing : "down",
    };
  }
  return {
    board: rects("board")[0] ?? null,
    lighthouse: rects("lighthouse")[0] ?? null,
    pointWater: rects("pointWater"),
    woods: rects("woods"),
    deepWater: rects("deepWater"),
    keeper,
  };
}

/** Marlow's points in Tiled, and the time of day each is for. */
export const KEEPER_POINTS: Readonly<Record<string, KeeperSpotId>> = {
  keeperDay: "day",
  keeperEvening: "evening",
  keeperNight: "night",
  keeperEveningLit: "eveningLit",
};

/** A grid that's `base` with every in-effect layer of `kind` painted on top. */
function combined(base: boolean[][], layers: readonly GatedLayer[], kind: GatedLayer["kind"], built: ReadonlySet<string>): boolean[][] {
  const shown = layers.filter((layer) => layer.kind === kind && inEffect(layer, built));
  if (shown.length === 0) return base.map((row) => [...row]);
  return base.map((row, r) => row.map((cell, c) => cell || shown.some((layer) => layer.tiles[r][c])));
}

/** The map as of today: walls, farmland and places with `built` done. */
export function mapFor(map: WorldMap, built: ReadonlySet<string>): WorldMap {
  const { gates } = map;
  return {
    ...map,
    blocked: combined(gates.baseBlocked, gates.layers, "collision", built),
    farmland: combined(gates.baseFarmland, gates.layers, "farmland", built),
    ...objectFields(gates.objects, built),
  };
}

/** The hint for facing a tile walled off by a gated layer that's in effect (the brambles), or null. */
export function closedHintAt(map: WorldMap, built: ReadonlySet<string>, tile: TilePos): string | null {
  for (const layer of map.gates.layers) {
    if (layer.kind !== "collision" || !layer.hint || !inEffect(layer, built)) continue;
    if (layer.tiles[tile.row]?.[tile.col]) return layer.hint;
  }
  return null;
}

/**
 * Where to look when something's built (the morning card's Look): the middle of the tiles of the
 * layers that change with it, or `fallback` if none do.
 */
export function lookAt(map: WorldMap, builtName: string, fallback: Rect | null): { x: number; y: number } | null {
  let minC = Infinity;
  let minR = Infinity;
  let maxC = -Infinity;
  let maxR = -Infinity;
  for (const layer of map.gates.layers) {
    if (layer.from !== builtName && layer.until !== builtName) continue;
    layer.tiles.forEach((row, r) =>
      row.forEach((on, c) => {
        if (!on) return;
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
      }),
    );
  }
  if (Number.isFinite(minC)) return { x: ((minC + maxC + 1) / 2) * TILE_SIZE, y: ((minR + maxR + 1) / 2) * TILE_SIZE };
  return fallback ? { x: fallback.x + fallback.width / 2, y: fallback.y + fallback.height / 2 } : null;
}
