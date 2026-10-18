/**
 * Marlow, the old lighthouse keeper (Milestone 6): his name, his notes and his small talk. The
 * village's story comes out in these lines and nowhere else. Notes are short, two or three
 * sentences, signed "— M.". Edit the words here.
 */

/** The keeper's name. */
export const KEEPER_NAME = "Marlow";

/**
 * The village's name, still to be chosen (like the game's). Lines say `{village}` where it goes, so
 * picking one is a change to this line only. Until then, "the village"; written so it reads well
 * mid-sentence either way.
 */
export const VILLAGE_NAME = "the village";

/** Under his name on his notes. */
export const KEEPER_TITLE = "kept the lighthouse on the point";

/** His first note, shown once on each device the first time it opens the game after he arrives. */
export const FIRST_NOTE: readonly string[] = [
  "Well, hello! I'm Marlow. I kept the lighthouse on the point, back when this was a busy little harbour. It's been dark for years.",
  "I've pinned some plans up on the board by the seed stand, if you two fancy waking the old place up.",
];

/** When the board has nothing new to give to. */
export const NEXT_PLAN_LINE = "I'm still drawing up the next plan. Give me a little while.";

/** The minutes he moves at: by the board in the daytime, fishing in the evening, his boat (or the lamp room) at night. */
export const KEEPER_HOURS = { evening: 18 * 60, night: 22 * 60 } as const;

/** A small-talk line, and when he says it. */
export interface SmallTalk {
  readonly line: string;
  /** Only from this minute… */
  readonly from?: number;
  /** …up to this one. */
  readonly to?: number;
  /** Only once this is built (a built name, see shared/village/built.ts). */
  readonly needs?: string;
  /** Only until this is built. */
  readonly until?: string;
}

/** What he says when there's no new note: picked by the time of day and what's open. */
export const SMALL_TALK: readonly SmallTalk[] = [
  { line: "Lovely morning for it.", to: 11 * 60 },
  { line: "Sea glass likes the morning after a rough night.", to: 12 * 60 },
  { line: "I used to row out past the point every morning. My knees had other ideas." },
  { line: "Mrs Penhallow grew melons the size of my head. Well, nearly." },
  { line: "Driftwood dries out lovely in the sun. Smells of the sea for years after." },
  { line: "When I was a boy, every boat in {village} came home by the light on the point." },
  { line: "There was a café on the front once. The crab cakes! I can still smell them." },
  { line: "Shells sell, but sea glass is the real treasure. Ask any keeper." },
  { line: "The brambles on the old path have had twenty years to grow. They won't go quietly.", until: "lighthouse/path" },
  { line: "Every evening I look out at the point and miss that old light.", until: "lighthouse" },
  { line: "The fish bite at the point after dark, you know.", needs: "lighthouse" },
  { line: "Have you been up the lighthouse yet? You can see the whole of {village} from the top.", needs: "lighthouse" },
  { line: "I sleep better with her shining. Silly, isn't it?", needs: "lighthouse" },
  { line: "Nothing's biting. Never mind: it's the sitting that counts.", from: KEEPER_HOURS.evening },
  { line: "Grand evening for it. The sea's like glass.", from: KEEPER_HOURS.evening },
  { line: "Off to bed soon. Mind how you go in the dark.", from: KEEPER_HOURS.night },
];

/** A line with the village's name in it. */
export function keeperWords(line: string): string {
  return line.replaceAll("{village}", VILLAGE_NAME);
}

/** The small talk he might say at `minute` with `built` done, in list order. */
export function smallTalkFor(minute: number, built: ReadonlySet<string>): string[] {
  return SMALL_TALK.filter(
    (talk) =>
      (talk.from === undefined || minute >= talk.from) &&
      (talk.to === undefined || minute < talk.to) &&
      (talk.needs === undefined || built.has(talk.needs)) &&
      (talk.until === undefined || !built.has(talk.until)),
  ).map((talk) => keeperWords(talk.line));
}
