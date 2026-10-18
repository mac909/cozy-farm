import { describe, expect, it } from "vitest";
import {
  DAY_END_MINUTE,
  DAY_START_MINUTE,
  REAL_MS_PER_DAY,
  formatTime,
  isMidnight,
  newClock,
  nextDay,
  shouldEndDay,
  tickClock,
  type GameClock,
} from "./clock";

const at = (hour: number, minute = 0, day = 1): GameClock => ({ day, minute: hour * 60 + minute });

describe("tickClock", () => {
  it("starts on day 1 at 6:00 am", () => {
    expect(newClock()).toEqual({ day: 1, minute: DAY_START_MINUTE });
  });

  it("runs a whole day in REAL_MS_PER_DAY", () => {
    expect(tickClock(newClock(), REAL_MS_PER_DAY / 2).minute).toBeCloseTo(15 * 60);
    expect(tickClock(newClock(), REAL_MS_PER_DAY).minute).toBe(DAY_END_MINUTE);
  });

  it("reaches midnight with the server's small ticks too", () => {
    const tickMs = 100;
    let clock = newClock();
    let ticks = 0;
    while (!isMidnight(clock)) {
      clock = tickClock(clock, tickMs);
      ticks++;
    }
    expect(ticks * tickMs).toBeGreaterThanOrEqual(REAL_MS_PER_DAY);
    expect(ticks * tickMs).toBeLessThanOrEqual(REAL_MS_PER_DAY + tickMs);
  });

  it("ignores zero, negative, and broken time steps", () => {
    const clock = at(9);
    expect(tickClock(clock, 0)).toBe(clock);
    expect(tickClock(clock, -500)).toBe(clock);
    expect(tickClock(clock, NaN)).toBe(clock);
  });

  it("stops at midnight instead of crossing into the next day", () => {
    const late = tickClock(at(23, 59), 60_000);
    expect(late).toEqual({ day: 1, minute: DAY_END_MINUTE });
    expect(isMidnight(late)).toBe(true);
    expect(tickClock(late, REAL_MS_PER_DAY)).toEqual(late);
  });
});

describe("isMidnight", () => {
  it("is false until the clock reaches 24:00", () => {
    expect(isMidnight(at(6))).toBe(false);
    expect(isMidnight({ day: 1, minute: DAY_END_MINUTE - 0.01 })).toBe(false);
    expect(isMidnight(at(24))).toBe(true);
  });
});

describe("shouldEndDay", () => {
  it("ends the day when everyone online is in bed", () => {
    expect(shouldEndDay(at(21), [true, true])).toBe(true);
    expect(shouldEndDay(at(21), [true])).toBe(true);
  });

  it("waits while anyone is still up", () => {
    expect(shouldEndDay(at(21), [true, false])).toBe(false);
  });

  it("doesn't end the day just because nobody is online", () => {
    expect(shouldEndDay(at(21), [])).toBe(false);
  });

  it("ends the day at midnight even if someone is still up", () => {
    expect(shouldEndDay(at(24), [false, true])).toBe(true);
    expect(shouldEndDay(at(24), [])).toBe(true);
  });
});

describe("nextDay", () => {
  it("goes to 6:00 am the next day, from bedtime or from midnight", () => {
    expect(nextDay(at(22, 30, 3))).toEqual({ day: 4, minute: DAY_START_MINUTE });
    expect(nextDay(at(24, 0, 3))).toEqual({ day: 4, minute: DAY_START_MINUTE });
  });
});

describe("formatTime", () => {
  it("shows 12-hour times with am and pm", () => {
    expect(formatTime(at(6).minute)).toBe("6:00 am");
    expect(formatTime(at(12).minute)).toBe("12:00 pm");
    expect(formatTime(at(13, 30).minute)).toBe("1:30 pm");
    expect(formatTime(at(24).minute)).toBe("12:00 am");
  });

  it("rounds down to the HUD step", () => {
    expect(formatTime(at(6, 7).minute)).toBe("6:00 am");
    expect(formatTime(at(9, 19.9).minute)).toBe("9:10 am");
    expect(formatTime(DAY_END_MINUTE - 0.01)).toBe("11:50 pm");
  });
});
