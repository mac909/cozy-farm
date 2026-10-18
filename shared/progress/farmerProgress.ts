import type { BadgeId } from "../content/badges";
import type { ItemId } from "../content/items";
import { LEVEL_XP, MAX_LEVEL, PERKS, SKILL_IDS, type PerkDef, type PerkId, type SkillId } from "../content/skills";

/**
 * A farmer's own progress (Milestone 7): experience in each skill, the counts the badges go by,
 * what kinds of things they've found themselves, the badges they've earned, and the gifts their
 * levels have brought. Plain data, saved with the farmer (since save version 5). Personal: it's
 * never compared with anyone else's. The rules that change it are in progress.ts and badges.ts.
 */

/** The counts badges go by. */
export type StatId =
  /** Fish landed. */
  | "fish"
  /** Fish landed from 10 pm (Night Owl). */
  | "nightFish"
  /** Bigger fish than ever (Record Breaker). */
  | "records"
  /** Crops picked. */
  | "crops"
  /** Beach finds picked up. */
  | "finds"
  /** Bugs caught. */
  | "bugs"
  /** Driftwood and branches picked up. */
  | "materials"
  /** Things given to the board (never coins). */
  | "given"
  /** Furniture and decorations put down. */
  | "placed"
  /** Nights you went to bed with someone else in bed too (Side by Side). */
  | "nightsTogether"
  /** Nights in a bed in someone else's house (Sleepover). */
  | "sleepovers"
  /** Climbing the lit lighthouse for the view after dark (Up the Lighthouse). */
  | "nightViews";

export const STAT_IDS: readonly StatId[] = [
  "fish",
  "nightFish",
  "records",
  "crops",
  "finds",
  "bugs",
  "materials",
  "given",
  "placed",
  "nightsTogether",
  "sleepovers",
  "nightViews",
];

export function isStatId(id: unknown): id is StatId {
  return typeof id === "string" && (STAT_IDS as readonly string[]).includes(id);
}

export type SkillXp = Readonly<Record<SkillId, number>>;

export interface FarmerProgress {
  /** Total experience in each skill. Levels are worked out from it (LEVEL_XP). */
  readonly xp: SkillXp;
  /** Experience earned on `day`, for "+36 today" on the You card. */
  readonly today: { readonly day: number; readonly xp: SkillXp };
  readonly stats: Readonly<Partial<Record<StatId, number>>>;
  /** Every kind of crop, fish, beach find and bug this farmer has picked, landed or caught themselves (for Every Crop and the like). */
  readonly kinds: readonly ItemId[];
  /** Badges earned, with the day each was. */
  readonly badges: Readonly<Partial<Record<BadgeId, number>>>;
  /** Gifts from levels already handed over (each comes once, even if the bag was full at the time). */
  readonly gifts: readonly ItemId[];
}

export const NO_XP: SkillXp = { farming: 0, fishing: 0, foraging: 0 };

/** Where everyone starts: level 1 in everything, nothing counted, no badges. Nobody gets experience for past play. */
export const EMPTY_PROGRESS: FarmerProgress = { xp: NO_XP, today: { day: 0, xp: NO_XP }, stats: {}, kinds: [], badges: {}, gifts: [] };

/** The level for a total of experience, 1 to MAX_LEVEL. */
export function levelFor(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= LEVEL_XP[level]) level++;
  return level;
}

/** A skill's level. */
export function levelOf(progress: FarmerProgress, skill: SkillId): number {
  return levelFor(progress.xp[skill]);
}

/** How far into its level a total of experience is, for the You card's bar. `toNext` is null at the top level. */
export function levelBar(xp: number): { level: number; fraction: number; toNext: number | null } {
  const level = levelFor(xp);
  if (level >= MAX_LEVEL) return { level, fraction: 1, toNext: null };
  const from = LEVEL_XP[level - 1];
  const to = LEVEL_XP[level];
  return { level, fraction: Math.min(1, Math.max(0, (xp - from) / (to - from))), toNext: to - xp };
}

/** Whether a farmer's levels have brought a perk. Nobody (undefined) has any. */
export function hasPerk(progress: FarmerProgress | undefined, id: PerkId): boolean {
  if (!progress) return false;
  const perk = PERKS.find((p) => p.id === id);
  return perk !== undefined && levelOf(progress, perk.skill) >= perk.level;
}

/** Every perk a farmer's levels have brought, skill by skill, level by level. */
export function perksOf(progress: FarmerProgress): (PerkDef & { readonly skill: SkillId })[] {
  return PERKS.filter((perk) => levelOf(progress, perk.skill) >= perk.level);
}

/** The perk a skill's next level brings, or null at the top. */
export function nextPerk(progress: FarmerProgress, skill: SkillId): (PerkDef & { readonly skill: SkillId }) | null {
  const level = levelOf(progress, skill);
  return PERKS.find((perk) => perk.skill === skill && perk.level === level + 1) ?? null;
}

/**
 * The title under a farmer's name on the You card: the best one their levels have brought (a top
 * title before a keen one; between equals, the skill they've done most), or null before any.
 */
export function titleOf(progress: FarmerProgress): string | null {
  const titled = perksOf(progress).filter((perk) => perk.title);
  titled.sort((a, b) => b.level - a.level || progress.xp[b.skill] - progress.xp[a.skill] || SKILL_IDS.indexOf(a.skill) - SKILL_IDS.indexOf(b.skill));
  return titled[0]?.title ?? null;
}

/** Experience earned today in each skill (none if `today` is from another day). */
export function xpToday(progress: FarmerProgress, day: number): SkillXp {
  return progress.today.day === day ? progress.today.xp : NO_XP;
}

/** A count, 0 if never counted. */
export function statOf(progress: FarmerProgress, stat: StatId): number {
  return progress.stats[stat] ?? 0;
}
