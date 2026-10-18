import { describe, expect, it } from "vitest";
import { FISH, FISH_IDS, type FishId } from "../content/fish";
import { randomSource } from "../random/random";
import {
  FISHING,
  NO_INPUT,
  cast,
  chooseFish,
  fishAvailable,
  isFinished,
  reelFeel,
  rollSize,
  tick,
  type BiteState,
  type CastingState,
  type FishingEvent,
  type FishingInput,
  type FishingState,
  type ReelingState,
  type WaitingState,
} from "./fishing";

const NOON = 12 * 60;
const TEN_PM = 22 * 60;
const HOLD = { holding: true };
const PRESS = { pressed: true, holding: true };

function started(spot: string, minute: number, seed: number): CastingState {
  const result = cast(spot, minute, seed);
  if (!result.ok) throw new Error(`expected a cast, got "${result.reason}"`);
  return result.state;
}

/** The first seed whose cast hooks `fishId`, so tests can pick their fish. */
function castFor(fishId: FishId, spot: string, minute: number): FishingState {
  for (let seed = 1; seed < 10_000; seed++) {
    const result = cast(spot, minute, seed);
    if (result.ok && result.state.fishId === fishId) return result.state;
  }
  throw new Error(`no seed casts ${fishId}`);
}

function types(events: readonly FishingEvent[]): string[] {
  return events.map((e) => e.type);
}

/** Ticks in steps of `stepMs` until the state reaches `phase`, collecting events. */
function runUntil(state: FishingState, phase: FishingState["phase"], stepMs = 50) {
  const events: FishingEvent[] = [];
  for (let i = 0; i < 10_000 && state.phase !== phase; i++) {
    const step = tick(state, stepMs, NO_INPUT);
    state = step.state;
    events.push(...step.events);
  }
  if (state.phase !== phase) throw new Error(`never reached ${phase}, stuck at ${state.phase}`);
  return { state, events };
}

/** Holds the button in steps of `stepMs` until the cast is over. */
function reel(state: FishingState, input: FishingInput = HOLD, stepMs = 50) {
  const events: FishingEvent[] = [];
  let ms = 0;
  for (let i = 0; i < 10_000 && !isFinished(state); i++) {
    const step = tick(state, stepMs, input);
    state = step.state;
    events.push(...step.events);
    ms += stepMs;
  }
  return { state, events, ms };
}

function hooked(spot: string, minute: number, seed: number): FishingState {
  const { state } = runUntil(started(spot, minute, seed), "bite");
  const step = tick(state, 0, PRESS);
  expect(types(step.events)).toEqual(["hooked"]);
  return step.state;
}

describe("tuning", () => {
  it("uses positive times, so every phase moves on", () => {
    expect(FISHING.castMs).toBeGreaterThan(0);
    expect(FISHING.biteDelayMs.min).toBeGreaterThan(0);
    expect(FISHING.biteDelayMs.max).toBeGreaterThanOrEqual(FISHING.biteDelayMs.min);
    expect(FISHING.reelStartProgress).toBeGreaterThan(0);
    expect(FISHING.reelStartProgress).toBeLessThan(1);
    for (const id of FISH_IDS) {
      const feel = reelFeel(id);
      expect(feel.biteWindowMs).toBeGreaterThan(0);
      expect(feel.reelMs).toBeGreaterThan(0);
      expect(feel.slipMs).toBeGreaterThan(0);
      if (feel.tugs === null) continue;
      expect(feel.tugs.gapMs.min).toBeGreaterThan(0);
      expect(feel.tugs.lastsMs).toBeGreaterThan(0);
      expect(feel.tugs.slipMs).toBeGreaterThan(0);
    }
  });

  it("is forgiving: holding through a tug right after the hook never loses the fish", () => {
    for (const id of FISH_IDS) {
      const tugs = reelFeel(id).tugs;
      if (tugs !== null) expect(tugs.lastsMs / tugs.slipMs).toBeLessThan(FISHING.reelStartProgress);
    }
  });

  it("is forgiving: holding through every tug still gains ground", () => {
    for (const id of FISH_IDS) {
      const feel = reelFeel(id);
      if (feel.tugs === null) continue;
      const gained = feel.tugs.gapMs.min / feel.reelMs;
      const lost = feel.tugs.lastsMs / feel.tugs.slipMs;
      expect(gained).toBeGreaterThan(lost);
    }
  });
});

