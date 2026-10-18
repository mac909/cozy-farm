import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { currentVersion, upgradeSave } from "./saveFormat";
import { SAVE_FILE, SaveStore } from "./saveStore";
import { WORLD_ID, WORLD_SAVE, worldFromSave } from "./worldSave";
import { EMPTY_PROGRESS } from "../../../shared/progress/farmerProgress";

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

    it("gets a fishing rod for each farmer, an empty beach and an empty book", () => {
      const loaded = world();
      expect(loaded.farmers[PIP].bag[5]).toEqual({ itemId: "fishing_rod", count: 1 });
      expect(loaded.farmers[JUNO].bag[3]).toEqual({ itemId: "fishing_rod", count: 1 });
      expect(loaded.beach).toEqual({ day: 0, finds: [] });
      expect(loaded.book).toEqual({ fish: {}, finds: {}, bugs: {} });
      expect(loaded.lastMorning?.washedUp).toEqual([]);
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

    it("puts a fishing rod in each farmer's first empty slot, and keeps everything else in the bags", () => {
      const v2 = JSON.parse(readFixture("world-v2.json"));
      const loaded = world();
      for (const [id, slot] of [[PIP, 5], [JUNO, 3]] as const) {
        const bag = loaded.farmers[id].bag;
        expect(bag[slot]).toEqual({ itemId: "fishing_rod", count: 1 });
        expect(bag.filter((_, i) => i !== slot)).toEqual(v2.farmers[id].bag.filter((_: unknown, i: number) => i !== slot));
      }
    });

    it("gets the same world seed every time it's upgraded, an empty beach and an empty book", () => {
      expect(world().worldSeed).toBe(world().worldSeed);
      expect(world().worldSeed).toBeGreaterThan(0);
      expect(world().beach).toEqual({ day: 0, finds: [] });
      expect(world().book).toEqual({ fish: {}, finds: {}, bugs: {} });
    });

    it("doesn't give a second rod, or squeeze one into a full bag", () => {
      const v2 = JSON.parse(readFixture("world-v2.json"));
      v2.farmers[PIP].bag = v2.farmers[PIP].bag.map((slot: unknown) => slot ?? { itemId: "radish", count: 1 });
      v2.farmers[JUNO].bag[10] = { itemId: "fishing_rod", count: 1 };
      const { save } = upgradeSave(JSON.stringify(v2), WORLD_SAVE, "edited v2");
      expect(save.farmers[PIP].bag.some((slot) => slot?.itemId === "fishing_rod")).toBe(false);
      expect(save.farmers[JUNO].bag.filter((slot) => slot?.itemId === "fishing_rod")).toHaveLength(1);
    });
  });

  describe("version 3 (Milestone 5: the beach, fishing, bugs and the collection book)", () => {
    const world = () => worldFromSave(upgradeSave(readFixture("world-v3.json"), WORLD_SAVE, "world-v3.json").save);

    it("keeps what's on the beach and the day of the last tide", () => {
      const loaded = world();
      expect(loaded.beach.day).toBe(9);
      expect(loaded.beach.finds).toEqual([
        { findId: "scallop_shell", col: 20, row: 23 },
        { findId: "sea_glass", col: 12, row: 24 },
        { findId: "conch_shell", col: 33, row: 22 },
      ]);
      expect(loaded.lastMorning?.washedUp).toEqual(["scallop_shell", "sea_glass", "conch_shell"]);
    });

    it("keeps the collection book, records and all", () => {
      const loaded = world();
      expect(loaded.book.fish.sea_bream).toEqual({ caught: 2, firstDay: 8, firstBy: "Juno 🌻", biggestCm: 41, biggestBy: "Pip" });
      expect(loaded.book.finds.starfish?.firstBy).toBe("Juno 🌻");
      expect(loaded.book.bugs.firefly?.caught).toBe(2);
    });

    it("keeps fish, finds and bugs in the bags and the crate", () => {
      const loaded = world();
      expect(loaded.farmers[PIP].bag[9]).toEqual({ itemId: "sea_bream", count: 2 });
      expect(loaded.farmers[JUNO].bag[9]).toEqual({ itemId: "firefly", count: 2 });
      expect(loaded.crate).toContainEqual({ itemId: "sardine", count: 4 });
      expect(loaded.worldSeed).toBe(328151057);
    });
  });
});

describe("every save from before Milestone 6", () => {
  for (const name of ["world-v1.json", "world-v2.json", "world-v3.json"]) {
    it(`${name} comes through with an empty village, nothing lying about, and an empty "built" on the last morning`, () => {
      const before = JSON.parse(readFixture(name));
      const loaded = worldFromSave(upgradeSave(readFixture(name), WORLD_SAVE, name).save);
      expect(loaded.village).toEqual({ keeperDay: 0, projects: {} });
      expect(loaded.forage).toEqual({ day: 0, items: [] });
      expect(loaded.lastMorning?.built).toEqual([]);
      expect(loaded.lastMorning?.foraged).toEqual([]);
      // And everything that was there is as it was.
      expect(loaded.clock).toEqual(before.clock);
      expect(loaded.coins).toBe(before.coins);
      expect(loaded.crate).toEqual(before.crate);
      expect(Object.keys(loaded.farm)).toHaveLength(before.farm.length);
      expect(Object.keys(loaded.farmers)).toEqual(Object.keys(before.farmers));
      for (const id of Object.keys(before.farmers)) {
        const was = before.farmers[id].bag as unknown[];
        const now = loaded.farmers[id].bag;
        // Slot for slot, but for the fishing rod Milestone 5 put in an empty one.
        now.forEach((slot, i) => {
          if (slot?.itemId === "fishing_rod" && was[i] === null) return;
          expect(slot, `${id} slot ${i}`).toEqual(was[i]);
        });
      }
      if (before.houses) expect(loaded.houses).toEqual(before.houses);
      if (before.decorations) expect(loaded.decorations).toEqual(before.decorations);
      if (before.beach) expect(loaded.beach).toEqual(before.beach);
      if (before.book) expect(loaded.book).toEqual(before.book);
    });
  }
});

