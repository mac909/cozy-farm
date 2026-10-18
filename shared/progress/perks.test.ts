import { describe, expect, it } from "vitest";
import { washUpFinds } from "../beachcombing/beachcombing";
import { tideIn } from "../beachcombing/tide";
import { collectFish } from "../collection/collect";
import { FISH } from "../content/fish";
import { goldenItemId, seedItemId } from "../content/items";
import { LEVEL_XP, PERK, type SkillId } from "../content/skills";
import { applyFarmAction } from "../farming/actions";
import { FISHING, cast, fishingPerks, isFinished, reelFeel, rollSize, tick, type FishingState } from "../fishing/fishing";
import { collectForage } from "../foraging/forage";
import { addItems, countOf, INVENTORY_SLOTS, newInventory } from "../inventory/inventory";
import { randomSource, type RandomSource } from "../random/random";
import { addFarmer, farmTileAt, newWorld, setFarmerBag, setFarmerProgress, setFarmTile, type World } from "../world/world";
import { EMPTY_PROGRESS } from "./farmerProgress";

/**
 * The perks in play (Milestone 7): each changes one rule a little, only for the farmer who earned
 * it (Extra tide brings a find for everyone).
 */

const PIP = "pip";
const FARMLAND = { farmland: Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => true)) };

/** Pip at a level in a skill. */
function pipAt(skill: SkillId, level: number, world: World = addFarmer(newWorld(4), PIP, { name: "Pip", character: "woman" })): World {
  return setFarmerProgress(world, PIP, { ...EMPTY_PROGRESS, xp: { ...EMPTY_PROGRESS.xp, [skill]: LEVEL_XP[level - 1] } });
}

/** A random source that gives these numbers, round and round. */
function rolls(...values: number[]): RandomSource {
  let i = 0;
  return {
    next: () => values[i++ % values.length],
    get state() {
      return i;
    },
  };
}

function withBag(world: World, ...stacks: [string, number][]): World {
  let bag = newInventory();
  for (const [itemId, count] of stacks) {
    const added = addItems(bag, itemId, count);
    if (!added.ok) throw new Error(itemId);
    bag = added.inventory;
  }
  return setFarmerBag(world, PIP, bag);
}

