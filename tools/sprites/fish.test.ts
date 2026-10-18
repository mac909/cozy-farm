import { describe, expect, it } from "vitest";
import { FISH_IDS } from "../../shared/content/fish";
import { FISH_ART } from "./fish";
import { fromGrid } from "./lib/image";

describe("fish art", () => {
  it("has a picture for exactly the fish in the fish list", () => {
    expect(Object.keys(FISH_ART).sort()).toEqual([...FISH_IDS].sort());
  });

  it.each(FISH_IDS)("draws %s on a 16×16 frame, leaving room for the outline", (id) => {
    const { grid, legend } = FISH_ART[id];
    expect(grid).toHaveLength(16);
    const img = fromGrid(grid, legend);
    expect(img.w).toBe(16);
    for (let y = 0; y < 16; y++) {
      expect(img.opaque(0, y) || img.opaque(15, y), `${id} touches the left or right edge on row ${y}`).toBe(false);
    }
  });
});