describe("cast", () => {
  it("starts a line with a fish that's biting there now", () => {
    const state = started("dock", NOON, 1);
    expect(state.phase).toBe("casting");
    expect(fishAvailable("dock", NOON)).toContain(state.fishId);
  });

  it("refuses spots that don't exist", () => {
    expect(cast("pond", NOON, 1)).toEqual({ ok: false, reason: "unknown-spot" });
  });

  it("says when nothing is biting (outside the day, or a broken time)", () => {
    expect(cast("dock", 3 * 60, 1)).toEqual({ ok: false, reason: "nothing-biting" });
    expect(cast("dock", NaN, 1)).toEqual({ ok: false, reason: "nothing-biting" });
  });
});

describe("choosing a fish", () => {
  it("only offers fish from that spot", () => {
    for (const id of fishAvailable("shore", NOON)) expect(FISH[id].spots).toContain("shore");
    expect(fishAvailable("shore", NOON)).not.toContain("mackerel");
  });

  it("never offers a night fish at noon, but does at night", () => {
    expect(fishAvailable("deep", NOON)).not.toContain("moonfish");
    expect(fishAvailable("deep", TEN_PM)).toContain("moonfish");

    const random = randomSource(1);
    const atNoon = new Set(Array.from({ length: 500 }, () => chooseFish("deep", NOON, random)));
    expect(atNoon.has("moonfish")).toBe(false);
    const atNight = new Set(Array.from({ length: 500 }, () => chooseFish("deep", TEN_PM, random)));
    expect(atNight.has("moonfish")).toBe(true);
  });

  it("picks common fish more often than rare ones", () => {
    const random = randomSource(2);
    const counts = new Map<FishId | null, number>();
    for (let i = 0; i < 3000; i++) {
      const id = chooseFish("deep", 7 * 60, random); // mackerel (common), sea bass, tuna (rare)
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    expect(counts.get("mackerel")!).toBeGreaterThan(counts.get("sea_bass")!);
    expect(counts.get("sea_bass")!).toBeGreaterThan(counts.get("tuna")!);
    expect(counts.get("tuna")!).toBeGreaterThan(0);
  });

  it("returns null when nothing is biting", () => {
    expect(chooseFish("deep", 2 * 60, randomSource(1))).toBeNull();
  });
});

describe("a whole cast", () => {
  it("lands, nibbles, bites, hooks, and reels in a fish", () => {
    const { state: biting, events: waitEvents } = runUntil(started("dock", NOON, 7), "bite");
    expect(waitEvents[0].type).toBe("landed");
    expect(waitEvents.at(-1)!.type).toBe("bite");
    const nibbles = waitEvents.filter((e) => e.type === "nibble").length;
    expect(nibbles).toBeGreaterThanOrEqual(FISHING.nibbles.min);
    expect(nibbles).toBeLessThanOrEqual(FISHING.nibbles.max);

    const hook = tick(biting, 100, PRESS);
    expect(types(hook.events)).toEqual(["hooked"]);
    const { state, events } = reel(hook.state);
    expect(state.phase).toBe("caught");
    const caught = events.at(-1)!;
    if (caught.type !== "caught" || state.phase !== "caught") throw new Error("expected a catch");
    expect(caught.fishId).toBe((biting as BiteState).fishId);
    expect(caught.sizeCm).toBe(state.sizeCm);
    const { min, max } = FISH[state.fishId].sizeCm;
    expect(state.sizeCm).toBeGreaterThanOrEqual(min);
    expect(state.sizeCm).toBeLessThanOrEqual(max);
  });

  it("plays out the same way from the same seed", () => {
    const play = () => {
      const { state, events } = runUntil(started("deep", TEN_PM, 31), "bite", 33);
      const hook = tick(state, 0, PRESS);
      const done = reel(hook.state, HOLD, 33);
      return { events: [...events, ...hook.events, ...done.events], state: done.state };
    };
    expect(play()).toEqual(play());
  });

  it("bites after a delay within the tuning range", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const landed = tick(started("shore", NOON, seed), FISHING.castMs, NO_INPUT).state as WaitingState;
      expect(landed.phase).toBe("waiting");
      expect(landed.biteAtMs).toBeGreaterThanOrEqual(FISHING.biteDelayMs.min);
      expect(landed.biteAtMs).toBeLessThan(FISHING.biteDelayMs.max);
      for (const at of landed.nibblesAtMs) expect(at).toBeLessThanOrEqual(landed.biteAtMs - FISHING.nibbleClearMs);
    }
  });

  it("gets through every phase in one long tick (a phone waking up)", () => {
    const step = tick(started("dock", NOON, 3), 60_000, NO_INPUT);
    const seen = types(step.events);
    expect(seen[0]).toBe("landed");
    expect(seen.slice(-2)).toEqual(["bite", "missed"]);
    expect(step.state).toMatchObject({ phase: "missed", reason: "too-late" });
  });

  it("ignores presses while the line is still flying out", () => {
    const step = tick(started("dock", NOON, 3), 100, PRESS);
    expect(step.state.phase).toBe("casting");
    expect(step.events).toEqual([]);
  });

  it("ignores zero, negative, and broken time steps", () => {
    const state = started("dock", NOON, 3);
    for (const dt of [0, -100, NaN, Infinity]) {
      expect(tick(state, dt, NO_INPUT)).toEqual({ state, events: [] });
    }
  });
});

