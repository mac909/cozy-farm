import { BEACH_FINDS, BEACH_FIND_IDS } from "../../../shared/content/beachFinds";
import { BUGS, BUG_IDS } from "../../../shared/content/bugs";
import { FISH, FISH_IDS, type BiteWindow, type FishingSpot } from "../../../shared/content/fish";
import { ITEMS, type ItemId } from "../../../shared/content/items";
import type { Rarity } from "../../../shared/content/rarity";
import { completion, type BookEvent, type BookSection, type CollectionBook } from "../../../shared/collection/collection";
import { SPOT_NAMES } from "../../../shared/fishing/spots";
import { DAY_END_MINUTE, DAY_START_MINUTE } from "../../../shared/time/clock";

/** The book's tabs, in order, with their names. */
export const BOOK_TABS: readonly { section: BookSection; title: string }[] = [
  { section: "fish", title: "Fish" },
  { section: "finds", title: "Beach" },
  { section: "bugs", title: "Bugs" },
];

/** One thing in the book: found or not, and the lines that describe it. */
export interface BookEntryView {
  id: ItemId;
  /** Its name, or "???" while it's still to find. */
  name: string;
  found: boolean;
  rarity: Rarity;
  /** A few short lines for the strip under the grid. */
  lines: string[];
}

/** "9 am", "12:30 pm", "midnight". */
export function clockWords(minute: number): string {
  if (minute >= DAY_END_MINUTE) return "midnight";
  const hour = Math.floor(minute / 60);
  const mins = Math.round(minute % 60);
  const half = hour < 12 ? "am" : "pm";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return mins === 0 ? `${h12} ${half}` : `${h12}:${String(mins).padStart(2, "0")} ${half}`;
}

/** "all day", "9 am to 6 pm", "6 am to 9 am and 5 pm to midnight". */
export function windowsWords(windows: readonly BiteWindow[]): string {
  if (windows.length === 1 && windows[0].from <= DAY_START_MINUTE && windows[0].to >= DAY_END_MINUTE) return "all day";
  return windows.map((w) => `${clockWords(w.from)} to ${clockWords(w.to)}`).join(" and ");
}

/** "the dock and the shore", "the end of the dock". */
export function spotsWords(spots: readonly FishingSpot[]): string {
  const names = spots.map((spot) => SPOT_NAMES[spot]);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** "by day", "in the evening", "in the morning": when a bug is out, roughly, for a hint. */
function partOfDay(windows: readonly BiteWindow[]): string {
  const from = Math.min(...windows.map((w) => w.from));
  if (from >= 18 * 60) return "after dark";
  if (Math.max(...windows.map((w) => w.to)) <= 12 * 60) return "in the morning";
  return "by day";
}

const times = (n: number, verb: string) => `${verb} ${n === 1 ? "once" : n === 2 ? "twice" : `${n} times`}`;
const sells = (id: ItemId) => `Sells for ${ITEMS[id].sellPrice ?? 0} in the crate`;

/** Every entry in one section of the book, in the book's order. */
export function bookEntries(book: CollectionBook, section: BookSection): BookEntryView[] {
  switch (section) {
    case "fish":
      return FISH_IDS.map((id) => {
        const fish = FISH[id];
        const entry = book.fish[id];
        const where = `Bites at ${spotsWords(fish.spots)}`;
        if (!entry) return { id, name: "???", found: false, rarity: fish.rarity, lines: ["Not caught yet.", `Try ${spotsWords(fish.spots)}.`] };
        return {
          id,
          name: fish.name,
          found: true,
          rarity: fish.rarity,
          lines: [
            `${times(entry.caught, "Caught")}. Biggest: ${entry.biggestCm} cm, by ${entry.biggestBy}`,
            `First caught by ${entry.firstBy} on day ${entry.firstDay}`,
            `${where}, ${windowsWords(fish.windows)}`,
            sells(id),
          ],
        };
      });
    case "finds":
      return BEACH_FIND_IDS.map((id) => {
        const entry = book.finds[id];
        const rarity = BEACH_FINDS[id].rarity;
        if (!entry) return { id, name: "???", found: false, rarity, lines: ["Not found yet.", "Look along the beach in the mornings."] };
        return {
          id,
          name: ITEMS[id].name,
          found: true,
          rarity,
          lines: [`${times(entry.found, "Found")}. First found by ${entry.firstBy} on day ${entry.firstDay}`, "Washes up on the beach", sells(id)],
        };
      });
    case "bugs":
      return BUG_IDS.map((id) => {
        const bug = BUGS[id];
        const entry = book.bugs[id];
        if (!entry) return { id, name: "???", found: false, rarity: bug.rarity, lines: ["Not caught yet.", `Out in the meadow ${partOfDay(bug.windows)}.`] };
        return {
          id,
          name: bug.name,
          found: true,
          rarity: bug.rarity,
          lines: [
            `${times(entry.caught, "Caught")}. First caught by ${entry.firstBy} on day ${entry.firstDay}`,
            `Out in the meadow, ${windowsWords(bug.windows)}`,
            sells(id),
          ],
        };
      });
  }
}

/** "14 of 29 found" for the whole book, and "5/12" for each tab. */
export function completionWords(book: CollectionBook): { all: string; tabs: Record<BookSection, string> } {
  const done = completion(book);
  return {
    all: `${done.all.found} of ${done.all.total} found`,
    tabs: {
      fish: `${done.fish.found}/${done.fish.total}`,
      finds: `${done.finds.found}/${done.finds.total}`,
      bugs: `${done.bugs.found}/${done.bugs.total}`,
    },
  };
}

/** What the celebration card says for something in the book: a title, a line, and the item to show. */
export interface Celebration {
  title: string;
  line: string;
  itemId: ItemId | null;
  /** A first discovery or a finished page: the jingle and the confetti. A record is a smaller cheer. */
  big: boolean;
}

const SECTION_DONE: Readonly<Record<BookSection, string>> = {
  fish: "Every fish in the sea!",
  finds: "Every shell on the shore!",
  bugs: "Every bug in the meadow!",
};

/** The card for a book event, found by `by`. */
export function celebrationFor(event: BookEvent, by: string): Celebration {
  switch (event.type) {
    case "discovered": {
      const name = ITEMS[event.id].name;
      const verb = event.section === "finds" ? "found" : "caught";
      return { title: "New in the collection book!", line: `${name}, ${verb} by ${by}`, itemId: event.id, big: true };
    }
    case "new-record":
      return {
        title: "A new record!",
        line: `${FISH[event.fishId].name}, ${event.sizeCm} cm (was ${event.previousCm} cm), by ${by}`,
        itemId: event.fishId,
        big: false,
      };
    case "section-complete":
      return { title: SECTION_DONE[event.section], line: "That page of the book is full.", itemId: null, big: true };
    case "book-complete":
      return { title: "The whole book is full!", line: "Everything there is to find, found together.", itemId: null, big: true };
  }
}
