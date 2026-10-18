import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CROPS, type CropId } from "../../../shared/content/crops";
import { cropItemFrame, cropStageFrame, seedPacketFrame } from "./cropFrames";

const manifest = JSON.parse(readFileSync("client/public/assets/custom/manifest.json", "utf8")) as {
  crops: { crops: Record<string, { stages: number[]; item: number; packet: number }> };
};

describe("crop frames", () => {
  it.each(Object.keys(CROPS) as CropId[])("match the sprite sheet for %s", (cropId) => {
    const art = manifest.crops.crops[cropId];
    expect(art.stages).toEqual(art.stages.map((_, stage) => cropStageFrame(cropId, stage)));
    expect(cropItemFrame(cropId)).toBe(art.item);
    expect(seedPacketFrame(cropId)).toBe(art.packet);
  });
});
