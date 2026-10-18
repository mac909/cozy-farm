import { describe, expect, it } from "vitest";
import { eveningTint } from "./evening";

describe("eveningTint", () => {
  it("is clear all day", () => {
    expect(eveningTint(6 * 60)).toBe(0);
    expect(eveningTint(17 * 60 + 30)).toBe(0);
  });

  it("deepens through the evening towards midnight", () => {
    const at = [18, 19, 20, 22, 24].map((hour) => eveningTint(hour * 60));
    for (let i = 1; i < at.length; i++) expect(at[i]).toBeGreaterThan(at[i - 1]);
    expect(eveningTint(20 * 60)).toBeCloseTo(0.2);
    expect(eveningTint(24 * 60)).toBeCloseTo(0.36);
  });
});
