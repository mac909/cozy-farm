import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SaveLoadError, messageOf } from "./errors";
import { type SaveFormat, type VersionedSave, currentVersion, upgradeSave } from "./saveFormat";

/** The save database's file name inside the data folder. */
export const SAVE_FILE = "saves.sqlite";

/** How long to wait for another connection (a backup, say) to finish, in milliseconds. */
const BUSY_TIMEOUT_MS = 10_000;

// One row per world, holding its whole save as JSON (with its `version` inside). When a load
// upgrades an old save, the original is copied to save_archive first, in case a migration has a bug.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS saves (
    world_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    saved_at TEXT NOT NULL
  ) STRICT;
  CREATE TABLE IF NOT EXISTS save_archive (
    world_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    data TEXT NOT NULL,
    archived_at TEXT NOT NULL,
    PRIMARY KEY (world_id, version)
  ) STRICT;
`;

// SQLite result codes meaning the file itself is damaged or isn't a database.
const SQLITE_CORRUPT = 11;
const SQLITE_NOTADB = 26;

export type LoadResult<T> =
  | { status: "none" }
  | {
      status: "loaded";
      save: T;
      /** When it was saved, as an ISO timestamp. */
      savedAt: string;
      /** The version it was stored in, if it had to be upgraded. */
      migratedFrom?: number;
    };

interface SaveRow {
  world_id: string;
  data: string;
  saved_at: string;
}

/**
 * Saves of one format, kept in `saves.sqlite` in the data folder, one per world.
 * Writes are transactions, so a crash mid-save leaves the previous save in place.
 */
export class SaveStore<T extends VersionedSave> {
  /** Full path of the save database. */
  readonly file: string;
  private readonly format: SaveFormat<T>;
  private readonly db: DatabaseSync;

  /** Opens the save database in `dataDir`, creating the folder and database if needed. */
  constructor(dataDir: string, format: SaveFormat<T>) {
    mkdirSync(dataDir, { recursive: true });
    this.file = path.join(dataDir, SAVE_FILE);
    this.format = format;
    this.db = openDatabase(this.file, { timeout: BUSY_TIMEOUT_MS });
    try {
      this.db.exec(SCHEMA);
    } catch (error) {
      this.db.close();
      throw asLoadError(error, this.file);
    }
  }

  /**
   * Loads and upgrades a world's save. Returns `{ status: "none" }` if that world has never been
   * saved, and throws SaveLoadError if its save can't be used.
   */
  load(worldId: string): LoadResult<T> {
    const row = this.db.prepare("SELECT world_id, data, saved_at FROM saves WHERE world_id = ?").get(worldId) as
      | SaveRow
      | undefined;
    if (!row) return { status: "none" };

    const { save, fromVersion } = upgradeSave(row.data, this.format, saveName(worldId, this.file));
    if (fromVersion === save.version) return { status: "loaded", save, savedAt: row.saved_at };

    this.db
      .prepare(
        "INSERT OR IGNORE INTO save_archive (world_id, version, data, archived_at) VALUES (?, ?, ?, ?)",
      )
      .run(worldId, fromVersion, row.data, new Date().toISOString());
    return { status: "loaded", save, savedAt: row.saved_at, migratedFrom: fromVersion };
  }

  /**
   * Replaces a world's save. Throws, writing nothing, if the save isn't at the current version or
   * wouldn't load back.
   */
  save(worldId: string, save: T): void {
    const version = currentVersion(this.format);
    if (save.version !== version) {
      throw new Error(`Not saving world "${worldId}": it's version ${save.version}, but saves are written as version ${version}.`);
    }
    const data = JSON.stringify(save);
    try {
      this.format.validate(JSON.parse(data));
    } catch (error) {
      throw new Error(`Not saving world "${worldId}": it wouldn't load back (${messageOf(error)}).`, { cause: error });
    }

    this.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO saves (world_id, data, saved_at) VALUES (?, ?, ?)
           ON CONFLICT (world_id) DO UPDATE SET data = excluded.data, saved_at = excluded.saved_at`,
        )
        .run(worldId, data, new Date().toISOString());
    });
  }

  close(): void {
    if (this.db.isOpen) this.db.close();
  }

  /** Runs `work` in one transaction: all of its writes land, or none do. */
  private transaction(work: () => void) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      work();
      this.db.exec("COMMIT");
    } catch (error) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

/** A world found in a save database by `checkSaveFile` or `snapshotSaves`. */
export interface StoredWorld {
  worldId: string;
  /** The version it's stored in. */
  version: number;
  savedAt: string;
}

/**
 * Copies the save database in `dataDir` to `dest` (which mustn't exist yet) as one consistent
 * snapshot, safe to take while the game is running and saving. Then checks the copy by loading
 * every world in it, and returns them. Throws if there's no save database or a world won't load.
 */
export function snapshotSaves<T extends VersionedSave>(
  dataDir: string,
  dest: string,
  format: SaveFormat<T>,
): StoredWorld[] {
  const file = path.join(dataDir, SAVE_FILE);
  if (!existsSync(file)) throw new Error(`There's no save database at ${file} yet.`);

  const source = openDatabase(file, { readOnly: true, timeout: BUSY_TIMEOUT_MS });
  try {
    source.prepare("VACUUM INTO ?").run(dest);
  } catch (error) {
    throw asLoadError(error, file);
  } finally {
    source.close();
  }

  return checkSaveFile(dest, format);
}

/**
 * Checks a save database file (a backup, say) without changing it: runs SQLite's integrity check,
 * then loads every world in it, and returns them. Throws if the file is damaged, isn't a save
 * database, or has a world that won't load.
 */
export function checkSaveFile<T extends VersionedSave>(file: string, format: SaveFormat<T>): StoredWorld[] {
  if (!existsSync(file)) throw new Error(`There's no file at ${file}.`);

  const db = openDatabase(file, { readOnly: true });
  try {
    let rows: SaveRow[];
    try {
      const integrity = db.prepare("PRAGMA integrity_check").all() as { integrity_check: string }[];
      if (integrity[0]?.integrity_check !== "ok") {
        throw new SaveLoadError(
          "not-a-database",
          `the saves in ${file}`,
          `the file failed SQLite's integrity check (${JSON.stringify(integrity)})`,
        );
      }
      if (!db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'saves'").get()) {
        throw new SaveLoadError("not-a-database", `the saves in ${file}`, "it has no saves table, so it isn't a save database");
      }
      rows = db.prepare("SELECT world_id, data, saved_at FROM saves ORDER BY world_id").all() as unknown as SaveRow[];
    } catch (error) {
      throw asLoadError(error, file);
    }
    return rows.map((row) => {
      const { fromVersion } = upgradeSave(row.data, format, saveName(row.world_id, file));
      return { worldId: row.world_id, version: fromVersion, savedAt: row.saved_at };
    });
  } finally {
    db.close();
  }
}

const saveName = (worldId: string, file: string) => `world "${worldId}" from ${file}`;

function openDatabase(file: string, options: { readOnly?: boolean; timeout?: number }) {
  try {
    return new DatabaseSync(file, options);
  } catch (error) {
    throw asLoadError(error, file);
  }
}

/** Turns SQLite's "this file is damaged" errors into a SaveLoadError; other errors pass through. */
function asLoadError(error: unknown, file: string): unknown {
  const code = (error as { errcode?: unknown } | null)?.errcode;
  if (code !== SQLITE_CORRUPT && code !== SQLITE_NOTADB) return error;
  return new SaveLoadError(
    "not-a-database",
    `the saves in ${file}`,
    `the file is damaged or isn't a SQLite database (${messageOf(error)})`,
    error,
  );
}
