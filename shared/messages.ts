import type { EmoteId } from "./content/emotes";
import type { Facing } from "./movement";
import type { Look } from "./player";

/**
 * Client → server, when joining: who I am, and where I am if I'm rejoining
 * after a dropped connection (so I don't pop back to the spawn point).
 */
export interface JoinOptions extends Look {
  x?: number;
  y?: number;
  facing?: Facing;
}

/** Client → server ("move"): where my character is now. */
export interface MoveMessage {
  x: number;
  y: number;
  facing: Facing;
  /** My clock (performance.now()) when I sent this. */
  sentAt: number;
}

/** Client → server ("look"): I changed my name or character. */
export type LookMessage = Look;

/** Client → server ("emote"): show this above my head. */
export interface EmoteMessage {
  emote: EmoteId;
}

/** Server → other clients ("emote"): show this above that player's head. */
export interface EmoteEvent {
  sessionId: string;
  emote: EmoteId;
}
