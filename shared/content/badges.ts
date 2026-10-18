import type { ItemId } from "./items";

/**
 * Badges (Milestone 7): little medals for things you've done, each a silhouette with a hint until
 * it's earned, like the collection book. Most are personal (yours, for what you did); the
 * village's are everyone's at once, because it's a shared village (and the shared book's).
 * What earns each is in shared/progress/badges.ts; the counts here are first guesses.
 *
 * Saves hold badge ids, so renaming one needs a save migration. Badges for places that aren't
 * built yet (the first shop, the bridge, the orchard, the whole village) come with their
 * milestones (docs/plans/progression.md, section 2.11).
 */

/** Groups on the You card, in order. */
export type BadgeGroup = "fishing" | "farming" | "foraging" | "village" | "giving" | "home" | "together" | "skills";

/**
 * A badge's picture inside its medal: an item's icon, or one of the game's own pictures (the lit
 * lighthouse, a cottage, a porch, a heart, the book, a bed).
 */
export type BadgeIcon = { readonly item: ItemId } | { readonly picture: "lighthouse" | "cottage" | "porch" | "heart" | "book" | "bed" | "view" };

export interface BadgeDef {
  readonly id: string;
  /** "Night Owl". */
  readonly name: string;
  readonly group: BadgeGroup;
  /** What earns it, short, under its silhouette: "A fish after 10 pm". */
  readonly hint: string;
  /** Everyone's at once (the village's): it's a shared village. */
  readonly shared?: boolean;
  readonly icon: BadgeIcon;
}

const badgeData = {
  // ---------- Fishing ----------
  first_catch: { id: "first_catch", name: "First Catch", group: "fishing", hint: "A fish", icon: { item: "sardine" } },
  angler: { id: "angler", name: "Angler", group: "fishing", hint: "50 fish", icon: { item: "mackerel" } },
  old_salt: { id: "old_salt", name: "Old Salt", group: "fishing", hint: "250 fish", icon: { item: "sea_bream" } },
  night_owl: { id: "night_owl", name: "Night Owl", group: "fishing", hint: "A fish after 10 pm", icon: { item: "lanternfish" } },
  record_breaker: { id: "record_breaker", name: "Record Breaker", group: "fishing", hint: "A bigger fish than ever", icon: { item: "flounder" } },
  // ---------- Farming ----------
  first_harvest: { id: "first_harvest", name: "First Harvest", group: "farming", hint: "A crop", icon: { item: "radish" } },
  green_thumb: { id: "green_thumb", name: "Green Thumb", group: "farming", hint: "100 crops", icon: { item: "carrot" } },
  harvest_home: { id: "harvest_home", name: "Harvest Home", group: "farming", hint: "500 crops", icon: { item: "pumpkin" } },
  every_crop: { id: "every_crop", name: "Every Crop", group: "farming", hint: "One of every crop", icon: { item: "strawberry" } },
  // ---------- Foraging ----------
  shell_seeker: { id: "shell_seeker", name: "Shell Seeker", group: "foraging", hint: "Every beach find", icon: { item: "conch_shell" } },
  butterfly_friend: { id: "butterfly_friend", name: "Butterfly Friend", group: "foraging", hint: "Every bug", icon: { item: "red_admiral" } },
  beachcomber: { id: "beachcomber", name: "Beachcomber", group: "foraging", hint: "100 beach finds", icon: { item: "scallop_shell" } },
  kindling: { id: "kindling", name: "Kindling", group: "foraging", hint: "50 driftwood or branches", icon: { item: "branch" } },
  // ---------- The village (everyone) ----------
  lamplighter: { id: "lamplighter", name: "Lamplighter", group: "village", hint: "The lighthouse lit", shared: true, icon: { picture: "lighthouse" } },
  // ---------- Giving ----------
  helping_hand: { id: "helping_hand", name: "Helping Hand", group: "giving", hint: "25 things given to the board", icon: { item: "driftwood" } },
  pillar: { id: "pillar", name: "Pillar of the Village", group: "giving", hint: "250 things given to the board", icon: { item: "sea_glass" } },
  // ---------- Home ----------
  moved_in: { id: "moved_in", name: "Moved In", group: "home", hint: "A cottage of your own", icon: { picture: "cottage" } },
  homemaker: { id: "homemaker", name: "Homemaker", group: "home", hint: "20 pieces put down", icon: { item: "potted_fern" } },
  porch_sitter: { id: "porch_sitter", name: "Porch Sitter", group: "home", hint: "A porch on your cottage", icon: { picture: "porch" } },
  // ---------- Together ----------
  side_by_side: { id: "side_by_side", name: "Side by Side", group: "together", hint: "10 nights you both went to bed", icon: { picture: "heart" } },
  sleepover: { id: "sleepover", name: "Sleepover", group: "together", hint: "A night in the other's house", icon: { picture: "bed" } },
  up_the_lighthouse: { id: "up_the_lighthouse", name: "Up the Lighthouse", group: "together", hint: "The view at night", icon: { picture: "view" } },
  full_book: { id: "full_book", name: "Full Book", group: "together", hint: "Every page of the book complete", shared: true, icon: { picture: "book" } },
  // ---------- The top of each skill ----------
  top_of_the_crop: { id: "top_of_the_crop", name: "Top of the Crop", group: "skills", hint: "Farming level 10", icon: { item: "golden_pumpkin" } },
  sea_legend: { id: "sea_legend", name: "Sea Legend", group: "skills", hint: "Fishing level 10", icon: { item: "conger_eel" } },
  treasure_hunter: { id: "treasure_hunter", name: "Treasure Hunter", group: "skills", hint: "Foraging level 10", icon: { item: "starfish" } },
} satisfies Record<string, BadgeDef>;

export type BadgeId = keyof typeof badgeData;

/** Every badge, in the You card's order. */
export const BADGES: Readonly<Record<BadgeId, BadgeDef>> = badgeData;

export const BADGE_IDS = Object.keys(BADGES) as BadgeId[];

export function isBadgeId(id: unknown): id is BadgeId {
  return typeof id === "string" && Object.hasOwn(BADGES, id);
}

/** The counts the counted badges ask for. */
export const BADGE_COUNTS = {
  angler: 50,
  old_salt: 250,
  green_thumb: 100,
  harvest_home: 500,
  beachcomber: 100,
  kindling: 50,
  helping_hand: 25,
  pillar: 250,
  homemaker: 20,
  side_by_side: 10,
} as const satisfies Partial<Record<BadgeId, number>>;

/** Night Owl: a fish caught from this minute (10 pm). */
export const NIGHT_OWL_FROM = 22 * 60;

/** Up the Lighthouse: the view from this minute (6 pm, when the lamp is lit and the moon is up). */
export const NIGHT_VIEW_FROM = 18 * 60;