describe("misses (just cast again)", () => {
  it("is too early to press before the bite, even on a nibble", () => {
    const waiting = tick(started("dock", NOON, 5), FISHING.castMs, NO_INPUT).state;
    expect(waiting.phase).toBe("waiting");
    const step = tick(waiting, 10, PRESS);
    expect(step.state).toEqual({ phase: "missed", spot: "dock", reason: "too-early" });
    expect(step.events).toEqual([{ type: "missed", reason: "too-early" }]);
  });

  it("is too late to press once the bite window has passed", () => {
    const { state } = runUntil(started("dock", NOON, 5), "bite");
    const biting = state as BiteState;
    // The tick that brought the bite may already have used a little of its window.
    const windowLeft = reelFeel(biting.fishId).biteWindowMs - biting.phaseMs;

    const late = tick(biting, windowLeft, PRESS);
    expect(late.state).toMatchObject({ phase: "missed", reason: "too-late" });
    expect(late.events).toEqual([{ type: "missed", reason: "too-late" }]);

    const justInTime = tick(biting, windowLeft - 1, PRESS);
    expect(justInTime.state.phase).toBe("reeling");
  });

  it("is too late across several small ticks too", () => {
    const { state: biting } = runUntil(started("shore", NOON, 9), "bite");
    const { state } = runUntil(biting, "missed", 100);
    expect(state).toMatchObject({ phase: "missed", reason: "too-late" });
    expect(tick(state, 100, PRESS)).toEqual({ state, events: [] });
  });

  it("gets away if you hook it and never reel", () => {
    const line = hooked("dock", NOON, 2);
    const { state, events, ms } = reel(line, NO_INPUT);
    expect(state).toMatchObject({ phase: "missed", reason: "got-away" });
    expect(events.at(-1)).toEqual({ type: "missed", reason: "got-away" });
    const feel = reelFeel((line as ReelingState).fishId);
    expect(ms).toBeGreaterThanOrEqual(FISHING.reelStartProgress * feel.slipMs);
  });
});

