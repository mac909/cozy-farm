import { FISH, FISH_IDS, bitesAt, isFishingSpot, type FishId, type FishingSpot } from "../content/fish";
import { RARITY_WEIGHTS, type Rarity } from "../content/rarity";
import {
  pickWeighted,
  randomBetween,
  randomInt,
  randomSource,
  type NumberRange,
  type RandomSource,
} from "../random/random";

/**
 * The fishing minigame: cast, wait for a bite, press in time, then hold to reel
 * it in. A miss only ends this cast; there's no bait to lose and no rod to
 * break, so the player just casts again.
 *
 * It's a pure state machine. `cast` starts a line, and `tick` moves it on by
 * some real time and the player's input, returning the new state and what
 * happened (for sounds and animations). The random source's state lives in the
 * fishing state, so the same seed and inputs always play out the same way.
 *
 * Every number here is a first guess, meant to be tuned by playing.
 */
export const FISHING = {
  /** The line flying out before it lands in the water. */
  castMs: 700,
  /** How long after landing something bites, picked at random each cast. */
  biteDelayMs: { min: 2000, max: 6000 },
  /** Little bobs while waiting that aren't a bite yet (pressing for one is too early). Picked at random each cast. */
  nibbles: { min: 0, max: 2 },
  /** No nibble comes this close before the real bite, so the two never blur together. */
  nibbleClearMs: 600,
  /** The reel starts this far along, from 0 (it got away) to 1 (landed). */
  reelStartProgress: 0.3,
} as const;

/** How a fish plays on the line. Livelier for rarer fish. */
export interface ReelFeel {
  /** Time to press after the bite, before the fish swims off. */
  biteWindowMs: number;
  /** Holding (with no tugs) this long takes the reel from 0 to landed. */
  reelMs: number;
  /** Letting go this long takes the reel from landed to 0, where the fish gets away. */
  slipMs: number;
  /**
   * Now and then the fish tugs. Holding through a tug loses a little ground;
   * letting go holds steady. Holding through every tug still lands the fish,
   * just more slowly. null: it never tugs.
   */
  tugs: {
    /** Time between tugs, picked at random each time. */
    gapMs: NumberRange;
    /** How long a tug lasts. */
    lastsMs: number;
    /** Holding through tugs this long takes the reel from landed to 0. */
    slipMs: number;
  } | null;
}

export const REEL_FEEL: Readonly<Record<Rarity, ReelFeel>> = {
  common: { biteWindowMs: 1500, reelMs: 1500, slipMs: 4000, tugs: null },
  uncommon: {
    biteWindowMs: 1300,
    reelMs: 2000,
    slipMs: 3500,
    tugs: { gapMs: { min: 1000, max: 1800 }, lastsMs: 500, slipMs: 5000 },
  },
  rare: {
    biteWindowMs: 1100,
    reelMs: 2500,
    slipMs: 3000,
    tugs: { gapMs: { min: 700, max: 1300 }, lastsMs: 600, slipMs: 4000 },
  },
};

export function reelFeel(fishId: FishId): ReelFeel {
  return REEL_FEEL[FISH[fishId].rarity];
}

/** Fish biting at `spot` at `minute` (game minutes after midnight), in FISH order. */
export function fishAvailable(spot: FishingSpot, minute: number): FishId[] {
  return FISH_IDS.filter((id) => FISH[id].spots.includes(spot) && bitesAt(FISH[id], minute));
}

/** Picks a fish biting at `spot` at `minute`, rarer ones less often. null if nothing is biting. */
export function chooseFish(spot: FishingSpot, minute: number, random: RandomSource): FishId | null {
  const fishId = pickWeighted(random, fishAvailable(spot, minute), (id) => RARITY_WEIGHTS[FISH[id].rarity]);
  return fishId ?? null;
}

/** A length for a caught fish, in whole centimetres. Middling sizes are likeliest, so a big one is worth showing off. */
export function rollSize(fishId: FishId, random: RandomSource): number {
  const { min, max } = FISH[fishId].sizeCm;
  const middling = (random.next() + random.next()) / 2;
  return Math.min(max, Math.floor(min + middling * (max - min + 1)));
}

interface Line {
  readonly spot: FishingSpot;
  /** The fish that will bite, picked when the line was cast. The player doesn't see it until it's caught. */
  readonly fishId: FishId;
  /** The random source's state (see shared/random), so every tick plays out the same way from the same seed. */
  readonly random: number;
  /** Time spent in the current phase, in ms. */
  readonly phaseMs: number;
}

/** The line is flying out. */
export interface CastingState extends Line {
  readonly phase: "casting";
}

/** The bobber is in the water. Pressing now is too early. */
export interface WaitingState extends Line {
  readonly phase: "waiting";
  /** When the fish bites, in ms after the line landed. */
  readonly biteAtMs: number;
  /** When the bobber nibbles before that, in ms after the line landed, earliest first. */
  readonly nibblesAtMs: readonly number[];
}

