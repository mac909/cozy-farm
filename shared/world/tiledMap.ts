import { TILE_SIZE } from "../constants";
import { KEEPER_POINTS, mapFor, NOTHING_BUILT, objectFields } from "./gates";
import { type GatedLayer, type HousePlan, type MapGates, type MapObject, type Rect, type Terrain, tileAt, type WorldMap } from "./map";

/**
 * Reads a map saved by Tiled (JSON format, see "Editing the map" in CLAUDE.md).
 * Only the parts the game rules need: the size, the hidden Collision and Farmland
 * layers, and the named objects. Drawing is left to the client.
 */

/** Hidden tile layers: any tile painted on them counts, whatever it looks like. */
export const COLLISION_LAYER = "Collision";
export const FARMLAND_LAYER = "Farmland";
/** The ground: its terrain set (grass, sand, sea) says where the beach and the water are. */
export const GROUND_LAYER = "Ground";
/** Layers whose tiles count as something standing or lying there (palms, tufts, planks). */
export const CLUTTER_LAYERS = ["Decor", "Details"];
/** The object layer with the spawn point and the spots for the shipping crate, tent, seed stand and store. */
export const OBJECTS_LAYER = "Objects";
/** Tile layers with this bool property set draw over the characters (tree tops). */
export const ABOVE_CHARACTERS_PROPERTY = "aboveCharacters";

/** The few Tiled JSON fields we read. */
export interface TiledMapJson {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
}

export interface TiledLayer {
  name: string;
  type: string;
  data?: unknown;
  objects?: TiledObject[];
  properties?: { name: string; type: string; value: unknown }[];
}

export interface TiledObject {
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  point?: boolean;
  properties?: { name: string; type: string; value: unknown }[];
}

/** A layer's string property: `shownFrom: lighthouse/path` says it's drawn (and in effect) once that's built. */
export const SHOWN_FROM_PROPERTY = "shownFrom";
/** `shownUntil: lighthouse/path`: drawn (and in effect) until that's built. */
export const SHOWN_UNTIL_PROPERTY = "shownUntil";
/** An object's string property: `needs: lighthouse` means it does nothing until that's built. */
export const NEEDS_PROPERTY = "needs";
/** A gated Collision layer's string property: the hint the Action button gives facing it ("brambles"). */
export const HINT_PROPERTY = "hint";

