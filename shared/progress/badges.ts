import { BADGE_COUNTS, BADGE_IDS, type BadgeId } from "../content/badges";
import { BEACH_FIND_IDS } from "../content/beachFinds";
import { BUG_IDS } from "../content/bugs";
import { CROPS, type CropId } from "../content/crops";
import { houseProjectId } from "../content/projects";
import { completion, isComplete } from "../collection/collection";
import type { ItemId } from "../content/items";
import { homeOf } from "../decor/decorate";
import { builtThings } from "../village/built";
import { farmerOf, setFarmerProgress, type FarmerId, type World } from "../world/world";
import { levelOf, statOf, type FarmerProgress, type StatId } from "./farmerProgress";

/**
 * Which badges a farmer has earned (Milestone 7). Each follows from their own counts and finds, or
 * from the world as it stands (a cottage of your own, the lighthouse lit, the shared book full), so
 * it's worked out rather than remembered as it happens: the counts start from the update (nobody
 * gets credit for play before it), but anything that follows from the world comes on first
 * joining. Earned badges are kept with the day, and never taken away.
 */

const CROP_IDS = Object.keys(CROPS) as CropId[];

/** Everything a badge's rule looks at. */
interface Context {
  readonly progress: FarmerProgress;
  readonly built: ReadonlySet<string>;
  readonly home: string | null;
  readonly bookFull: boolean;
}

const count = (stat: StatId, n: number) => (c: Context) => statOf(c.progress, stat) >= n;
const every = (ids: readonly ItemId[]) => (c: Context) => ids.every((id) => c.progress.kinds.includes(id));

const RULES: Readonly<Record<BadgeId, (c: Context) => boolean>> = {
  first_catch: count("fish", 1),
  angler: count("fish", BADGE_COUNTS.angler),
  old_salt: count("fish", BADGE_COUNTS.old_salt),
  night_owl: count("nightFish", 1),
  record_breaker: count("records", 1),
  first_harvest: count("crops", 1),
  green_thumb: count("crops", BADGE_COUNTS.green_thumb),
  harvest_home: count("crops", BADGE_COUNTS.harvest_home),
  every_crop: every(CROP_IDS),
  shell_seeker: every(BEACH_FIND_IDS),
  butterfly_friend: every(BUG_IDS),
  beachcomber: count("finds", BADGE_COUNTS.beachcomber),
  kindling: count("materials", BADGE_COUNTS.kindling),
  lamplighter: (c) => c.built.has("lighthouse"),
  helping_hand: count("given", BADGE_COUNTS.helping_hand),
  pillar: count("given", BADGE_COUNTS.pillar),
  moved_in: (c) => c.home !== null,
  homemaker: count("placed", BADGE_COUNTS.homemaker),
  porch_sitter: (c) => c.home !== null && c.built.has(houseProjectId(c.home, "porch")),
  side_by_side: count("nightsTogether", BADGE_COUNTS.side_by_side),
  sleepover: count("sleepovers", 1),
  up_the_lighthouse: count("nightViews", 1),
  full_book: (c) => c.bookFull,
  top_of_the_crop: (c) => levelOf(c.progress, "farming") >= 10,
  sea_legend: (c) => levelOf(c.progress, "fishing") >= 10,
  treasure_hunter: (c) => levelOf(c.progress, "foraging") >= 10,
};

/** Every badge a farmer's progress and the world say they've earned, in the You card's order (earned or not before). */
export function badgesDue(world: World, farmerId: FarmerId, built: ReadonlySet<string> = builtThings(world)): BadgeId[] {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return [];
  const context: Context = {
    progress: farmer.progress,
    built,
    home: homeOf(world.houses, farmerId),
    bookFull: isComplete(completion(world.book).all),
  };
  return BADGE_IDS.filter((id) => RULES[id](context));
}

/** Gives a farmer every badge they've earned and haven't got yet, dated today. Returns the world and the new ones. */
export function awardBadges(world: World, farmerId: FarmerId, built?: ReadonlySet<string>): { world: World; badges: BadgeId[] } {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return { world, badges: [] };
  const fresh = badgesDue(world, farmerId, built).filter((id) => farmer.progress.badges[id] === undefined);
  if (fresh.length === 0) return { world, badges: [] };
  const badges = { ...farmer.progress.badges };
  for (const id of fresh) badges[id] = world.clock.day;
  return { world: setFarmerProgress(world, farmerId, { ...farmer.progress, badges }), badges: fresh };
}

/** Everyone's new badges (after the night, or the lamp being lit: the village's go to everyone). */
export function awardEveryone(world: World): { world: World; awarded: Record<FarmerId, BadgeId[]> } {
  const built = builtThings(world);
  const awarded: Record<FarmerId, BadgeId[]> = {};
  let next = world;
  for (const farmerId of Object.keys(world.farmers)) {
    const result = awardBadges(next, farmerId, built);
    next = result.world;
    if (result.badges.length > 0) awarded[farmerId] = result.badges;
  }
  return { world: next, awarded };
}

/**
 * How far a farmer has got towards a badge that counts something ("32 of 50"), or that wants one
 * of everything ("4 of 6"), for the You card. Null for the rest.
 */
export function badgeProgress(progress: FarmerProgress, id: BadgeId): { have: number; need: number } | null {
  const counted: Partial<Record<BadgeId, StatId>> = {
    angler: "fish",
    old_salt: "fish",
    green_thumb: "crops",
    harvest_home: "crops",
    beachcomber: "finds",
    kindling: "materials",
    helping_hand: "given",
    pillar: "given",
    homemaker: "placed",
    side_by_side: "nightsTogether",
  };
  const stat = counted[id];
  if (stat) {
    const need = (BADGE_COUNTS as Partial<Record<BadgeId, number>>)[id] ?? 1;
    return { have: Math.min(need, statOf(progress, stat)), need };
  }
  const kinds: Partial<Record<BadgeId, readonly ItemId[]>> = { every_crop: CROP_IDS, shell_seeker: BEACH_FIND_IDS, butterfly_friend: BUG_IDS };
  const all = kinds[id];
  if (all) return { have: all.filter((kind) => progress.kinds.includes(kind)).length, need: all.length };
  return null;
}

/** The badges, earned and not, as the You card lists them: "9 of 26 badges". */
export function badgeCount(progress: FarmerProgress): { earned: number; total: number } {
  return { earned: BADGE_IDS.filter((id) => progress.badges[id] !== undefined).length, total: BADGE_IDS.length };
}

/** For checks: every badge has a rule. */
export const BADGE_RULE_IDS = Object.keys(RULES) as BadgeId[];
