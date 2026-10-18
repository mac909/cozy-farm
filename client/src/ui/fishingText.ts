import { FISH } from "../../../shared/content/fish";
import type { FishingState, MissReason } from "../../../shared/fishing/fishing";

/** What the fishing strip at the top of the screen shows: a line of words and, while reeling, how far in the fish is. */
export interface FishingHudView {
  text: string;
  /** 0 (it gets away) to 1 (landed) while reeling; null before the fish is hooked. */
  progress: number | null;
  /** The fish is pulling: let go. */
  tugging: boolean;
  /** It's biting: tap now (the strip pulses). */
  biting: boolean;
}

/** Waiting for the server to send the line. */
export const CASTING_VIEW: FishingHudView = { text: "Casting…", progress: null, tugging: false, biting: false };

/** The strip for a line in the water. Null once it's over (caught or missed). */
export function fishingHud(state: FishingState, touch: boolean): FishingHudView | null {
  const tap = touch ? "Tap" : "Press";
  const hold = touch ? "Hold" : "Hold Space";
  switch (state.phase) {
    case "casting":
      return CASTING_VIEW;
    case "waiting":
      return { text: "Wait for a bite…", progress: null, tugging: false, biting: false };
    case "bite":
      return { text: `${tap} now!`, progress: null, tugging: false, biting: true };
    case "reeling":
      return state.tugging
        ? { text: "It's pulling! Let go…", progress: state.progress, tugging: true, biting: false }
        : { text: `${hold} to reel it in`, progress: state.progress, tugging: false, biting: false };
    case "caught":
    case "missed":
      return null;
  }
}

/** The word on the Action button while fishing. */
export function fishingWord(state: FishingState | null): string {
  if (!state) return "Wait…";
  switch (state.phase) {
    case "bite":
      return "Now!";
    case "reeling":
      return state.tugging ? "Let go" : "Reel";
    case "caught":
      return "Caught!";
    default:
      return "Wait…";
  }
}

/** What a miss says over your head. Nothing is lost: cast again. */
export const MISS_TEXT: Readonly<Record<MissReason, string>> = {
  "too-early": "Too soon! Wait for the bobber to dip.",
  "too-late": "It got away. Cast again!",
  "got-away": "It slipped off the hook!",
};

/** What a catch says over your head: "A Sea Bream! 34 cm". */
export function catchText(fishId: keyof typeof FISH, sizeCm: number): string {
  const name = FISH[fishId].name;
  const article = /^[AEIOU]/i.test(name) ? "An" : "A";
  return `${article} ${name}! ${sizeCm} cm`;
}
