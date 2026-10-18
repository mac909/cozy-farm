import { BEACH_FINDS, type BeachFindId } from "../content/beachFinds";
import { BUGS, type BugId } from "../content/bugs";
import { CROPS, type CropId } from "../content/crops";
import { FISH, type FishId } from "../content/fish";
import type { BadgeId } from "../content/badges";
import { NIGHT_OWL_FROM } from "../content/badges";
import { cropItemId, type ItemId } from "../content/items";
import { PERKS, XP, type SkillId } from "../content/skills";
import { daysToRipe } from "../farming/farming";
import { addItems, roomFor } from "../inventory/inventory";
import { farmerOf, setFarmerBag, setFarmerProgress, type FarmerId, type World } from "../world/world";
import { awardBadges } from "./badges";
import { levelFor, NO_XP, type FarmerProgress, type SkillXp, type StatId } from "./farmerProgress";

/**
 * Doing things counts (Milestone 7): every pick, catch, find and gift gives experience in its skill
 * and adds to the counts badges go by, the same however it was done. A level brings its perk at
 * once (and its gift, if it has one and there's room in the bag), and any badge it's now earned.
 * No numbers fly about while you play: the You card shows the bars, and a level or a badge gets a
 * small card on your own screen. Experience numbers are in shared/content/skills.ts.
 */

/** Something a farmer did that counts. */
export type Deed =
  /** Picked a crop; \`regrown\`: it had grown back after an earlier pick. */
  | { readonly kind: "harvest"; readonly cropId: CropId; readonly regrown: boolean }
  /** Landed a fish (\`count\`: two with Double catch), at \`minute\`; \`record\`: bigger than ever. */
  | { readonly kind: "fish"; readonly fishId: FishId; readonly count: number; readonly record: boolean; readonly minute: number }
  /** A hooked fish got away. */
  | { readonly kind: "gotAway" }
  | { readonly kind: "find"; readonly findId: BeachFindId }
  | { readonly kind: "bug"; readonly bugId: BugId }
  /** Picked up driftwood or a branch (\`count\`: two with Armful). */
  | { readonly kind: "material"; readonly itemId: ItemId; readonly count: number }
  /** Gave things to the board (never counting coins). */
  | { readonly kind: "give"; readonly count: number }
  /** Put a piece of furniture or a decoration down. */
  | { readonly kind: "placed" }
  /** Was in bed when the night came: with someone else in bed too, in someone else's house. */
  | { readonly kind: "night"; readonly together: boolean; readonly sleepover: boolean }
  /** Climbed the lit lighthouse for the view; \`night\`: after dark (NIGHT_VIEW_FROM). */
  | { readonly kind: "view"; readonly night: boolean };

/** Something to tell the farmer about, on their own screen only. */
export type ProgressEvent =
  | { readonly type: "levelUp"; readonly skill: SkillId; readonly level: number }
  | { readonly type: "badge"; readonly badge: BadgeId }
  /** A level's gift went into the bag. */
  | { readonly type: "gift"; readonly itemId: ItemId }
  /** A level's gift is waiting for room in the bag (it comes as soon as there is). */
  | { readonly type: "giftWaiting"; readonly itemId: ItemId };

/** The experience a deed gives, and in which skill, or null for none. */
export function xpFor(deed: Deed): { skill: SkillId; amount: number } | null {
  switch (deed.kind) {
    case "harvest":
      return { skill: "farming", amount: deed.regrown ? XP.regrownPick : daysToRipe(CROPS[deed.cropId]) };
    case "fish":
      return { skill: "fishing", amount: XP.fish[FISH[deed.fishId].rarity] + (deed.record ? XP.record : 0) };
    case "gotAway":
      return { skill: "fishing", amount: XP.gotAway };
    case "find":
      return { skill: "foraging", amount: XP.find[BEACH_FINDS[deed.findId].rarity] };
    case "bug":
      return { skill: "foraging", amount: XP.bug[BUGS[deed.bugId].rarity] };
    case "material":
      return { skill: "foraging", amount: XP.material * Math.max(1, deed.count) };
    default:
      return null;
  }
}

/** What a deed adds to the counts. */
function statsFor(deed: Deed): Partial<Record<StatId, number>> {
  switch (deed.kind) {
    case "harvest":
      return { crops: 1 };
    case "fish":
      return { fish: deed.count, ...(deed.minute >= NIGHT_OWL_FROM ? { nightFish: deed.count } : {}), ...(deed.record ? { records: 1 } : {}) };
    case "find":
      return { finds: 1 };
    case "bug":
      return { bugs: 1 };
    case "material":
      return { materials: deed.count };
    case "give":
      return { given: deed.count };
    case "placed":
      return { placed: 1 };
    case "night":
      return { ...(deed.together ? { nightsTogether: 1 } : {}), ...(deed.sleepover ? { sleepovers: 1 } : {}) };
    case "view":
      return deed.night ? { nightViews: 1 } : {};
    case "gotAway":
      return {};
  }
}

