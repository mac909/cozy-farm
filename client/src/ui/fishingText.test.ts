import { describe, expect, it } from "vitest";
import type { FishingState } from "../../../shared/fishing/fishing";
import { catchText, fishingHud, fishingWord, MISS_TEXT } from "./fishingText";

const line = { spot: "dock" as const, fishId: "sardine" as const, random: 1, phaseMs: 0 };
const waiting: FishingState = { ...line, phase: "waiting", biteAtMs: 3000, nibblesAtMs: [] };
const bite: FishingState = { ...line, phase: "bite" };
const reeling = (tugging: boolean): FishingState => ({ ...line, phase: "reeling", progress: 0.4, tugging, untilTugChangeMs: 500 });

describe("the fishing strip", () => {
  it("says to wait, then to tap, then to hold or let go", () => {
    expect(fishingHud(waiting, true)?.text).toBe("Wait for a bite…");
    expect(fishingHud(bite, true)).toMatchObject({ text: "Tap now!", biting: true });
    expect(fishingHud(bite, false)?.text).toBe("Press now!");
    expect(fishingHud(reeling(false), true)).toMatchObject({ text: "Hold to reel it in", progress: 0.4, tugging: false });
    expect(fishingHud(reeling(false), false)?.text).toBe("Hold Space to reel it in");
    expect(fishingHud(reeling(true), true)).toMatchObject({ text: "It's pulling! Let go…", tugging: true });
  });

  it("goes once the cast is over", () => {
    expect(fishingHud({ phase: "caught", spot: "dock", fishId: "sardine", sizeCm: 14 }, true)).toBeNull();
    expect(fishingHud({ phase: "missed", spot: "dock", reason: "too-late" }, true)).toBeNull();
  });
});

describe("the Action button while fishing", () => {
  it("follows the line", () => {
    expect(fishingWord(null)).toBe("Wait…");
    expect(fishingWord(waiting)).toBe("Wait…");
    expect(fishingWord(bite)).toBe("Now!");
    expect(fishingWord(reeling(false))).toBe("Reel");
    expect(fishingWord(reeling(true))).toBe("Let go");
  });
});

describe("what a cast ends with", () => {
  it("names the catch and its size", () => {
    expect(catchText("sea_bream", 34)).toBe("A Sea Bream! 34 cm");
  });

  it("is kind about a miss", () => {
    for (const text of Object.values(MISS_TEXT)) expect(text).not.toMatch(/lost|fail/i);
  });
});
