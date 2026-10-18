import { BEACH_FIND_IDS, isBeachFindId, type BeachFindId } from "../content/beachFinds";
import { BUG_IDS, isBugId, type BugId } from "../content/bugs";
import { FISH_IDS, isFishId, type FishId } from "../content/fish";

/**
 * The shared collection book: every fish, beach find and bug the two of you have
 * discovered, who found each one first, and the biggest of each fish. One book
 * for both players. Never changed in place; the actions below return a new one.
 */

/** Who found something, and when. `by` is the player's name at the time, as the book shows it. */
export interface Finder {
  readonly day: number;
  readonly by: string;
}

export interface FishEntry {
  /** How many have been caught, by either player. */
  readonly caught: number;
  readonly firstDay: number;
  readonly firstBy: string;
  /** The biggest caught so far, in centimetres, and who caught it. */
  readonly biggestCm: number;
  readonly biggestBy: string;
}

export interface FindEntry {
  /** How many have been picked up, by either player. */
  readonly found: number;
  readonly firstDay: number;
  readonly firstBy: string;
}

export interface BugEntry {
  /** How many have been caught, by either player. */
  readonly caught: number;
  readonly firstDay: number;
  readonly firstBy: string;
}

export interface CollectionBook {
  /** Only fish that have been caught have an entry. */
  readonly fish: Readonly<Partial<Record<FishId, FishEntry>>>;
  /** Only finds that have been picked up have an entry. */
  readonly finds: Readonly<Partial<Record<BeachFindId, FindEntry>>>;
  /** Only bugs that have been caught have an entry. */
  readonly bugs: Readonly<Partial<Record<BugId, BugEntry>>>;
}

export const EMPTY_BOOK: CollectionBook = { fish: {}, finds: {}, bugs: {} };

export type BookSection = keyof CollectionBook;

/** The book's sections, in the order it shows them. */
export const BOOK_SECTIONS: readonly BookSection[] = ["fish", "finds", "bugs"];

/** Moments worth a little celebration, in the order they happened. */
export type BookEvent =
  | { readonly type: "discovered"; readonly section: "fish"; readonly id: FishId }
  | { readonly type: "discovered"; readonly section: "finds"; readonly id: BeachFindId }
  | { readonly type: "discovered"; readonly section: "bugs"; readonly id: BugId }
  /** A bigger one than ever before (not counting the first catch, which is a discovery). */
  | { readonly type: "new-record"; readonly fishId: FishId; readonly sizeCm: number; readonly previousCm: number }
  | { readonly type: "section-complete"; readonly section: BookSection }
  | { readonly type: "book-complete" };

export type BookResult<Reason extends string> =
  | { ok: true; book: CollectionBook; events: BookEvent[] }
  | { ok: false; reason: Reason };

/** Writes down a caught fish. */
export function recordCatch(
  book: CollectionBook,
  fishId: string,
  sizeCm: number,
  finder: Finder,
): BookResult<"unknown-fish" | "bad-size"> {
  if (!isFishId(fishId)) return { ok: false, reason: "unknown-fish" };
  if (!(Number.isFinite(sizeCm) && sizeCm > 0)) return { ok: false, reason: "bad-size" };
  const entry = book.fish[fishId];

  if (entry === undefined) {
    const first: FishEntry = {
      caught: 1,
      firstDay: finder.day,
      firstBy: finder.by,
      biggestCm: sizeCm,
      biggestBy: finder.by,
    };
    const after = { ...book, fish: { ...book.fish, [fishId]: first } };
    const events = discoveryEvents(book, after, { type: "discovered", section: "fish", id: fishId });
    return { ok: true, book: after, events };
  }

  const isRecord = sizeCm > entry.biggestCm;
  const updated: FishEntry = isRecord
    ? { ...entry, caught: entry.caught + 1, biggestCm: sizeCm, biggestBy: finder.by }
    : { ...entry, caught: entry.caught + 1 };
  const events: BookEvent[] = isRecord
    ? [{ type: "new-record", fishId, sizeCm, previousCm: entry.biggestCm }]
    : [];
  return { ok: true, book: { ...book, fish: { ...book.fish, [fishId]: updated } }, events };
}

/** Writes down a beach find that was picked up. */
export function recordFind(
  book: CollectionBook,
  findId: string,
  finder: Finder,
): BookResult<"unknown-find"> {
  if (!isBeachFindId(findId)) return { ok: false, reason: "unknown-find" };
  const entry = book.finds[findId];

  if (entry === undefined) {
    const first: FindEntry = { found: 1, firstDay: finder.day, firstBy: finder.by };
    const after = { ...book, finds: { ...book.finds, [findId]: first } };
    const events = discoveryEvents(book, after, { type: "discovered", section: "finds", id: findId });
    return { ok: true, book: after, events };
  }

  const updated: FindEntry = { ...entry, found: entry.found + 1 };
  return { ok: true, book: { ...book, finds: { ...book.finds, [findId]: updated } }, events: [] };
}

/** Writes down a caught bug. */
export function recordBug(book: CollectionBook, bugId: string, finder: Finder): BookResult<"unknown-bug"> {
  if (!isBugId(bugId)) return { ok: false, reason: "unknown-bug" };
  const entry = book.bugs[bugId];

  if (entry === undefined) {
    const first: BugEntry = { caught: 1, firstDay: finder.day, firstBy: finder.by };
    const after = { ...book, bugs: { ...book.bugs, [bugId]: first } };
    const events = discoveryEvents(book, after, { type: "discovered", section: "bugs", id: bugId });
    return { ok: true, book: after, events };
  }

  const updated: BugEntry = { ...entry, caught: entry.caught + 1 };
  return { ok: true, book: { ...book, bugs: { ...book.bugs, [bugId]: updated } }, events: [] };
}

/** How much of a section (or the whole book) is filled in. */
export interface Completion {
  readonly found: number;
  readonly total: number;
}

export interface BookCompletion {
  readonly fish: Completion;
  readonly finds: Completion;
  readonly bugs: Completion;
  readonly all: Completion;
}

/** Counts what's been discovered. Only things still in the game data count, so totals follow the data. */
export function completion(book: CollectionBook): BookCompletion {
  const fish = { found: FISH_IDS.filter((id) => book.fish[id] !== undefined).length, total: FISH_IDS.length };
  const finds = {
    found: BEACH_FIND_IDS.filter((id) => book.finds[id] !== undefined).length,
    total: BEACH_FIND_IDS.length,
  };
  const bugs = { found: BUG_IDS.filter((id) => book.bugs[id] !== undefined).length, total: BUG_IDS.length };
  return {
    fish,
    finds,
    bugs,
    all: { found: fish.found + finds.found + bugs.found, total: fish.total + finds.total + bugs.total },
  };
}

export function isComplete({ found, total }: Completion): boolean {
  return total > 0 && found >= total;
}

/** The discovery, then any section or the whole book it just completed. */
function discoveryEvents(before: CollectionBook, after: CollectionBook, discovered: BookEvent): BookEvent[] {
  const was = completion(before);
  const now = completion(after);
  const events: BookEvent[] = [discovered];
  for (const section of BOOK_SECTIONS) {
    if (!isComplete(was[section]) && isComplete(now[section])) events.push({ type: "section-complete", section });
  }
  if (!isComplete(was.all) && isComplete(now.all)) events.push({ type: "book-complete" });
  return events;
}
