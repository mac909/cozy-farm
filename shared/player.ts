import { CHARACTERS, type CharacterId, DEFAULT_CHARACTER, LEGACY_SHIRT_COLORS } from "./content/characters";
import { EMOTES, type EmoteId } from "./content/emotes";

/** Longest name, in characters (an emoji counts as one). */
export const NAME_MAX_LENGTH = 12;

/** Used when a join arrives without a usable name. */
export const DEFAULT_NAME = "Farmer";

/** What a player picked for themselves. */
export interface Look {
  name: string;
  character: CharacterId;
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

export function isCharacter(value: unknown): value is CharacterId {
  return CHARACTERS.some((character) => character.id === value);
}

export function isEmote(value: unknown): value is EmoteId {
  return EMOTES.some((emote) => emote.id === value);
}

/**
 * Turns untrusted input into a valid look, falling back to defaults for anything unusable.
 * Looks saved before characters existed have a shirt `color` instead; that picks a matching character.
 */
export function lookFrom(raw: unknown): Look {
  const input = (raw ?? {}) as { name?: unknown; character?: unknown; color?: unknown };
  const legacy =
    typeof input.color === "string" && Object.hasOwn(LEGACY_SHIRT_COLORS, input.color)
      ? LEGACY_SHIRT_COLORS[input.color]
      : undefined;
  return {
    name: cleanName(input.name) || DEFAULT_NAME,
    character: isCharacter(input.character) ? input.character : (legacy ?? DEFAULT_CHARACTER),
  };
}
