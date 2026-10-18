import { type Migration, type SaveFormat, currentVersion } from "./saveFormat";

/** Id of the one shared world's save. */
export const WORLD_ID = "farm";

/**
 * Everything about the shared world that survives a restart.
 *
 * To change this shape once it has reached the real farm: add a migration below that turns the
 * previous version into the new one, then update this type and `validate`. Until Milestone 2
 * ships, nothing has been saved for real, so version 1 can still change freely.
 */
export interface WorldSave {
  version: number;
  /** In-game day, starting at 1. */
  day: number;
}

/** Upgrades for old world saves, oldest first: the first turns version 1 into 2. */
const migrations: Migration[] = [
  // For example, version 1 → 2 adding the shared wallet:
  // (save) => ({ ...save, coins: 0 }),
];

export const WORLD_SAVE: SaveFormat<WorldSave> = {
  migrations,
  validate(save) {
    if (typeof save.day !== "number" || !Number.isInteger(save.day) || save.day < 1) {
      throw new Error(`day should be a whole number from 1 up, not ${JSON.stringify(save.day)}`);
    }
    return save as unknown as WorldSave;
  },
};

/** The save for a brand-new world. */
export function newWorldSave(): WorldSave {
  return { version: currentVersion(WORLD_SAVE), day: 1 };
}
