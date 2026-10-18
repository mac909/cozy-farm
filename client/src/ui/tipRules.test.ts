import { describe, expect, it } from "vitest";
import { parseSeen, tipFor } from "./tipRules";

describe("first-day tips", () => {
  it("brings up each tip once", () => {
    expect(tipFor("started", new Set())).toBe("dig");
    expect(tipFor("started", new Set(["dig"]))).toBeNull();
    expect(tipFor("dug", new Set(["dig"]))).toBe("plant");
    expect(tipFor("picked", new Set())).toBe("crate");
  });

  it("brings up the bedtime tip after the first watering or in the evening, whichever comes first", () => {
    expect(tipFor("watered", new Set())).toBe("bedtime");
    expect(tipFor("evening", new Set())).toBe("bedtime");
    expect(tipFor("evening", new Set(["bedtime"]))).toBeNull();
  });

  it("points out the cottages, then the store and arranging once you've moved in", () => {
    expect(tipFor("homeless", new Set(["dig", "plant", "bedtime", "crate"]))).toBe("houses");
    expect(tipFor("movedIn", new Set())).toBe("home");
    expect(tipFor("arranging", new Set())).toBe("arrange");
    expect(tipFor("arranging", new Set(["arrange"]))).toBeNull();
  });

  it("reads what the device remembers, ignoring anything odd", () => {
    expect(parseSeen(null)).toEqual(new Set());
    expect(parseSeen("dig,crate,nonsense,")).toEqual(new Set(["dig", "crate"]));
  });
});
