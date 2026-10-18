import path from "node:path";
import { fileURLToPath } from "node:url";

/** Where dev keeps its saves when DATA_DIR isn't set: data-dev/ at the repo root, far from the real farm. */
export const DEV_DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../data-dev");

/**
 * The folder that holds the save database, from DATA_DIR. The real farm sets it to /app/data, its
 * farm-data volume. Production must set it, so the farm never saves inside the container, where a
 * rebuild would wipe it.
 */
export function resolveDataDir(env: NodeJS.ProcessEnv = process.env): string {
  const dir = env.DATA_DIR?.trim();
  if (dir) return path.resolve(dir);
  if (env.NODE_ENV === "production") {
    throw new Error("DATA_DIR must be set in production. docker-compose.yml sets it to /app/data, the farm-data volume.");
  }
  return DEV_DATA_DIR;
}