describe("reeling", () => {
  const reelingRare = (overrides: Partial<ReelingState> = {}): ReelingState => ({
    phase: "reeling",
    spot: "deep",
    fishId: "moonfish",
    random: 1,
    phaseMs: 0,
    progress: FISHING.reelStartProgress,
    tugging: false,
    untilTugChangeMs: 400,
    ...overrides,
  });

  it("lands a common fish after holding for its reel time", () => {
    const line = castFor("sardine", "dock", NOON);
    const { state: biting } = runUntil(line, "bite");
    const reeling = tick(biting, 0, PRESS).state;
    const feel = reelFeel("sardine");
    const needMs = (1 - FISHING.reelStartProgress) * feel.reelMs;
    expect(tick(reeling, needMs - 1, HOLD).state.phase).toBe("reeling");
    expect(tick(reeling, needMs + 1, HOLD).state.phase).toBe("caught");
  });

  it("never tugs on a common fish", () => {
    const { state: biting } = runUntil(castFor("sardine", "dock", NOON), "bite");
    const { events } = reel(tick(biting, 0, PRESS).state);
    expect(types(events)).not.toContain("tug-start");
  });

  it("tugs on a rare fish, starting and stopping", () => {
    const step = tick(reelingRare(), 400, NO_INPUT);
    expect(types(step.events)).toEqual(["tug-start"]);
    expect(step.state).toMatchObject({ tugging: true, untilTugChangeMs: reelFeel("moonfish").tugs!.lastsMs });
    const after = tick(step.state, reelFeel("moonfish").tugs!.lastsMs, NO_INPUT);
    expect(types(after.events)).toEqual(["tug-end"]);
    expect(after.state).toMatchObject({ tugging: false });
  });

  it("holds steady if you let go during a tug, and slips if you hold through it", () => {
    const tugging = reelingRare({ tugging: true, untilTugChangeMs: 500, progress: 0.5 });
    expect((tick(tugging, 300, NO_INPUT).state as ReelingState).progress).toBe(0.5);
    expect((tick(tugging, 300, HOLD).state as ReelingState).progress).toBeLessThan(0.5);
  });

  it("still lands a rare fish if you just hold the whole time", () => {
    const { state, events } = reel(reelingRare({ untilTugChangeMs: 100 }));
    expect(state.phase).toBe("caught");
    expect(types(events)).toContain("tug-start");
  });

  it("lands sooner if you let go during tugs", () => {
    let state: FishingState = reelingRare({ untilTugChangeMs: 100 });
    let ms = 0;
    while (!isFinished(state)) {
      const input: FishingInput = (state as ReelingState).tugging ? NO_INPUT : HOLD;
      state = tick(state, 20, input).state;
      ms += 20;
    }
    expect(state.phase).toBe("caught");
    expect(ms).toBeLessThan(reel(reelingRare({ untilTugChangeMs: 100 }), HOLD, 20).ms);
  });

  it("keeps going if a hooked fish's tugs were taken out of the data", () => {
    const stale = { ...reelingRare(), fishId: "sardine" as FishId, tugging: true };
    const step = tick(stale, 100, HOLD);
    expect(step.state).toMatchObject({ phase: "reeling", tugging: false, untilTugChangeMs: null });
    expect(reel(step.state).state.phase).toBe("caught");
  });
});

describe("rollSize", () => {
  it("stays within every fish's size range", () => {
    const random = randomSource(4);
    for (const id of FISH_IDS) {
      const { min, max } = FISH[id].sizeCm;
      const sizes = Array.from({ length: 300 }, () => rollSize(id, random));
      for (const size of sizes) {
        expect(Number.isInteger(size)).toBe(true);
        expect(size).toBeGreaterThanOrEqual(min);
        expect(size).toBeLessThanOrEqual(max);
      }
    }
  });

  it("makes middling sizes likelier than the biggest", () => {
    const random = randomSource(6);
    const { min, max } = FISH.tuna.sizeCm;
    const mid = (min + max) / 2;
    const sizes = Array.from({ length: 2000 }, () => rollSize("tuna", random));
    const middling = sizes.filter((s) => Math.abs(s - mid) < (max - min) / 6).length;
    const biggest = sizes.filter((s) => s > max - (max - min) / 6).length;
    expect(middling).toBeGreaterThan(biggest * 2);
    expect(biggest).toBeGreaterThan(0);
  });
});
