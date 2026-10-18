import { TILE_SIZE } from "../constants";
import { type Rect, tileAt, type WorldMap } from "./map";

/**
 * Reads a map saved by Tiled (JSON format, see "Editing the map" in CLAUDE.md).
 * Only the parts the game rules need: the size, the hidden Collision and Farmland
 * layers, and the named objects. Drawing is left to the client.
 */

/** Hidden tile layers: any tile painted on them counts, whatever it looks like. */
export const COLLISION_LAYER = "Collision";
export const FARMLAND_LAYER = "Farmland";
/** The object layer with the spawn point and the spots for the shipping crate, tent and seed stand. */
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
}

export interface TiledTileset {
  name: string;
  firstgid: number;
  image?: string;
  /** Present only for external tilesets, which Phaser can't read. */
  source?: string;
}

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

  const painted = (name: string): boolean[][] => {
    const layer = json.layers.find((l) => l.name === name);
    if (!layer || layer.type !== "tilelayer") throw new Error(`The map has no "${name}" tile layer`);
    const { data } = layer;
    if (!Array.isArray(data)) {
      throw new Error(`Layer "${name}" isn't plain numbers: in Tiled, set Map Properties → Tile Layer Format to CSV`);
    }
    if (data.length !== width * height) throw new Error(`Layer "${name}" has ${data.length} tiles, expected ${width * height}`);
    return Array.from({ length: height }, (_, row) => data.slice(row * width, (row + 1) * width).map((gid) => gid !== 0));
  };

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

  return {
    width,
    height,
    blocked: painted(COLLISION_LAYER),
    farmland: painted(FARMLAND_LAYER),
    spawn,
    shippingCrate: area("shippingCrate"),
    tent: area("tent"),
    seedStand: area("seedStand"),
  };
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
