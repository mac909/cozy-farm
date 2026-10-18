import { describe, expect, it } from "vitest";
import { EMPTY_BOOK, type CollectionBook } from "../../../shared/collection/collection";
import { BUG_IDS } from "../../../shared/content/bugs";
import { FISH_IDS } from "../../../shared/content/fish";
import { bookEntries, celebrationFor, clockWords, completionWords, spotsWords, windowsWords } from "./bookText";

const BOOK: CollectionBook = {
  fish: { sea_bream: { caught: 2, firstDay: 8, firstBy: "Juno", biggestCm: 41, biggestBy: "Pip" } },
  finds: { starfish: { found: 1, firstDay: 3, firstBy: "Pip" } },
  bugs: { firefly: { caught: 5, firstDay: 4, firstBy: "Juno" } },
};

describe("times and places in words", () => {
  it("says clock times the friendly way", () => {
    expect(clockWords(9 * 60)).toBe("9 am");
    expect(clockWords(12 * 60 + 30)).toBe("12:30 pm");
    expect(clockWords(18 * 60)).toBe("6 pm");
    expect(clockWords(24 * 60)).toBe("midnight");
  });

  it("says when something's about", () => {
    expect(windowsWords([{ from: 360, to: 1440 }])).toBe("all day");
    expect(windowsWords([{ from: 540, to: 1080 }])).toBe("9 am to 6 pm");
    expect(windowsWords([{ from: 360, to: 540 }, { from: 1020, to: 1440 }])).toBe("6 am to 9 am and 5 pm to midnight");
  });

  it("names the fishing spots", () => {
    expect(spotsWords(["dock"])).toBe("the dock");
    expect(spotsWords(["dock", "shore"])).toBe("the dock and the shore");
    expect(spotsWords(["shore", "deep"])).toBe("the shore and the end of the dock");
  });
});

describe("the book's pages", () => {
  it("lists every fish, found ones by name with their record", () => {
    const fish = bookEntries(BOOK, "fish");
    expect(fish.map((f) => f.id)).toEqual(FISH_IDS);
    const bream = fish.find((f) => f.id === "sea_bream")!;
    expect(bream).toMatchObject({ name: "Sea Bream", found: true });
    expect(bream.lines[0]).toBe("Caught twice. Biggest: 41 cm, by Pip");
    expect(bream.lines[1]).toBe("First caught by Juno on day 8");
    expect(bream.lines[2]).toBe("Bites at the dock, 9 am to 6 pm");
  });

  it("hides what's still to find, with a hint of where", () => {
    const tuna = bookEntries(BOOK, "fish").find((f) => f.id === "tuna")!;
    expect(tuna).toMatchObject({ name: "???", found: false });
    expect(tuna.lines).toEqual(["Not caught yet.", "Try the end of the dock."]);
    const moth = bookEntries(BOOK, "bugs").find((b) => b.id === "luna_moth")!;
    expect(moth.lines[1]).toBe("Out in the meadow after dark.");
    expect(bookEntries(BOOK, "bugs").find((b) => b.id === "brimstone")!.lines[1]).toBe("Out in the meadow in the morning.");
  });

  it("says how often something was found", () => {
    expect(bookEntries(BOOK, "finds").find((f) => f.id === "starfish")!.lines[0]).toBe("Found once. First found by Pip on day 3");
    expect(bookEntries(BOOK, "bugs").find((f) => f.id === "firefly")!.lines[0]).toBe("Caught 5 times. First caught by Juno on day 4");
  });

  it("counts what's been found", () => {
    const words = completionWords(BOOK);
    expect(words.all).toBe(`3 of ${FISH_IDS.length + 5 + BUG_IDS.length} found`);
    expect(words.tabs.fish).toBe(`1/${FISH_IDS.length}`);
    expect(completionWords(EMPTY_BOOK).all).toMatch(/^0 of/);
  });
});

describe("celebrations", () => {
  it("cheers a first discovery, saying who found it", () => {
    expect(celebrationFor({ type: "discovered", section: "fish", id: "tuna" }, "Pip")).toEqual({
      title: "New in the collection book!",
      line: "Bluefin Tuna, caught by Pip",
      itemId: "tuna",
      big: true,
    });
    expect(celebrationFor({ type: "discovered", section: "finds", id: "sea_glass" }, "Juno").line).toBe("Sea Glass, found by Juno");
  });

  it("gives a record a smaller cheer", () => {
    const record = celebrationFor({ type: "new-record", fishId: "sardine", sizeCm: 19, previousCm: 14 }, "Juno");
    expect(record).toMatchObject({ title: "A new record!", big: false, itemId: "sardine" });
    expect(record.line).toBe("Sardine, 19 cm (was 14 cm), by Juno");
  });

  it("cheers a full page and a full book", () => {
    expect(celebrationFor({ type: "section-complete", section: "bugs" }, "Pip").title).toBe("Every bug in the meadow!");
    expect(celebrationFor({ type: "book-complete" }, "Pip").big).toBe(true);
  });
});
