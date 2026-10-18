/**
 * A few one-time tips for the first day, each shown once per device. The hints over your head
 * teach the rest. Edit the words here.
 */

export type TipId = "dig" | "plant" | "bedtime" | "crate";

export const TIPS: Readonly<Record<TipId, string>> = {
  dig: "Pick the hoe in your hotbar, walk into the farm field and tap the big round button to dig.",
  plant: "Now pick the seeds and plant them in the dug soil, then water them with the can. Watered crops grow overnight.",
  bedtime: "The day ends when everyone's in bed in the tent by the farm gate. Walk up to its door and tap Sleep.",
  crate: "Sell what you pick in the shipping crate on the dock. It pays out overnight, into the coins you share.",
};

/** What just happened in the game that might call for a tip. */
export type TipEvent = "started" | "dug" | "watered" | "evening" | "picked";

const TIP_FOR: Readonly<Record<TipEvent, TipId>> = {
  started: "dig",
  dug: "plant",
  watered: "bedtime",
  evening: "bedtime",
  picked: "crate",
};

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
