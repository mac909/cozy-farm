import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveLoadError } from "./errors";
import type { SaveFormat, VersionedSave } from "./saveFormat";
import { SAVE_FILE, SaveStore, checkSaveFile, snapshotSaves } from "./saveStore";
import { WORLD_ID, WORLD_SAVE, type WorldSave, newWorldSave } from "./worldSave";

/** A new world's save, on the given day. */
const onDay = (day: number): WorldSave => ({ ...newWorldSave(), clock: { day, minute: 360 } });

let dataDir: string;
let stores: SaveStore<VersionedSave>[];

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "cozy-farm-saves-"));
  stores = [];
});

afterEach(() => {
  // Windows can't delete a database that's still open.
  for (const store of stores) store.close();
  rmSync(dataDir, { recursive: true, force: true });
});

function openStore<T extends VersionedSave>(format: SaveFormat<T>, dir = dataDir) {
  const store = new SaveStore(dir, format);
  stores.push(store);
  return store;
}

/** Puts raw JSON straight into the database, the way an older server (or a disk fault) would have left it. */
function writeRawSave(worldId: string, data: string) {
  const db = new DatabaseSync(path.join(dataDir, SAVE_FILE));
  db.prepare("INSERT OR REPLACE INTO saves (world_id, data, saved_at) VALUES (?, ?, ?)").run(
    worldId,
    data,
    "2026-10-01T20:00:00.000Z",
  );
  db.close();
}

function readRawSave(worldId: string) {
  const db = new DatabaseSync(path.join(dataDir, SAVE_FILE));
  const row = db.prepare("SELECT data FROM saves WHERE world_id = ?").get(worldId) as { data: string } | undefined;
  db.close();
  return row?.data;
}

/** A pretend format at version 3, with a wallet added in 2 and `clock.day` moved to `dayNumber` in 3. */
interface V3Save {
  version: number;
  dayNumber: number;
  coins: number;
}
const v3Format: SaveFormat<V3Save> = {
  migrations: [
    (save) => ({ ...save, coins: 0 }),
    ({ clock, ...rest }) => ({ ...rest, dayNumber: (clock as { day: number }).day }),
  ],
  validate(save) {
    if (typeof save.dayNumber !== "number") throw new Error("dayNumber is missing");
    return save as unknown as V3Save;
  },
};

