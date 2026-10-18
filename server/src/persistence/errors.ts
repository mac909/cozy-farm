/** Why a save couldn't be loaded. */
export type SaveLoadReason =
  | "not-a-database"
  | "invalid-json"
  | "missing-version"
  | "newer-version"
  | "migration-failed"
  | "invalid-save";

/**
 * A save exists but can't be used. Nothing has been changed. Don't start a fresh world in its
 * place: the next save would overwrite the old world.
 */
export class SaveLoadError extends Error {
  readonly reason: SaveLoadReason;

  /** `where` names the save, `problem` says what's wrong with it. */
  constructor(reason: SaveLoadReason, where: string, problem: string, cause?: unknown) {
    super(
      `Can't load ${where}: ${problem}.\n` +
        "The save was left as it is. Restore a backup (npm run farm:backup keeps them in " +
        "%OneDrive%\\CozyFarm\\backups) or fix it by hand.",
      { cause },
    );
    this.name = "SaveLoadError";
    this.reason = reason;
  }
}

/** The message of anything thrown, for including in another message. */
export const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