/** A bite: press within the fish's biteWindowMs to hook it. */
export interface BiteState extends Line {
  readonly phase: "bite";
}

/** Hooked: hold to reel it in, let go when it tugs. */
export interface ReelingState extends Line {
  readonly phase: "reeling";
  /** From 0 (it gets away) to 1 (landed). */
  readonly progress: number;
  readonly tugging: boolean;
  /** Time until the fish next starts or stops tugging. null if it never tugs. */
  readonly untilTugChangeMs: number | null;
}

/** Landed. The cast is over. */
export interface CaughtState {
  readonly phase: "caught";
  readonly spot: FishingSpot;
  readonly fishId: FishId;
  readonly sizeCm: number;
}

export type MissReason = "too-early" | "too-late" | "got-away";

/** Nothing this time. The cast is over; cast again. */
export interface MissedState {
  readonly phase: "missed";
  readonly spot: FishingSpot;
  readonly reason: MissReason;
}

export type FishingState =
  | CastingState
  | WaitingState
  | BiteState
  | ReelingState
  | CaughtState
  | MissedState;

type ActiveState = CastingState | WaitingState | BiteState | ReelingState;

/** What happened during a tick, in order, for the client to show. */
export type FishingEvent =
  | { readonly type: "landed" }
  | { readonly type: "nibble" }
  | { readonly type: "bite" }
  | { readonly type: "hooked" }
  | { readonly type: "tug-start" }
  | { readonly type: "tug-end" }
  | { readonly type: "caught"; readonly fishId: FishId; readonly sizeCm: number }
  | { readonly type: "missed"; readonly reason: MissReason };

/**
 * The player's button (one button, so one thumb works). `pressed`: it went
 * down since the last tick, even if it's already back up. `holding`: it's down now.
 */
export interface FishingInput {
  readonly pressed?: boolean;
  readonly holding?: boolean;
}

export const NO_INPUT: FishingInput = {};

export interface FishingStep {
  state: FishingState;
  events: FishingEvent[];
}

export type CastResult =
  | { ok: true; state: CastingState }
  | { ok: false; reason: "unknown-spot" | "nothing-biting" };

/**
 * Casts a line at `spot` at `minute` (game minutes after midnight). `seed` is
 * any number; the same seed always plays out the same way. The fish is picked
 * now, from what's biting at this spot and time.
 */
export function cast(spot: string, minute: number, seed: number): CastResult {
  if (!isFishingSpot(spot)) return { ok: false, reason: "unknown-spot" };
  const random = randomSource(seed);
  const fishId = chooseFish(spot, minute, random);
  if (fishId === null) return { ok: false, reason: "nothing-biting" };
  return { ok: true, state: { phase: "casting", spot, fishId, random: random.state, phaseMs: 0 } };
}

/** True once the cast is over, caught or missed. Ticking a finished state changes nothing. */
export function isFinished(state: FishingState): state is CaughtState | MissedState {
  return state.phase === "caught" || state.phase === "missed";
}

/** Far more phase changes than one tick ever needs (a whole reel is a few dozen). */
const MAX_STEPS_PER_TICK = 1000;

/**
 * Moves the line on by `dtMs` of real time, then applies the input. Time runs
 * through the phases in order, so one long tick (a phone waking up) can go
 * from waiting past the bite; a press in that same tick lands at its end, and
 * so is too late. Holding counts for the whole tick.
 */
export function tick(state: FishingState, dtMs: number, input: FishingInput): FishingStep {
  if (isFinished(state)) return { state, events: [] };
  const events: FishingEvent[] = [];
  const random = randomSource(state.random);
  const holding = input.holding === true;
  let current: FishingState = state;
  let left = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;

  // A cap on steps, so odd tuning numbers (a tug lasting 0 ms) can never hang the server.
  for (let steps = 0; left > 0 && !isFinished(current) && steps < MAX_STEPS_PER_TICK; steps++) {
    const step = advance(current, left, holding, random, events);
    current = step.state;
    left -= Math.max(0, step.usedMs);
  }
  if (input.pressed === true && !isFinished(current)) current = press(current, random, events);

  // Phases pass the random source along as they go; its final state is saved here.
  return { state: isFinished(current) ? current : { ...current, random: random.state }, events };
}

interface Advanced {
  state: FishingState;
  /** Time used, at most what was given. Less if the phase ended part way. */
  usedMs: number;
}

function advance(
  state: ActiveState,
  ms: number,
  holding: boolean,
  random: RandomSource,
  events: FishingEvent[],
): Advanced {
  switch (state.phase) {
    case "casting":
      return advanceCasting(state, ms, random, events);
    case "waiting":
      return advanceWaiting(state, ms, events);
    case "bite":
      return advanceBite(state, ms, events);
    case "reeling":
      return advanceReeling(state, ms, holding, random, events);
  }
}

