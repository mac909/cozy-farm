import { describe, expect, it } from "vitest";
import {
  mixSeed,
  nextRandom,
  pickWeighted,
  randomBetween,
  randomInt,
  randomSource,
  shuffled,
} from "./random";

function draws(seed: number, n: number): number[] {
  const random = randomSource(seed);
  return Array.from({ length: n }, () => random.next());
}

describe("randomSource", () => {
  it("gives the same numbers from the same seed", () => {
    expect(draws(42, 20)).toEqual(draws(42, 20));
  });

  it("gives different numbers from different seeds", () => {
    expect(draws(1, 5)).not.toEqual(draws(2, 5));
  });

  it("stays between 0 and 1", () => {
    for (const value of draws(7, 2000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("carries on from a stored state", () => {
    const random = randomSource(99);
    random.next();
    random.next();
    const resumed = randomSource(random.state);
    expect(resumed.next()).toBe(random.next());
  });

  it("matches stepping by hand with nextRandom", () => {
    const step = nextRandom(5);
    const random = randomSource(5);
    expect(random.next()).toBe(step.value);
    expect(random.state).toBe(step.state);
  });

  it("copes with seeds that aren't whole 32-bit numbers", () => {
    for (const seed of [-1, 2 ** 40 + 3, 1.5, NaN]) {
      const value = randomSource(seed).next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("mixSeed", () => {
  it("is the same for the same parts, and different when they change or swap", () => {
    expect(mixSeed(123, 4)).toBe(mixSeed(123, 4));
    expect(mixSeed(123, 4)).not.toBe(mixSeed(123, 5));
    expect(mixSeed(1, 2)).not.toBe(mixSeed(2, 1));
  });
});

describe("randomBetween and randomInt", () => {
  it("stay in range, and randomInt reaches both ends", () => {
    const random = randomSource(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const float = randomBetween(random, { min: 2, max: 5 });
      expect(float).toBeGreaterThanOrEqual(2);
      expect(float).toBeLessThan(5);
      const int = randomInt(random, { min: 1, max: 3 });
      expect(Number.isInteger(int)).toBe(true);
      seen.add(int);
    }
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it("give the one value when min and max are equal", () => {
    expect(randomBetween(randomSource(1), { min: 4, max: 4 })).toBe(4);
    expect(randomInt(randomSource(1), { min: 4, max: 4 })).toBe(4);
  });
});

describe("pickWeighted", () => {
  it("picks heavier items more often", () => {
    const random = randomSource(11);
    const counts = { heavy: 0, light: 0 };
    for (let i = 0; i < 2000; i++) {
      const pick = pickWeighted(random, ["heavy", "light"] as const, (item) => (item === "heavy" ? 9 : 1));
      counts[pick!]++;
    }
    expect(counts.heavy).toBeGreaterThan(counts.light * 5);
    expect(counts.light).toBeGreaterThan(0);
  });

  it("never picks items weighing 0 or less, or broken weights", () => {
    const random = randomSource(12);
    const weights: Record<string, number> = { a: 0, b: -3, c: NaN, d: 1 };
    for (let i = 0; i < 200; i++) {
      expect(pickWeighted(random, Object.keys(weights), (k) => weights[k])).toBe("d");
    }
  });

  it("returns undefined when there's nothing to pick", () => {
    expect(pickWeighted(randomSource(1), [], () => 1)).toBeUndefined();
    expect(pickWeighted(randomSource(1), ["a"], () => 0)).toBeUndefined();
  });
});

describe("shuffled", () => {
  it("keeps every item and leaves the original alone", () => {
    const items = [1, 2, 3, 4, 5, 6];
    const out = shuffled(randomSource(8), items);
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("shuffles the same way from the same seed", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g"];
    expect(shuffled(randomSource(5), items)).toEqual(shuffled(randomSource(5), items));
  });
});
