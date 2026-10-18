/**
 * Emote bubbles, one per emote in shared/content/emotes.ts (same order).
 * The pack's speech bubbles (Ui/Emote) have a heart but no wave, so the wave
 * is our own hand drawn into the pack's empty bubble.
 */
import { Img, fromGrid, recolor } from "./lib/image";

/** The pack's bubble colour and the dark it draws faces with. */
const BUBBLE = "#fce2ca";
const INK = "#4e484a";

/** Pack emotes used as they are, and the one we take the empty bubble from (a smiley, face wiped). */
export const PACK_EMOTES = {
  heart: "Ui/Emote/emote27.png",
  blank: "Ui/Emote/emote11.png",
} as const;

/** A raised, open hand, in the pack's face ink. Drawn at (2, 2) inside the 14×13 bubble. */
const HAND = [
  "....k.k...",
  "..k.k.k...",
  "..k.k.k.k.",
  "..k.k.k.k.",
  "k.kkkkkkk.",
  "kkkkkkkkk.",
  ".kkkkkkkk.",
  "..kkkkkk..",
];

/** Frames in EMOTES order: wave, heart. `readPack` loads a file relative to the pack folder. */
export function emoteFrames(readPack: (file: string) => Img): Img[] {
  const blank = recolor(readPack(PACK_EMOTES.blank), { [INK]: BUBBLE });
  const wave = blank.blit(fromGrid(HAND, { k: INK }), 2, 2);
  return [wave, readPack(PACK_EMOTES.heart)];
}
