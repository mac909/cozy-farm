import { describe, expect, it } from "vitest";
import { smallTalkFor } from "./keeper";

describe("Marlow's small talk", () => {
  const lit = new Set(["keeper", "lighthouse/path", "lighthouse"]);

  it("talks about the boarded-up garden shop until it opens, then about planting in season (Milestone 8)", () => {
    expect(smallTalkFor(600, lit).some((line) => line.includes("boarded up"))).toBe(true);
    const open = new Set([...lit, "gardenShop"]);
    expect(smallTalkFor(600, open).some((line) => line.includes("boarded up"))).toBe(false);
    expect(smallTalkFor(600, open).some((line) => line.includes("season"))).toBe(true);
  });

  it("says something about the season, and nothing seasonal before the seasons begin", () => {
    const open = new Set([...lit, "gardenShop"]);
    expect(smallTalkFor(600, open, "spring").some((line) => line.includes("Blossom"))).toBe(true);
    expect(smallTalkFor(600, open, "winter").some((line) => line.includes("frost"))).toBe(true);
    expect(smallTalkFor(13 * 60, open, "winter").some((line) => line.includes("frost"))).toBe(false);
    expect(smallTalkFor(600, open, null).some((line) => /Blossom|frost|swim|Leaves/.test(line))).toBe(false);
  });
});
