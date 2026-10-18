import { describe, expect, it } from "vitest";
import { BEACH_FIND_IDS } from "../content/beachFinds";
import { BUG_IDS } from "../content/bugs";
import { FISH_IDS } from "../content/fish";
import {
  EMPTY_BOOK,
  completion,
  isComplete,
  recordBug,
  recordCatch,
  recordFind,
  type BookResult,
  type CollectionBook,
} from "./collection";

const SAM = { day: 3, by: "Sam" };
const ALEX = { day: 5, by: "Alex" };

function bookOf(result: BookResult<string>): CollectionBook {
  if (!result.ok) throw new Error(`expected success, got "${result.reason}"`);
  return result.book;
}

function eventsOf(result: BookResult<string>) {
  if (!result.ok) throw new Error(`expected success, got "${result.reason}"`);
  return result.events;
}

describe("recordCatch", () => {
  it("discovers a fish the first time it's caught", () => {
    const result = recordCatch(EMPTY_BOOK, "sardine", 14, SAM);
    expect(eventsOf(result)).toEqual([{ type: "discovered", section: "fish", id: "sardine" }]);
    expect(bookOf(result).fish.sardine).toEqual({
      caught: 1,
      firstDay: 3,
      firstBy: "Sam",
      biggestCm: 14,
      biggestBy: "Sam",
    });
  });

  it("counts later catches without celebrating them again", () => {
    const book = bookOf(recordCatch(EMPTY_BOOK, "sardine", 14, SAM));
    const again = recordCatch(book, "sardine", 12, ALEX);
    expect(eventsOf(again)).toEqual([]);
    expect(bookOf(again).fish.sardine).toMatchObject({ caught: 2, biggestCm: 14, biggestBy: "Sam", firstBy: "Sam" });
  });

  it("celebrates a bigger one, and remembers who caught it", () => {
    const book = bookOf(recordCatch(EMPTY_BOOK, "sardine", 14, SAM));
    const bigger = recordCatch(book, "sardine", 19, ALEX);
    expect(eventsOf(bigger)).toEqual([{ type: "new-record", fishId: "sardine", sizeCm: 19, previousCm: 14 }]);
    expect(bookOf(bigger).fish.sardine).toMatchObject({ caught: 2, biggestCm: 19, biggestBy: "Alex", firstBy: "Sam" });
  });

  it("doesn't call a tie a record", () => {
    const book = bookOf(recordCatch(EMPTY_BOOK, "sardine", 14, SAM));
    expect(eventsOf(recordCatch(book, "sardine", 14, ALEX))).toEqual([]);
    expect(bookOf(recordCatch(book, "sardine", 14, ALEX)).fish.sardine?.biggestBy).toBe("Sam");
  });

  it("refuses unknown fish and broken sizes", () => {
    expect(recordCatch(EMPTY_BOOK, "shark", 100, SAM)).toEqual({ ok: false, reason: "unknown-fish" });
    expect(recordCatch(EMPTY_BOOK, "toString", 100, SAM)).toEqual({ ok: false, reason: "unknown-fish" });
    for (const size of [0, -3, NaN, Infinity]) {
      expect(recordCatch(EMPTY_BOOK, "sardine", size, SAM)).toEqual({ ok: false, reason: "bad-size" });
    }
  });

  it("never changes the book it was given", () => {
    const book = bookOf(recordCatch(EMPTY_BOOK, "sardine", 14, SAM));
    recordCatch(book, "sardine", 19, ALEX);
    recordCatch(book, "mackerel", 30, ALEX);
    expect(book.fish).toEqual({
      sardine: { caught: 1, firstDay: 3, firstBy: "Sam", biggestCm: 14, biggestBy: "Sam" },
    });
    expect(EMPTY_BOOK).toEqual({ fish: {}, finds: {}, bugs: {} });
  });
});

describe("recordFind", () => {
  it("discovers a find the first time, then just counts", () => {
    const first = recordFind(EMPTY_BOOK, "starfish", ALEX);
    expect(eventsOf(first)).toEqual([{ type: "discovered", section: "finds", id: "starfish" }]);
    expect(bookOf(first).finds.starfish).toEqual({ found: 1, firstDay: 5, firstBy: "Alex" });

    const second = recordFind(bookOf(first), "starfish", SAM);
    expect(eventsOf(second)).toEqual([]);
    expect(bookOf(second).finds.starfish).toEqual({ found: 2, firstDay: 5, firstBy: "Alex" });
  });

  it("refuses things that don't wash up", () => {
    expect(recordFind(EMPTY_BOOK, "radish", SAM)).toEqual({ ok: false, reason: "unknown-find" });
    expect(recordFind(EMPTY_BOOK, "sardine", SAM)).toEqual({ ok: false, reason: "unknown-find" });
  });
});

