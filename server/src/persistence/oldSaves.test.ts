import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { currentVersion, upgradeSave } from "./saveFormat";
import { SAVE_FILE, SaveStore } from "./saveStore";
import { WORLD_ID, WORLD_SAVE, worldFromSave } from "./worldSave";

/**
 * Every save shape that has ever reached the real farm, kept as a fixture in fixtures/ and loaded
 * at today's version. Each new save version adds its own world-v<N>.json, so old saves stay tested
 * forever. Never edit a fixture once it's committed: it stands for saves already out there.
 */

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

const fixtureFiles = fs
  .readdirSync(FIXTURES)
  .filter((name) => /^world-v\d+\.json$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

const readFixture = (name: string) => fs.readFileSync(path.join(FIXTURES, name), "utf8");

const PIP = "3f2c8a1e-6b4d-4c7a-9e21-5d8f0a6b7c31";
const JUNO = "b71e09d4-2a5f-4e83-8c6d-0f4a9b2e1d57";

describe("old saves", () => {
  it("has a fixture for every save version up to today's", () => {
    expect(fixtureFiles).toEqual(Array.from({ length: currentVersion(WORLD_SAVE) }, (_, i) => `world-v${i + 1}.json`));
  });

  for (const name of fixtureFiles) {
    it(`${name} loads at today's version`, () => {
      const { save, fromVersion } = upgradeSave(readFixture(name), WORLD_SAVE, name);
      expect(fromVersion).toBe(Number(name.match(/\d+/)![0]));
      expect(save.version).toBe(currentVersion(WORLD_SAVE));
      // The upgraded save is one the game would write and read back the same.
      expect(WORLD_SAVE.validate(JSON.parse(JSON.stringify(save)))).toEqual(save);
    });
  }

  describe("version 1 (Milestone 2, the first on the real farm)", () => {
    const world = () => worldFromSave(upgradeSave(readFixture("world-v1.json"), WORLD_SAVE, "world-v1.json").save);

    it("keeps the clock, the coins, the crate and the last morning", () => {
      const loaded = world();
      expect(loaded.clock).toEqual({ day: 6, minute: 1012.5 });
      expect(loaded.coins).toBe(735);
      expect(loaded.crate).toEqual([
        { itemId: "radish", count: 6 },
        { itemId: "strawberry", count: 2 },
        { itemId: "carrot_seeds", count: 1 },
      ]);
      expect(loaded.lastMorning?.sale.total).toBe(260);
    });

    it("keeps every dug tile and crop", () => {
      const loaded = world();
      expect(Object.keys(loaded.farm)).toHaveLength(8);
      expect(loaded.farm["7,5"]).toEqual({ kind: "planted", watered: false, cropId: "radish", stage: 3, daysInStage: 0 });
      expect(loaded.farm["6,5"]).toEqual({ kind: "tilled", watered: true });
    });

    it("keeps both farmers with their names, characters and bags", () => {
      const loaded = world();
      expect(Object.keys(loaded.farmers)).toEqual([PIP, JUNO]);
      expect(loaded.farmers[PIP]).toMatchObject({ name: "Pip", character: "woman" });
      expect(loaded.farmers[JUNO]).toMatchObject({ name: "Juno 🌻", character: "boy" });
      expect(loaded.farmers[PIP].bag[2]).toEqual({ itemId: "radish_seeds", count: 7 });
      expect(loaded.farmers[JUNO].bag).toHaveLength(24);
    });

    it("gets every cottage empty, ready to move into, and no decorations yet", () => {
      const loaded = world();
      expect(loaded.houses).toEqual({});
      expect(loaded.decorations).toEqual([]);
    });
  });

  describe("version 2 (Milestone 4: houses and decorations)", () => {
    const world = () => worldFromSave(upgradeSave(readFixture("world-v2.json"), WORLD_SAVE, "world-v2.json").save);

    it("keeps who lives where and what's in each house", () => {
      const loaded = world();
      expect(loaded.houses.house1.owner).toBe(PIP);
      expect(loaded.houses.house1.furniture).toContainEqual({ itemId: "red_bed", col: 0, row: 0, turn: 0 });
      expect(loaded.houses.house2.owner).toBe(JUNO);
      expect(loaded.houses.house2.furniture.some((piece) => piece.itemId === "cream_rug" && piece.turn === 1)).toBe(true);
    });

    it("keeps the decorations on the farm", () => {
      const loaded = world();
      expect(loaded.decorations).toContainEqual({ itemId: "fence", col: 23, row: 7, turn: 2 });
      expect(loaded.decorations.length).toBe(6);
    });
  });
});

describe("old saves in the save database", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  for (const name of fixtureFiles) {
    it(`${name} upgrades on load, keeping the original in the archive`, () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cozy-farm-fixture-"));
      dirs.push(dir);
      const store = new SaveStore(dir, WORLD_SAVE);
      try {
        // Stored exactly as an older server wrote it.
        const db = new DatabaseSync(path.join(dir, SAVE_FILE));
        db.prepare("INSERT INTO saves (world_id, data, saved_at) VALUES (?, ?, ?)").run(WORLD_ID, readFixture(name), "2026-10-18T00:00:00.000Z");
        db.close();
        const loaded = store.load(WORLD_ID);
        expect(loaded.status).toBe("loaded");
        if (loaded.status !== "loaded") return;
        expect(loaded.save.version).toBe(currentVersion(WORLD_SAVE));
        const version = Number(name.match(/\d+/)![0]);
        expect(loaded.migratedFrom).toBe(version === currentVersion(WORLD_SAVE) ? undefined : version);
        // The upgraded world saves and loads again as it is.
        store.save(WORLD_ID, loaded.save);
        const again = store.load(WORLD_ID);
        expect(again.status === "loaded" && again.save).toEqual(loaded.save);
      } finally {
        store.close();
      }
    });
  }
});
