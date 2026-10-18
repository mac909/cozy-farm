import { describe, expect, it } from "vitest";
import { CROPS, MAX_STAGES, type CropId } from "../../shared/content/crops";
import { CROP_ART } from "./crops";

describe("crop art", () => {
  it("has art for exactly the crops in the crop list, in the same order (a row each in crops.png)", () => {
    expect(Object.keys(CROP_ART)).toEqual(Object.keys(CROPS));
  });

  it.each(Object.keys(CROPS) as CropId[])("draws %s's frames 16 × 16", (id) => {
    const art = CROP_ART[id];
    for (const grid of [...art.stages, art.item]) {
      expect(grid).toHaveLength(16);
      for (const row of grid) expect(row).toHaveLength(16);
    }
    expect(art.packet).toHaveLength(8);
    for (const row of art.packet) expect(row).toHaveLength(8);
  });

  it.each(Object.keys(CROPS) as CropId[])("draws every growth stage of %s", (id) => {
    expect(CROP_ART[id].stages).toHaveLength(CROPS[id].stages);
    expect(CROPS[id].stages).toBeLessThanOrEqual(MAX_STAGES);
  });
});
