import { describe, expect, it } from "vitest";
import { DEFAULT_CHARACTER } from "./content/characters";
import { cleanName, DEFAULT_NAME, isCharacter, isEmote, lookFrom, NAME_MAX_LENGTH } from "./player";

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

describe("isCharacter / isEmote", () => {
  it("only allows the preset ids", () => {
    expect(isCharacter("pig")).toBe(true);
    expect(isCharacter("NinjaRed")).toBe(false);
    expect(isEmote("heart")).toBe(true);
    expect(isEmote("explode")).toBe(false);
    expect(isEmote(undefined)).toBe(false);
  });
});

describe("lookFrom", () => {
  it("keeps a valid look", () => {
    expect(lookFrom({ name: "Mason", character: "maskFrog" })).toEqual({ name: "Mason", character: "maskFrog" });
  });

  it("falls back to defaults for missing or bad values", () => {
    const fallback = { name: DEFAULT_NAME, character: DEFAULT_CHARACTER };
    expect(lookFrom({ name: " ", character: "neon" })).toEqual(fallback);
    expect(lookFrom(undefined)).toEqual(fallback);
    expect(lookFrom("nonsense")).toEqual(fallback);
  });

  it("turns a look saved with a shirt colour into a matching character", () => {
    expect(lookFrom({ name: "Mason", color: "sky" })).toEqual({ name: "Mason", character: "eskimo" });
    expect(lookFrom({ name: "Mason", color: "coral" }).character).toBe("boy");
    expect(lookFrom({ name: "Mason", color: "toString" }).character).toBe(DEFAULT_CHARACTER);
  });

  it("prefers a character over an old shirt colour", () => {
    expect(lookFrom({ name: "Mason", character: "pig", color: "sky" }).character).toBe("pig");
  });
});
