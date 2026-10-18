/**
 * A few one-time tips for the first day, each shown once per device. The hints over your head
 * teach the rest. Edit the words here.
 */

export type TipId = "dig" | "plant" | "bedtime" | "crate" | "houses" | "home" | "arrange" | "beach" | "fishing" | "fishSell" | "bugs";

export const TIPS: Readonly<Record<TipId, string>> = {
  dig: "Pick the hoe in your hotbar, walk into the farm field and tap the big round button to dig.",
  plant: "Now pick the seeds and plant them in the dug soil, then water them with the can. Watered crops grow overnight.",
  bedtime: "The day ends when everyone's in bed in the tent by the farm gate. Walk up to its door and tap Sleep.",
  crate: "Sell what you pick in the shipping crate on the dock. It pays out overnight, into the coins you share.",
  houses: "Two empty cottages are waiting in the meadow above the farm. Walk up to one's door and tap Move in to make it yours.",
  home: "Welcome home! The general store by the path sells furniture. Tap Arrange (the hammer) to put things where you like.",
  arrange: "Move the frame with the stick (or tap a tile), then Place. Turn turns it, Lift picks up what's there, and Done when you're finished.",
  beach: "Something new washes up on the beach every morning. Shells, sea glass and starfish sell in the crate, and each new kind goes in your collection book.",
  fishing:
    "Stand on the dock or the beach facing the sea, and tap Fish. When the bobber dips, tap! Then hold to reel it in, and let go while it pulls. Anywhere on the screen works.",
  fishSell: "Different fish bite at the dock, the shore and the end of the dock, and at different times of day. They sell in the crate.",
  bugs: "Different butterflies come out at different times of day, and fireflies after dark. Walk up close and tap Catch.",
};

/** What just happened in the game that might call for a tip. */
export type TipEvent =
  | "started"
  | "dug"
  | "watered"
  | "evening"
  | "picked"
  | "homeless"
  | "movedIn"
  | "arranging"
  | "pickedUp"
  | "rod"
  | "caughtFish"
  | "caughtBug";

const TIP_FOR: Readonly<Record<TipEvent, TipId>> = {
  started: "dig",
  dug: "plant",
  watered: "bedtime",
  evening: "bedtime",
  picked: "crate",
  homeless: "houses",
  movedIn: "home",
  arranging: "arrange",
  pickedUp: "beach",
  rod: "fishing",
  caughtFish: "fishSell",
  caughtBug: "bugs",
};

/** A tip that makes another out of date: moving in answers "go and move in". */
export const SUPERSEDES: Readonly<Partial<Record<TipId, TipId>>> = { home: "houses" };

/** The tip an event brings up, unless it's been shown on this device already. */
export function tipFor(event: TipEvent, seen: ReadonlySet<TipId>): TipId | null {
  const tip = TIP_FOR[event];
  return seen.has(tip) ? null : tip;
}

/** Tips already shown, as stored on the device: anything unknown is ignored. */
export function parseSeen(stored: string | null): Set<TipId> {
  const ids = (stored ?? "").split(",");
  return new Set(ids.filter((id): id is TipId => Object.hasOwn(TIPS, id)));
}
