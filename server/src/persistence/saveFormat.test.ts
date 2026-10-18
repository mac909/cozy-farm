import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEV_DATA_DIR, resolveDataDir } from "./dataDir";
import { type SaveFormat, currentVersion, upgradeSave } from "./saveFormat";
import { WORLD_SAVE, newWorldSave } from "./worldSave";

describe("upgradeSave", () => {
  const steps: string[] = [];
  const format: SaveFormat<{ version: number; log: string[] }> = {
    migrations: [
      (save) => {
        steps.push("1→2");
        return { ...save, log: ["1→2"] };
      },
      (save) => {
        steps.push("2→3");
        return { ...save, log: [...(save.log as string[]), "2→3"] };
      },
    ],
    validate: (save) => save as unknown as { version: number; log: string[] },
  };

  it("runs only the migrations a save needs, in order, stamping each version", () => {
    steps.length = 0;
    expect(upgradeSave('{"version":1}', format, "test")).toEqual({
      save: { version: 3, log: ["1→2", "2→3"] },
      fromVersion: 1,
    });
    expect(steps).toEqual(["1→2", "2→3"]);

    steps.length = 0;
    expect(upgradeSave('{"version":2,"log":[]}', format, "test").save).toEqual({ version: 3, log: ["2→3"] });
    expect(steps).toEqual(["2→3"]);
  });

  it("leaves a current save as it is", () => {
    expect(upgradeSave('{"version":3,"log":[]}', format, "test")).toEqual({
      save: { version: 3, log: [] },
      fromVersion: 3,
    });
  });
});

describe("world save format", () => {
  it("is one version past its last migration", () => {
    expect(newWorldSave().version).toBe(currentVersion(WORLD_SAVE));
    expect(currentVersion(WORLD_SAVE)).toBe(WORLD_SAVE.migrations.length + 1);
  });

  it("accepts a brand-new world", () => {
    expect(WORLD_SAVE.validate({ ...newWorldSave() })).toEqual(newWorldSave());
  });
});

describe("resolveDataDir", () => {
  it("uses DATA_DIR when it's set", () => {
    expect(resolveDataDir({ DATA_DIR: "/app/data", NODE_ENV: "production" })).toBe(path.resolve("/app/data"));
  });

  it("falls back to data-dev at the repo root in dev", () => {
    expect(resolveDataDir({})).toBe(DEV_DATA_DIR);
    // Vitest runs from the repo root.
    expect(DEV_DATA_DIR).toBe(path.resolve("data-dev"));
  });

  it("refuses to guess in production", () => {
    expect(() => resolveDataDir({ NODE_ENV: "production" })).toThrow(/DATA_DIR must be set/);
    expect(() => resolveDataDir({ NODE_ENV: "production", DATA_DIR: "  " })).toThrow(/DATA_DIR must be set/);
  });
});