describe("SaveStore", () => {
  it("says there's no save yet in a new data folder, creating the folder", () => {
    const dir = path.join(dataDir, "nested", "data-dev");
    const store = openStore(WORLD_SAVE, dir);
    expect(store.load(WORLD_ID)).toEqual({ status: "none" });
    expect(existsSync(path.join(dir, SAVE_FILE))).toBe(true);
  });

  it("loads a save back after a restart", () => {
    const world: WorldSave = onDay(7);
    openStore(WORLD_SAVE).save(WORLD_ID, world);
    stores[0].close();

    const result = openStore(WORLD_SAVE).load(WORLD_ID);
    expect(result).toMatchObject({ status: "loaded", save: world });
    expect(result).not.toHaveProperty("migratedFrom");
    expect(result.status === "loaded" && Date.parse(result.savedAt)).toBeGreaterThan(0);
  });

  it("stores the save as JSON with its version inside", () => {
    openStore(WORLD_SAVE).save(WORLD_ID, newWorldSave());
    expect(JSON.parse(readRawSave(WORLD_ID)!)).toEqual(newWorldSave());
  });

  it("replaces the previous save and keeps worlds apart", () => {
    const store = openStore(WORLD_SAVE);
    store.save(WORLD_ID, onDay(1));
    store.save(WORLD_ID, onDay(2));
    store.save("other", onDay(9));
    expect(store.load(WORLD_ID)).toMatchObject({ save: { clock: { day: 2 } } });
    expect(store.load("other")).toMatchObject({ save: { clock: { day: 9 } } });
  });

  it("upgrades an old save through each migration and archives the original", () => {
    openStore(WORLD_SAVE).save(WORLD_ID, onDay(4));
    const original = readRawSave(WORLD_ID);

    const store = openStore(v3Format);
    expect(store.load(WORLD_ID)).toMatchObject({
      status: "loaded",
      save: { version: 3, dayNumber: 4, coins: 0 },
      migratedFrom: 1,
    });

    const db = new DatabaseSync(store.file, { readOnly: true });
    expect(db.prepare("SELECT world_id, version, data FROM save_archive").all()).toEqual([
      { world_id: WORLD_ID, version: 1, data: original },
    ]);
    db.close();

    store.save(WORLD_ID, { version: 3, dayNumber: 5, coins: 10 });
    const reloaded = store.load(WORLD_ID);
    expect(reloaded).toMatchObject({ save: { dayNumber: 5 } });
    expect(reloaded).not.toHaveProperty("migratedFrom");
  });

  it("refuses a save from a newer version of the game", () => {
    openStore(WORLD_SAVE);
    const newer = JSON.stringify({ version: 2, day: 3, coins: 50 });
    writeRawSave(WORLD_ID, newer);
    expectLoadError(() => stores[0].load(WORLD_ID), "newer-version");
    expect(readRawSave(WORLD_ID)).toBe(newer);
  });

  it("reports a corrupt save helpfully and leaves it alone", () => {
    const store = openStore(WORLD_SAVE);
    writeRawSave(WORLD_ID, '{"version":1,"day":');
    const error = expectLoadError(() => store.load(WORLD_ID), "invalid-json");
    expect(error.message).toContain(`world "${WORLD_ID}"`);
    expect(error.message).toContain(store.file);
    expect(error.message).toContain("left as it is");
    expect(readRawSave(WORLD_ID)).toBe('{"version":1,"day":');
  });

  it.each([
    ["missing-version", '{"day":3}'],
    ["missing-version", '{"version":"1","day":3}'],
    ["invalid-save", "[1,2,3]"],
    ["invalid-save", '{"version":1,"day":0}'],
  ] as const)("reports %s for %s", (reason, data) => {
    const store = openStore(WORLD_SAVE);
    writeRawSave(WORLD_ID, data);
    expectLoadError(() => store.load(WORLD_ID), reason);
  });

  it("reports a migration that fails, without archiving or changing anything", () => {
    openStore(WORLD_SAVE).save(WORLD_ID, newWorldSave());
    const original = readRawSave(WORLD_ID);
    const broken: SaveFormat<VersionedSave> = {
      migrations: [
        () => {
          throw new Error("oops");
        },
      ],
      validate: (save) => save as unknown as VersionedSave,
    };
    const error = expectLoadError(() => openStore(broken).load(WORLD_ID), "migration-failed");
    expect(error.message).toContain("from version 1 to 2 failed (oops)");
    expect(readRawSave(WORLD_ID)).toBe(original);
  });

  it("reports a save file that isn't a database", () => {
    writeFileSync(path.join(dataDir, SAVE_FILE), "definitely not sqlite ".repeat(100));
    expectLoadError(() => openStore(WORLD_SAVE), "not-a-database");
  });

  it("won't write a save that couldn't be loaded back", () => {
    const store = openStore(WORLD_SAVE);
    store.save(WORLD_ID, onDay(3));
    expect(() => store.save(WORLD_ID, { ...onDay(3), coins: Number.NaN })).toThrow(/wouldn't load back/);
    expect(() => store.save(WORLD_ID, { ...onDay(4), version: 0 })).toThrow(/saves are written as version 1/);
    expect(store.load(WORLD_ID)).toMatchObject({ save: { clock: { day: 3 } } });
  });

  it("keeps the previous save when a write fails partway, and carries on afterwards", () => {
    const store = openStore(WORLD_SAVE);
    store.save(WORLD_ID, onDay(3));

    const saboteur = new DatabaseSync(store.file);
    saboteur.exec("CREATE TRIGGER fail_update BEFORE UPDATE ON saves BEGIN SELECT RAISE(ABORT, 'disk on fire'); END");
    expect(() => store.save(WORLD_ID, onDay(4))).toThrow(/disk on fire/);
    expect(store.load(WORLD_ID)).toMatchObject({ save: { clock: { day: 3 } } });

    saboteur.exec("DROP TRIGGER fail_update");
    saboteur.close();
    store.save(WORLD_ID, onDay(5));
    expect(store.load(WORLD_ID)).toMatchObject({ save: { clock: { day: 5 } } });
  });
});

describe("snapshotSaves", () => {
  it("copies the saves to a new file and checks every world loads", () => {
    const store = openStore(WORLD_SAVE);
    store.save(WORLD_ID, onDay(12));
    const dest = path.join(dataDir, "backup.sqlite");

    const worlds = snapshotSaves(dataDir, dest, WORLD_SAVE);
    expect(worlds).toEqual([{ worldId: WORLD_ID, version: 1, savedAt: expect.any(String) }]);

    // Restoring a backup is putting the copy back as saves.sqlite.
    const restoredDir = path.join(dataDir, "restored");
    mkdirSync(restoredDir);
    copyFileSync(dest, path.join(restoredDir, SAVE_FILE));
    expect(openStore(WORLD_SAVE, restoredDir).load(WORLD_ID)).toMatchObject({ save: { clock: { day: 12 } } });
  });

  it("fails without creating anything when there's no save yet", () => {
    expect(() => snapshotSaves(dataDir, path.join(dataDir, "backup.sqlite"), WORLD_SAVE)).toThrow(/no save database/);
    expect(existsSync(path.join(dataDir, SAVE_FILE))).toBe(false);
  });

  it("fails when a world in the copy won't load", () => {
    openStore(WORLD_SAVE);
    writeRawSave(WORLD_ID, "not json");
    expect(() => snapshotSaves(dataDir, path.join(dataDir, "backup.sqlite"), WORLD_SAVE)).toThrow(SaveLoadError);
  });
});

describe("checkSaveFile", () => {
  it("lists the worlds in a good save database without changing it", () => {
    openStore(WORLD_SAVE).save(WORLD_ID, onDay(4));
    const file = path.join(dataDir, SAVE_FILE);
    const before = readFileSync(file);

    expect(checkSaveFile(file, WORLD_SAVE)).toEqual([{ worldId: WORLD_ID, version: 1, savedAt: expect.any(String) }]);
    expect(readFileSync(file).equals(before)).toBe(true);
  });

  it("accepts a save database with no worlds yet", () => {
    openStore(WORLD_SAVE);
    expect(checkSaveFile(path.join(dataDir, SAVE_FILE), WORLD_SAVE)).toEqual([]);
  });

  it("fails when there's no file", () => {
    expect(() => checkSaveFile(path.join(dataDir, "missing.sqlite"), WORLD_SAVE)).toThrow(/no file/);
  });

  it("fails on a file that isn't a database", () => {
    const file = path.join(dataDir, "notes.sqlite");
    writeFileSync(file, "these are not the saves you're looking for ".repeat(100));
    expectLoadError(() => checkSaveFile(file, WORLD_SAVE), "not-a-database");
  });

  it("fails on a database that isn't a save database", () => {
    const file = path.join(dataDir, "other.sqlite");
    const db = new DatabaseSync(file);
    db.exec("CREATE TABLE crops (name TEXT)");
    db.close();
    const error = expectLoadError(() => checkSaveFile(file, WORLD_SAVE), "not-a-database");
    expect(error.summary).toContain("no saves table");
  });

  it("fails when a world won't load, such as one from a newer server", () => {
    openStore(WORLD_SAVE);
    writeRawSave(WORLD_ID, JSON.stringify({ version: 99, day: 3 }));
    expectLoadError(() => checkSaveFile(path.join(dataDir, SAVE_FILE), WORLD_SAVE), "newer-version");
  });
});

function expectLoadError(action: () => unknown, reason: SaveLoadError["reason"]): SaveLoadError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(SaveLoadError);
    expect((error as SaveLoadError).reason).toBe(reason);
    return error as SaveLoadError;
  }
  throw new Error(`Expected a SaveLoadError (${reason}), but nothing was thrown.`);
}
