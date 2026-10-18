import { SaveLoadError, messageOf } from "./errors";

/** The one field every save has, in every version. */
export interface VersionedSave {
  version: number;
}

/** A save as plain JSON, possibly partway through being upgraded. */
export type SaveJson = Record<string, unknown>;

/** Turns a save of version n into version n + 1. It only reshapes the data; the version number is set for it. */
export type Migration = (save: SaveJson) => SaveJson;

/** How one kind of save is upgraded and checked. */
export interface SaveFormat<T extends VersionedSave> {
  /**
   * Every migration ever written, oldest first: `migrations[0]` turns version 1 into 2.
   * Never edit or remove one that has shipped; add a new one instead.
   */
  readonly migrations: readonly Migration[];
  /** Returns a save at the current version as `T`, or throws an Error saying what's wrong with it. */
  validate(save: SaveJson): T;
}

/** The version saves are written in: one past the last migration, so adding a migration bumps it. */
export const currentVersion = (format: SaveFormat<VersionedSave>) => format.migrations.length + 1;

/**
 * Parses a stored save and upgrades it to the current version, one migration at a time.
 * `where` names the save in error messages. Throws SaveLoadError if the save can't be read,
 * came from a newer version of the game, or fails to upgrade.
 */
export function upgradeSave<T extends VersionedSave>(
  json: string,
  format: SaveFormat<T>,
  where: string,
): { save: T; fromVersion: number } {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new SaveLoadError("invalid-json", where, `it isn't valid JSON (${messageOf(error)})`, error);
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new SaveLoadError("invalid-save", where, "it isn't a JSON object");
  }

  const fromVersion = (data as SaveJson).version;
  if (typeof fromVersion !== "number" || !Number.isInteger(fromVersion) || fromVersion < 1) {
    throw new SaveLoadError(
      "missing-version",
      where,
      `its version is ${JSON.stringify(fromVersion)}, not a whole number from 1 up`,
    );
  }
  const latest = currentVersion(format);
  if (fromVersion > latest) {
    throw new SaveLoadError(
      "newer-version",
      where,
      `it's save version ${fromVersion}, but this server only knows up to version ${latest}. ` +
        "Run a newer server instead of an older one",
    );
  }

  let save = data as SaveJson;
  for (let version = fromVersion; version < latest; version++) {
    try {
      save = { ...format.migrations[version - 1](save), version: version + 1 };
    } catch (error) {
      throw new SaveLoadError(
        "migration-failed",
        where,
        `upgrading it from version ${version} to ${version + 1} failed (${messageOf(error)})`,
        error,
      );
    }
  }

  try {
    return { save: format.validate(save), fromVersion };
  } catch (error) {
    throw new SaveLoadError(
      "invalid-save",
      where,
      `it doesn't fit save version ${latest} (${messageOf(error)})`,
      error,
    );
  }
}
