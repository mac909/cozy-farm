/** Emotes a player can show above their head. Each one has a matching icon in the art. */
export const EMOTES = [
  { id: "wave", label: "Wave" },
  { id: "heart", label: "Heart" },
] as const;

export type EmoteId = (typeof EMOTES)[number]["id"];
