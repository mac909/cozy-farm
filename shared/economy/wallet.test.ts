import { describe, expect, it } from "vitest";
import { STARTING_COINS, addCoins, canAfford, isCoinAmount, spendCoins } from "./wallet";

describe("the wallet", () => {
  it("starts with a whole number of coins", () => {
    expect(isCoinAmount(STARTING_COINS)).toBe(true);
  });
});

describe("addCoins", () => {
  it("adds coins", () => {
    expect(addCoins(100, 35)).toBe(135);
    expect(addCoins(0, 0)).toBe(0);
  });

  it("ignores amounts that would take coins away or make them fractional", () => {
    for (const bad of [-50, 2.5, NaN, Infinity]) expect(addCoins(100, bad)).toBe(100);
  });
});

describe("spendCoins", () => {
  it("spends coins", () => {
    expect(spendCoins(100, 30)).toEqual({ ok: true, coins: 70 });
  });

  it("can spend exactly everything, down to zero", () => {
    expect(spendCoins(100, 100)).toEqual({ ok: true, coins: 0 });
    expect(canAfford(100, 100)).toBe(true);
  });

  it("fails cleanly when there aren't enough coins", () => {
    expect(spendCoins(100, 101)).toEqual({ ok: false, reason: "not-enough-coins" });
    expect(spendCoins(0, 1)).toEqual({ ok: false, reason: "not-enough-coins" });
    expect(canAfford(100, 101)).toBe(false);
  });

  it("refuses amounts that would add coins or make them fractional", () => {
    for (const bad of [-50, 0.5, NaN, Infinity]) {
      expect(spendCoins(100, bad)).toEqual({ ok: false, reason: "bad-amount" });
      expect(canAfford(100, bad)).toBe(false);
    }
  });
});