describe("version 4 (Milestone 6: Marlow, the board and the lighthouse)", () => {
  const world = () => worldFromSave(upgradeSave(readFixture("world-v4.json"), WORLD_SAVE, "world-v4.json").save);

  it("keeps when Marlow came and how far the lighthouse has got, helpers and all", () => {
    const loaded = world();
    expect(loaded.village.keeperDay).toBe(10);
    expect(loaded.village.projects.lighthouse).toEqual({
      gathered: 1,
      built: 1,
      given: { driftwood: 7, branch: 8, "any:fish": 2, coins: 150 },
      helpers: [JUNO, PIP],
      doneDay: null,
    });
  });

  it("keeps the driftwood and branches lying about, and the morning that built the path", () => {
    const loaded = world();
    expect(loaded.forage.day).toBe(12);
    expect(loaded.forage.items).toContainEqual({ itemId: "driftwood", col: 15, row: 23 });
    expect(loaded.forage.items.filter((i) => i.itemId === "branch")).toHaveLength(2);
    expect(loaded.lastMorning?.built).toEqual([{ project: "lighthouse", step: 0 }]);
    expect(loaded.farmers[PIP].bag[6]).toEqual({ itemId: "driftwood", count: 3 });
  });
});

describe("every save from before Milestone 7", () => {
  for (const name of ["world-v1.json", "world-v2.json", "world-v3.json", "world-v4.json"]) {
    it(`${name} comes through with every farmer at level 1, nothing counted and no badges, and everything else as it was`, () => {
      const before = worldFromSave(upgradeSave(readFixture(name), WORLD_SAVE, name).save);
      for (const farmer of Object.values(before.farmers)) expect(farmer.progress).toEqual(EMPTY_PROGRESS);
      // Nothing on the farm is marked as grown back: the first pick of an old strawberry counts in full.
      for (const tile of Object.values(before.farm)) expect("regrown" in tile).toBe(false);
      const raw = JSON.parse(readFixture(name));
      for (const id of Object.keys(raw.farmers)) {
        expect(before.farmers[id].name).toBe(raw.farmers[id].name);
        expect(before.farmers[id].bag.filter((slot) => slot && slot.itemId !== "fishing_rod")).toEqual(
          (raw.farmers[id].bag as unknown[]).filter((slot) => slot && (slot as { itemId: string }).itemId !== "fishing_rod"),
        );
      }
      if (raw.village) expect(before.village).toEqual(raw.village);
    });
  }
});

describe("version 5 (Milestone 7: skills, badges and porches)", () => {
  const world = () => worldFromSave(upgradeSave(readFixture("world-v5.json"), WORLD_SAVE, "world-v5.json").save);

  it("keeps each farmer's skills, counts, kinds, badges and gifts", () => {
    const loaded = world();
    expect(loaded.farmers[PIP].progress.xp).toEqual({ farming: 212, fishing: 96, foraging: 41 });
    expect(loaded.farmers[PIP].progress.badges.helping_hand).toBe(14);
    expect(loaded.farmers[PIP].progress.gifts).toEqual(["straw_hat"]);
    expect(loaded.farmers[JUNO].progress.stats).toMatchObject({ fish: 44, nightFish: 3, sleepovers: 1 });
    expect(loaded.farmers[JUNO].progress.kinds).toContain("lanternfish");
    expect(loaded.farmers[JUNO].progress.today).toEqual({ day: 16, xp: { farming: 0, fishing: 21, foraging: 0 } });
  });

  it("keeps both porches, one built and one half given, and the morning that built it", () => {
    const loaded = world();
    expect(loaded.village.projects["house2:porch"]).toMatchObject({ gathered: 1, built: 1, doneDay: 17 });
    expect(loaded.village.projects["house1:porch"]).toEqual({
      gathered: 0,
      built: 0,
      given: { driftwood: 7, branch: 8, coins: 900 },
      helpers: [JUNO],
      doneDay: null,
    });
    expect(loaded.lastMorning?.built).toEqual([{ project: "house2:porch", step: 0 }]);
  });

  it("keeps a regrown strawberry, a golden radish and the gifts", () => {
    const loaded = world();
    expect(loaded.farm["9,6"]).toEqual({ kind: "planted", watered: false, cropId: "strawberry", stage: 2, daysInStage: 0, regrown: true });
    expect(loaded.farmers[PIP].bag[13]).toEqual({ itemId: "golden_radish", count: 1 });
    expect(loaded.farmers[PIP].bag[12]).toEqual({ itemId: "straw_hat", count: 1 });
    expect(loaded.houses.house2.furniture).toContainEqual({ itemId: "mounted_fish", col: 4, row: 0, turn: 0 });
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
