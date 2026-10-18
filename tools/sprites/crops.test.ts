import { describe, expect, it } from "vitest";
import { CROPS, type CropId } from "../../shared/content/crops";
import { CROP_ART } from "./crops";

/** In crops.png, column 5 holds the harvested item, so a crop can have at most 5 growth stages. */
const MAX_STAGES = 5;

describe("crop art", () => {
  it("has art for exactly the crops in the crop list", () => {
    expect(Object.keys(CROP_ART).sort()).toEqual(Object.keys(CROPS).sort());
  });

  it.each(Object.keys(CROPS) as CropId[])("draws every growth stage of %s", (id) => {
    expect(CROP_ART[id].stages).toHaveLength(CROPS[id].stages);
    expect(CROPS[id].stages).toBeLessThanOrEqual(MAX_STAGES);
  });
});
