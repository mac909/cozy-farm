import { parseTiledMap, type TiledMapJson } from "./tiledMap";
import villageJson from "./village.json";

/**
 * The seaside village, painted in Tiled: shared/world/village.json.
 * See "Editing the map" in CLAUDE.md.
 */
export const VILLAGE_TILED = villageJson as TiledMapJson;

export const VILLAGE_MAP = parseTiledMap(VILLAGE_TILED);
