import { BADGES, BADGE_IDS, type BadgeIcon, type BadgeId } from "../../../shared/content/badges";
import { ITEMS, type ItemId } from "../../../shared/content/items";
import { PERKS, SKILLS, SKILL_IDS, type PerkDef, type SkillId } from "../../../shared/content/skills";
import { badgeCount, badgeProgress } from "../../../shared/progress/badges";
import { levelBar, levelOf, nextPerk, perksOf, titleOf, xpToday, type FarmerProgress } from "../../../shared/progress/farmerProgress";
import type { ProgressEvent } from "../../../shared/progress/progress";

/**
 * The words on the You card (Milestone 7): each skill's level, bar, today's experience and the next
 * perk; the perks you have; the badges, earned and still to earn; and the small cards a level, a
 * gift or a badge brings. Personal: these are only ever about the farmer on this device.
 */

/** A perk as a line: "Plant and water. Planting waters the tile too." */
export function perkLine(perk: PerkDef): string {
  return `${perk.name}. ${perk.text}${perk.later ? ` (Starts ${perk.later}.)` : ""}`;
}

export interface SkillRow {
  id: SkillId;
  name: string;
  icon: ItemId;
  level: number;
  /** How far into the level, 0 to 1 (1 at the top). */
  fraction: number;
  /** "+36 today", or null if nothing today. */
  today: string | null;
  /** "Next: Seed saver, 1 in 6 picks gives a seed back", or "Top level!" */
  next: { name: string; text: string } | null;
  /** The skill's own title once earned ("Keen Gardener"). */
  title: string | null;
}

/** One row per skill, for the Skills tab. */
export function skillRows(progress: FarmerProgress, day: number): SkillRow[] {
  const today = xpToday(progress, day);
  return SKILL_IDS.map((id) => {
    const bar = levelBar(progress.xp[id]);
    const next = nextPerk(progress, id);
    const titles = perksOf(progress).filter((perk) => perk.skill === id && perk.title);
    return {
      id,
      name: SKILLS[id].name,
      icon: SKILLS[id].icon,
      level: bar.level,
      fraction: bar.fraction,
      today: today[id] > 0 ? `+${today[id]} today` : null,
      next: next ? { name: next.name, text: `${lowerFirst(next.text)}${next.later ? ` (${next.later})` : ""}` } : null,
      title: titles.at(-1)?.title ?? null,
    };
  });
}

const lowerFirst = (text: string) => (/^(A |[A-Z][a-z])/.test(text) ? text[0].toLowerCase() + text.slice(1) : text);

/** The perks you have, skill by skill, as lines for "Your perks". Titles and gifts are left out (the title shows at the top). */
export function perkLines(progress: FarmerProgress): { name: string; text: string }[] {
  return perksOf(progress)
    .filter((perk) => !perk.title && !perk.gift)
    .map((perk) => ({ name: perk.name, text: `${perk.text}${perk.later ? ` Starts ${perk.later}.` : ""}` }));
}

/** Under your name at the top of the card: your best title, or how many badges. */
export function youSubtitle(progress: FarmerProgress, tab: "skills" | "badges"): string {
  const { earned, total } = badgeCount(progress);
  if (tab === "badges") return `${earned} of ${total} badges`;
  const title = titleOf(progress);
  if (title) return title;
  return SKILL_IDS.every((skill) => levelOf(progress, skill) === 1) ? "Level 1 in everything, to begin with" : "Your first title comes at level 4";
}

/** A badge on the Badges tab. */
export interface BadgeCell {
  id: BadgeId;
  /** Its name, or its hint while it's still to earn (under a "?"). */
  label: string;
  name: string;
  earned: boolean;
  icon: BadgeIcon;
  /** The words in the strip under the grid when it's tapped. */
  info: string;
}

