import { describe, expect, it } from "vitest";
import { CROP_IDS, CROPS } from "../content/crops";
import { SEASON_DAYS, SEASON_IDS, YEAR_DAYS } from "../content/seasons";
import { allYear, inSeason, seasonBegins, seasonLabel, seasonOn, yearStartFor } from "./seasons";

describe("seasons", () => {
  it("haven't begun until the garden shop opens (yearStart 0)", () => {
    expect(seasonOn(40, 0)).toBeNull();
    expect(seasonBegins(40, 0)).toBe(false);
  });

  it("go spring, summer, autumn, winter, fourteen days each, from the day spring came", () => {
    expect(seasonOn(24, 24)).toEqual({ season: "spring", day: 1, year: 1 });
    expect(seasonOn(37, 24)).toEqual({ season: "spring", day: 14, year: 1 });
    expect(seasonOn(38, 24)).toEqual({ season: "summer", day: 1, year: 1 });
    expect(seasonOn(24 + 2 * SEASON_DAYS, 24)?.season).toBe("autumn");
    expect(seasonOn(24 + 3 * SEASON_DAYS + 13, 24)).toEqual({ season: "winter", day: 14, year: 1 });
    expect(seasonOn(24 + YEAR_DAYS, 24)).toEqual({ season: "spring", day: 1, year: 2 });
  });

  it("say when a season begins, and read as 'Spring 3'", () => {
    expect(seasonBegins(24, 24)).toBe(true);
    expect(seasonBegins(25, 24)).toBe(false);
    expect(seasonBegins(38, 24)).toBe(true);
    expect(seasonLabel({ season: "autumn", day: 3, year: 1 })).toBe("Autumn 3");
  });

  it("can be set to start any season today (the dev command), early in a world too", () => {
    for (const season of SEASON_IDS) {
      for (const day of [1, 5, 30, 200]) {
        const start = yearStartFor(day, season);
        expect(start).toBeGreaterThanOrEqual(1);
        expect(seasonOn(day, start), `${season} on day ${day}`).toMatchObject({ season, day: 1 });
        expect(seasonOn(day + SEASON_DAYS, start)?.season).toBe(SEASON_IDS[(SEASON_IDS.indexOf(season) + 1) % 4]);
      }
    }
  });
});

describe("planting in season", () => {
  it("lets the starter crops, wheat and cotton go in all year", () => {
    for (const id of CROP_IDS.filter((crop) => CROPS[crop].sold === "seedStand")) expect(allYear(id), id).toBe(true);
    expect(allYear("wheat")).toBe(true);
    expect(allYear("cotton")).toBe(true);
    for (const season of SEASON_IDS) expect(inSeason("radish", { season, day: 1, year: 1 })).toBe(true);
  });

  it("lets a seasonal crop go in only in its season, and anything before the seasons begin", () => {
    expect(inSeason("peas", { season: "spring", day: 4, year: 1 })).toBe(true);
    expect(inSeason("peas", { season: "summer", day: 4, year: 1 })).toBe(false);
    expect(inSeason("melon", { season: "summer", day: 1, year: 2 })).toBe(true);
    expect(inSeason("kale", { season: "autumn", day: 14, year: 1 })).toBe(false);
    expect(inSeason("kale", null)).toBe(true);
  });
});
