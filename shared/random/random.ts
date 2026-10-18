/**
 * Seeded randomness for game rules. The same seed always gives the same
 * numbers, so tests are repeatable and the server can save a random source
 * mid-way (its state is one whole number) and carry on later.
 *
 * The generator is mulberry32: tiny, fast, and plenty random for a game. It's
 * not for anything secret.
 */

/** A range of numbers, `min` to `max`. */
export interface NumberRange {
  readonly min: number;
  readonly max: number;
}

/** A stream of random numbers from a seed. */
export interface RandomSource {
  /** A number from 0 (included) to 1 (excluded). */
  next(): number;
  /** Where the stream is now. Store it and pass it to randomSource to carry on from here. */
  readonly state: number;
}

/** One step of the generator: a number from 0 to 1, and the state to step from next. */
export function nextRandom(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(next ^ (next >>> 15), next | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: next };
}

/** A random source starting from `seed` (any number; only its whole 32-bit part counts). */
export function randomSource(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    next() {
      const step = nextRandom(state);
      state = step.state;
      return step.value;
    },
    get state() {
      return state;
    },
  };
}

/**
 * Mixes several numbers into one seed, for example a world seed and a day
 * number. Nearby inputs give unrelated seeds, and the order matters.
 */
export function mixSeed(...parts: readonly number[]): number {
  let hash = 0x9e3779b9;
  for (const part of parts) {
    hash = Math.imul(hash ^ (part >>> 0), 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
  }
  return hash >>> 0;
}

/** A number from `min` (included) to `max` (excluded, unless they're equal). */
export function randomBetween(random: RandomSource, { min, max }: NumberRange): number {
  return min + random.next() * (max - min);
}

/** A whole number from `min` to `max`, both included. */
export function randomInt(random: RandomSource, { min, max }: NumberRange): number {
  return min + Math.floor(random.next() * (max - min + 1));
}

/**
 * Picks one item, each as likely as its weight compared with the others.
 * Items weighing 0 or less are never picked. Returns undefined if nothing can be.
 */
export function pickWeighted<T>(
  random: RandomSource,
  items: readonly T[],
  weightOf: (item: T) => number,
): T | undefined {
  const weights = items.map((item) => {
    const weight = weightOf(item);
    return weight > 0 && Number.isFinite(weight) ? weight : 0;
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (!(total > 0)) return undefined;
  let roll = random.next() * total;
  let last = -1;
  for (let i = 0; i < items.length; i++) {
    if (weights[i] === 0) continue;
    roll -= weights[i];
    if (roll < 0) return items[i];
    last = i;
  }
  // Rounding can leave a sliver at the very end; it belongs to the last item that can be picked.
  return items[last];
}

/** A shuffled copy of `items` (Fisher–Yates). */
export function shuffled<T>(random: RandomSource, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