describe("recordBug", () => {
  it("discovers a bug the first time, then just counts", () => {
    const first = recordBug(EMPTY_BOOK, "brimstone", SAM);
    expect(eventsOf(first)).toEqual([{ type: "discovered", section: "bugs", id: "brimstone" }]);
    expect(bookOf(first).bugs.brimstone).toEqual({ caught: 1, firstDay: 3, firstBy: "Sam" });

    const second = recordBug(bookOf(first), "brimstone", ALEX);
    expect(eventsOf(second)).toEqual([]);
    expect(bookOf(second).bugs.brimstone).toEqual({ caught: 2, firstDay: 3, firstBy: "Sam" });
  });

  it("refuses things that aren't bugs", () => {
    expect(recordBug(EMPTY_BOOK, "sardine", SAM)).toEqual({ ok: false, reason: "unknown-bug" });
    expect(recordBug(EMPTY_BOOK, "constructor", SAM)).toEqual({ ok: false, reason: "unknown-bug" });
  });
});

describe("completion", () => {
  it("starts at nothing found", () => {
    expect(completion(EMPTY_BOOK)).toEqual({
      fish: { found: 0, total: FISH_IDS.length },
      finds: { found: 0, total: BEACH_FIND_IDS.length },
      bugs: { found: 0, total: BUG_IDS.length },
      all: { found: 0, total: FISH_IDS.length + BEACH_FIND_IDS.length + BUG_IDS.length },
    });
  });

  it("counts each kind once, however many were caught", () => {
    let book = EMPTY_BOOK;
    book = bookOf(recordCatch(book, "sardine", 14, SAM));
    book = bookOf(recordCatch(book, "sardine", 15, SAM));
    book = bookOf(recordCatch(book, "tuna", 120, ALEX));
    book = bookOf(recordFind(book, "sea_glass", ALEX));
    const counts = completion(book);
    expect(counts.fish.found).toBe(2);
    expect(counts.finds.found).toBe(1);
    expect(counts.all.found).toBe(3);
  });

  it("ignores entries for things no longer in the game data", () => {
    const old = {
      fish: { old_boot: { caught: 1, firstDay: 1, firstBy: "Sam", biggestCm: 30, biggestBy: "Sam" } },
      finds: {},
      bugs: {},
    };
    expect(completion(old as CollectionBook).fish.found).toBe(0);
  });

  it("celebrates finishing a section, then the whole book", () => {
    let book = EMPTY_BOOK;
    for (const id of FISH_IDS.slice(0, -1)) book = bookOf(recordCatch(book, id, 20, SAM));
    const lastFish = recordCatch(book, FISH_IDS.at(-1)!, 20, SAM);
    expect(eventsOf(lastFish).map((e) => e.type)).toEqual(["discovered", "section-complete"]);
    expect(eventsOf(lastFish)[1]).toEqual({ type: "section-complete", section: "fish" });
    book = bookOf(lastFish);
    expect(isComplete(completion(book).fish)).toBe(true);
    expect(isComplete(completion(book).all)).toBe(false);

    for (const id of BEACH_FIND_IDS.slice(0, -1)) book = bookOf(recordFind(book, id, ALEX));
    const lastFind = recordFind(book, BEACH_FIND_IDS.at(-1)!, ALEX);
    expect(eventsOf(lastFind)).toEqual([
      { type: "discovered", section: "finds", id: BEACH_FIND_IDS.at(-1) },
      { type: "section-complete", section: "finds" },
    ]);
    book = bookOf(lastFind);

    for (const id of BUG_IDS.slice(0, -1)) book = bookOf(recordBug(book, id, ALEX));
    const lastBug = recordBug(book, BUG_IDS.at(-1)!, ALEX);
    expect(eventsOf(lastBug)).toEqual([
      { type: "discovered", section: "bugs", id: BUG_IDS.at(-1) },
      { type: "section-complete", section: "bugs" },
      { type: "book-complete" },
    ]);
    expect(isComplete(completion(bookOf(lastBug)).all)).toBe(true);
  });

  it("doesn't celebrate completion again for repeat catches", () => {
    let book = EMPTY_BOOK;
    for (const id of FISH_IDS) book = bookOf(recordCatch(book, id, 20, SAM));
    expect(eventsOf(recordCatch(book, FISH_IDS[0], 10, SAM))).toEqual([]);
  });

  it("calls an empty section incomplete", () => {
    expect(isComplete({ found: 0, total: 0 })).toBe(false);
  });
});
