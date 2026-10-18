import { describe, expect, it } from "vitest";
import { houseSign, insideText } from "./houseText";

const pip = { name: "Pip", farmerId: "pip" };
const juno = { name: "Juno", farmerId: "juno" };

describe("the sign over a cottage", () => {
  it("says whose it is", () => {
    expect(houseSign("Pip")).toBe("Pip's house");
    expect(houseSign(null)).toBe("Empty cottage");
  });

  it("says who's inside", () => {
    expect(insideText("pip", [])).toBeNull();
    expect(insideText("pip", [pip])).toBe("Pip is home");
    expect(insideText("pip", [juno])).toBe("Juno is visiting");
    expect(insideText("pip", [pip, juno])).toBe("Pip is home, Juno is visiting");
    expect(insideText(null, [juno])).toBe("Juno is looking round");
  });
});