describe("farming perks", () => {
  const ripe = (world: World) => setFarmTile(world, 3, 3, { kind: "planted", watered: false, cropId: "radish", stage: 3, daysInStage: 0 });
  const pick = (world: World, random?: RandomSource) => applyFarmAction(world, FARMLAND, { farmerId: PIP, action: "harvest", col: 3, row: 3 }, random);

  it("Plant and water: planting at level 2 waters the tile too", () => {
    for (const [level, watered] of [[1, false], [2, true]] as const) {
      let world = withBag(pipAt("farming", level), ["radish_seeds", 5]);
      world = setFarmTile(world, 3, 3, { kind: "tilled", watered: false });
      const result = applyFarmAction(world, FARMLAND, { farmerId: PIP, action: "plant", col: 3, row: 3, slot: 0 });
      if (!result.ok) throw new Error(result.hint.reason);
      expect(result.tile).toMatchObject({ kind: "planted", watered });
    }
  });

  it("Early riser: a crop planted at level 9 has a day's start, never ripe", () => {
    let world = withBag(pipAt("farming", 9), ["radish_seeds", 5], ["potato_seeds", 5]);
    world = setFarmTile(setFarmTile(world, 3, 3, { kind: "tilled", watered: false }), 4, 3, { kind: "tilled", watered: false });
    const radish = applyFarmAction(world, FARMLAND, { farmerId: PIP, action: "plant", col: 3, row: 3, slot: 0 });
    const potato = applyFarmAction(world, FARMLAND, { farmerId: PIP, action: "plant", col: 4, row: 3, slot: 1 });
    expect(radish.ok && radish.tile).toMatchObject({ stage: 1, daysInStage: 0 });
    expect(potato.ok && potato.tile).toMatchObject({ stage: 0, daysInStage: 1 });
  });

  it("gives nothing extra before level 3, or without a roll", () => {
    expect(pick(ripe(withBag(pipAt("farming", 2))), rolls(0))).toMatchObject({ ok: true, harvested: { itemId: "radish", count: 1 } });
    const noRoll = pick(ripe(withBag(pipAt("farming", 10))));
    expect(noRoll.ok && noRoll.bonus).toBeUndefined();
  });

  it("A little extra, Bumper crop, Seed saver: one more and a seed back on lucky picks", () => {
    // Rolls in order: golden, one more, seed back.
    const lucky = pick(ripe(withBag(pipAt("farming", 5))), rolls(0.9, 0.05, 0.1));
    if (!lucky.ok) throw new Error(lucky.hint.reason);
    expect(lucky.bonus).toEqual([{ itemId: "radish", count: 1 }, { itemId: seedItemId("radish"), count: 1 }]);
    expect(countOf(lucky.world.farmers[PIP].bag, "radish")).toBe(2);
    // A roll of 0.15 is past A little extra's 1 in 10, but within Bumper crop's 1 in 6.
    const plain = pick(ripe(withBag(pipAt("farming", 5))), rolls(0.9, 0.15, 0.9));
    expect(plain.ok && plain.bonus).toBeUndefined();
    const bumper = pick(ripe(withBag(pipAt("farming", 7))), rolls(0.9, 0.15, 0.9));
    expect(bumper.ok && bumper.bonus).toEqual([{ itemId: "radish", count: 1 }]);
  });

  it("Golden crops: 1 in 20 picks at level 10 is golden", () => {
    const golden = pick(ripe(withBag(pipAt("farming", 10))), rolls(PERK.goldenCrops - 0.01, 0.9, 0.9));
    expect(golden).toMatchObject({ ok: true, harvested: { itemId: goldenItemId("radish"), count: 1 } });
    const plain = pick(ripe(withBag(pipAt("farming", 9))), rolls(0, 0.9, 0.9));
    expect(plain).toMatchObject({ ok: true, harvested: { itemId: "radish" } });
  });

  it("never fails a pick for an extra with no room", () => {
    const full = Array.from({ length: INVENTORY_SLOTS }, (_, i) => (i === 0 ? { itemId: "radish" as const, count: 98 } : { itemId: "hoe" as const, count: 1 }));
    const world = setFarmerBag(ripe(pipAt("farming", 7)), PIP, full);
    const result = pick(world, rolls(0, 0, 0));
    expect(result).toMatchObject({ ok: true, harvested: { itemId: "radish", count: 1 } });
    expect(result.ok && result.bonus).toBeUndefined();
  });

  it("says when a pick was of a crop that grew back", () => {
    let world = withBag(pipAt("farming", 1));
    world = setFarmTile(world, 3, 3, { kind: "planted", watered: false, cropId: "strawberry", stage: 3, daysInStage: 0 });
    const first = applyFarmAction(world, FARMLAND, { farmerId: PIP, action: "harvest", col: 3, row: 3 });
    if (!first.ok) throw new Error(first.hint.reason);
    expect(first.regrown).toBe(false);
    expect(farmTileAt(first.world, 3, 3)).toMatchObject({ regrown: true });
    const regrown = setFarmTile(first.world, 3, 3, { kind: "planted", watered: false, cropId: "strawberry", stage: 3, daysInStage: 0, regrown: true });
    const again = applyFarmAction(regrown, FARMLAND, {
      farmerId: PIP,
      action: "harvest",
      col: 3,
      row: 3,
    });
    expect(again.ok && again.regrown).toBe(true);
  });
});