/** A layer's or object's string property, or null. */
export function stringProperty(thing: { properties?: unknown }, name: string): string | null {
  const properties: { name?: unknown; value?: unknown }[] = Array.isArray(thing.properties) ? thing.properties : [];
  const value = properties.find((p) => p?.name === name)?.value;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Whether a tile layer comes and goes as things are built. */
export function isGatedLayer(layer: { properties?: unknown }): boolean {
  return stringProperty(layer, SHOWN_FROM_PROPERTY) !== null || stringProperty(layer, SHOWN_UNTIL_PROPERTY) !== null;
}

export interface TiledTileset {
  name: string;
  firstgid: number;
  image?: string;
  /** Present only for external tilesets, which Phaser can't read. */
  source?: string;
  /** Terrain sets ("Beach": grass, sand, sea), painted with Tiled's terrain brush. */
  wangsets?: TiledWangSet[];
}

export interface TiledWangSet {
  name: string;
  type: string;
  colors: { name: string }[];
  /** Each tile's colours: 8 numbers clockwise from the top edge, corners at the odd places; 0 is none, 1 the first colour. */
  wangtiles: { tileid: number; wangid: number[] }[];
}

/** Tiled keeps flips and turns in a tile's top bits. */
const GID_MASK = 0x1fffffff;

export function parseTiledMap(input: unknown): WorldMap {
  const json = input as TiledMapJson;
  if (!json || !Array.isArray(json.layers) || !Array.isArray(json.tilesets)) throw new Error("Not a Tiled JSON map");
  const { width, height } = json;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("The map needs a fixed size (an infinite map won't do)");
  }
  if (json.tilewidth !== TILE_SIZE || json.tileheight !== TILE_SIZE) {
    throw new Error(`Map tiles must be ${TILE_SIZE}×${TILE_SIZE}`);
  }
  for (const tileset of json.tilesets) {
    if (tileset.source) {
      throw new Error(`Tileset "${tileset.source}" is external: embed it in the map (Tiled: the Embed Tileset button in the Tilesets panel)`);
    }
  }

  const tiles = (name: string): number[] => {
    const layer = json.layers.find((l) => l.name === name);
    if (!layer || layer.type !== "tilelayer") throw new Error(`The map has no "${name}" tile layer`);
    const { data } = layer;
    if (!Array.isArray(data)) {
      throw new Error(`Layer "${name}" isn't plain numbers: in Tiled, set Map Properties → Tile Layer Format to CSV`);
    }
    if (data.length !== width * height) throw new Error(`Layer "${name}" has ${data.length} tiles, expected ${width * height}`);
    return data as number[];
  };
  const grid = <T>(data: readonly number[], cell: (gid: number) => T): T[][] =>
    Array.from({ length: height }, (_, row) => data.slice(row * width, (row + 1) * width).map(cell));
  const painted = (name: string): boolean[][] => grid(tiles(name), (gid) => gid !== 0);
  const hasLayer = (name: string) => json.layers.some((l) => l.name === name && l.type === "tilelayer");
  const empty = new Array<number>(width * height).fill(0);

  const objectLayer = json.layers.find((l) => l.name === OBJECTS_LAYER && l.type === "objectgroup");
  if (!objectLayer) throw new Error(`The map has no "${OBJECTS_LAYER}" object layer`);
  const one = (name: string): TiledObject => {
    const found = (objectLayer.objects ?? []).filter((o) => o.name === name);
    if (found.length === 0) throw new Error(`The map has no "${name}" object`);
    if (found.length > 1) throw new Error(`The map has more than one "${name}" object`);
    return found[0];
  };

  const spawnObject = one("spawn");
  const spawn = tileAt(spawnObject.x, spawnObject.y);
  if (spawn.col < 0 || spawn.row < 0 || spawn.col >= width || spawn.row >= height) {
    throw new Error("The spawn point is outside the map");
  }
  const area = (name: string): Rect => {
    const { x, y, width = 0, height = 0 } = one(name);
    return { x, y, width, height };
  };

  // Each cottage ("house1") has its room ("interior1"), at least 3 × 3 tiles with its walls.
  const houses: HousePlan[] = [];
  for (const object of objectLayer.objects ?? []) {
    const match = /^house(\d+)$/.exec(object.name);
    if (!match) continue;
    const id = object.name;
    const interior = area(`interior${match[1]}`);
    if (interior.width < 3 * TILE_SIZE || interior.height < 3 * TILE_SIZE) throw new Error(`"interior${match[1]}" is smaller than 3 × 3 tiles`);
    houses.push({ id, building: area(id), interior });
  }
  houses.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const terrainOf = terrainReader(json.tilesets);
  const clutter = CLUTTER_LAYERS.filter(hasLayer).map(tiles);

  // Layers that come and go as the village is built (Milestone 6).
  const layers: GatedLayer[] = json.layers
    .filter((l) => l.type === "tilelayer" && l.name !== COLLISION_LAYER && l.name !== FARMLAND_LAYER)
    .filter((l) => isGatedLayer(l) || l.name.startsWith(`${COLLISION_LAYER} `) || l.name.startsWith(`${FARMLAND_LAYER} `))
    .map((l) => ({
      name: l.name,
      kind: l.name.startsWith(`${COLLISION_LAYER} `) ? "collision" : l.name.startsWith(`${FARMLAND_LAYER} `) ? "farmland" : "art",
      from: stringProperty(l, SHOWN_FROM_PROPERTY),
      until: stringProperty(l, SHOWN_UNTIL_PROPERTY),
      tiles: painted(l.name),
      hint: stringProperty(l, HINT_PROPERTY),
    }));
  const objects: MapObject[] = (objectLayer.objects ?? [])
    .filter((o) => GATED_OBJECTS.includes(o.name) || Object.hasOwn(KEEPER_POINTS, o.name))
    .map((o) => ({
      name: o.name,
      rect: { x: o.x, y: o.y, width: o.width ?? 0, height: o.height ?? 0 },
      point: o.point === true,
      needs: stringProperty(o, NEEDS_PROPERTY),
      props: Object.fromEntries(
        (o.properties ?? []).filter((p) => p.name !== NEEDS_PROPERTY && typeof p.value === "string").map((p) => [p.name, p.value as string]),
      ),
    }));
  const gates: MapGates = { layers, objects, baseBlocked: painted(COLLISION_LAYER), baseFarmland: painted(FARMLAND_LAYER) };

  const base: WorldMap = {
    width,
    height,
    blocked: gates.baseBlocked,
    farmland: gates.baseFarmland,
    spawn,
    shippingCrate: area("shippingCrate"),
    tent: area("tent"),
    seedStand: area("seedStand"),
    store: area("store"),
    houses,
    terrain: grid(hasLayer(GROUND_LAYER) ? tiles(GROUND_LAYER) : empty, terrainOf),
    cluttered: grid(
      empty.map((_, i) => (clutter.some((layer) => layer[i] !== 0) ? 1 : 0)),
      (any) => any !== 0,
    ),
    ...objectFields(objects, NOTHING_BUILT),
    gates,
  };
  // As it starts, with nothing built.
  return mapFor(base, NOTHING_BUILT);
}

