import { describe, expect, it } from "vitest";
import { DAY_END_MINUTE, newClock } from "../time/clock";
import { DROP_WAIT_MS, nameList, nightStarts, recentDrops, sleepersText, waitingText } from "./bedtime";

const morning = newClock();
const midnight = { day: 1, minute: DAY_END_MINUTE };

describe("nightStarts", () => {
  it("starts at once for one player alone in bed", () => {
    expect(nightStarts(morning, [true], [], 0)).toBe(true);
  });

  it("waits while anyone online is still up", () => {
    expect(nightStarts(morning, [true, false], [], 0)).toBe(false);
    expect(nightStarts(morning, [true, true], [], 0)).toBe(true);
  });

  it("waits 30 seconds for someone who dropped while still up, then starts", () => {
    const drops = [{ farmerId: "juno", at: 1000 }];
    expect(nightStarts(morning, [true], drops, 1000)).toBe(false);
    expect(nightStarts(morning, [true], drops, 1000 + DROP_WAIT_MS - 1)).toBe(false);
    expect(nightStarts(morning, [true], drops, 1000 + DROP_WAIT_MS)).toBe(true);
  });

  it("never starts before midnight with nobody online (the room doesn't even ask then)", () => {
    expect(nightStarts(morning, [], [], 0)).toBe(false);
    expect(nightStarts(morning, [], [{ farmerId: "juno", at: 0 }], 0)).toBe(false);
  });

  it("starts at midnight whoever's still up", () => {
    expect(nightStarts(midnight, [false, false], [{ farmerId: "juno", at: 0 }], 0)).toBe(true);
  });
});

describe("recentDrops", () => {
  it("forgets drops older than the wait", () => {
    const drops = [
      { farmerId: "a", at: 0 },
      { farmerId: "b", at: 20_000 },
    ];
    expect(recentDrops(drops, 35_000)).toEqual([{ farmerId: "b", at: 20_000 }]);
  });
});

describe("bedtime words", () => {
  it("lists names like a sentence", () => {
    expect(nameList([])).toBe("");
    expect(nameList(["Pip"])).toBe("Pip");
    expect(nameList(["Pip", "Juno"])).toBe("Pip and Juno");
    expect(nameList(["Pip", "Juno", "Kai"])).toBe("Pip, Juno and Kai");
  });

  it("says who's asleep on the clock card", () => {
    expect(sleepersText([])).toBeNull();
    expect(sleepersText(["Pip"])).toBe("Pip is asleep");
    expect(sleepersText(["Pip", "Juno"])).toBe("Pip and Juno are asleep");
  });

  it("says who the night is waiting for", () => {
    expect(waitingText(["Juno"])).toBe("Waiting for Juno to go to bed");
    expect(waitingText([])).toBe("The night starts in a moment…");
  });
});
