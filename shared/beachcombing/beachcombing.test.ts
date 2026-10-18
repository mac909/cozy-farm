import { describe, expect, it } from "vitest";
import { BEACH_FINDS, type BeachFindId } from "../content/beachFinds";
import {
  BEACHCOMBING,
  EMPTY_BEACH,
  findAt,
  pickUp,
  washUpFinds,
  type Beach,
  type BeachFind,
  type TilePos,
} from "./beachcombing";

const SEED = 20261018;

/** A strip of sand `width` tiles wide and `height` tall. */
function sand(width: number, height = 1): TilePos[] {
  const tiles: TilePos[] = [];
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) tiles.push({ col, row });
  return tiles;
}

const BEACH = sand(20, 4);

function keys(tiles: readonly TilePos[]): string[] {
  return tiles.map((t) => `${t.col},${t.row}`);
}

function fullBeach(): Beach {
  return sand(BEACHCOMBING.maxOnBeach).map((t): BeachFind => ({ ...t, findId: "scallop_shell" }));
}

describe("washUpFinds", () => {
  it("scatters a handful of finds on the sand", () => {
    const { beach, washedUp } = washUpFinds({ day: 1, worldSeed: SEED, sandTiles: BEACH, beach: EMPTY_BEACH });
    expect(washedUp.length).toBeGreaterThanOrEqual(BEACHCOMBING.perMorning.min);
    expect(washedUp.length).toBeLessThanOrEqual(BEACHCOMBING.perMorning.max);
    expect(beach).toEqual(washedUp);
    for (const find of washedUp) {
      expect(keys(BEACH)).toContain(`${find.col},${find.row}`);
      expect(Object.hasOwn(BEACH_FINDS, find.findId)).toBe(true);
    }
  });

  it("is the same for the same day and world seed", () => {
    const tide = { day: 4, worldSeed: SEED, sandTiles: BEACH, beach: EMPTY_BEACH };
    expect(washUpFinds(tide)).toEqual(washUpFinds(tide));
  });

  it("changes from day to day, and from world to world", () => {
    const on = (day: number, worldSeed = SEED) =>
      washUpFinds({ day, worldSeed, sandTiles: BEACH, beach: EMPTY_BEACH }).washedUp;
    expect(on(1)).not.toEqual(on(2));
    expect(on(1)).not.toEqual(on(1, SEED + 1));
  });

  it("doesn't care what order the sand tiles come in", () => {
    const tide = { day: 9, worldSeed: SEED, beach: EMPTY_BEACH };
    expect(washUpFinds({ ...tide, sandTiles: [...BEACH].reverse() })).toEqual(
      washUpFinds({ ...tide, sandTiles: BEACH }),
    );
  });

  it("does nothing with no sand tiles", () => {
    expect(washUpFinds({ day: 1, worldSeed: SEED, sandTiles: [], beach: EMPTY_BEACH })).toEqual({
      beach: EMPTY_BEACH,
      washedUp: [],
    });
  });

  it("does nothing when the beach is already full", () => {
    const beach = fullBeach();
    const result = washUpFinds({ day: 2, worldSeed: SEED, sandTiles: BEACH, beach });
    expect(result.washedUp).toEqual([]);
    expect(result.beach).toBe(beach);
  });

  it("only tops a nearly full beach up to the cap, keeping what was there", () => {
    const beach = fullBeach().slice(1);
    for (let day = 1; day <= 30; day++) {
      const result = washUpFinds({ day, worldSeed: SEED, sandTiles: BEACH, beach });
      expect(result.washedUp.length).toBeLessThanOrEqual(1);
      expect(result.beach.length).toBeLessThanOrEqual(BEACHCOMBING.maxOnBeach);
      expect(result.beach.slice(0, beach.length)).toEqual(beach);
    }
  });

  it("never puts a find on a blocked tile or one that already has a find", () => {
    const blocked = sand(20, 2); // the top two rows
    const beach: Beach = [{ col: 3, row: 2, findId: "starfish" }];
    for (let day = 1; day <= 50; day++) {
      const { washedUp } = washUpFinds({ day, worldSeed: SEED, sandTiles: BEACH, blocked, beach });
      for (const find of washedUp) {
        expect(find.row).toBeGreaterThanOrEqual(2);
        expect(`${find.col},${find.row}`).not.toBe("3,2");
      }
    }
  });

  it("never puts two finds on the same tile", () => {
    for (let day = 1; day <= 50; day++) {
      const { washedUp } = washUpFinds({ day, worldSeed: SEED, sandTiles: sand(3), beach: EMPTY_BEACH });
      expect(new Set(keys(washedUp)).size).toBe(washedUp.length);
    }
  });

  it("gives one find, not two, when two want the only free tile", () => {
    const listedTwice = [{ col: 5, row: 5 }, { col: 5, row: 5 }];
    for (let day = 1; day <= 20; day++) {
      const { washedUp } = washUpFinds({ day, worldSeed: SEED, sandTiles: listedTwice, beach: EMPTY_BEACH });
      expect(keys(washedUp)).toEqual(["5,5"]);
    }
  });

  it("skips tiles that aren't whole numbers", () => {
    const odd = [{ col: 1.5, row: 0 }, { col: NaN, row: 0 }, { col: 2, row: Infinity }];
    expect(washUpFinds({ day: 1, worldSeed: SEED, sandTiles: odd, beach: EMPTY_BEACH }).washedUp).toEqual([]);
  });

  it("washes up rarer finds less often", () => {
    const counts = { common: 0, uncommon: 0, rare: 0 };
    for (let day = 1; day <= 1000; day++) {
      for (const find of washUpFinds({ day, worldSeed: SEED, sandTiles: BEACH, beach: EMPTY_BEACH }).washedUp) {
        counts[BEACH_FINDS[find.findId].rarity]++;
      }
    }
    expect(counts.common).toBeGreaterThan(counts.uncommon);
    expect(counts.uncommon).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(0);
  });
});