/** The kind of thing a deed found, for the "every …" badges (a crop counts as its crop, golden or not). */
function kindOf(deed: Deed): ItemId | null {
  switch (deed.kind) {
    case "harvest":
      return cropItemId(deed.cropId);
    case "fish":
      return deed.fishId;
    case "find":
      return deed.findId;
    case "bug":
      return deed.bugId;
    default:
      return null;
  }
}

/**
 * Adds \`amount\` experience in \`skill\` on \`day\` (counted in "today" too). Returns the progress and
 * every level reached on the way, lowest first.
 */
export function addXp(progress: FarmerProgress, skill: SkillId, amount: number, day: number): { progress: FarmerProgress; levels: number[] } {
  const gain = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
  if (gain === 0) return { progress, levels: [] };
  const before = levelFor(progress.xp[skill]);
  const xp: SkillXp = { ...progress.xp, [skill]: progress.xp[skill] + gain };
  const sameDay = progress.today.day === day;
  const todayXp: SkillXp = { ...(sameDay ? progress.today.xp : NO_XP), [skill]: (sameDay ? progress.today.xp[skill] : 0) + gain };
  const after = levelFor(xp[skill]);
  const levels = Array.from({ length: after - before }, (_, i) => before + i + 1);
  return { progress: { ...progress, xp, today: { day, xp: todayXp } }, levels };
}

/** The gifts a farmer's levels have brought that they haven't been handed yet, lowest level first. */
export function giftsOwed(progress: FarmerProgress): ItemId[] {
  return PERKS.filter((perk) => perk.gift && levelFor(progress.xp[perk.skill]) >= perk.level && !progress.gifts.includes(perk.gift)).map((perk) => perk.gift!);
}

/** Hands a farmer any gifts their levels have brought, as far as their bag has room. */
export function handOverGifts(world: World, farmerId: FarmerId): { world: World; given: ItemId[] } {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return { world, given: [] };
  let bag = farmer.bag;
  const given: ItemId[] = [];
  for (const itemId of giftsOwed(farmer.progress)) {
    if (roomFor(bag, itemId) < 1) continue;
    const added = addItems(bag, itemId, 1);
    if (!added.ok || added.leftover > 0) continue;
    bag = added.inventory;
    given.push(itemId);
  }
  if (given.length === 0) return { world, given };
  const next = setFarmerProgress(setFarmerBag(world, farmerId, bag), farmerId, { ...farmer.progress, gifts: [...farmer.progress.gifts, ...given] });
  return { world: next, given };
}

/**
 * A farmer did something: experience, counts and kinds; then any level's gift (or a note that it's
 * waiting for room) and any badge now earned. Returns the world and what to tell them, in order:
 * levels, gifts, badges. Someone who isn't a farmer changes nothing.
 */
export function recordDeed(world: World, farmerId: FarmerId, deed: Deed): { world: World; events: ProgressEvent[] } {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return { world, events: [] };
  let progress = farmer.progress;
  const events: ProgressEvent[] = [];
  const xp = xpFor(deed);
  if (xp) {
    const added = addXp(progress, xp.skill, xp.amount, world.clock.day);
    progress = added.progress;
    for (const level of added.levels) events.push({ type: "levelUp", skill: xp.skill, level });
  }
  const stats = statsFor(deed);
  if (Object.keys(stats).length > 0) {
    const next = { ...progress.stats };
    for (const [stat, n] of Object.entries(stats) as [StatId, number][]) next[stat] = (next[stat] ?? 0) + n;
    progress = { ...progress, stats: next };
  }
  const kind = kindOf(deed);
  if (kind && !progress.kinds.includes(kind)) progress = { ...progress, kinds: [...progress.kinds, kind] };
  return afterProgress(setFarmerProgress(world, farmerId, progress), farmerId, events);
}

/** Experience straight into a skill, for testing (the dev command). Real play never calls this. */
export function grantXp(world: World, farmerId: FarmerId, skill: SkillId, amount: number): { world: World; events: ProgressEvent[] } {
  const farmer = farmerOf(world, farmerId);
  if (!farmer) return { world, events: [] };
  const added = addXp(farmer.progress, skill, amount, world.clock.day);
  const events: ProgressEvent[] = added.levels.map((level) => ({ type: "levelUp", skill, level }));
  return afterProgress(setFarmerProgress(world, farmerId, added.progress), farmerId, events);
}

/** After a farmer's progress changed: their gifts and their badges. */
function afterProgress(world: World, farmerId: FarmerId, events: ProgressEvent[]): { world: World; events: ProgressEvent[] } {
  const gifts = handOverGifts(world, farmerId);
  const reached = new Set(events.flatMap((e) => (e.type === "levelUp" ? [`${e.skill}:${e.level}`] : [])));
  for (const itemId of gifts.given) events.push({ type: "gift", itemId });
  // A gift this level brought, with no room for it yet: say it's waiting (once, now; it comes later by itself).
  for (const perk of PERKS) {
    if (perk.gift && reached.has(`${perk.skill}:${perk.level}`) && !gifts.given.includes(perk.gift)) events.push({ type: "giftWaiting", itemId: perk.gift });
  }
  const badges = awardBadges(gifts.world, farmerId);
  for (const badge of badges.badges) events.push({ type: "badge", badge });
  return { world: badges.world, events };
}
