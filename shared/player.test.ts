import { describe, expect, it } from "vitest";
import { cleanName, DEFAULT_NAME, isEmote, isShirtColor, lookFrom, NAME_MAX_LENGTH } from "./player";

describe("cleanName", () => {
  it("trims and squeezes spaces", () => {
    expect(cleanName("  Sea   Breeze  ")).toBe("Sea Breeze");
  });

  it("removes line breaks and control characters", () => {
    expect(cleanName("Ma\nson\u0007")).toBe("Ma son");
  });

  it("cuts long names", () => {
    expect(cleanName("a".repeat(40))).toHaveLength(NAME_MAX_LENGTH);
  });

  it("counts an emoji as one character and never cuts one in half", () => {
    const farmer = "👩‍🌾";
    expect(cleanName(farmer.repeat(20))).toBe(farmer.repeat(NAME_MAX_LENGTH));
  });

  it("doesn't leave a trailing space after cutting", () => {
    expect(cleanName("abcdefghijk lmn")).toBe("abcdefghijk");
  });

  it("returns an empty string for anything that isn't text", () => {
    expect(cleanName(undefined)).toBe("");
    expect(cleanName(42)).toBe("");
    expect(cleanName("   ")).toBe("");
  });
});

describe("isShirtColor / isEmote", () => {
  it("only allows the preset ids", () => {
    expect(isShirtColor("mint")).toBe(true);
    expect(isShirtColor("#ff0000")).toBe(false);
    expect(isEmote("heart")).toBe(true);
    expect(isEmote("explode")).toBe(false);
    expect(isEmote(undefined)).toBe(false);
  });
});

describe("lookFrom", () => {
  it("keeps a valid look", () => {
    expect(lookFrom({ name: "Mason", color: "sky" })).toEqual({ name: "Mason", color: "sky" });
  });

  it("falls back to defaults for missing or bad values", () => {
    expect(lookFrom({ name: " ", color: "neon" })).toEqual({ name: DEFAULT_NAME, color: "coral" });
    expect(lookFrom(undefined)).toEqual({ name: DEFAULT_NAME, color: "coral" });
    expect(lookFrom("nonsense")).toEqual({ name: DEFAULT_NAME, color: "coral" });
  });
});