function advanceCasting(
  state: CastingState,
  ms: number,
  random: RandomSource,
  events: FishingEvent[],
): Advanced {
  const need = FISHING.castMs - state.phaseMs;
  if (ms < need) return { state: { ...state, phaseMs: state.phaseMs + ms }, usedMs: ms };
  const biteAtMs = randomBetween(random, FISHING.biteDelayMs);
  const nibbleCount = randomInt(random, FISHING.nibbles);
  const latestNibble = biteAtMs - FISHING.nibbleClearMs;
  const nibblesAtMs =
    latestNibble > 0
      ? Array.from({ length: nibbleCount }, () => random.next() * latestNibble).sort((a, b) => a - b)
      : [];
  events.push({ type: "landed" });
  const { spot, fishId } = state;
  return {
    state: { phase: "waiting", spot, fishId, random: random.state, phaseMs: 0, biteAtMs, nibblesAtMs },
    usedMs: need,
  };
}

function advanceWaiting(state: WaitingState, ms: number, events: FishingEvent[]): Advanced {
  const used = Math.min(ms, state.biteAtMs - state.phaseMs);
  const until = state.phaseMs + used;
  for (const at of state.nibblesAtMs) {
    if (at >= state.phaseMs && at < until) events.push({ type: "nibble" });
  }
  if (until < state.biteAtMs) return { state: { ...state, phaseMs: until }, usedMs: used };
  events.push({ type: "bite" });
  const { spot, fishId, random } = state;
  return { state: { phase: "bite", spot, fishId, random, phaseMs: 0 }, usedMs: used };
}

function advanceBite(state: BiteState, ms: number, events: FishingEvent[]): Advanced {
  const window = reelFeel(state.fishId).biteWindowMs;
  const need = window - state.phaseMs;
  if (ms < need) return { state: { ...state, phaseMs: state.phaseMs + ms }, usedMs: ms };
  return { state: miss(state, "too-late", events), usedMs: need };
}

function advanceReeling(
  state: ReelingState,
  ms: number,
  holding: boolean,
  random: RandomSource,
  events: FishingEvent[],
): Advanced {
  const feel = reelFeel(state.fishId);
  const tugs = feel.tugs;
  // A line hooked before the fish's tugs were changed in the data just stops tugging.
  const tugsOn = tugs !== null && state.untilTugChangeMs !== null;
  const untilTugChange = tugsOn ? Math.max(0, state.untilTugChangeMs ?? 0) : Infinity;
  const span = Math.min(ms, untilTugChange);
  const rate = reelRate(feel, holding, tugsOn && state.tugging);

  // Landed or lost part way through this span?
  if (rate > 0 && state.progress + rate * span >= 1) {
    const sizeCm = rollSize(state.fishId, random);
    events.push({ type: "caught", fishId: state.fishId, sizeCm });
    const caught: CaughtState = { phase: "caught", spot: state.spot, fishId: state.fishId, sizeCm };
    return { state: caught, usedMs: (1 - state.progress) / rate };
  }
  if (rate < 0 && state.progress + rate * span <= 0) {
    return { state: miss(state, "got-away", events), usedMs: state.progress / -rate };
  }

  const reeled: ReelingState = {
    ...state,
    phaseMs: state.phaseMs + span,
    progress: state.progress + rate * span,
    tugging: tugsOn && state.tugging,
    untilTugChangeMs: tugsOn ? untilTugChange - span : null,
  };
  if (tugs !== null && reeled.untilTugChangeMs !== null && reeled.untilTugChangeMs <= 0) {
    const tugging = !reeled.tugging;
    events.push({ type: tugging ? "tug-start" : "tug-end" });
    const untilTugChangeMs = tugging ? tugs.lastsMs : randomBetween(random, tugs.gapMs);
    return { state: { ...reeled, tugging, untilTugChangeMs }, usedMs: span };
  }
  return { state: reeled, usedMs: span };
}

/** How fast the reel moves, in progress per ms: up while holding, down while not, and the other way round during a tug. */
function reelRate(feel: ReelFeel, holding: boolean, tugging: boolean): number {
  if (tugging && feel.tugs !== null) return holding ? -1 / feel.tugs.slipMs : 0;
  return holding ? 1 / feel.reelMs : -1 / feel.slipMs;
}

function press(state: ActiveState, random: RandomSource, events: FishingEvent[]): FishingState {
  switch (state.phase) {
    case "waiting":
      return miss(state, "too-early", events);
    case "bite": {
      events.push({ type: "hooked" });
      const tugs = reelFeel(state.fishId).tugs;
      const { spot, fishId } = state;
      return {
        phase: "reeling",
        spot,
        fishId,
        random: random.state,
        phaseMs: 0,
        progress: FISHING.reelStartProgress,
        tugging: false,
        untilTugChangeMs: tugs === null ? null : randomBetween(random, tugs.gapMs),
      };
    }
    default:
      // Casting: the line isn't in yet. Reeling: holding is what counts.
      return state;
  }
}

function miss(state: ActiveState, reason: MissReason, events: FishingEvent[]): MissedState {
  events.push({ type: "missed", reason });
  return { phase: "missed", spot: state.spot, reason };
}