describe("pickUp", () => {
  const beach: Beach = [
    { col: 1, row: 1, findId: "sea_glass" },
    { col: 2, row: 1, findId: "starfish" },
  ];

  it("takes the find off the beach and says what it was", () => {
    const result = pickUp(beach, 2, 1);
    expect(result).toEqual({ ok: true, beach: [{ col: 1, row: 1, findId: "sea_glass" }], findId: "starfish" });
    expect(beach.length).toBe(2);
  });

  it("finds nothing on an empty tile", () => {
    expect(pickUp(beach, 9, 9)).toEqual({ ok: false, reason: "nothing-here" });
    expect(pickUp(EMPTY_BEACH, 1, 1)).toEqual({ ok: false, reason: "nothing-here" });
  });

  it("can't pick the same find up twice", () => {
    const first = pickUp(beach, 1, 1);
    if (!first.ok) throw new Error("expected a find");
    expect(pickUp(first.beach, 1, 1)).toEqual({ ok: false, reason: "nothing-here" });
  });

  it("frees the tile for a later tide", () => {
    const only: TilePos[] = [{ col: 0, row: 0 }];
    const taken: Beach = [{ col: 0, row: 0, findId: "cowrie_shell" }];
    expect(washUpFinds({ day: 3, worldSeed: SEED, sandTiles: only, beach: taken }).washedUp).toEqual([]);
    const after = pickUp(taken, 0, 0);
    if (!after.ok) throw new Error("expected a find");
    const next = washUpFinds({ day: 3, worldSeed: SEED, sandTiles: only, beach: after.beach });
    expect(next.washedUp.length).toBe(1);
  });
});

describe("findAt", () => {
  it("says what's on a tile", () => {
    const beach: Beach = [{ col: 4, row: 2, findId: "conch_shell" as BeachFindId }];
    expect(findAt(beach, 4, 2)?.findId).toBe("conch_shell");
    expect(findAt(beach, 2, 4)).toBeUndefined();
  });
});
