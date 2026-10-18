// Every message between client and server. Each feature has its own section, so features built side by side only meet in small additions.

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

// ---------- Dev commands (refused when NODE_ENV is production) ----------

/** What a dev command does: start the night now, set the clock (value: game minutes after midnight), or add coins (value: how many). */
export type DevCommand = "nextDay" | "setTime" | "addCoins";

/** Client → server ("dev"): a shortcut for testing. Also on window.dev in the browser console. */
export interface DevMessage {
  command: DevCommand;
  value?: number;
}