/** Objects that can come and go (or there can be several of), read into the map's gates. */
const GATED_OBJECTS = ["board", "lighthouse", "pointWater", "woods", "deepWater"];

/**
 * Reads the ground's terrain from the tileset painted with the terrain brush: the first terrain
 * set with colours named Grass, Sand and Sea. Each tile's four corners say what it is.
 */
function terrainReader(tilesets: readonly TiledTileset[]): (gid: number) => Terrain {
  const byTile = new Map<number, Terrain>();
  for (const tileset of tilesets) {
    for (const set of tileset.wangsets ?? []) {
      const names = set.colors.map((c) => c.name.toLowerCase());
      if (!["grass", "sand", "sea"].every((n) => names.includes(n))) continue;
      for (const { tileid, wangid } of set.wangtiles) {
        // Corner sets keep colours at the odd places; a mixed set may use the edges too.
        const places = set.type === "corner" ? wangid.filter((_, i) => i % 2 === 1) : wangid;
        const kinds = new Set(places.filter((c) => c > 0).map((c) => names[c - 1]));
        byTile.set(tileset.firstgid + tileid, terrainFrom(kinds));
      }
    }
  }
  return (gid) => byTile.get(gid & GID_MASK) ?? "other";
}

function terrainFrom(kinds: ReadonlySet<string>): Terrain {
  if (kinds.size === 1) {
    const [only] = kinds;
    if (only === "grass" || only === "sand" || only === "sea") return only;
  }
  if (kinds.has("sea")) return "shore";
  if (kinds.has("grass") && kinds.has("sand")) return "edge";
  return "other";
}

/**
 * Tiled stores tileset images relative to the map file, e.g.
 * "../../client/public/assets/custom/beach-terrain.png". The game serves
 * client/public/ at the site root, so that becomes "/assets/custom/beach-terrain.png".
 */
export function tilesetImageUrl(image: string): string {
  const marker = "client/public/";
  const at = image.replace(/\\/g, "/").indexOf(marker);
  if (at < 0) throw new Error(`Tileset image "${image}" must be inside client/public/`);
  return encodeURI("/" + image.replace(/\\/g, "/").slice(at + marker.length));
}

export function isAboveCharacters(layer: { properties?: unknown }): boolean {
  const properties: { name?: unknown; value?: unknown }[] = Array.isArray(layer.properties) ? layer.properties : [];
  return properties.some((p) => p?.name === ABOVE_CHARACTERS_PROPERTY && p?.value === true);
}