/** Every badge: the earned ones first, in colour, then the rest as silhouettes with their hint. */
export function badgeCells(progress: FarmerProgress): BadgeCell[] {
  const cells = BADGE_IDS.map((id): BadgeCell => {
    const badge = BADGES[id];
    const day = progress.badges[id];
    const earned = day !== undefined;
    const towards = badgeProgress(progress, id);
    const shared = badge.shared ? " Everyone's: you earned it together." : "";
    const info = earned
      ? `${badge.hint}. Earned on day ${day}.${shared}`
      : `${badge.hint}.${towards ? ` ${towards.have} of ${towards.need} so far.` : ""}${badge.shared ? " Everyone gets this one together." : ""}`;
    return { id, label: earned ? badge.name : badge.hint, name: badge.name, earned, icon: badge.icon, info };
  });
  return [...cells.filter((cell) => cell.earned), ...cells.filter((cell) => !cell.earned)];
}

/** A small card on your own screen: a level, a gift, a badge. */
export interface ProgressCard {
  title: string;
  line: string;
  /** What to show: a skill's icon, an item, a badge's picture. */
  picture: { skill: SkillId } | { item: ItemId } | { badge: BadgeIcon };
  /** The jingle and a sparkle over your head (a level or a badge); a gift is quieter. */
  big: boolean;
  /** Which tab of the You card tapping it opens. */
  tab: "skills" | "badges";
}

/**
 * The cards for what the server said, in order. A level's gift is folded into its card ("It's in
 * your bag"); a gift that waited for room in the bag gets its own when it comes.
 */
export function progressCards(events: readonly ProgressEvent[]): ProgressCard[] {
  const cards: ProgressCard[] = [];
  const folded = new Set<ItemId>();
  for (const event of events) {
    if (event.type === "levelUp") {
      const perk = PERKS.find((p) => p.skill === event.skill && p.level === event.level);
      const gift = perk?.gift;
      let line = perk ? perkLine(perk) : "";
      if (gift) {
        const given = events.some((e) => e.type === "gift" && e.itemId === gift);
        const waiting = events.some((e) => e.type === "giftWaiting" && e.itemId === gift);
        if (given) line += ` The ${ITEMS[gift].name.toLowerCase()} is in your bag.`;
        else if (waiting) line += ` Make room in your bag for the ${ITEMS[gift].name.toLowerCase()}.`;
        if (given || waiting) folded.add(gift);
      }
      cards.push({ title: `${SKILLS[event.skill].name} level ${event.level}`, line, picture: { skill: event.skill }, big: true, tab: "skills" });
    } else if (event.type === "gift" && !folded.has(event.itemId)) {
      cards.push({ title: `A ${ITEMS[event.itemId].name.toLowerCase()} for you`, line: "It's in your bag now.", picture: { item: event.itemId }, big: false, tab: "skills" });
    } else if (event.type === "giftWaiting" && !folded.has(event.itemId)) {
      cards.push({ title: `A ${ITEMS[event.itemId].name.toLowerCase()} is waiting`, line: "Make room in your bag and it'll come.", picture: { item: event.itemId }, big: false, tab: "skills" });
    } else if (event.type === "badge") {
      const badge = BADGES[event.badge];
      cards.push({ title: `New badge: ${badge.name}`, line: `${badge.hint}.`, picture: { badge: badge.icon }, big: true, tab: "badges" });
    }
  }
  return cards;
}

/** Whether there's something on the You card this device hasn't seen: a level or a badge. */
export function somethingNew(progress: FarmerProgress, seen: YouSeen): boolean {
  return SKILL_IDS.some((skill) => levelOf(progress, skill) > (seen.levels[skill] ?? 1)) || BADGE_IDS.some((id) => progress.badges[id] !== undefined && !seen.badges.includes(id));
}

/** What the You card last showed on this device. */
export interface YouSeen {
  levels: Partial<Record<SkillId, number>>;
  badges: string[];
}

/** What the You card shows now, to remember as seen. */
export function seenNow(progress: FarmerProgress): YouSeen {
  return {
    levels: Object.fromEntries(SKILL_IDS.map((skill) => [skill, levelOf(progress, skill)])),
    badges: BADGE_IDS.filter((id) => progress.badges[id] !== undefined),
  };
}
