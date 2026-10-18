import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newWorld, type World } from "../../../shared/world/world";
import type { WorldSave } from "../persistence/worldSave";
import { LiveWorld, SAVE_DELAY_MS, type WorldSaver } from "./liveWorld";

class FakeSaver implements WorldSaver {
  saves: WorldSave[] = [];
  closed = false;
  failing = false;
  save(_worldId: string, save: WorldSave) {
    if (this.failing) throw new Error("disk full");
    this.saves.push(save);
  }
  close() {
    this.closed = true;
  }
}

const onDay = (day: number): World => ({ ...newWorld(), clock: { day, minute: 400 } });

let saver: FakeSaver;

beforeEach(() => {
  vi.useFakeTimers();
  saver = new FakeSaver();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("LiveWorld", () => {
  it("saves a couple of seconds after a change, once for a burst of changes", () => {
    const live = new LiveWorld(saver, newWorld());
    live.set(onDay(2));
    live.set(onDay(3));
    vi.advanceTimersByTime(SAVE_DELAY_MS - 1);
    expect(saver.saves).toHaveLength(0);
    live.set(onDay(4));
    vi.advanceTimersByTime(1);
    expect(saver.saves.map((s) => s.clock.day)).toEqual([4]);
  });

  it("keeps saving every couple of seconds while changes keep coming", () => {
    const live = new LiveWorld(saver, newWorld());
    for (let day = 2; day < 12; day++) {
      live.set(onDay(day));
      vi.advanceTimersByTime(500);
    }
    expect(saver.saves.length).toBe(2);
  });

  it("takes small changes along with the next save without saving for them", () => {
    const live = new LiveWorld(saver, newWorld());
    live.set(onDay(2), { save: false });
    vi.advanceTimersByTime(SAVE_DELAY_MS * 5);
    expect(saver.saves).toHaveLength(0);
    live.saveNow();
    expect(saver.saves[0].clock.day).toBe(2);
  });

  it("saves right away when asked, instead of later", () => {
    const live = new LiveWorld(saver, newWorld());
    live.set(onDay(2));
    live.saveNow();
    vi.advanceTimersByTime(SAVE_DELAY_MS * 2);
    expect(saver.saves).toHaveLength(1);
  });

  it("carries on when a save fails, and tries again with the next change", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const live = new LiveWorld(saver, newWorld());
    saver.failing = true;
    live.set(onDay(2));
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("disk full"));
    expect(live.world.clock.day).toBe(2);
    saver.failing = false;
    live.set(onDay(3));
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(saver.saves.map((s) => s.clock.day)).toEqual([3]);
  });

  it("saves and closes on shutdown", () => {
    const live = new LiveWorld(saver, newWorld());
    live.set(onDay(5), { save: false });
    live.close();
    expect(saver.saves.map((s) => s.clock.day)).toEqual([5]);
    expect(saver.closed).toBe(true);
  });
});
