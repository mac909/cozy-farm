import { EMOTES, type EmoteId } from "./content/emotes";
import { DEFAULT_SHIRT_COLOR, SHIRT_COLORS, type ShirtColorId } from "./content/shirtColors";

/** Longest name, in characters (an emoji counts as one). */
export const NAME_MAX_LENGTH = 12;

/** Used when a join arrives without a usable name. */
export const DEFAULT_NAME = "Farmer";

/** What a player picked for themselves. */
export interface Look {
  name: string;
  color: ShirtColorId;
}

/** Splits text into the characters a person would count, keeping emoji like 👩‍🌾 whole. */
function characters(text: string): string[] {
  if (typeof Intl.Segmenter !== "function") return Array.from(text);
  return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
}

/** Tidies a typed name: single spaces, no control characters, at most NAME_MAX_LENGTH characters. Can return "". */
export function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const tidy = raw.replace(/\s+/gu, " ").replace(/\p{Cc}/gu, "").trim();
  return characters(tidy).slice(0, NAME_MAX_LENGTH).join("").trim();
}

export function isShirtColor(value: unknown): value is ShirtColorId {
  return SHIRT_COLORS.some((color) => color.id === value);
}

export function isEmote(value: unknown): value is EmoteId {
  return EMOTES.some((emote) => emote.id === value);
}

/** Turns untrusted input into a valid look, falling back to defaults for anything unusable. */
export function lookFrom(raw: unknown): Look {
  const input = (raw ?? {}) as { name?: unknown; color?: unknown };
  return {
    name: cleanName(input.name) || DEFAULT_NAME,
    color: isShirtColor(input.color) ? input.color : DEFAULT_SHIRT_COLOR,
  };
}