describe("fishing perks", () => {
  /** Plays a line through with no presses until it bites or is missed. */
  function untilBite(state: FishingState): { waitedMs: number; state: FishingState } {
    let waitedMs = 0;
    while (state.phase !== "bite" && !isFinished(state)) {
      state = tick(state, 10, {}).state;
      waitedMs += 10;
    }
    return { waitedMs, state };
  }

  it("carry on the line, so the device plays them out", () => {
    const perks = fishingPerks(pipAt("fishing", 9).farmers[PIP].progress);
    expect(perks).toEqual({ rareWeight: PERK.luckyLine, line: { hookMs: PERK.steadyHandsMs, biteFactor: PERK.quickBites, bigger: PERK.bigOnes, tugEase: PERK.gentleReel } });
    expect(fishingPerks(EMPTY_PROGRESS)).toEqual({ rareWeight: 1, line: {} });
    const line = cast("dock", 600, 7, perks);
    expect(line.ok && line.state.perks).toEqual(perks.line);
    // Without perks, the line is exactly as before.
    const plain = cast("dock", 600, 7);
    expect(plain.ok && "perks" in plain.state).toBe(false);
  });

  it("the good rod (Milestone 8): 30% sooner bites and a fifth of a second to hook, on top of the perks", () => {
    expect(fishingPerks(EMPTY_PROGRESS, "good_rod")).toEqual({ rareWeight: 1, line: { hookMs: 200, biteFactor: 0.7 } });
    expect(fishingPerks(EMPTY_PROGRESS, "fishing_rod")).toEqual({ rareWeight: 1, line: {} });
    const both = fishingPerks(pipAt("fishing", 3).farmers[PIP].progress, "good_rod");
    expect(both.line.hookMs).toBe(PERK.steadyHandsMs + 200);
    expect(both.line.biteFactor).toBeCloseTo(PERK.quickBites * 0.7);
  });

  it("Quick bites: the same cast bites sooner", () => {
    const slow = cast("dock", 600, 11);
    const quick = cast("dock", 600, 11, { rareWeight: 1, line: { biteFactor: PERK.quickBites } });
    if (!slow.ok || !quick.ok) throw new Error("no cast");
    const a = untilBite(slow.state).waitedMs;
    const b = untilBite(quick.state).waitedMs;
    expect(b).toBeLessThan(a);
    expect(b - FISHING.castMs).toBeCloseTo((a - FISHING.castMs) * PERK.quickBites, -2);
  });

  it("Steady hands: a bite waits a fifth of a second longer to be hooked", () => {
    const with_ = cast("dock", 600, 11, { rareWeight: 1, line: { hookMs: PERK.steadyHandsMs } });
    if (!with_.ok) throw new Error("no cast");
    const { state } = untilBite(with_.state);
    const window = reelFeel(state.phase === "bite" ? state.fishId : "sardine").biteWindowMs;
    expect(tick(state, window + 100, {}).state.phase).toBe("bite");
    expect(tick(state, window + PERK.steadyHandsMs + 10, {}).state.phase).toBe("missed");
  });

  it("Big ones: sizes come out bigger, never past the biggest", () => {
    for (let seed = 1; seed < 50; seed++) {
      const plain = rollSize("sardine", randomSource(seed));
      const big = rollSize("sardine", randomSource(seed), PERK.bigOnes);
      expect(big).toBeGreaterThanOrEqual(plain);
      expect(big).toBeLessThanOrEqual(FISH.sardine.sizeCm.max);
    }
  });

  it("Lucky line: rare fish bite more often", () => {
    const rareCount = (rareWeight: number) => {
      let n = 0;
      for (let seed = 1; seed <= 3000; seed++) {
        const line = cast("point", 21 * 60, seed, { rareWeight, line: {} });
        if (line.ok && FISH[line.state.fishId].rarity === "rare") n++;
      }
      return n;
    };
    expect(rareCount(PERK.luckyLine)).toBeGreaterThan(rareCount(1) * 1.2);
  });

  it("Double catch: 1 in 8 catches at level 10 is two fish, in the bag and the book", () => {
    const world = { ...pipAt("fishing", 10), clock: { day: 4, minute: 600 } };
    const two = collectFish(world, PIP, "sardine", 15, rolls(PERK.doubleCatch - 0.01));
    if (!two.ok) throw new Error(two.hint.reason);
    expect(two.count).toBe(2);
    expect(countOf(two.world.farmers[PIP].bag, "sardine")).toBe(2);
    expect(two.world.book.fish.sardine?.caught).toBe(2);
    expect(collectFish(world, PIP, "sardine", 15, rolls(0.5))).toMatchObject({ ok: true, count: 1 });
    expect(collectFish(pipAt("fishing", 9), PIP, "sardine", 15, rolls(0))).toMatchObject({ ok: true, count: 1 });
  });
});

describe("foraging perks", () => {
  it("Armful: 1 in 4 driftwood at level 7 comes as two", () => {
    const lying = (world: World): World => ({ ...world, forage: { day: 4, items: [{ itemId: "driftwood", col: 5, row: 5 }] } });
    const two = collectForage(lying(pipAt("foraging", 7)), PIP, 5, 5, rolls(0.2));
    expect(two).toMatchObject({ ok: true, count: 2 });
    expect(two.ok && countOf(two.world.farmers[PIP].bag, "driftwood")).toBe(2);
    expect(collectForage(lying(pipAt("foraging", 7)), PIP, 5, 5, rolls(0.3))).toMatchObject({ ok: true, count: 1 });
    expect(collectForage(lying(pipAt("foraging", 6)), PIP, 5, 5, rolls(0))).toMatchObject({ ok: true, count: 1 });
  });

  it("Extra tide: one more find washes up for everyone while anyone has it", () => {
    const sand = Array.from({ length: 30 }, (_, col) => ({ col, row: 20 }));
    const base = { day: 5, worldSeed: 8, sandTiles: sand, beach: [] };
    expect(washUpFinds({ ...base, extra: 1 }).washedUp.length).toBe(washUpFinds(base).washedUp.length + 1);
    const world = (level: number): World => ({ ...pipAt("foraging", level), clock: { day: 5, minute: 360 }, beach: { day: 4, finds: [] } });
    const plain = tideIn(world(4), { sand }).washedUp.length;
    expect(tideIn(world(5), { sand }).washedUp.length).toBe(plain + PERK.extraTide);
  });
});
