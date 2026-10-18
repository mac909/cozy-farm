import { describe, expect, it } from "vitest";
import { parseTime } from "./devCommands";

describe("parseTime", () => {
  it("reads 24-hour and am/pm times", () => {
    expect(parseTime("23:50")).toBe(23 * 60 + 50);
    expect(parseTime("6:00")).toBe(360);
    expect(parseTime("9:30 pm")).toBe(21 * 60 + 30);
    expect(parseTime("6am")).toBe(360);
    expect(parseTime("12:10 am")).toBe(10);
    expect(parseTime("12 pm")).toBe(720);
    expect(parseTime("24:00")).toBe(1440);
    expect(parseTime(1000)).toBe(1000);
  });

  it("refuses what isn't a time", () => {
    for (const bad of ["", "noon", "13 pm", "10:75", "25:00"]) expect(parseTime(bad)).toBeNaN();
  });
});
